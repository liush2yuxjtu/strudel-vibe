// Offline soundtrack renderer for the vibe-music demo film.
//
// Reuses the REAL strudel-cli engine (compile/queryCycle) and synth
// (valueToVoice/renderVoice) to render authentic Strudel audio — the same
// voices you'd hear from `strudel play` — but offline into one master WAV,
// laid out to match the Remotion film's exact per-scene timing.
//
// Run from the strudel-cli dir so the @strudel/* deps + kabelsalat stub resolve:
//   node --import ./scripts/_register-hooks.mjs scripts/render-soundtrack.mjs <out.wav>
// (the wrapper below also self-registers if launched plainly via bin/vibe path)

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { compile, queryCycle, bootstrap } from '../src/engine.mjs';
import { valueToVoice, renderVoice, voiceTotalFrames, SR } from '../src/synth.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FPS = 30;
const MASTER = 0.42; // single-track headroom before soft-clip

// ---- film timeline (mirrors video/src/scenes.ts) ---------------------------
const INTRO_FRAMES = 95;
const OUTRO_FRAMES = 130;
// [clip, seconds] from video/public/clips/manifest.json
const SCENES = [
  ['s1a', 5.4],
  ['s1b', 4.5],
  ['s2', 7.0],
  ['s3', 7.0],
  ['s4', 7.2],
  ['s5', 3.6],
  ['s6', 7.7],
];

// ---- per-segment patterns ---------------------------------------------------
// Only sounds the strudel-cli synth can voice: drums (bd sd hh cp oh lt mt ht)
// and note(...).s(sine|sawtooth|square|triangle). gain/fast/slow/range OK.
const FINALE =
  'stack(\n  s("bd*4, ~ cp").bank("RolandTR909"),\n  s("hh*16").gain(saw.range(.2,.9)),\n  note("c2 eb2 g2 bb2").s("sawtooth").lpf(sine.range(300,2200).slow(4)).room(.5)\n).fast(1.5)';

// Each entry: a slice of the timeline with its own pattern + tempo (cps).
// Built in timeline order; durations sum to the full film length.
const SEGMENTS = [
  {
    name: 'intro',
    seconds: INTRO_FRAMES / FPS, // 3.17s riser
    cps: 0.5,
    code: 'stack(\n  s("hh*16").gain(saw.range(.08,.7)),\n  note("c2").s("sawtooth").gain(.45)\n)',
  },
  {
    name: 's1a · 808 thunderstorm + binary choir',
    seconds: 5.4,
    cps: 0.5,
    code:
      'stack(\n  s("bd*2 ~ bd ~"),\n  note("c1 c1 g1 c1").s("sine").gain(.95),\n  note("c4 c4 ~ c4 c4 ~ c4 ~").s("square").gain(.22)\n)',
  },
  {
    name: 's1b · the drop',
    seconds: 4.5,
    cps: 0.55,
    code:
      'stack(\n  s("bd*4, ~ cp"),\n  s("hh*16").gain(.5),\n  note("c2 eb2 g2 bb2").s("sawtooth").gain(.6)\n)',
  },
  {
    name: 's2 · cyberpunk taiko vs acid bass',
    seconds: 7.0,
    cps: 0.7,
    code:
      'stack(\n  s("bd*4"),\n  s("lt*4 mt*4 ht*4 lt*4").gain(.7),\n  note("c2 c2 eb2 c2 g2 c2 bb1 c2").s("sawtooth").gain(.5)\n)',
  },
  {
    name: 's3 · lofi rain dubstep wobble',
    seconds: 7.0,
    cps: 0.45,
    code:
      'stack(\n  s("bd ~ ~ bd ~ ~ sd ~"),\n  s("hh*8").gain(.3),\n  note("e1 e1 ~ g1 a1 ~ g1 e1").s("sawtooth").gain(saw.range(.2,.85))\n)',
  },
  {
    name: 's4 · disco ball → free jazz → techno',
    seconds: 7.2,
    cps: 0.55,
    code:
      'stack(\n  s("bd*4, ~ cp"),\n  s("hh*16").gain(.4),\n  note("c3 e3 g3 b3 d4 b3 g3 e3").s("triangle").gain(.5)\n)',
  },
  {
    name: 's5 · drum & bass preset',
    seconds: 3.6,
    cps: 0.7,
    code:
      'stack(\n  s("bd ~ ~ ~ ~ ~ bd ~"),\n  s("~ ~ sd ~ ~ ~ sd ~"),\n  s("hh*16").gain(.5),\n  note("c1 ~ ~ c1").s("sine").gain(.95)\n)',
  },
  {
    name: 's6 · hand-built finale',
    seconds: 7.7,
    cps: 0.5,
    code: FINALE,
  },
  {
    name: 'outro · finale tail',
    seconds: OUTRO_FRAMES / FPS, // 4.33s ride-out
    cps: 0.5,
    code: FINALE,
  },
];

// Render one pattern to a mono Float32Array of exactly `seconds` length.
async function renderSegment(code, cps, seconds) {
  const pattern = await compile(code);
  const total = Math.round(seconds * SR);
  const out = new Float32Array(total);
  const numCycles = Math.ceil(seconds * cps) + 2;
  const voices = [];
  for (let cy = 0; cy < numCycles; cy++) {
    let haps = [];
    try {
      haps = queryCycle(pattern, cy);
    } catch {
      /* skip bad cycle */
    }
    for (const h of haps) {
      const begin = Number(h.part.begin);
      const end = Number(h.whole ? h.whole.end : h.part.end);
      const startFrame = Math.round((begin / cps) * SR);
      const durFrames = Math.max(1, Math.round(((end - begin) / cps) * SR));
      if (startFrame >= total) continue;
      const v = valueToVoice(h.value, startFrame, durFrames);
      if (v) voices.push(v);
    }
  }
  // mix voices
  for (const v of voices) {
    const tf = voiceTotalFrames(v);
    for (let i = 0; i < tf; i++) {
      const g = v.start + i;
      if (g < 0 || g >= total) continue;
      out[g] += renderVoice(v, i);
    }
  }
  // master + soft clip (mirrors Synth._tick)
  for (let i = 0; i < total; i++) {
    let s = out[i] * MASTER;
    if (s > 1) s = 1;
    else if (s < -1) s = -1;
    else s = Math.tanh(s);
    out[i] = s;
  }
  // de-click: short fade-in, slightly longer fade-out
  const fin = Math.min(Math.floor(SR * 0.012), total);
  const fout = Math.min(Math.floor(SR * 0.05), total);
  for (let i = 0; i < fin; i++) out[i] *= i / fin;
  for (let i = 0; i < fout; i++) out[total - 1 - i] *= i / fout;
  return out;
}

function floatToWav(mono) {
  const n = mono.length;
  const bytesPerSample = 2;
  const channels = 2; // duplicate mono -> stereo
  const dataBytes = n * channels * bytesPerSample;
  const buf = Buffer.alloc(44 + dataBytes);
  // RIFF header
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataBytes, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); // PCM chunk size
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(channels, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * channels * bytesPerSample, 28); // byte rate
  buf.writeUInt16LE(channels * bytesPerSample, 32); // block align
  buf.writeUInt16LE(16, 34); // bits per sample
  buf.write('data', 36);
  buf.writeUInt32LE(dataBytes, 40);
  let off = 44;
  for (let i = 0; i < n; i++) {
    let s = mono[i];
    if (s > 1) s = 1;
    else if (s < -1) s = -1;
    const v = Math.round(s * 32767);
    buf.writeInt16LE(v, off); // L
    buf.writeInt16LE(v, off + 2); // R
    off += 4;
  }
  return buf;
}

async function main() {
  const outArg = process.argv[2] || join(__dirname, '..', '..', 'video', 'public', 'soundtrack.wav');
  const outPath = resolve(outArg);
  await bootstrap();

  const totalSeconds = SEGMENTS.reduce((a, s) => a + s.seconds, 0);
  const totalFrames = Math.round(totalSeconds * SR);
  const master = new Float32Array(totalFrames);

  let cursor = 0; // frame offset
  for (const seg of SEGMENTS) {
    const pcm = await renderSegment(seg.code, seg.cps, seg.seconds);
    for (let i = 0; i < pcm.length; i++) {
      const g = cursor + i;
      if (g < master.length) master[g] += pcm[i];
    }
    cursor += pcm.length;
    let peak = 0;
    for (let i = 0; i < pcm.length; i++) peak = Math.max(peak, Math.abs(pcm[i]));
    console.log(`  ✓ ${seg.name.padEnd(40)} ${seg.seconds.toFixed(2)}s  peak ${peak.toFixed(2)}`);
  }

  // final 0.4s fade so the outro tail doesn't cut hard
  const tail = Math.min(Math.floor(SR * 0.4), totalFrames);
  for (let i = 0; i < tail; i++) master[totalFrames - 1 - i] *= i / tail;

  const wav = floatToWav(master);
  writeFileSync(outPath, wav);
  console.log(`\n-> wrote ${outPath}  (${totalSeconds.toFixed(2)}s, ${(wav.length / 1e6).toFixed(1)} MB)`);
}

main().catch((e) => {
  console.error(e && e.stack ? e.stack : String(e));
  process.exit(1);
});
