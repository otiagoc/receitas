// Frame sampling from videos + normalization of photo-post images.
import fs from 'node:fs';
import path from 'node:path';
import { run, log, config } from './util.js';
import { probeDuration } from './transcribe.js';

const MAX_FRAMES = Number(process.env.RECEITAS_MAX_FRAMES || 16);
const WIDTH = 768;

/**
 * Returns an array of frame filenames (relative to dir, inside dir/frames).
 * Videos: ~1 frame per 3.5 s spread evenly (max 16 total).
 * Photos (carousel slides, incl. mixed carousels): each image resized to 768px wide.
 */
export async function extractFrames({ videos, photos = [] }, dir) {
  const outDir = path.join(dir, 'frames');
  fs.mkdirSync(outDir, { recursive: true });
  const frames = [];

  if (videos.length) {
    const durations = await Promise.all(videos.map(probeDuration));
    const total = durations.reduce((a, b) => a + b, 0) || 1;
    const budget = Math.min(MAX_FRAMES, Math.max(4, Math.round(total / 3.5)));
    for (const [vi, video] of videos.entries()) {
      const dur = durations[vi] || 1;
      const n = Math.max(1, Math.round((budget * dur) / total));
      for (let k = 0; k < n; k++) {
        const t = ((k + 0.5) * dur) / n;
        const name = `frame_${String(frames.length + 1).padStart(2, '0')}_${t.toFixed(1)}s.jpg`;
        const r = await run('ffmpeg', ['-y', '-v', 'error', '-ss', t.toFixed(2), '-i', video, '-frames:v', '1',
          '-vf', `scale=${WIDTH}:-2`, '-q:v', '4', path.join(outDir, name)], { timeoutMs: config.timeouts.frames });
        if (r.code === 0 && fs.existsSync(path.join(outDir, name))) frames.push(`frames/${name}`);
      }
    }
  }
  // Photo / carousel slides: the images are the content (also in mixed carousels).
  {
    for (const img of photos.slice(0, Math.max(0, MAX_FRAMES + 4 - frames.length))) {
      const name = `photo_${String(frames.length + 1).padStart(2, '0')}.jpg`;
      const r = await run('ffmpeg', ['-y', '-v', 'error', '-i', img, '-vf', `scale='min(${WIDTH},iw)':-2`, '-q:v', '4', path.join(outDir, name)], { timeoutMs: config.timeouts.frames });
      if (r.code === 0) frames.push(`frames/${name}`);
    }
  }
  log.info(`frames: ${frames.length}`);
  return frames;
}

/** Cover from the frame Claude picked: re-grab it at full resolution from the video (or the photo itself). */
export async function coverFromFrame(frameRel, { videos, photos = [] }, dir) {
  if (typeof frameRel !== 'string' || !/^frames\/(frame|photo)_[\w.-]+\.jpg$/.test(frameRel)) return null;
  const abs = path.join(dir, frameRel);
  if (!fs.existsSync(abs)) return null;
  const out = path.join(dir, 'cover_pick.jpg');
  const m = frameRel.match(/frame_\d+_([\d.]+)s\.jpg$/);
  let args;
  if (m && videos.length === 1) {
    args = ['-y', '-v', 'error', '-ss', m[1], '-i', videos[0], '-frames:v', '1', '-vf', "scale='min(1080,iw)':-2", '-q:v', '3', out];
  } else {
    args = ['-y', '-v', 'error', '-i', abs, '-q:v', '3', out];
  }
  const r = await run('ffmpeg', args, { timeoutMs: config.timeouts.frames });
  return r.code === 0 && fs.existsSync(out) ? out : null;
}

/** Produce a cover JPEG (max 1080 wide) from the thumbnail or a mid-video frame. */
export async function makeCover({ cover, videos }, dir) {
  const out = path.join(dir, 'cover.jpg');
  let src = cover;
  let args;
  if (src) {
    args = ['-y', '-v', 'error', '-i', src, '-vf', "scale='min(1080,iw)':-2", '-q:v', '3', out];
  } else if (videos[0]) {
    const d = await probeDuration(videos[0]);
    args = ['-y', '-v', 'error', '-ss', String(Math.max(0, d * 0.8)), '-i', videos[0], '-frames:v', '1', '-vf', "scale='min(1080,iw)':-2", '-q:v', '3', out];
  } else return null;
  const r = await run('ffmpeg', args, { timeoutMs: config.timeouts.frames });
  return r.code === 0 && fs.existsSync(out) ? out : null;
}
