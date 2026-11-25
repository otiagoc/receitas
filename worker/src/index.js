#!/usr/bin/env node
// Receitas worker: claims queued recipes from Supabase and processes them.
//   node src/index.js                 → long-running worker (realtime + poll every 30s)
//   node src/index.js --once <url>    → create a row for <url> and process it now
//   node src/index.js --id <uuid>     → (re)process an existing row
//   node src/index.js --drain         → process everything queued, then exit (cloud runs)
import { config, log } from './util.js';
import { login, claimNext, subscribe, insertRecipe, getRecipe, updateRecipe } from './db.js';
import { processRecipe } from './pipeline.js';
import { findModel } from './transcribe.js';

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function runOnce(url) {
  await login();
  const row = await insertRecipe(url);
  log.info(`receita criada: ${row.id}`);
  const r = await processRecipe(row);
  console.log(JSON.stringify(r, null, 2));
  process.exit(r.ok ? 0 : 1);
}

async function runId(id) {
  await login();
  const row = await getRecipe(id);
  await updateRecipe(id, { status: 'processing', locked_at: new Date().toISOString(), error: null });
  const r = await processRecipe(row);
  console.log(JSON.stringify(r, null, 2));
  process.exit(r.ok ? 0 : 1);
}

async function runDrain() {
  const deadline = Date.now() + Number(process.env.RECEITAS_DRAIN_MINUTES || 50) * 60_000;
  await login();
  let n = 0, failed = 0;
  while (Date.now() < deadline) {
    const row = await claimNext();
    if (!row) break;
    const r = await processRecipe(row);
    n++; if (!r?.ok) failed++;
  }
  log.info(`drain: ${n} processada(s), ${failed} com erro`);
  process.exit(0);
}

async function runLoop() {
  log.info(`worker a iniciar (modelo Claude: ${config.model || 'padrão do CLI'}, whisper: ${findModel() || 'nenhum'})`);
  await login();
  let draining = false;
  let again = false;
  let stopping = false;

  async function drain(reason) {
    if (stopping) return;
    if (draining) { again = true; return; }
    draining = true;
    try {
      do {
        again = false;
        for (;;) {
          if (stopping) break;
          const row = await claimNext();
          if (!row) break;
          log.info(`trabalho obtido (${reason})`);
          await processRecipe(row);
        }
      } while (again && !stopping);
    } catch (e) {
      log.error('ciclo:', e.message);
    } finally {
      draining = false;
    }
  }

  subscribe((reason) => drain(reason));
  setInterval(() => drain('poll'), config.pollMs);
  await drain('arranque');

  const stop = (sig) => {
    log.info(`${sig} recebido — a terminar${draining ? ' (trabalho em curso será retomado após 20 min)' : ''}`);
    stopping = true;
    setTimeout(() => process.exit(0), draining ? 2000 : 0);
  };
  process.on('SIGTERM', () => stop('SIGTERM'));
  process.on('SIGINT', () => stop('SIGINT'));
}

process.on('unhandledRejection', (e) => log.error('unhandledRejection:', e?.message || e));

const once = arg('--once');
const id = arg('--id');
if (process.argv.includes('--once') && !once) {
  console.error('uso: node src/index.js --once <url-instagram>');
  process.exit(2);
}
if (once) runOnce(once).catch((e) => { log.error(e.message); process.exit(1); });
else if (process.argv.includes('--drain')) runDrain().catch((e) => { log.error(e.message); process.exit(1); });
else if (id) runId(id).catch((e) => { log.error(e.message); process.exit(1); });
else runLoop().catch((e) => { log.error(e.message); process.exit(1); });
