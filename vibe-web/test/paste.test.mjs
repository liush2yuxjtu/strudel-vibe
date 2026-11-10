import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
function between(start, end) {
  const from = html.indexOf(start), to = html.indexOf(end, from);
  assert.ok(from >= 0 && to > from, start);
  return html.slice(from, to);
}
const paste = between('  let editorImport = null;', '  function renderChips(){');
const audio = between('  async function resumeAudio(){', '  /** Play stays secondary');
const playback = between('  async function runFirstDemo(){', '  // ——— 90s idle');
const status = '({' + between('    async getStatus(){', '    async generateMusic(') + '})';
const good = 'note("c4").s("sine")';
const next = 'note("e4").s("sine")';
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function app(overrides = {}) {
  const elements = new Map();
  const c = {
    phase: 'idle', current: '', started: false, state: '', seen: false, hushCount: 0,
    events: [], reads: 0, evaluations: 0, initializations: 0, scrolls: 0,
    crypto: { randomUUID }, performance, setTimeout, clearTimeout, Promise, AbortController,
    FIRST_DEMO_CODE: good, lang: 'en', scribbleOn: false, idleAutoOn: false,
    $(id) {
      if (!elements.has(id)) elements.set(id, { value: '', textContent: '', hidden: false, focus() { c.focused = id; } });
      return elements.get(id);
    },
    t: key => key === 'soundUnavailable' ? 'Unavailable sound: {sounds}' : key,
    setPhase: value => { c.phase = value; }, setState: value => { c.state = value; },
    jamTrack: (name, props) => c.events.push({ name, props }),
    document: { querySelector: () => ({ scrollIntoView() { c.scrolls++; } }) },
    navigator: { clipboard: { readText() { c.reads++; return Promise.resolve(good); } } },
    syncPadsReadyUi() {}, syncFirstDemoUi() {}, revealPads() {}, syncPlayButton() {},
    bumpIdle() {}, clearPads() {}, logLine() {}, onHapHit() {},
    currentExamples: () => [], firstDemoSeen: () => c.seen,
    markFirstDemoSeen: () => { c.seen = true; }, dismissFirstDemo: () => { c.seen = true; },
    getAudioContext: () => ({ state: 'running' }),
    getAnalyzerData: () => new Float32Array([0.01, -0.01]),
    samples: async () => {},
    initStrudel: async () => { c.initializations++; return {}; },
    evaluate: async () => {
      c.evaluations++;
      vm.runInContext('lastTriggeredAttempt = activeAttempt.attempt_id', c);
      return { _Pattern: true, queryArc: () => [{ value: { s: 'sine' } }] };
    },
    fetch: async () => ({ ok: true, status: 200, json: async () => ({ code: good }) }),
    hush: () => { c.hushCount++; },
    ...overrides,
  };
  vm.createContext(c);
  vm.runInContext(paste + audio + playback, c);
  c.bridge = vm.runInContext(status, c);
  return c;
}
const event = (c, name) => c.events.find(e => e.name === name);

test('paste stages a draft without audio, then Apply shares its operation identity', async () => {
  const c = app();
  const imported = await c.openPasteBridge();
  assert.equal(c.$('code').value, good);
  assert.equal(c.focused, 'code');
  assert.equal(c.$('codeFeedback').textContent, 'pasteReady');
  assert.equal(c.phase, 'idle');
  assert.equal(c.initializations, 0);
  assert.equal(c.evaluations, 0);
  const applied = await c.applyEditor();
  assert.equal(applied.phase, 'playing');
  for (const name of ['paste_bridge_open', 'paste_bridge_ready', 'paste_bridge_apply', 'playback_started', 'playback_signal']) {
    const observed = event(c, name);
    assert.ok(observed, name);
    assert.equal(observed.props.attempt_id, imported.attempt_id, name);
    assert.equal(observed.props.source, 'paste_bridge', name);
  }
  c.stopPlayback('transport');
  assert.equal(event(c, 'vibe_stop').props.source, 'paste_bridge');
  assert.equal(event(c, 'vibe_stop').props.trigger, 'transport');
});

test('import does not replace a playing attempt or confuse draft with played code', async () => {
  const c = app();
  await c.playCode(next);
  const before = await c.bridge.getStatus();
  await c.openPasteBridge();
  const after = await c.bridge.getStatus();
  assert.equal(after.attempt_id, before.attempt_id);
  assert.equal(after.code_preview, next);
  assert.equal(after.editor_code_preview, good);
  assert.equal(after.editor_dirty, true);
  assert.equal(after.playback_evidence, 'engine_signal');
  assert.notEqual(after.import_attempt_id, after.attempt_id);
  assert.equal(c.hushCount, 0);
  c.stopPlayback('cleanup');
});

test('busy paste and Apply have no clipboard, focus, editor or status side effects', async () => {
  for (const phase of ['composing', 'loading']) {
    const c = app({ phase, state: 'writing' });
    c.$('code').value = next;
    assert.equal((await c.openPasteBridge()).code, 'BUSY');
    assert.equal((await c.applyEditor()).code, 'BUSY');
    assert.equal((await c.vibe()).code, 'BUSY');
    assert.equal(c.reads, 0);
    assert.equal(c.scrolls, 0);
    assert.equal(c.focused, undefined);
    assert.equal(c.$('code').value, next);
    assert.equal(c.state, 'writing');
    assert.equal(c.events.length, 0);
  }
});

test('Stop invalidates a pending read and a late completion cannot stop a newer Apply', async () => {
  const read = deferred();
  const c = app({ navigator: { clipboard: { readText: () => read.promise } } });
  c.$('code').value = next;
  const pending = c.openPasteBridge();
  c.stopPlayback('transport');
  await c.applyEditor();
  const newer = await c.bridge.getStatus();
  read.resolve(good);
  assert.equal((await pending).code, 'ABORTED');
  const after = await c.bridge.getStatus();
  assert.equal(after.attempt_id, newer.attempt_id);
  assert.equal(after.code_preview, next);
  assert.equal(c.$('code').value, next);
  assert.equal(after.phase, 'playing');
  c.stopPlayback('cleanup');
});

test('a manual edit invalidates a pending read without losing the newer draft', async () => {
  const read = deferred();
  const c = app({ navigator: { clipboard: { readText: () => read.promise } } });
  const pending = c.openPasteBridge();
  c.$('code').value = next;
  c.editorChanged();
  read.resolve(good);
  assert.equal((await pending).code, 'ABORTED');
  assert.equal(c.$('code').value, next);
  assert.equal(c.$('codeFeedback').textContent, 'codeDraft');
  assert.equal(c.evaluations, 0);
});

test('a newer paste invalidates the older read', async () => {
  const first = deferred(), second = deferred();
  let reads = 0;
  const c = app({ navigator: { clipboard: { readText: () => (++reads === 1 ? first.promise : second.promise) } } });
  const old = c.openPasteBridge(), fresh = c.openPasteBridge();
  second.resolve(next); await fresh;
  first.resolve(good);
  assert.equal((await old).code, 'ABORTED');
  assert.equal(c.$('code').value, next);
  assert.equal(c.phase, 'idle');
});

test('starting generation invalidates the pending clipboard read', async () => {
  const read = deferred(), response = deferred();
  let submitted = false;
  const c = app({ navigator: { clipboard: { readText: () => read.promise } }, fetch: () => { submitted = true; return response.promise; } });
  c.$('code').value = next;
  const pending = c.openPasteBridge();
  const generating = c.vibe({ intent: 'quiet melody' });
  for (let i = 0; i < 30 && !submitted; i++) await Promise.resolve();
  assert.equal(submitted, true);
  read.resolve(good);
  assert.equal((await pending).code, 'ABORTED');
  assert.equal(c.$('code').value, next);
  assert.equal(c.state, 'composing');
  response.resolve({ ok: true, status: 200, json: async () => ({ code: good }) });
  assert.equal((await generating).phase, 'playing');
  c.stopPlayback('cleanup');
});

test('clipboard denial, empty and too-long text preserve the draft with distinct feedback', async () => {
  for (const [readText, expected] of [
    [() => Promise.reject(new Error('denied')), 'pasteUnavailable'],
    [() => Promise.resolve('  '), 'pasteEmpty'],
    [() => Promise.resolve('x'.repeat(20001)), 'pasteTooLong'],
  ]) {
    const c = app({ navigator: { clipboard: { readText } } });
    c.$('code').value = next;
    assert.equal((await c.openPasteBridge()).code, expected);
    assert.equal(c.$('code').value, next);
    assert.equal(c.$('codeFeedback').textContent, expected);
    assert.equal(c.evaluations, 0);
  }
});

test('ready-draft edits retain import provenance until the first Apply', async () => {
  const c = app();
  const imported = await c.openPasteBridge();
  c.$('code').value = next; c.editorChanged();
  assert.equal((await c.applyEditor()).attempt_id, imported.attempt_id);
  assert.equal(c.current, next);
  c.stopPlayback('transport');
  assert.notEqual((await c.applyEditor()).attempt_id, imported.attempt_id);
  c.stopPlayback('cleanup');
});

test('unknown registered sound fails explicitly and a compatible retry can play', async () => {
  let missing = true;
  const c = app({ strudel: { soundMap: { get: () => ({ bd: {}, sine: {} }) } }, evaluate: async () => {
    vm.runInContext('lastTriggeredAttempt = activeAttempt.attempt_id', c);
    return { queryArc: () => [{ value: missing ? { s: 'bd', bank: 'missing909' } : { s: 'sine' } }] };
  } });
  c.$('code').value = 's("missing909_bd")';
  const failed = await c.applyEditor();
  assert.equal(failed.code, 'SOUND_UNAVAILABLE');
  assert.equal(c.phase, 'idle');
  assert.equal((await c.bridge.getStatus()).playback_evidence, 'none');
  assert.match(c.$('codeFeedback').textContent, /missing909_bd/);
  assert.equal(c.$('compatibleExample').hidden, false);
  missing = false; c.$('code').value = good;
  assert.equal((await c.applyEditor()).phase, 'playing');
  assert.equal(c.$('compatibleExample').hidden, true);
  c.stopPlayback('cleanup');
});

test('engine prebake loads both maps and derives aliases from registered tr909 sounds', async () => {
  const loaded = [], aliases = [];
  const c = app({
    samples: async url => { loaded.push(url); },
    strudel: { soundMap: { get: () => ({ sine: {}, tr909_bd: {}, tr909_hh: {} }) }, soundAlias: (...args) => aliases.push(args) },
    initStrudel: async options => { await options.prebake(); return {}; },
  });
  await c.ensureStarted();
  assert.deepEqual(loaded.sort(), ['/samples/strudel.json', '/samples/tr909.json']);
  assert.deepEqual(aliases, [['tr909_bd', 'rolandtr909_bd'], ['tr909_hh', 'rolandtr909_hh']]);
});


test('silent events and custom sound sources are not missing sample-bank errors', () => {
  const c = app({ strudel: { soundMap: { get: () => ({}) } } });
  for (const value of [{ s: '-' }, { s: '~' }, { s: '_' }, { s: 'custom', source() {} }]) {
    assert.doesNotThrow(() => c.validatePatternSounds({ queryArc: () => [{ value }] }));
  }
});
