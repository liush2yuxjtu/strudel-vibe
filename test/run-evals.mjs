#!/usr/bin/env node
// Third-party eval harness for eval.md — runs all 5 points with FIXED tools and
// prints one JSON verdict plus raw evidence. No self-grading: each point passes
// only if observable output matches a fixed predicate. Raw evidence is also saved
// under test/evidence/ so an LLM judge reads raw JSON, not vibes.
//
// Usage:
//   MINIMAX_API_KEY=sk-... node test/run-evals.mjs [--url https://vibe-web-gray.vercel.app/]
//   (eval #2 needs tmux; eval #3/#4/#5 need MINIMAX_API_KEY; #4/#5 need python+playwright)
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BIN = join(ROOT, 'strudel-cli', 'bin', 'strudel.mjs');
const args = process.argv.slice(2);
const url = (args[args.indexOf('--url') + 1] && args.includes('--url'))
  ? args[args.indexOf('--url') + 1]
  : (process.env.EVAL_URL || 'https://vibe-web-gray.vercel.app/');

const sh = (cmd, a, opts = {}) =>
  spawnSync(cmd, a, { encoding: 'utf8', cwd: ROOT, env: process.env, ...opts });
const sleep = (ms) => spawnSync('sleep', [String(ms / 1000)]);

const results = {};

// ---------- eval #1: CLI compile & query ----------
(() => {
  const r = sh('node', [BIN, 'eval', 's("bd*4")', '1']);
  const lines = (r.stdout || '').trim().split('\n').filter((l) => l.includes('{'));
  const evts = lines.map((l) => {
    const [pos, jsonStr] = l.split('\t');
    let v = {}; try { v = JSON.parse(jsonStr); } catch {}
    return { begin: parseFloat((pos || '').split('+')[1]), s: v.s };
  });
  const begins = evts.map((e) => e.begin);
  const pass = evts.length === 4 && evts.every((e) => e.s === 'bd')
    && [0, 0.25, 0.5, 0.75].every((b) => begins.includes(b));
  results.eval1_cli_compile = { pass, evidence: { count: evts.length, events: evts, raw: lines } };
})();

// ---------- eval #2: live overlay + hot reload (tmux) ----------
(() => {
  const hasTmux = sh('which', ['tmux']).status === 0;
  if (!hasTmux) { results.eval2_live_hotreload = { pass: false, skipped: 'tmux not found' }; return; }
  sh('node', [BIN, 'stop']);
  sh('node', [BIN, 'start', '--no-audio']);
  sleep(1500);
  sh('node', [BIN, 'append', 's("bd*4")']);
  sleep(600);
  sh('node', [BIN, 'append', 'note("c2 e2").s("sawtooth")']);
  sleep(1500);
  const show = (sh('node', [BIN, 'show']).stdout || '');
  const blocks = show.split('// ---').length;            // 2 blocks → one separator → split len 2
  const cap1 = (sh('tmux', ['capture-pane', '-p', '-t', 'strudel']).stdout || '');
  sleep(1800);
  const cap2 = (sh('tmux', ['capture-pane', '-p', '-t', 'strudel']).stdout || '');
  const cyc = (s) => { const m = s.match(/cycle:\s*(\d+)/); return m ? parseInt(m[1], 10) : NaN; };
  const lay = (s) => { const m = s.match(/layers:\s*(\d+)/); return m ? parseInt(m[1], 10) : NaN; };
  const c1 = cyc(cap1), c2 = cyc(cap2), layers = lay(cap2);
  sh('node', [BIN, 'stop']);
  const pass = blocks === 2 && layers === 2 && Number.isFinite(c1) && Number.isFinite(c2) && c2 > c1;
  results.eval2_live_hotreload = {
    pass,
    evidence: { separators_make_blocks: blocks, layers, cycle_t1: c1, cycle_t2: c2, show: show.trim() },
  };
})();

// ---------- eval #3: NL → Strudel (MiniMax) ----------
(() => {
  if (!process.env.MINIMAX_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    results.eval3_translate = { pass: false, skipped: 'MINIMAX_API_KEY not set' }; return;
  }
  const r = sh('node', [BIN, 'translate', '四拍鼓加八分hihat', '--json'], { timeout: 60000 });
  const jsonLine = (r.stdout || '').trim().split('\n').find((l) => l.trim().startsWith('{'));
  let out = {}; try { out = JSON.parse(jsonLine); } catch {}
  const code = (out.code || '').trim();
  // single Strudel expression that compile() accepted (ok:true comes from translateValid)
  const pass = out.ok === true && code.length > 0 && !code.includes('```') && /\b(s|note|stack|n)\s*\(/.test(code);
  results.eval3_translate = { pass, evidence: { ok: out.ok, code, stderr: (r.stderr || '').slice(0, 200) } };
})();

// ---------- eval #4 + #5: web live + perceivable (python/playwright judge) ----------
(() => {
  const py = sh('python3', [join(ROOT, 'test', 'browser-eval.py'), url], { timeout: 120000 });
  let parsed = null;
  try { parsed = JSON.parse(py.stdout); } catch {}
  if (!parsed) {
    results.eval4_web_live = { pass: false, error: 'browser judge failed', stderr: (py.stderr || '').slice(0, 400) };
    results.eval5_perceivable = { pass: false, error: 'browser judge failed' };
    return;
  }
  results.eval4_web_live = parsed.eval4_web_live;
  results.eval5_perceivable = parsed.eval5_perceivable;
  results._browser_raw = parsed.raw;
})();

// ---------- verdict ----------
const keys = ['eval1_cli_compile', 'eval2_live_hotreload', 'eval3_translate', 'eval4_web_live', 'eval5_perceivable'];
const all_pass = keys.every((k) => results[k] && results[k].pass);
const verdict = { url, all_pass, summary: Object.fromEntries(keys.map((k) => [k, !!(results[k] && results[k].pass)])), results };

mkdirSync(join(ROOT, 'test', 'evidence'), { recursive: true });
writeFileSync(join(ROOT, 'test', 'evidence', 'verdict.json'), JSON.stringify(verdict, null, 2));
console.log(JSON.stringify(verdict, null, 2));
process.exit(all_pass ? 0 : 1);
