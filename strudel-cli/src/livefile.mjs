// The "live buffer" that agents append to. The file is a sequence of layer
// blocks separated by a "// ---" marker line. Each block is one Strudel
// expression; blocks are stacked together so appending is musically additive.
// `setcps(n)` / `setcpm(n)` lines anywhere are parsed out to set tempo.
import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdirSync, writeFileSync, readFileSync, existsSync, appendFileSync } from 'node:fs';

export const HOME = process.env.STRUDEL_CLI_HOME || join(homedir(), '.strudel-cli');
export const DEFAULT_LIVE = join(HOME, 'live.strudel');
export const STATE = join(HOME, 'session.json');
const MARKER = '// ---';

export function ensureHome() {
  mkdirSync(HOME, { recursive: true });
}

export function readState() {
  try { return JSON.parse(readFileSync(STATE, 'utf8')); } catch { return {}; }
}
export function writeState(s) {
  ensureHome();
  writeFileSync(STATE, JSON.stringify(s, null, 2));
}
export function liveFile() {
  return readState().file || DEFAULT_LIVE;
}

export function initLive(file = DEFAULT_LIVE, content = 'silence') {
  ensureHome();
  if (!existsSync(file)) writeFileSync(file, content + '\n');
  return file;
}

export function setBuffer(file, code) {
  ensureHome();
  writeFileSync(file, code.trim() + '\n');
}

export function appendLayer(file, code) {
  ensureHome();
  const existing = existsSync(file) ? readFileSync(file, 'utf8') : '';
  const blocks = splitBlocks(existing);
  const meaningful = blocks.filter((b) => hasCode(b));
  if (meaningful.length === 0) {
    // buffer is empty/silence -> this code becomes the first real layer
    writeFileSync(file, code.trim() + '\n');
  } else {
    appendFileSync(file, `\n${MARKER}\n${code.trim()}\n`);
  }
}

export function hush(file) {
  setBuffer(file, 'silence');
}

function splitBlocks(text) {
  return text.split(new RegExp(`^${MARKER}\\s*$`, 'm'));
}

function stripComment(line) {
  return line.replace(/\/\/.*$/, '').trim();
}

function hasCode(block) {
  return block.split('\n').some((l) => stripComment(l).length > 0 && stripComment(l) !== 'silence');
}

// Parse the file into { code, cps } ready for the engine.
export function compose(text) {
  let cps = null;
  // pull tempo directives
  const cpsM = [...text.matchAll(/setcps\(\s*([\d.]+)\s*\)/g)];
  const cpmM = [...text.matchAll(/setcpm\(\s*([\d.]+)\s*\)/g)];
  if (cpsM.length) cps = parseFloat(cpsM[cpsM.length - 1][1]);
  else if (cpmM.length) cps = parseFloat(cpmM[cpmM.length - 1][1]) / 60;

  const cleaned = text
    .replace(/setcps\([^)]*\)\s*;?/g, '')
    .replace(/setcpm\([^)]*\)\s*;?/g, '');

  const blocks = splitBlocks(cleaned)
    .map((b) => b.split('\n').map(stripComment).filter(Boolean).join('\n').trim())
    .filter((b) => b.length > 0 && b !== 'silence');

  let code;
  if (blocks.length === 0) code = 'silence';
  else if (blocks.length === 1) code = blocks[0];
  else code = 'stack(\n' + blocks.map((b) => `(${b})`).join(',\n') + '\n)';
  return { code, cps, layers: blocks.length };
}

export function readCompose(file) {
  const text = existsSync(file) ? readFileSync(file, 'utf8') : 'silence';
  return compose(text);
}
