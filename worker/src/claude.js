// Calls to the local Claude Code CLI (`claude -p`) using the user's subscription.
import { run, log, config, StageError } from './util.js';
import { parseJsonReply, CATEGORIES, DIFFICULTIES, AISLES } from './schema.js';

/**
 * Run `claude -p` isolated from user hooks/plugins/MCP/CLAUDE.md.
 * tools: '' for none, 'Read' to let it look at frames inside cwd.
 */
export async function claudeCall(prompt, { cwd, tools = '', timeoutMs, label = 'claude' }) {
  const args = [
    '-p',
    '--output-format', 'json',
    '--safe-mode',
    '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}',
    '--setting-sources', '',
    '--disable-slash-commands',
    '--no-session-persistence',
    '--permission-mode', 'dontAsk',
    '--tools', tools,
  ];
  if (tools) args.push('--allowedTools', tools);
  if (config.model) args.push('--model', config.model);
  const env = { ...process.env };
  delete env.CLAUDECODE; // allow nesting when started from a Claude Code session
  delete env.CLAUDE_CODE_ENTRYPOINT;
  const t0 = Date.now();
  let r;
  try {
    r = await run(config.claudeBin, args, { cwd, timeoutMs, input: prompt, env });
  } catch (e) {
    throw new StageError('A análise com o Claude demorou demasiado.', e.message);
  }
  let out;
  try { out = JSON.parse(r.stdout); } catch {
    const msg = (r.stderr || r.stdout || '').trim().slice(-400);
    if (/login|auth|credential|keychain|401/i.test(msg)) {
      throw new StageError('O Claude Code não tem sessão iniciada neste Mac (corre `claude` e faz login).', msg, { retryable: false });
    }
    throw new StageError('Falha ao chamar o Claude.', `code=${r.code} ${msg}`);
  }
  if (out.is_error) {
    const msg = String(out.result || out.subtype || 'erro').slice(0, 300);
    if (/usage limit|rate limit|limit reached/i.test(msg)) throw new StageError('Limite de utilização do Claude atingido; tenta mais tarde.', msg);
    throw new StageError('O Claude devolveu um erro.', msg);
  }
  log.info(`${label}: ${((Date.now() - t0) / 1000).toFixed(1)}s, turns=${out.num_turns}, out_tokens=${out.usage?.output_tokens ?? '?'}`);
  return String(out.result || '');
}

export function buildExtractionPrompt({ url, caption, author, transcript, language, frames }) {
  return `És um chef e editor de receitas português. Vais transformar uma publicação do Instagram numa receita estruturada, escrita em português europeu (pt-PT, ex.: "frigideira", "natas", "pequeno-almoço", "fiambre", "chávena"; nunca português do Brasil).

FONTES (podem estar noutra língua — traduz tudo para pt-PT):
- URL: ${url}
- Autor: ${author || 'desconhecido'}
- Legenda da publicação:
"""
${(caption || '(sem legenda)').slice(0, 6000)}
"""
- Transcrição do áudio${language ? ` (língua detetada: ${language})` : ''}:
"""
${(transcript || '(sem fala / sem áudio)').slice(0, 12000)}
"""
- Imagens do vídeo/publicação, por ordem cronológica, nesta pasta (o nome inclui o segundo do vídeo):
${frames.map((f) => `  - ${f}`).join('\n') || '  (nenhuma)'}

TAREFA:
1. Usa a ferramenta Read para ver TODAS as imagens listadas (texto sobreposto no ecrã costuma ter quantidades e passos importantes).
2. Cruza legenda + transcrição + imagens para reconstruir a receita completa.
3. Se faltarem quantidades, estima valores razoáveis para o número de doses, e marca-os com note "quantidade estimada" (nunca apresentes uma estimativa como certa). Se uma quantidade for mesmo "a gosto", usa unit "q.b." e quantity null.
4. Se o conteúdo NÃO for uma receita de comida/bebida, responde apenas {"is_recipe": false}.

RESPONDE APENAS com um objeto JSON (sem texto antes/depois, sem \`\`\`), com esta forma exata:
{
  "is_recipe": true,
  "title": "nome curto e apetitoso em pt-PT",
  "description": "1–2 frases apetitosas a descrever o prato",
  "cuisine": "ex.: italiana, portuguesa, mexicana",
  "category": uma de ${JSON.stringify(CATEGORIES)},
  "tags": ["tags curtas em minúsculas pt-PT, ex.: vegetariano, rápido, air fryer, sem glúten, forno, uma panela"],
  "servings": número inteiro,
  "prep_min": inteiro, "cook_min": inteiro, "total_min": inteiro,
  "difficulty": uma de ${JSON.stringify(DIFFICULTIES)},
  "ingredients": [
    {"name": "nome normalizado, singular, minúsculas, pt-PT, sem quantidades (ex.: cebola, dente de alho → alho, peito de frango, queijo parmesão)",
     "quantity": número ou null, "unit": "un|g|kg|ml|l|c. sopa|c. chá|chávena|dente|q.b.|pitada|fatia|lata|embalagem|ramo|folha",
     "note": "ex.: picada, ralado, à temperatura ambiente, quantidade estimada" ou null,
     "group": "subgrupo quando a receita tem partes (ex.: Molho, Massa, Cobertura)" ou null,
     "aisle": uma de ${JSON.stringify(AISLES)},
     "optional": false}
  ],
  "steps": [
    {"n": 1, "title": "título curto com verbo (ex.: Refogar a cebola)", "text": "instrução completa e clara, com temperaturas, tempos e pontos de referência",
     "duration_min": inteiro ou null, "timer_sec": segundos SÓ quando há uma espera/cozedura real (forno, cozer, repousar), senão null,
     "ingredients": ["nomes de ingredientes usados neste passo, iguais aos de ingredients[].name"]}
  ],
  "tips": ["dicas úteis do autor ou tuas (conservação, substituições, variações)"]
}
Regras: números como números (não strings); passos curtos e acionáveis (normalmente 4–10); temperaturas em °C; medidas métricas (converte cups/oz/°F).`;
}

/** Call #1: structured recipe extraction (returns raw parsed JSON). */
export async function extractRecipe(input, cwd) {
  const prompt = buildExtractionPrompt(input);
  let lastErr;
  for (let i = 0; i < 2; i++) {
    const text = await claudeCall(prompt + (i ? '\n\nATENÇÃO: a resposta anterior não era JSON válido. Responde SÓ com o objeto JSON.' : ''),
      { cwd, tools: 'Read', timeoutMs: config.timeouts.extract, label: 'extração' });
    try { return parseJsonReply(text); } catch (e) { lastErr = e; log.warn('JSON inválido na extração:', e.message); }
  }
  throw new StageError('Não foi possível interpretar a receita.', lastErr?.message);
}
