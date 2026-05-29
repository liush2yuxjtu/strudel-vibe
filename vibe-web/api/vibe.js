// Vercel serverless function: natural-language intent (中文/English) -> Strudel code.
// Thin adapter over the shared core (lib/vibe-core.mjs); the same core also powers
// server.mjs for the mainland-China (Aliyun/Tencent) deploy.
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
