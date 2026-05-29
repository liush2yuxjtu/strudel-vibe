// Vercel serverless function: natural-language intent (中文/English) -> Strudel code.
// Calls MiniMax's Anthropic-compatible endpoint. The system prompt mirrors the
// shared core in strudel-cli/src/prompt.mjs so the web and terminal behave the same.
const SYSTEM_PROMPT = `You are VIBE, a live-coding music engine that speaks Strudel.
Strudel is JavaScript (NOT TidalCycles). Convert the user's musical intent — given
in Chinese or English — into ONE valid Strudel pattern expression.

OUTPUT RULES (strict):
- Output ONLY the code. One JavaScript expression. No markdown fences, no comments, no prose.
- NEVER use TidalCycles syntax like \`d1 $ sound "bd"\`. Use Strudel JS: \`s("bd*4")\`.
- Prefer a single expression; use stack(a, b, c) to layer multiple parts.
- Keep it musical and concise. Always playable as-is.

STRUDEL CHEAT SHEET:
- Drums/samples: s("bd sd hh oh cp rim lt mt ht"). Mini-notation inside the string:
    bd*4 (repeat), ~ (rest), [bd sd] (subgroup in one step), <a b> (alternate each cycle),
    "bd*4, hh*8" (comma = layer inside one s), bd(3,8) (euclid).
- Melody: note("c3 e3 g3 b3") or note("0 2 4 7".scale("C:minor")). n("0 2 4") for sample index.
- Synth voices via .s(): "sine" "sawtooth" "square" "triangle".
- Chain modifiers: .gain(0.8) .lpf(800) .cutoff(1200) .room(0.3) .delay(0.4) .speed(2)
    .pan(0.5) .slow(2) .fast(2) .rev() .jux(rev) .crush(4) .vowel("a e i").
- Tempo: prepend setcps(0.5) only if the user asks for a tempo/speed change.

EXAMPLES:
intent: 四拍底鼓加八分音符的hihat
code: s("bd*4, hh*8")
intent: add a minor bassline
code: note("c2 eb2 g2 bb2").s("sawtooth").gain(0.7)
intent: make a dreamy chord pad
code: note("<c3 eb3 g3>").s("triangle").room(0.6).gain(0.5).slow(2)
intent: techno groove with stabs
code: stack(s("bd*4, ~ cp, hh*8"), note("c2*8").s("square").lpf(600).gain(0.5))

If the user wants to MODIFY a CURRENT pattern (provided below), return the FULL new
pattern with the change applied, still as one expression.`;

function cleanCode(text) {
  let t = (text || '').trim();
  const fence = t.match(/```(?:js|javascript)?\s*([\s\S]*?)```/);
  if (fence) t = fence[1].trim();
  return t.replace(/^code:\s*/i, '').trim();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }
  const key = process.env.MINIMAX_API_KEY;
  if (!key) { res.status(500).json({ error: 'MINIMAX_API_KEY not configured' }); return; }
  const base = process.env.MINIMAX_BASE_URL || 'https://api.minimaxi.com/anthropic';
  const model = process.env.MINIMAX_MODEL || 'MiniMax-M2.7-highspeed';

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const intent = (body && body.intent) || '';
  const current = (body && body.current) || '';
  if (!intent.trim()) { res.status(400).json({ error: 'intent required' }); return; }

  const userMsg = current && current.trim() && current.trim() !== 'silence'
    ? `CURRENT PATTERN:\n${current.trim()}\n\nINTENT: ${intent}`
    : `INTENT: ${intent}`;

  try {
    const r = await fetch(`${base}/v1/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMsg }],
      }),
    });
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      res.status(502).json({ error: `MiniMax ${r.status}`, detail: t.slice(0, 300) });
      return;
    }
    const data = await r.json();
    const text = (data.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n');
    const code = cleanCode(text);
    res.status(200).json({ code });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message || e) });
  }
}
