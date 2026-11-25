// End-to-end processing of one recipe row.
import fs from 'node:fs';
import path from 'node:path';
import { config, log, timed, StageError } from './util.js';
import { download } from './download.js';
import { transcribe } from './transcribe.js';
import { extractFrames, makeCover, coverFromFrame } from './frames.js';
import { extractRecipe } from './claude.js';
import { illustrate } from './illustrate.js';
import { normalizeRecipe } from './schema.js';
import { updateRecipe, uploadCover } from './db.js';

const NOT_RECIPE = 'Este vídeo não parece ter uma receita.';

function jobDir(id) {
  const dir = path.join(config.tmpDir, `job-${id}-${process.pid}`); // unique per process: concurrent runs never share a dir
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Keep the most recent job dir at tmp/last for debugging; remove the rest. */
function rotate(dir) {
  const last = path.join(config.tmpDir, 'last');
  try {
    fs.rmSync(last, { recursive: true, force: true });
    // drop the heavy media, keep frames/json/transcripts
    for (const f of fs.readdirSync(dir)) if (/\.(mp4|mkv|webm|mov|wav)$/.test(f)) fs.rmSync(path.join(dir, f), { force: true });
    fs.renameSync(dir, last);
  } catch (e) {
    log.warn('limpeza tmp:', e.message);
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export async function processRecipe(row) {
  const t0 = Date.now();
  const timings = {};
  const dir = jobDir(row.id);
  log.info(`=== receita ${row.id} (${row.source_url}) tentativa ${row.attempts ?? '?'} ===`);
  const heartbeat = setInterval(() => {
    updateRecipe(row.id, { locked_at: new Date().toISOString() }).catch((e) => log.warn('heartbeat:', e.message));
  }, 5 * 60_000);
  try {
    const media = await timed('download', timings, () => download(row.source_url, dir));
    const tr = media.videos.length ? await timed('transcrição', timings, () => transcribe(media.videos, dir)) : null;
    const frames = await timed('frames', timings, () => extractFrames(media, dir));
    let cover = await makeCover(media, dir);

    // Save raw source info early so it's visible even if later stages fail.
    await updateRecipe(row.id, { caption: media.caption || null, author: media.author, transcript: tr?.text || null });

    const raw = await timed('claude: extração', timings, () => extractRecipe({
      url: row.source_url, caption: media.caption, author: media.author,
      transcript: tr?.text, language: tr?.language, frames,
    }, dir));
    fs.writeFileSync(path.join(dir, 'recipe.raw.json'), JSON.stringify(raw, null, 2));

    let recipe;
    try { recipe = normalizeRecipe(raw); } catch (e) {
      if (e.notRecipe) throw new StageError(NOT_RECIPE, e.message, { retryable: false });
      throw new StageError('Não foi possível interpretar a receita.', e.message);
    }

    const picked = await coverFromFrame(raw?.cover_frame, media, dir).catch(() => null);
    if (picked) { cover = picked; log.info(`capa escolhida: ${raw.cover_frame}`); }

    const art = await timed('claude: ilustrações', timings, () => illustrate(recipe, dir));
    const coverUrl = cover ? await timed('upload capa', timings, () => uploadCover(row.id, cover).catch((e) => { log.warn(e.message); return null; })) : null;

    const patch = {
      ...recipe,
      steps: art.steps,
      hero_svg: art.hero_svg,
      ...(coverUrl ? { cover_url: coverUrl } : {}),
      status: 'done',
      error: null,
    };
    fs.writeFileSync(path.join(dir, 'recipe.final.json'), JSON.stringify(patch, null, 2));
    await updateRecipe(row.id, patch);
    timings.total = Math.round((Date.now() - t0) / 100) / 10;
    log.info(`✔ receita ${row.id} "${recipe.title}" concluída`, JSON.stringify(timings));
    return { ok: true, id: row.id, title: recipe.title, timings };
  } catch (e) {
    const msg = e.userMessage || 'Ocorreu um erro ao processar a receita.';
    log.error(`✘ receita ${row.id}: ${e.message}`);
    await updateRecipe(row.id, { status: 'error', error: msg }).catch((err) => log.error('não foi possível gravar o erro:', err.message));
    return { ok: false, id: row.id, error: msg, detail: e.message, timings };
  } finally {
    clearInterval(heartbeat);
    rotate(dir);
  }
}
