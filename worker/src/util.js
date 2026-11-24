// Shared helpers: config, logging, subprocess execution with timeouts.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const WORKER_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const ROOT_DIR = path.resolve(WORKER_DIR, '..');

/** Read KEY=VALUE lines from the credentials file (never logged). */
function readCredentials() {
  const file = process.env.RECEITAS_CREDENTIALS || path.join(ROOT_DIR, '.credentials.local');
  const out = {};
  try {
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  } catch (e) {
    throw new Error(`Não foi possível ler o ficheiro de credenciais (${file}): ${e.code || e.message}`);
  }
  return out;
}

const creds = readCredentials();

export const config = {
  supabaseUrl: process.env.SUPABASE_URL || 'https://vhvhwfwkfdfzjoiqqqok.supabase.co',
  supabaseKey: process.env.SUPABASE_KEY || 'sb_publishable_x-_kXcu3XoDtwA6p04UFyQ_hB10FJIP',
  email: process.env.RECEITAS_EMAIL || creds.RECEITAS_EMAIL,
  password: process.env.RECEITAS_PASSWORD || creds.RECEITAS_PASSWORD,
  shareToken: process.env.SHARE_TOKEN || creds.SHARE_TOKEN,
  model: process.env.RECEITAS_MODEL || '',
  claudeBin: process.env.CLAUDE_BIN || 'claude',
  pollMs: Number(process.env.RECEITAS_POLL_MS || 30000),
  tmpDir: path.join(WORKER_DIR, 'tmp'),
  modelsDir: path.join(WORKER_DIR, 'models'),
  maxAttempts: Number(process.env.RECEITAS_MAX_ATTEMPTS || 3),
  timeouts: {
    download: 4 * 60_000,
    transcribe: 8 * 60_000,
    frames: 2 * 60_000,
    extract: 10 * 60_000,
    illustrate: 12 * 60_000,
  },
};

function ts() {
  return new Date().toISOString().replace('T', ' ').replace('Z', '');
}

export const log = {
  info: (...a) => console.log(`[${ts()}]`, ...a),
  warn: (...a) => console.warn(`[${ts()}] WARN`, ...a),
  error: (...a) => console.error(`[${ts()}] ERRO`, ...a),
};

export class StageError extends Error {
  /** @param {string} userMessage short pt-PT message stored in recipes.error */
  constructor(userMessage, detail, { retryable = true } = {}) {
    super(detail ? `${userMessage} (${detail})` : userMessage);
    this.userMessage = userMessage;
    this.retryable = retryable;
  }
}

/**
 * Run a command, capture stdout/stderr, enforce a timeout.
 * Resolves { code, stdout, stderr }; rejects only on spawn failure or timeout.
 */
export function run(cmd, args, { cwd, timeoutMs = 120_000, input, env } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, env: env || process.env, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let killed = false;
    const timer = setTimeout(() => {
      killed = true;
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 5000).unref();
    }, timeoutMs);
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; if (stderr.length > 200_000) stderr = stderr.slice(-100_000); });
    child.on('error', (e) => { clearTimeout(timer); reject(e); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (killed) reject(new Error(`timeout após ${Math.round(timeoutMs / 1000)}s: ${cmd}`));
      else resolve({ code, stdout, stderr });
    });
    if (input != null) child.stdin.end(input);
    else child.stdin.end();
  });
}

/** Map with limited concurrency. */
export async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export async function timed(label, timings, fn) {
  const t0 = Date.now();
  log.info(`▶ ${label}`);
  try {
    return await fn();
  } finally {
    const s = (Date.now() - t0) / 1000;
    timings[label] = Math.round(s * 10) / 10;
    log.info(`■ ${label} (${timings[label]}s)`);
  }
}
