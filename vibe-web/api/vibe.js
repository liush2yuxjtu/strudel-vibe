// Vercel serverless function: natural-language intent (中文/English) -> Strudel code.
// Thin adapter over lib/vibe-core.mjs (DeepSeek Chat Completions). The same core
// powers server.mjs for the mainland-China (Aliyun/Tencent) deploy.
// Env (server-side only): DEEPSEEK_API_KEY required; optional DEEPSEEK_BASE_URL, DEEPSEEK_MODEL.
import { generateStrudel } from '../lib/vibe-core.mjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const intent = (body && body.intent) || '';
  const current = (body && body.current) || '';

  const { status, body: out } = await generateStrudel({ intent, current }, process.env);
  res.status(status).json(out);
}
