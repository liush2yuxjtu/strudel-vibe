// Standalone vibe-music server — one Node process serves the static app AND the
// /api/vibe endpoint. This is the mainland-China deploy target: run it on an
// Aliyun/Tencent 轻量应用服务器 or ECS behind an ICP-filed domain (see DEPLOY-CN.md).
//
// No dependencies — plain node:http. Start with:  MINIMAX_API_KEY=sk-... node server.mjs
// Configurable via env: PORT (default 8080), MINIMAX_BASE_URL, MINIMAX_MODEL.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateStrudel } from './lib/vibe-core.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.WAV': 'audio/wav',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => resolve(data));
    req.on('error', () => resolve(data));
  });
}

function sendJson(res, status, obj) {
  const s = JSON.stringify(obj);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(s);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  // API: NL -> Strudel (same logic as the Vercel function)
  if (url.pathname === '/api/vibe') {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'POST only' });
    let body = {};
    try { body = JSON.parse(await readBody(req) || '{}'); } catch { body = {}; }
    const { status, body: out } = await generateStrudel(
      { intent: body.intent || '', current: body.current || '' },
      process.env,
    );
    return sendJson(res, status, out);
  }

  // Static files (index.html, vendor/, samples/, …) — confined to ROOT.
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';
  const filePath = path.normalize(path.join(ROOT, pathname));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end('forbidden'); }
  // Never serve server-side source to the browser.
  if (/^\/(server\.mjs|lib\/|api\/|package\.json|vercel\.json)/.test(pathname)) {
    res.writeHead(404); return res.end('not found');
  }
  fs.stat(filePath, (err, stat) => {
    if (err || stat.isDirectory()) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'content-type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`vibe-music server on :${PORT}  (MINIMAX_API_KEY ${process.env.MINIMAX_API_KEY ? 'set' : 'MISSING'})`);
});
