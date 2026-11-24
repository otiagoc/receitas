// Audio extraction (ffmpeg) + speech-to-text (whisper.cpp).
import fs from 'node:fs';
import path from 'node:path';
import { run, log, config } from './util.js';

const WHISPER = process.env.WHISPER_BIN || 'whisper-cli';
const MODEL_CANDIDATES = ['ggml-large-v3-turbo-q5_0.bin', 'ggml-large-v3-turbo.bin', 'ggml-small.bin', 'ggml-base.bin'];

export function findModel() {
  if (process.env.WHISPER_MODEL) return process.env.WHISPER_MODEL;
  for (const m of MODEL_CANDIDATES) {
    const p = path.join(config.modelsDir, m);
    if (fs.existsSync(p) && fs.statSync(p).size > 10_000_000) return p;
  }
  return null;
}

export async function hasAudio(video) {
  const r = await run('ffprobe', ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=codec_type', '-of', 'csv=p=0', video], { timeoutMs: 30_000 });
  return r.code === 0 && r.stdout.includes('audio');
}

export async function probeDuration(video) {
  const r = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', video], { timeoutMs: 30_000 });
  const d = parseFloat(r.stdout);
  return Number.isFinite(d) ? d : 0;
}

/** Returns { text, language } or null when there is no audio/speech. */
export async function transcribe(videos, dir) {
  const model = findModel();
  if (!model) {
    log.warn('nenhum modelo whisper em worker/models — a saltar transcrição');
    return null;
  }
  const parts = [];
  let language = null;
  for (const [i, video] of videos.entries()) {
    if (!(await hasAudio(video))) { log.info(`sem áudio: ${path.basename(video)}`); continue; }
    const wav = path.join(dir, `audio_${i}.wav`);
    const ff = await run('ffmpeg', ['-y', '-v', 'error', '-i', video, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', wav], { timeoutMs: config.timeouts.frames });
    if (ff.code !== 0) { log.warn('ffmpeg áudio falhou:', ff.stderr.slice(-300)); continue; }
    const outBase = path.join(dir, `transcript_${i}`);
    const w = await run(WHISPER, ['-m', model, '-f', wav, '-l', 'auto', '-oj', '-of', outBase, '-np', '-t', '6'], { timeoutMs: config.timeouts.transcribe });
    if (w.code !== 0) { log.warn('whisper falhou:', w.stderr.slice(-400)); continue; }
    try {
      const j = JSON.parse(fs.readFileSync(`${outBase}.json`, 'utf8'));
      language = language || j?.result?.language || null;
      const text = (j.transcription || []).map((s) => s.text.trim()).filter(Boolean).join(' ');
      if (text) parts.push(cleanTranscript(text));
    } catch (e) {
      log.warn('não foi possível ler a transcrição:', e.message);
    }
  }
  const text = parts.join('\n\n').trim();
  if (!text) return null;
  return { text, language };
}

/** Drop whisper hallucinations on music-only audio. */
function cleanTranscript(t) {
  const s = t.replace(/\[(music|música|musique|BLANK_AUDIO|applause|laughter)[^\]]*\]/gi, ' ')
    .replace(/[♪♫]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (s.length < 4) return '';
  return s;
}
