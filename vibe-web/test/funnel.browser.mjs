import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const vendor = await fs.readFile(path.join(root, 'vendor/strudel-web-1.2.6.js'), 'utf8');
const server = http.createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.wav': 'audio/wav' };
    const data = await fs.readFile(file);
    res.writeHead(200, { 'content-type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
let checks = 0;
async function scenario(name, run, options = {}) {
  const context = await browser.newContext({ viewport: options.mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 } });
  await context.addInitScript(({ failure }) => {
    window.__WEBMCP_TELEMETRY__ = false;
    window.__testEvents = [];
    window.__apiCalls = 0;
    window.__failure = failure;
    const enrichers = [];
    window.amplitude = {
      invoked: true,
      add(plugin) { enrichers.push(plugin); return { promise: Promise.resolve() }; },
      init() { this.track('[Amplitude] Page Viewed', {}); return { promise: Promise.resolve() }; },
      track(event_type, event_properties) {
        const event = { event_type, event_properties };
        const promise = (async () => {
          let next = event;
          for (const p of enrichers) { if (p.setup) await p.setup({}, window.amplitude); if (p.execute) next = await p.execute(next); }
          window.__testEvents.push(next);
          return next;
        })();
        return { promise };
      },
    };
  }, { failure: options.failure || '' });
  const errors = [];
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  let apiCalls = 0;
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/vibe') {
      const body = route.request().postDataJSON();
      if (!body.intent) return route.fulfill({ status: 400, json: { error: 'intent required' } });
      apiCalls++;
      if (options.apiDelay) await new Promise(resolve => setTimeout(resolve, options.apiDelay));
      return route.fulfill({ status: options.apiError ? 502 : 200, json: options.apiError ? { error: 'test upstream failure' } : { code: 's("bd*4, hh*8")' } }).catch(() => {});
    }
    if (url.pathname.endsWith('/vendor/strudel-web-1.2.6.js')) {
      const injected = `
        window.__initCalls = 0;
        const realInitStrudel = window.initStrudel;
        window.initStrudel = (...args) => {
          window.__initCalls++;
          if (window.__failure === 'init-once' && window.__initCalls === 1) return Promise.reject(new Error('test init failed'));
          if (window.__failure === 'slow-init') return new Promise(resolve => setTimeout(resolve, 650)).then(() => realInitStrudel(...args));
          return realInitStrudel(...args);
        };
        const realEvaluate = window.evaluate;
        window.evaluate = (...args) => window.__failure === 'evaluate' ? Promise.reject(new Error('test invalid pattern')) : realEvaluate(...args);
        if (window.__failure === 'audio') window.getAudioContext = () => ({state:'suspended', resume:async()=>{throw new Error('test audio blocked')}});
      `;
      return route.fulfill({ contentType: 'text/javascript', body: vendor + injected });
    }
    if (url.origin !== new URL(base).origin || url.pathname.startsWith('/_vercel/')) return route.fulfill({ contentType: 'text/javascript', body: '' });
    return route.continue();
  });
  try {
    await page.goto(base + (options.query || ''));
    await page.waitForFunction(() => !!window.__vibe);
    await run(page, () => apiCalls);
    assert.deepEqual(errors, [], 'no unhandled browser exceptions');
    checks++;
    console.log('PASS ' + name);
  } finally { await context.close(); }
}
const events = page => page.evaluate(() => window.__testEvents);
const phase = page => page.evaluate(() => window.__vibe.phase());
const settle = page => page.waitForFunction(() => !['loading', 'composing'].includes(window.__vibe.phase()), null, { timeout: 15000 });
try {
  await scenario('empty submit shows feedback and focuses intent', async (page, calls) => {
    const before = await page.locator('#state').innerText();
    await page.locator('#send').click();
    assert.notEqual(await page.locator('#state').innerText(), before);
    assert.equal(await page.locator('#intent').evaluate(el => el === document.activeElement), true);
    assert.equal(calls(), 0);
    assert.equal((await events(page)).filter(e => e.event_type === 'vibe_generate_submit').length, 0);
    await page.getByRole('button', {name:'EN',exact:true}).click();
    await page.locator('#send').click();
    assert.match(await page.locator('#state').innerText(), /type|describe|enter/i);
  });
  await scenario('local demo reaches running audio and retains no API dependency', async (page, calls) => {
    await page.locator('#firstDemoGo').click(); await settle(page);
    assert.equal(await phase(page), 'playing');
    assert.equal(await page.evaluate(() => window.__vibe.audioState()), 'running');
    assert.equal(calls(), 0);
    assert.equal(await page.locator('#firstDemo').isVisible(), false);
    assert.match(await page.locator('#state').innerText(), /自己|一句|改|your|type/i);
    assert.equal((await events(page)).filter(e => e.event_type === 'first_demo_play').length, 1);
    await page.locator('#stop').click(); assert.equal(await phase(page), 'idle');
  });
  await scenario('real Strudel parse errors stay failures even when evaluate resolves', async page => {
    await page.locator('#firstDemoGo').click(); await settle(page);
    await page.locator('#stop').click();
    await page.locator('#code').fill('not a valid strudel pattern');
    await page.locator('#apply').click(); await settle(page);
    assert.equal(await phase(page), 'idle');
    assert.match(await page.locator('#state').innerText(), /无法播放|Play failed/i);
  });
  await scenario('failed initialization keeps demo retry and retry starts engine again', async page => {
    await page.locator('#firstDemoGo').click(); await settle(page);
    assert.equal(await phase(page), 'idle');
    assert.equal(await page.locator('#firstDemoGo').isEnabled(), true);
    assert.equal(await page.locator('#firstDemo').isVisible(), true);
    assert.equal((await events(page)).some(e => ['first_demo_play','vibe_play','playback_started'].includes(e.event_type)), false);
    await page.locator('#firstDemoGo').click(); await settle(page);
    assert.equal(await phase(page), 'playing');
    assert.equal(await page.evaluate(() => window.__initCalls), 2);
  }, { failure: 'init-once' });
  await scenario('audio failure does not emit success or consume demo', async page => {
    await page.locator('#firstDemoGo').click(); await settle(page);
    assert.equal(await phase(page), 'idle');
    assert.equal(await page.locator('#firstDemo').isVisible(), true);
    assert.equal((await events(page)).some(e => ['first_demo_play','vibe_play','playback_started'].includes(e.event_type)), false);
  }, { failure: 'audio' });
  await scenario('generation playback error propagates to WebMCP and preserves input', async page => {
    const out = await page.evaluate(() => window.__vibeWebMcp.generateMusic('test drums'));
    assert.ok(out.error); assert.notEqual(out.phase, 'playing');
    assert.equal(await phase(page), 'idle');
    assert.equal(await page.locator('#intent').inputValue(), 'test drums');
    const playOut = await page.evaluate(() => window.__vibeWebMcp.controlPlayback('play', { code: 's("bd")' }));
    assert.ok(playOut.error);
    assert.equal((await events(page)).some(e => e.event_type === 'vibe_play'), false);
  }, { failure: 'evaluate' });
  await scenario('request failure restores controls and preserves prompt', async page => {
    await page.locator('#intent').fill('test drums'); await page.locator('#send').click(); await settle(page);
    assert.equal(await phase(page), 'idle'); assert.equal(await page.locator('#send').isEnabled(), true);
    assert.equal(await page.locator('#intent').inputValue(), 'test drums');
    assert.equal((await events(page)).some(e => e.event_type === 'vibe_play'), false);
  }, { apiError: true });
  await scenario('stop prevents late generation and duplicate submit', async (page, calls) => {
    await page.locator('#intent').fill('test drums'); await page.locator('#send').click();
    await page.locator('#intent').press('Enter');
    await page.locator('#stop').click();
    await page.waitForTimeout(1200);
    assert.equal(await phase(page), 'idle'); assert.equal(calls(), 1);
    assert.equal((await events(page)).some(e => e.event_type === 'vibe_play'), false);
  }, { apiDelay: 700 });
  await scenario('stop prevents late demo initialization from restarting playback', async page => {
    await page.locator('#firstDemoGo').click(); await page.locator('#stop').click();
    await page.waitForTimeout(1200);
    assert.equal(await phase(page), 'idle');
    assert.equal(await page.locator('#firstDemo').isVisible(), true);
    assert.equal((await events(page)).some(e => e.event_type === 'first_demo_play'), false);
  }, { failure: 'slow-init' });
  await scenario('mobile empty submit is reachable', async page => {
    await page.locator('#send').click();
    assert.equal(await page.locator('#intent').evaluate(el => el === document.activeElement), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  }, { mobile: true });
  console.log(`${checks} browser scenarios passed. API responses are mocked; Strudel and samples are real.`);
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
