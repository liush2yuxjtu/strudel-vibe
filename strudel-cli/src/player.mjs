// The live player: owns the clock, queries the current Strudel pattern cycle by
// cycle, schedules audio voices ahead of the playhead, hot-reloads the live file
// on change (live-coding swap), and renders a terminal visualization.
import { watch, existsSync } from 'node:fs';
import { compile, queryCycle, bootstrap } from './engine.mjs';
import { Synth, SR } from './synth.mjs';
import { readCompose } from './livefile.mjs';

const QUERY_LOOKAHEAD_CYCLES = 2;
const DISPLAY_MS = 80;
const STEPS = 16;

export class Player {
  constructor(file, { audio = true, cps = 0.5 } = {}) {
    this.file = file;
    this.audioOn = audio;
    this.cps = cps;
    this.pattern = null;
    this.queriedCycle = 0;
    this.synth = new Synth({ onError: (e) => this._note(`audio: ${e.message}`) });
    this.events = [];        // recent triggered events for display
    this.stepGrid = [];      // per-layer-ish onset markers for current cycle
    this.error = null;
    this.status = 'starting';
    this.layers = 0;
    this._tickTimer = null;
    this._dispTimer = null;
    this._watcher = null;
    this._lastCycleShown = -1;
  }

  async start() {
    await bootstrap();
    this.t0 = performance.now();
    await this.reload();
    if (this.audioOn) this.synth.start(this.t0);
    this.queriedCycle = Math.floor(this.curCycle());
    this._tickTimer = setInterval(() => this._schedule(), 25);
    this._dispTimer = setInterval(() => this._render(), DISPLAY_MS);
    this._watchFile();
    this.status = 'playing';
    const onExit = () => this.stop();
    process.on('SIGINT', onExit);
    process.on('SIGTERM', onExit);
  }

  stop() {
    if (this._tickTimer) clearInterval(this._tickTimer);
    if (this._dispTimer) clearInterval(this._dispTimer);
    if (this._watcher) this._watcher.close();
    this.synth.stop();
    process.stdout.write('\x1b[?25h\n'); // show cursor
    process.exit(0);
  }

  curFrame() { return this.t0 != null ? Math.floor(((performance.now() - this.t0) / 1000) * SR) : 0; }
  curCycle() { return (this.curFrame() / SR) * this.cps; }

  async reload() {
    try {
      const { code, cps, layers } = readCompose(this.file);
      if (cps && cps > 0) this.cps = cps;
      const pat = await compile(code);
      this.pattern = pat;
      this.layers = layers;
      this.error = null;
      this._note(`reloaded · ${layers} layer(s) · cps ${this.cps}`);
    } catch (e) {
      this.error = e.message;
      this._note(`error: ${e.message}`);
    }
  }

  _watchFile() {
    if (!existsSync(this.file)) return;
    let t = null;
    this._watcher = watch(this.file, () => {
      clearTimeout(t);
      t = setTimeout(() => this.reload(), 60); // debounce
    });
  }

  _schedule() {
    if (!this.pattern) return;
    const cur = this.curCycle();
    const until = Math.floor(cur) + QUERY_LOOKAHEAD_CYCLES;
    while (this.queriedCycle <= until) {
      let haps = [];
      try { haps = queryCycle(this.pattern, this.queriedCycle); } catch (e) { this.error = e.message; }
      for (const h of haps) {
        const begin = Number(h.part.begin);
        const end = Number(h.whole ? h.whole.end : h.part.end);
        const startFrame = Math.round((begin / this.cps) * SR);
        const durFrames = Math.max(1, Math.round(((end - begin) / this.cps) * SR));
        if (this.audioOn) {
          // valueToVoice imported lazily to keep module graph simple
          this.synth.addVoice(this._voice(h.value, startFrame, durFrames));
        }
        this._pushEvent(begin, h.value);
      }
      this.queriedCycle++;
    }
  }

  _voice(value, startFrame, durFrames) {
    return this.__vtv(value, startFrame, durFrames);
  }

  _pushEvent(begin, value) {
    const label = value.note != null ? `♪ ${value.note}` : value.s != null ? value.s : JSON.stringify(value);
    this.events.push({ cycle: begin, label });
    if (this.events.length > 200) this.events.shift();
  }

  _note(msg) {
    this._lastNote = msg;
  }

  _render() {
    const cycle = this.curCycle();
    const cyInt = Math.floor(cycle);
    const step = Math.floor((cycle - cyInt) * STEPS);
    const out = [];
    out.push('\x1b[2J\x1b[H\x1b[?25l'); // clear, home, hide cursor
    out.push('  \x1b[1;36m🌀 strudel-cli\x1b[0m  live player\n');
    out.push(`  file: \x1b[2m${this.file}\x1b[0m\n`);
    out.push(`  cps: \x1b[33m${this.cps}\x1b[0m   cycle: \x1b[32m${cyInt}\x1b[0m   layers: ${this.layers}   audio: ${this.audioOn ? '🔊' : '🔇'}\n`);
    if (this.error) out.push(`  \x1b[41;97m ERROR \x1b[0m \x1b[31m${this.error}\x1b[0m\n`);
    else if (this._lastNote) out.push(`  \x1b[2m${this._lastNote}\x1b[0m\n`);
    // playhead bar
    let bar = '  [';
    for (let i = 0; i < STEPS; i++) bar += i === step ? '\x1b[1;35m|\x1b[0m' : '\x1b[2m·\x1b[0m';
    bar += ']\n';
    out.push(bar);
    // recent events in this cycle
    const recent = this.events.filter((e) => Math.floor(e.cycle) === cyInt);
    out.push('\n  now playing:\n');
    const seen = new Set();
    const rows = [];
    for (const e of recent) {
      const s = Math.floor((e.cycle - Math.floor(e.cycle)) * STEPS);
      const k = e.label + "@" + s;
      if (seen.has(k)) continue; seen.add(k);
      rows.push({ s, label: e.label });
    }
    rows.sort((a, b) => a.s - b.s);
    for (const r of rows.slice(0, 24)) {
      out.push(`    \x1b[2m${String(r.s).padStart(2)}\x1b[0m  \x1b[36m${r.label}\x1b[0m\n`);
    }
    out.push('\n  \x1b[2medit the file or `strudel append \"...\"` to vibe live · Ctrl-C to stop\x1b[0m\n');
    process.stdout.write(out.join(''));
  }
}

// wire the voice factory (avoids circular import at module top)
import { valueToVoice } from './synth.mjs';
Player.prototype.__vtv = valueToVoice;
