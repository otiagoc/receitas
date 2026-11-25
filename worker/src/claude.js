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

/** European Portuguese style rules shared by every prompt that writes user-facing text. */
export const PT_PT_RULES = `PORTUGUÊS EUROPEU (pt-PT) — OBRIGATÓRIO, nunca português do Brasil:
- Trata o leitor por "tu", de forma consistente, no imperativo de pt-PT: "pré-aquece o forno", "forra o tabuleiro", "pincela", "junta", "mexe", "deixa repousar", "serve". NUNCA uses as formas "você"/brasileiras ("Pré-aqueça", "Forre", "Pulverize", "Adicione", "Coloque", "Sirva").
- Títulos dos passos no infinitivo: "Refogar a cebola", "Cozer a massa".
- Vocabulário pt-PT (à esquerda o que NÃO usar → à direita o correto): macarrão/espaguete → massa (ou o formato: esparguete, cotovelinhos, penne, fusilli); creme de leite → natas; geladeira → frigorífico; presunto (cozido) → fiambre; café da manhã → pequeno-almoço; assadeira/forma → tabuleiro/forma; frigideira ok; colher (sopa) → colher de sopa; xícara → chávena; açúcar de confeiteiro → açúcar em pó; fermento em pó → fermento; liquidificador → liquidificadora; batedeira ok; requeijão/cream cheese → queijo creme; abobrinha → curgete; cebolinha → cebolinho; maionese ok; suco → sumo; ralado ok; abacaxi → ananás; tomate-cereja ok; peito de frango ok; carne moída → carne picada; bacon → bacon; mussarela → mozarela; panela → tacho/panela; fogo → lume ("lume médio"); escorrer ok; spray de óleo → óleo em spray.
- Ortografia pt-PT pós-acordo: "ação", "detetar", "receção", "facto", "contacto", "ótimo".
- Unidades sempre no singular (a app trata do plural): "c. sopa", "dente", "chávena", "fatia", nunca "dentes"/"chávenas".
- Antes de responder, relê todo o texto e corrige qualquer forma brasileira.`;

export function buildExtractionPrompt({ url, caption, author, transcript, language, frames }) {
  return `És um chef e editor de receitas português. Vais transformar uma publicação do Instagram numa receita estruturada, escrita em português europeu (pt-PT, ex.: "frigideira", "natas", "pequeno-almoço", "fiambre", "chávena"; nunca português do Brasil).

REGRAS DE LÍNGUA (obrigatórias — o leitor é de Portugal):
- Vocabulário de Portugal: massa (não "macarrão"), natas (não "creme de leite"), fiambre (não "presunto cozido"), frigorífico (não "geladeira"), tabuleiro (não "assadeira"/"forma"), frigideira (não "frigideira antiaderente" se desnecessário), açúcar em pó (não "açúcar de confeiteiro"), pequeno-almoço (não "café da manhã"), ananás (não "abacaxi"), sumo (não "suco"), polpa de tomate (não "extrato"), lume (não "fogo"), picar/triturar (não "bater no liquidificador" → "triturar com a varinha" ou "no liquidificador").
- Verbos no imperativo, tratamento por "tu" (forma de Portugal): "Pré-aquece o forno", "Forra o tabuleiro", "Pincela com azeite", "Junta", "Mexe", "Deixa cozinhar". Nunca "Pré-aqueça", "Forre", "Pulverize", "Coloque", "Adicione".
- Ortografia e construções de Portugal: "a cozinhar" (não "cozinhando"), "deixa repousar", "facto", "receção".

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
  "title": "nome curto e apetitoso em pt-PT (ex.: \\"Massa de frango à toscana gratinada\\")",
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
  "tips": ["dicas úteis do autor ou tuas, a tratar o leitor por tu (conservação, substituições, variações)"],
  "cover_frame": "caminho EXATO de uma das imagens listadas (ex.: frames/frame_07_24.5s.jpg) que sirva de capa: o prato final pronto, apetitoso, bem enquadrado, SEM texto/legendas/autocolantes sobrepostos e sem caras em grande plano; se nenhuma servir, null"
}
Regras: números como números (não strings); passos curtos e acionáveis (normalmente 4–10); temperaturas em °C; medidas métricas (converte cups/oz/°F).

${PT_PT_RULES}`;
}

/** Call #1: structured recipe extraction (returns raw parsed JSON). */
export async function extractRecipe(input, cwd) {
  const prompt = buildExtractionPrompt(input);
  let lastErr;
  for (let i = 0; i < 2; i++) {
    const text = await claudeCall(prompt + (i ? '\n\nATENÇÃO: a resposta anterior não era JSON válido. Responde SÓ com o objeto JSON.' : ''),
      { cwd, tools: 'Read', timeoutMs: config.timeouts.extract, label: 'extração' });
    let json;
    try { json = parseJsonReply(text); } catch (e) { lastErr = e; log.warn('JSON inválido na extração:', e.message); continue; }
    return fixPtBr(json, cwd);
  }
  throw new StageError('Não foi possível interpretar a receita.', lastErr?.message);
}

// Brazilian Portuguese markers (formal "você" imperatives and BR-only vocabulary).
const PT_BR = /(?<!\p{L})(macarrão|pré-aqueça|forre|pulverize|adicione|coloque|acrescente|despeje|misture|sirva|leve ao|deixe|retire|tempere|cozinhe|polvilhe|regue|creme de leite|geladeira|xícaras?|café da manhã|abobrinha|mussarela|carne moída|suco|requeijão|liquidificador|cebolinha|você)(?!\p{L})/giu;

export function findPtBr(obj) {
  const hits = new Set((JSON.stringify(obj).match(PT_BR) || []).map((h) => h.toLowerCase()));
  return [...hits];
}

/** If Brazilian forms slipped through, ask Claude once to rewrite the JSON in pt-PT (keeps structure). */
async function fixPtBr(json, cwd) {
  if (json?.is_recipe === false) return json;
  const hits = findPtBr(json);
  if (!hits.length) return json;
  log.warn(`formas pt-BR detetadas (${hits.join(', ')}) — a corrigir para pt-PT`);
  const prompt = `Reescreve TODO o texto deste JSON em português europeu (pt-PT), sem alterar a estrutura, números, categorias, corredores (aisle) nem dificuldade.
Formas a corrigir encontradas: ${hits.join(', ')}.

${PT_PT_RULES}

Mantém os nomes dos ingredientes em steps[].ingredients iguais a ingredients[].name (corrige ambos da mesma forma).
Responde APENAS com o JSON corrigido.

${JSON.stringify(json)}`;
  try {
    const fixed = parseJsonReply(await claudeCall(prompt, { cwd, tools: '', timeoutMs: config.timeouts.extract, label: 'correção pt-PT' }));
    const left = findPtBr(fixed);
    if (left.length) log.warn(`ainda com formas pt-BR: ${left.join(', ')}`);
    return fixed;
  } catch (e) {
    log.warn('correção pt-PT falhou, a manter original:', e.message);
    return json;
  }
}
