// Crazy-creative demo recorder for vibe-web (NL -> Strudel live music)
// Usage: node demo/record-demo.mjs
//
// Produces, under demo/out/:
//   - a continuous webm screen recording (Playwright video; no audio)
//   - keyframe screenshots (artifacts)
//   - timeline.json  : ms offsets of each "beat" from recording start,
//                       so the Remotion layer can sync captions/overlays.
//
// A glowing fake cursor + click ripples are injected because Playwright's
// headless video has no real pointer — this makes the "agent" feel alive.

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, 'out');
const SHOTS_DIR = join(OUT_DIR, 'shots');
mkdirSync(SHOTS_DIR, { recursive: true });

const URL = 'https://vibe-web-gray.vercel.app/';
const W = 1280, H = 720;

// The wild, escalating "crazy creative user" persona.
const PROMPTS = [
  'a thunderstorm made of 808 drums and a robot choir chanting in binary',
  'cyberpunk taiko drums drag-racing a glitchy acid bassline at 160bpm',
  'lofi rain where every raindrop is a tiny dubstep wobble',
  'a disco ball shattering into free jazz, then techno picks up the pieces',
];
// Guaranteed-lively finale typed straight into the editor (no API dependency).
const FINALE_CODE =
  'stack(\n  s("bd*4, ~ cp").bank("RolandTR909"),\n  s("hh*16").gain(saw.range(.2,.9)),\n  note("c2 eb2 g2 bb2").s("sawtooth").lpf(sine.range(300,2200).slow(4)).room(.5)\n).fast(1.5)';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- timeline bookkeeping --------------------------------------------------
let T0 = 0;
const beats = [];
const now = () => Date.now() - T0;
function beat(kind, text) {
  const at = now();
  beats.push({ at, kind, text });
  console.log(`  [${(at / 1000).toFixed(1)}s] ${kind}: ${text ?? ''}`);
}

// ---- fake cursor + ripple injection ---------------------------------------
const CURSOR_INIT = `
(() => {
  const dot = document.createElement('div');
  dot.id = '__agent_cursor';
  Object.assign(dot.style, {
    position:'fixed', left:'0', top:'0', width:'22px', height:'22px',
    marginLeft:'-11px', marginTop:'-11px', borderRadius:'50%',
    background:'radial-gradient(circle at 35% 35%, #fff, #7af0c0 45%, rgba(176,122,255,.0) 72%)',
    boxShadow:'0 0 18px 6px rgba(122,240,192,.55), 0 0 40px 12px rgba(176,122,255,.35)',
    pointerEvents:'none', zIndex:'2147483647', transition:'transform .06s linear',
    transform:'translate(-50px,-50px)'
  });
  const add = () => { if (document.body && !document.getElementById('__agent_cursor')) document.body.appendChild(dot); };
  if (document.body) add(); else document.addEventListener('DOMContentLoaded', add);
  window.addEventListener('mousemove', (e) => { dot.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)'; }, true);
  window.addEventListener('mousedown', (e) => {
    const r = document.createElement('div');
    Object.assign(r.style, {
      position:'fixed', left:e.clientX+'px', top:e.clientY+'px', width:'10px', height:'10px',
      marginLeft:'-5px', marginTop:'-5px', borderRadius:'50%', border:'2px solid #ff5d9e',
      pointerEvents:'none', zIndex:'2147483646', opacity:'0.9'
    });
    document.body.appendChild(r);
    const t0 = performance.now();
    (function grow(){
      const k = (performance.now()-t0)/520;
      if (k>=1){ r.remove(); return; }
      const s = 1 + k*7; r.style.transform = 'scale('+s+')'; r.style.opacity = String(0.9*(1-k));
      requestAnimationFrame(grow);
    })();
  }, true);
})();
`;

// Smoothly glide the (virtual) mouse to an element's center.
async function glideTo(page, locator, steps = 26) {
  const box = await locator.boundingBox().catch(() => null);
  if (!box) return;
  const x = box.x + box.width / 2 + (Math.random() * 12 - 6);
  const y = box.y + box.height / 2 + (Math.random() * 8 - 4);
  await page.mouse.move(x, y, { steps }).catch(() => {});
  await sleep(180);
}

async function humanType(page, locator, text) {
  await locator.click().catch(() => {});
  for (const ch of text) {
    await page.keyboard.type(ch, { delay: 26 + Math.random() * 60 });
  }
}

async function clearInput(page) {
  await page.keyboard.press('Meta+A').catch(() => {});
  await page.keyboard.press('Control+A').catch(() => {});
  await page.keyboard.press('Backspace').catch(() => {});
}

async function shot(page, name) {
  await page.screenshot({ path: join(SHOTS_DIR, name) }).catch(() => {});
}

// Wait until the code editor has non-trivial content (MiniMax answered).
async function waitForCode(page, timeout = 18000) {
  try {
    await page.waitForFunction(
      () => (document.getElementById('code')?.value || '').trim().length > 8,
      { timeout },
    );
    return true;
  } catch { return false; }
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--autoplay-policy=no-user-gesture-required',
      '--use-fake-ui-for-media-stream',
      '--mute-audio',
    ],
  });
  const context = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
    recordVideo: { dir: OUT_DIR, size: { width: W, height: H } },
  });
  await context.addInitScript(CURSOR_INIT);
  const page = await context.newPage();

  T0 = Date.now();
  beat('boot', 'navigating');
  await page.goto(URL, { waitUntil: 'networkidle' }).catch(() => {});
  await sleep(1800);
  await shot(page, '00-loaded.png');

  const input = page.locator('#intent');
  const sendBtn = page.locator('#send');
  const codeArea = page.locator('#code');

  // Warm intro: cursor wanders in, hovers the title, then the input.
  await page.mouse.move(W * 0.5, H * 0.4, { steps: 20 });
  await sleep(500);
  await glideTo(page, input);
  await sleep(400);

  let idx = 0;
  for (const prompt of PROMPTS) {
    idx++;
    await glideTo(page, input);
    await clearInput(page);
    beat('prompt', prompt);
    await humanType(page, input, prompt);
    await sleep(300);
    await shot(page, `0${idx}-typed.png`);

    await glideTo(page, sendBtn, 18);
    await page.mouse.down(); await sleep(60); await page.mouse.up();
    beat('compose', 'MiniMax composing…');

    const ok = await waitForCode(page);
    if (ok) {
      beat('play', 'pattern playing');
      await shot(page, `0${idx}-playing.png`);
    } else {
      // Fallback: inject a lively pattern so the visualizer still erupts.
      beat('fallback', 'injecting local pattern');
      await codeArea.click().catch(() => {});
      await clearInput(page);
      await page.keyboard.insertText(FINALE_CODE).catch(() => {});
      await page.locator('#play').click().catch(() => {});
    }

    // Let it ride — cursor drifts over the visualizer like it's vibing.
    for (let i = 0; i < 4; i++) {
      await page.mouse.move(
        W * (0.55 + Math.random() * 0.4),
        H * (0.2 + Math.random() * 0.4),
        { steps: 16 },
      ).catch(() => {});
      await sleep(950);
    }
  }

  // Beat: click an example chip (shows the curated presets).
  const chip = page.locator('.chip').nth(4);
  if (await chip.count()) {
    await glideTo(page, chip, 22);
    beat('chip', await chip.innerText().catch(() => 'preset'));
    await page.mouse.down(); await sleep(60); await page.mouse.up();
    await waitForCode(page, 16000);
    await sleep(3500);
  }

  // Finale: the user hand-edits the code editor, then hits play.
  await glideTo(page, codeArea, 22);
  await codeArea.click().catch(() => {});
  await page.keyboard.press('Meta+A').catch(() => {});
  await page.keyboard.press('Control+A').catch(() => {});
  await page.keyboard.press('Backspace').catch(() => {});
  beat('handcode', 'user rewrites the pattern by hand');
  await page.keyboard.insertText(FINALE_CODE).catch(() => {});
  await sleep(400);
  await shot(page, '90-handcode.png');
  const applyBtn = page.locator('#apply');
  await glideTo(page, applyBtn, 18);
  await page.mouse.down(); await sleep(60); await page.mouse.up();
  beat('finale', 'hand-built banger drops');
  await shot(page, '91-finale.png');

  // Let the last track ride out.
  for (let i = 0; i < 6; i++) {
    await page.mouse.move(
      W * (0.5 + Math.random() * 0.45),
      H * (0.15 + Math.random() * 0.5),
      { steps: 14 },
    ).catch(() => {});
    await sleep(800);
  }
  beat('end', 'done');

  await context.close(); // flushes the video file
  await browser.close();

  writeFileSync(join(OUT_DIR, 'timeline.json'), JSON.stringify({ url: URL, w: W, h: H, beats }, null, 2));
  console.log('-> done. artifacts under', OUT_DIR);
}

main().catch((e) => { console.error(e); process.exit(1); });
