// Calls MiniMax's Anthropic-compatible endpoint to translate intent -> Strudel code.
import { SYSTEM_PROMPT, buildUserMessage } from './prompt.mjs';

const BASE = process.env.MINIMAX_BASE_URL || 'https://api.minimaxi.com/anthropic';
const MODEL = process.env.MINIMAX_MODEL || 'MiniMax-M2.7-highspeed';

export function getKey() {
  const k = process.env.MINIMAX_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!k) throw new Error('MINIMAX_API_KEY not set');
  return k;
}

// Strip markdown fences / stray prose, keep the code.
export function cleanCode(text) {
  let t = (text || '').trim();
  const fence = t.match(/```(?:js|javascript)?\s*([\s\S]*?)```/);
  if (fence) t = fence[1].trim();
  // drop leading "code:" label if the model echoes the example format
  t = t.replace(/^code:\s*/i, '').trim();
  // if multiple lines, keep lines that look like code (drop empty/prose-only)
  return t;
}

export async function translate(intent, currentCode = '', { key = getKey(), signal } = {}) {
  const res = await fetch(`${BASE}/v1/messages`, {
    method: 'POST',
    signal,
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserMessage(intent, currentCode) }],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`MiniMax ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  // Anthropic content is an array of blocks; keep text blocks, skip thinking.
  const text = (data.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
  return cleanCode(text);
}

// Translate, then compile-check. On failure, ask the model once to fix it given
// the error. Returns { code, ok, error }. `compileFn` is injected so this module
// stays free of the engine (the web app validates client-side instead).
export async function translateValid(intent, currentCode, compileFn, opts = {}) {
  let code = await translate(intent, currentCode, opts);
  try {
    await compileFn(code);
    return { code, ok: true };
  } catch (e1) {
    const repairIntent = `${intent}\n\n(The previous code "${code}" failed to compile with error: ${e1.message}. Return a corrected single Strudel expression.)`;
    try {
      const fixed = await translate(repairIntent, currentCode, opts);
      await compileFn(fixed);
      return { code: fixed, ok: true, repaired: true };
    } catch (e2) {
      return { code, ok: false, error: e2.message };
    }
  }
}
