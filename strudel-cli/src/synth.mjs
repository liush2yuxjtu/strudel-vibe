// Real-time software synth that turns scheduled "voices" into f32le PCM and
// pipes it to ffplay. Wall-clock paced producer; voices are placed at absolute
// frame indices so the player (which converts Strudel cycle-time -> frames) and
// this producer agree on a single timeline.
import { spawn } from 'node:child_process';

const SR = 44100;
const LOOKAHEAD_S = 0.18;      // keep this much audio buffered ahead of wall clock
const TICK_MS = 20;
const MASTER = 0.28;           // headroom before soft-clip

const NOTES = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };

// note name ("c3", "f#4", "bb2", "gs3") or midi number -> frequency (Hz). C4=60.
export function noteToFreq(note) {
  let midi;
  if (typeof note === 'number') {
    midi = note;
  } else if (typeof note === 'string') {
    const m = note.trim().toLowerCase().match(/^([a-g])([#sb]?)(-?\d+)?$/);
    if (!m) return null;
    let semis = NOTES[m[1]];
    if (m[2] === '#' || m[2] === 's') semis += 1;
    else if (m[2] === 'b') semis -= 1;
    const oct = m[3] === undefined ? 3 : parseInt(m[3], 10);
    midi = semis + (oct + 1) * 12; // c4 -> 60
  } else {
    return null;
  }
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Map a Strudel hap value -> a voice spec, given absolute start frame + duration.
const DRUMS = new Set([
  'bd', 'kick', 'sd', 'sn', 'snare', 'hh', 'hat', 'ch', 'oh', 'cp', 'clap',
  'rim', 'rs', 'lt', 'mt', 'ht', 'perc', 'tom', 'cb', 'click',
]);
const WAVES = new Set(['sine', 'sawtooth', 'saw', 'square', 'triangle', 'tri', 'pulse']);

export function valueToVoice(value, startFrame, durFrames) {
  const gain = value.gain != null ? value.gain : 1;
  const s = value.s;
  const hasNote = value.note != null || value.n != null;
  const note = value.note != null ? value.note : value.n;

  // Drum / percussion presets keyed by sound name.
  if (s && DRUMS.has(String(s))) {
    return drumVoice(String(s), startFrame, durFrames, gain);
  }

  // Melodic: oscillator at note frequency.
  let freq = noteToFreq(note);
  if (freq == null) freq = 220; // fallback pitch when only a sound name is given
  let wave = 'sawtooth';
  if (s && WAVES.has(String(s))) wave = String(s);
  return {
    type: wave === 'saw' ? 'sawtooth' : wave === 'tri' ? 'triangle' : wave,
    freq,
    start: startFrame,
    dur: durFrames,
    gain,
    atk: Math.floor(SR * 0.008),
    rel: Math.floor(SR * 0.12),
    phase: 0,
  };
}

function drumVoice(name, start, dur, gain) {
  const base = { start, gain, phase: 0, drum: name };
  switch (name) {
    case 'bd': case 'kick':
      return { ...base, type: 'kick', freq: 55, dur: Math.min(dur, Math.floor(SR * 0.18)) };
    case 'sd': case 'sn': case 'snare':
      return { ...base, type: 'snare', freq: 180, dur: Math.min(dur, Math.floor(SR * 0.18)) };
    case 'cp': case 'clap':
      return { ...base, type: 'clap', freq: 0, dur: Math.min(dur, Math.floor(SR * 0.14)) };
    case 'oh':
      return { ...base, type: 'hat', freq: 0, dur: Math.min(dur, Math.floor(SR * 0.22)) };
    case 'hh': case 'hat': case 'ch': case 'click': case 'rim': case 'rs':
      return { ...base, type: 'hat', freq: 0, dur: Math.min(dur, Math.floor(SR * 0.05)) };
    default:
      return { ...base, type: 'tom', freq: 140, dur: Math.min(dur, Math.floor(SR * 0.16)) };
  }
}

// Render a single voice at local frame index i (0-based from voice.start).
export function renderVoice(v, i) {
  const t = i / SR;
  let sample = 0;
  switch (v.type) {
    case 'kick': {
      const f = v.freq * Math.pow(2, -8 * t); // pitch drop
      sample = Math.sin(2 * Math.PI * f * t) * Math.exp(-18 * t);
      break;
    }
    case 'snare': {
      const tone = Math.sin(2 * Math.PI * v.freq * t) * 0.4;
      const noise = (Math.random() * 2 - 1) * 0.9;
      sample = (tone + noise) * Math.exp(-30 * t);
      break;
    }
    case 'clap': {
      const noise = Math.random() * 2 - 1;
      const env = Math.exp(-30 * t) * (0.6 + 0.4 * Math.sin(2 * Math.PI * 25 * t));
      sample = noise * env;
      break;
    }
    case 'hat': {
      sample = (Math.random() * 2 - 1) * Math.exp(-60 * t) * 0.7;
      break;
    }
    case 'tom': {
      const f = v.freq * Math.pow(2, -4 * t);
      sample = Math.sin(2 * Math.PI * f * t) * Math.exp(-16 * t);
      break;
    }
    default: {
      // oscillator with attack/sustain/release envelope
      const phase = (v.freq * t) % 1;
      let osc;
      if (v.type === 'square' || v.type === 'pulse') osc = phase < 0.5 ? 1 : -1;
      else if (v.type === 'triangle') osc = 4 * Math.abs(phase - 0.5) - 1;
      else if (v.type === 'sine') osc = Math.sin(2 * Math.PI * phase);
      else osc = 2 * phase - 1; // sawtooth
      let env;
      if (i < v.atk) env = i / v.atk;
      else if (i < v.dur) env = 1;
      else env = Math.max(0, 1 - (i - v.dur) / v.rel);
      sample = osc * env * 0.6;
    }
  }
  return sample * v.gain;
}

export function voiceTotalFrames(v) {
  if (v.rel != null) return v.dur + v.rel;
  return v.dur;
}

export class Synth {
  constructor({ onError } = {}) {
    this.sr = SR;
    this.voices = [];
    this.written = 0;          // total frames pushed to ffplay
    this.startTime = null;     // performance.now() ms at frame 0
    this.proc = null;
    this.timer = null;
    this.onError = onError || (() => {});
    this.muted = false;
  }

  start(t0) {
    if (this.proc) return;
    this.proc = spawn(
      'ffplay',
      ['-hide_banner', '-loglevel', 'error', '-nodisp', '-autoexit',
        '-f', 'f32le', '-ar', String(SR), '-ch_layout', 'mono', '-i', 'pipe:0'],
      { stdio: ['pipe', 'ignore', 'ignore'] },
    );
    this.proc.on('error', (e) => this.onError(e));
    this.proc.stdin.on('error', () => {});
    this.startTime = t0 != null ? t0 : performance.now();
    this.timer = setInterval(() => this._tick(), TICK_MS);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.proc) {
      try { this.proc.stdin.end(); } catch {}
      try { this.proc.kill('SIGTERM'); } catch {}
    }
    this.proc = null;
  }

  // current playhead frame from wall clock
  playFrame() {
    if (this.startTime == null) return 0;
    return Math.floor(((performance.now() - this.startTime) / 1000) * SR);
  }

  addVoice(v) {
    if (v) this.voices.push(v);
  }

  clearVoices() { this.voices = []; }

  _tick() {
    if (!this.proc) return;
    const target = this.playFrame() + Math.floor(LOOKAHEAD_S * SR);
    let n = target - this.written;
    if (n <= 0) return;
    if (n > SR) n = SR; // cap a runaway catch-up
    const buf = Buffer.allocUnsafe(n * 4);
    const start = this.written;
    // prune dead voices
    if (this.voices.length > 256) {
      this.voices = this.voices.filter((v) => start - v.start < voiceTotalFrames(v));
    }
    for (let i = 0; i < n; i++) {
      const g = start + i;
      let mix = 0;
      if (!this.muted) {
        for (let vi = 0; vi < this.voices.length; vi++) {
          const v = this.voices[vi];
          const local = g - v.start;
          if (local < 0) continue;
          if (local >= voiceTotalFrames(v)) continue;
          mix += renderVoice(v, local);
        }
      }
      mix *= MASTER;
      // soft clip
      if (mix > 1) mix = 1; else if (mix < -1) mix = -1;
      else mix = Math.tanh(mix);
      buf.writeFloatLE(mix, i * 4);
    }
    this.written += n;
    try { this.proc.stdin.write(buf); } catch {}
  }
}

export { SR };
