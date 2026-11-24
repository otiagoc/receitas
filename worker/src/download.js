// Download an Instagram reel / post (video, photo or carousel) with yt-dlp.
import fs from 'node:fs';
import path from 'node:path';
import { run, log, StageError, config, WORKER_DIR } from './util.js';

const YTDLP = process.env.YTDLP_BIN || 'yt-dlp';
const COOKIES_FILE = process.env.RECEITAS_COOKIES || path.join(WORKER_DIR, 'cookies.txt');

function baseArgs(url) {
  return [
    '--no-progress', '--no-warnings', '--no-mtime',
    '--ignore-no-formats-error', // photo posts have no video formats
    '-f', 'bv*[height<=720][ext=mp4]+ba[ext=m4a]/b[height<=720][ext=mp4]/bv*[height<=720]+ba/b[height<=720]/b',
    '--merge-output-format', 'mp4',
    '--write-info-json', '--write-thumbnail', '--convert-thumbnails', 'jpg',
    '--socket-timeout', '30', '--retries', '3',
    '-o', 'media_%(playlist_index|0)s.%(ext)s',
    '-o', 'thumbnail:thumb_%(playlist_index|0)s.%(ext)s',
    '-o', 'infojson:info_%(playlist_index|0)s.%(ext)s',
    '-o', 'pl_infojson:playlist.%(ext)s',
    url,
  ];
}

function classifyFailure(stderr) {
  const s = stderr || '';
  if (/Operation not permitted|Cookies\.binarycookies|PermissionError|not authorized to access/i.test(s)) {
    return new StageError(
      'O Instagram pediu sessão e o worker não consegue ler os cookies do Safari. Corre worker/scripts/export-cookies.sh no Terminal (ou dá "Acesso total ao disco" ao node).',
      'safari cookies', { retryable: false });
  }
  if (/login required|rate-limit|requested content is not available|Please log in|empty media response|private/i.test(s)) {
    return new StageError('O Instagram bloqueou o download (precisa de sessão iniciada no Safari ou a publicação é privada).', lastLine(s));
  }
  if (/Unsupported URL|is not a valid URL/i.test(s)) {
    return new StageError('Link não suportado. Partilha um reel ou publicação do Instagram.', lastLine(s), { retryable: false });
  }
  if (/404|not found|has been removed|unavailable/i.test(s)) {
    return new StageError('A publicação não existe ou foi removida.', lastLine(s), { retryable: false });
  }
  return new StageError('Não foi possível descarregar o vídeo.', lastLine(s));
}

function lastLine(s) {
  return (s || '').trim().split('\n').filter(Boolean).slice(-1)[0]?.slice(0, 300) || '';
}

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

/** Collect downloaded media in the job dir into a normalized structure. */
function collect(dir) {
  const files = fs.readdirSync(dir);
  const videos = files.filter((f) => /^media_\d+\.(mp4|mkv|webm|mov)$/.test(f)).sort().map((f) => path.join(dir, f));
  let images = files.filter((f) => /^(media|thumb)_\d+\.(jpg|jpeg|png|webp)$/.test(f)).sort().map((f) => path.join(dir, f));
  const infos = files.filter((f) => /^info_\d+\.info\.json$/.test(f)).sort().map((f) => readJson(path.join(dir, f))).filter(Boolean);
  const playlist = readJson(path.join(dir, 'playlist.info.json'));
  const main = playlist || infos[0] || {};
  const first = infos[0] || {};
  const caption = main.description || first.description || '';
  const author = main.channel || first.channel || main.uploader_id || first.uploader_id || main.uploader || first.uploader || null;
  // For video entries the thumbnail is only a cover; for photo entries it IS the content.
  const idx = (f) => Number(path.basename(f).match(/_(\d+)\./)?.[1]);
  const videoIdx = new Set(videos.map(idx));
  const photos = images.filter((f) => !videoIdx.has(idx(f)));
  const cover = images[0] || null;
  return { videos, images, photos, cover, caption, author, title: main.title || first.title || null, infos };
}

export async function download(url, dir) {
  fs.mkdirSync(dir, { recursive: true });
  const attempt = async (extra) => {
    const r = await run(YTDLP, [...extra, ...baseArgs(url)], { cwd: dir, timeoutMs: config.timeouts.download });
    return r;
  };

  let r = await attempt([]);
  let got = collect(dir);
  // yt-dlp exits non-zero on photo posts ("No video formats") even when it wrote the images.
  if (!got.videos.length && !got.images.length) {
    log.warn('download anónimo falhou:', lastLine(r.stderr));
    // 1) cookies exported from Safari with scripts/export-cookies.sh (no Full Disk Access needed)
    if (fs.existsSync(COOKIES_FILE)) {
      log.info('a tentar com worker/cookies.txt');
      r = await attempt(['--cookies', COOKIES_FILE]);
      got = collect(dir);
    }
    // 2) read Safari cookies directly (needs Full Disk Access for node under launchd)
    if (!got.videos.length && !got.images.length) {
      log.info('a tentar com cookies do Safari');
      r = await attempt(['--cookies-from-browser', 'safari']);
      got = collect(dir);
    }
    if (r.code !== 0 && !got.videos.length && !got.images.length) throw classifyFailure(r.stderr);
  }
  if (!got.videos.length && !got.images.length) throw classifyFailure(r.stderr);
  log.info(`download: ${got.videos.length} vídeo(s), ${got.images.length} imagem(ns), autor=${got.author}`);
  return got;
}
