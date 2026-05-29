// Demo recorder that captures the REAL WebAudio output of vibe-web.
//
// Playwright's page video has no audio, and headless Chromium has no speakers —
// but WebAudio still *runs*. So we tap the page's AudioContext: every node that
// connects to ctx.destination is also teed into a MediaStreamAudioDestinationNode,
// which a MediaRecorder captures. That is the exact Strudel sound the browser
// makes. We then mux that audio onto the Playwright video, time-aligned.
//
// CN / RedNote variant: a CALM, natural Chinese user building one chill lo-fi
// track step by step (no unhinged-agent behavior). Same real-WebAudio capture.
//
// Output (demo/out/):
//   - Playwright video webm  (picture, no audio)
//   - cn-demo-audio.webm     (captured real WebAudio, opus)
//   - vibe-demo-cn.mp4       (muxed: real picture + real Strudel sound)
//   - timeline-cn.json       (beat offsets + measured audio/video sync offset)

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, 'out');
const SHOTS_DIR = join(OUT_DIR, 'shots');
mkdirSync(SHOTS_DIR, { recursive: true });

const URL = 'https://vibe-web-gray.vercel.app/';
// Portrait, phone-native capture so the app text is legible when the cut plays
// on a phone in RedNote. We force vibe-web into a single big-font column.
const W = 900, H = 1600;

// Calm, natural Chinese prompts — a real user building one chill track step by
// step (vibe-web passes `current` code, so each line layers onto the last).
const PROMPTS = [
  '来一段轻松的 lo-fi 鼓点',
  '加一条慵懒的贝斯线',
  '再加点温暖的电钢琴和弦',
  '整体更梦幻一点，加点混响',
];
// NOTE: no .bank("RolandTR909") — that bank isn't in vibe-web's /samples kit, so
// it would silence the kick/clap. The default kit (bd/cp/hh) is loaded, so plain
// names give a full-sounding finale.
const FINALE_CODE =
  'stack(\n  s("bd*4, ~ cp"),\n  s("hh*16").gain(saw.range(.2,.9)),\n  note("c2 eb2 g2 bb2").s("sawtooth").lpf(sine.range(300,2200).slow(4)).room(.5)\n).fast(1.5)';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let T0 = 0;
const beats = [];
const now = () => Date.now() - T0;
function beat(kind, text) {
  const at = now();
  beats.push({ at, kind, text });
  console.log(`  [${(at / 1000).toFixed(1)}s] ${kind}: ${text ?? ''}`);
}

// ---- WebAudio tap: tee everything bound for ctx.destination into a recorder --
const AUDIO_TAP_INIT = `
(() => {
  if (window.__audioTapInstalled) return;
  window.__audioTapInstalled = true;
  const destToTap = new WeakMap();
  const recorders = [];
  window.__audioChunks = [];
  window.__audioStartWall = null;

  const NativeAC = window.AudioContext || window.webkitAudioContext;
  if (!NativeAC) return;

  const origConnect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (target, ...rest) {
    const r = origConnect.apply(this, [target, ...rest]);
    try { const tap = destToTap.get(target); if (tap) origConnect.call(this, tap); } catch (e) {}
    return r;
  };

  function install(ctx) {
    try {
      const tap = ctx.createMediaStreamDestination();
      destToTap.set(ctx.destination, tap);

      // Keepalive: a permanently-running silent oscillator feeding BOTH the tap
      // and the real destination. Without an always-live source, the tap's
      // MediaStream track goes inactive during hush gaps between patterns and
      // the MediaRecorder stalls (cutting the capture short). This guarantees a
      // continuous signal so the recorder runs the whole session.
      const ka = ctx.createOscillator();
      const kg = ctx.createGain();
      kg.gain.value = 0.00001; // effectively silent
      ka.connect(kg);
      kg.connect(tap);
      kg.connect(ctx.destination);
      try { ka.start(); } catch (e) {}

      // ONE recorder for the whole session (singleton ctx) -> one valid webm.
      const rec = new MediaRecorder(tap.stream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 256000 });
      rec.ondataavailable = (e) => { if (e.data && e.data.size) window.__audioChunks.push(e.data); };
      rec.start(200);
      window.__audioStartWall = Date.now();
      if (window.__onAudioStart) { try { window.__onAudioStart(window.__audioStartWall); } catch (e) {} }
      recorders.push(rec);

      // Resume keepalive — browsers can auto-suspend an AudioContext.
      setInterval(() => { try { if (ctx.state === 'suspended') ctx.resume(); } catch (e) {} }, 1000);
    } catch (e) { /* ignore */ }
  }

  // Force a singleton AudioContext so a later new AudioContext() (vibe-web may
  // make one per play) keeps using the SAME tap + recorder -> continuous audio.
  let singletonCtx = null;
  function Patched() {
    if (singletonCtx && singletonCtx.state !== 'closed') {
      try { if (singletonCtx.state === 'suspended') singletonCtx.resume(); } catch (e) {}
      return singletonCtx;
    }
    const ctx = new NativeAC(...arguments);
    singletonCtx = ctx;
    install(ctx);
    return ctx;
  }
  Patched.prototype = NativeAC.prototype;
  try { window.AudioContext = Patched; } catch (e) {}
  try { window.webkitAudioContext = Patched; } catch (e) {}

  window.__stopAudio = async () => new Promise((resolve) => {
    let pending = recorders.length;
    if (!pending) return resolve(null);
    const finish = async () => {
      const blob = new Blob(window.__audioChunks, { type: 'audio/webm' });
      const buf = new Uint8Array(await blob.arrayBuffer());
      let bin = '';
      const CH = 0x8000;
      for (let i = 0; i < buf.length; i += CH) bin += String.fromCharCode.apply(null, buf.subarray(i, i + CH));
      resolve(btoa(bin));
    };
    recorders.forEach((rec) => {
      rec.onstop = () => { if (--pending === 0) finish(); };
      try { rec.requestData(); rec.stop(); } catch (e) { if (--pending === 0) finish(); }
    });
  });
})();
`;

// Phone-legibility overrides: force a single column, blow up the fonts, and hide
// the chips/log so the prompt + generated code + visualizer all fit big in a tall
// portrait frame. Injected as a <style> so it wins over the site's CSS.
const MOBILE_CSS = `
(() => {
  const css = \`
    header{padding:18px 26px 6px !important}
    .logo{font-size:40px !important}
    .tag{font-size:19px !important}
    .wrap{grid-template-columns:1fr !important; max-width:none !important; padding:16px 24px 24px !important; gap:18px !important}
    .panel{padding:22px !important; border-radius:20px !important}
    .panel h2{font-size:18px !important; margin-bottom:14px !important; letter-spacing:.14em !important}
    .promptbox{gap:14px !important}
    .promptbox input, #intent{font-size:30px !important; padding:22px 22px !important}
    .promptbox button, .row button{font-size:26px !important; padding:18px 26px !important; border-radius:14px !important}
    .state{font-size:24px !important; margin:16px 0 !important}
    .chips{display:none !important}
    .log{display:none !important}
    .viz{height:230px !important}
    .vlabel{font-size:28px !important; gap:14px !important}
    .spin{width:22px !important; height:22px !important}
    .code{font-size:30px !important; min-height:360px !important; line-height:1.5 !important; padding:20px !important}
    .prog{height:6px !important; margin-top:14px !important}
    footer{font-size:18px !important; padding:10px 24px 22px !important}
  \`;
  const apply = () => {
    if (document.getElementById('__mobile_css')) return;
    const s = document.createElement('style');
    s.id = '__mobile_css'; s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  };
  if (document.head) apply(); else document.addEventListener('DOMContentLoaded', apply);
})();
`;

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

async function glideTo(page, locator, steps = 26) {
  const box = await locator.boundingBox().catch(() => null);
  if (!box) return;
  const x = box.x + box.width / 2 + (Math.random() * 12 - 6);
  const y = box.y + box.height / 2 + (Math.random() * 8 - 4);
  await page.mouse.move(x, y, { steps }).catch(() => {});
  await sleep(180);
}
async function humanType(page, locator, text) {
  // calm, unhurried typing — a real person, not a frantic agent
  await locator.click().catch(() => {});
  for (const ch of text) await page.keyboard.type(ch, { delay: 95 + Math.random() * 90 });
}
async function clearInput(page) {
  await page.keyboard.press('Meta+A').catch(() => {});
  await page.keyboard.press('Control+A').catch(() => {});
  await page.keyboard.press('Backspace').catch(() => {});
}
async function shot(page, name) { await page.screenshot({ path: join(SHOTS_DIR, name) }).catch(() => {}); }
async function waitForCode(page, timeout = 18000) {
  try {
    await page.waitForFunction(() => (document.getElementById('code')?.value || '').trim().length > 8, { timeout });
    return true;
  } catch { return false; }
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream'],
  });
  const context = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 2, // crisp text at phone scale
    recordVideo: { dir: OUT_DIR, size: { width: W, height: H } },
  });
  await context.addInitScript(AUDIO_TAP_INIT);
  await context.addInitScript(MOBILE_CSS);
  await context.addInitScript(CURSOR_INIT);

  let audioStartWall = null;
  const page = await context.newPage();
  await page.exposeFunction('__onAudioStart', (wall) => { if (audioStartWall == null) audioStartWall = wall; });
  page.on('console', (m) => console.log(`    [browser:${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => console.log(`    [browser:ERROR] ${e.message}`));

  const videoT0 = Date.now(); // ~ Playwright video frame 0
  T0 = videoT0;
  beat('boot', 'navigating');
  await page.goto(URL, { waitUntil: 'networkidle' }).catch(() => {});
  await sleep(1800);
  await shot(page, 'a00-loaded.png');

  const input = page.locator('#intent');
  const sendBtn = page.locator('#send');
  const codeArea = page.locator('#code');

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

    await glideTo(page, sendBtn, 18);
    await page.mouse.down(); await sleep(60); await page.mouse.up();
    beat('compose', 'MiniMax composing…');

    const ok = await waitForCode(page);
    if (ok) { beat('play', 'pattern playing'); await shot(page, `cn0${idx}-playing.png`); }
    else {
      beat('fallback', 'injecting local pattern');
      await codeArea.click().catch(() => {});
      await clearInput(page);
      await page.keyboard.insertText(FINALE_CODE).catch(() => {});
      await page.locator('#play').click().catch(() => {});
    }
    // calm: drift the cursor once toward the visualizer and just listen
    await page.mouse.move(W * 0.72, H * 0.32, { steps: 30 }).catch(() => {});
    await sleep(8200);
  }

  // calm closer: the user gently opens the code editor and applies a clean,
  // known-good pattern — shows "it's real code you can edit" without frantic
  // hand-coding. fill() reliably clears the textarea first (Meta+A is flaky
  // headless and would concatenate onto leftover code -> SyntaxError -> silent).
  await glideTo(page, codeArea, 30);
  beat('handcode', '你甚至能自己改代码');
  await codeArea.fill(FINALE_CODE).catch(() => {});
  await sleep(600);
  const applyBtn = page.locator('#apply');
  await glideTo(page, applyBtn, 24);
  await page.mouse.down(); await sleep(60); await page.mouse.up();
  beat('finale', 'final track plays');
  await sleep(700);
  await page.locator('#play').click().catch(() => {});

  // let the final track ride out calmly
  await page.mouse.move(W * 0.7, H * 0.3, { steps: 30 }).catch(() => {});
  await sleep(9000);
  beat('end', 'done');

  // pull the captured real audio out as base64, then close
  const b64 = await page.evaluate(() => window.__stopAudio && window.__stopAudio());
  const videoPath = await page.video().path();
  await context.close();
  await browser.close();

  const offsetSec = audioStartWall != null ? (audioStartWall - videoT0) / 1000 : 0;
  writeFileSync(join(OUT_DIR, 'timeline-cn.json'),
    JSON.stringify({ url: URL, w: W, h: H, videoT0, audioStartWall, offsetSec, videoPath, beats }, null, 2));

  if (!b64) { console.error('!! no audio captured — WebAudio tap produced nothing'); process.exit(2); }
  const audioPath = join(OUT_DIR, 'cn-demo-audio.webm');
  writeFileSync(audioPath, Buffer.from(b64, 'base64'));
  console.log(`-> captured audio: ${audioPath}  (offset ${offsetSec.toFixed(3)}s)`);
  console.log(`-> video: ${videoPath}`);

  // mux: place audio at its measured offset relative to video t0
  const outMp4 = join(OUT_DIR, 'vibe-demo-cn.mp4');
  const args = ['-y', '-loglevel', 'error'];
  if (offsetSec >= 0) {
    args.push('-i', videoPath, '-itsoffset', offsetSec.toFixed(3), '-i', audioPath);
  } else {
    args.push('-itsoffset', (-offsetSec).toFixed(3), '-i', videoPath, '-i', audioPath);
  }
  args.push('-map', '0:v:0', '-map', '1:a:0',
    // tame the hot WebAudio capture (peaks hit 0 dB) + normalize for delivery
    '-af', 'alimiter=limit=0.95:level=false,loudnorm=I=-15:TP=-1.5:LRA=11',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'medium',
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', outMp4);
  const r = spawnSync('ffmpeg', args, { stdio: 'inherit' });
  if (r.status !== 0) { console.error('ffmpeg mux failed'); process.exit(3); }
  console.log(`-> muxed real-audio demo: ${outMp4}`);
}

main().catch((e) => { console.error(e && e.stack ? e.stack : String(e)); process.exit(1); });
