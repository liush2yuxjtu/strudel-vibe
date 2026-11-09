import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
function between(start, end) {
  const from = html.indexOf(start);
  const to = html.indexOf(end, from);
  assert.ok(from >= 0 && to > from, `source section ${start}`);
  return html.slice(from, to);
}
const playback = between('  async function runFirstDemo(){', '  // ——— 90s idle');
const audio = between('  async function resumeAudio(){', '  /** Play stays secondary');
function app(overrides = {}) {
  const elements = new Map();
  const c = {
    started: false, current: '', phase: 'idle', lastTriggeredAttempt: null, seen: false, state: '', events: [], hushCount: 0,
    crypto: { randomUUID }, performance, setTimeout, clearTimeout, Promise,
    FIRST_DEMO_CODE: 's("bd*4")',
    $(id) {
      if (!elements.has(id)) elements.set(id, { value: '', textContent: '', focus() { c.focused = id; } });
      return elements.get(id);
    },
    t: key => key,
    setPhase: p => { c.phase = p; }, setState: s => { c.state = s; },
    jamTrack: (name, props) => c.events.push({ name, props }),
    markFirstDemoSeen: () => { c.seen = true; }, firstDemoSeen: () => c.seen,
    dismissFirstDemo: () => { c.seen = true; }, syncFirstDemoUi() {}, revealPads() {}, syncPlayButton() {}, bumpIdle() {}, clearPads() {}, logLine() {}, onHapHit() {}, samples() {},
    getAudioContext: () => ({ state: 'running' }),
    getAnalyzerData: () => new Float32Array([0.01, -0.01]),
    initStrudel: async () => ({}),
    evaluate: async () => vm.runInContext('lastTriggeredAttempt = activeAttempt.attempt_id', c),
    fetch: async () => ({ ok: true, status: 200, json: async () => ({ code: 's("bd")' }) }),
    hush: () => { c.hushCount++; }, ...overrides,
  };
  vm.createContext(c);
  vm.runInContext(audio + playback, c);
  return c;
}
const names = c => c.events.map(e => e.name);
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };

test('empty intent shows feedback and never submits', async () => {
  let requests = 0; const c = app({ fetch: () => { requests++; } });
  c.$('intent').value = '  ';
  assert.equal((await c.vibe()).code, 'INTENT_REQUIRED');
  assert.equal(c.focused, 'intent'); assert.equal(c.state, 'intentRequired');
  assert.equal(requests, 0); assert.equal(names(c).includes('vibe_generate_submit'), false);
});
test('failed engine restores idle, preserves demo and permits retry', async () => {
  let tries = 0; const c = app({ initStrudel: async () => { if (++tries === 1) throw Error('engine failed'); return {}; } });
  assert.equal((await c.runFirstDemo()).code, 'PLAYBACK_FAILED');
  assert.equal(c.phase, 'idle'); assert.equal(c.seen, false);
  assert.equal(names(c).includes('first_demo_play'), false);
  assert.equal((await c.runFirstDemo()).phase, 'playing');
  assert.equal(tries, 2); assert.equal(c.seen, true);
});
test('missing or suspended audio cannot become playback success', async () => {
  for (const ac of [null, { state: 'suspended', resume: async () => {} }, { state: 'suspended', resume: async () => { throw Error('blocked'); } }]) {
    const c = app({ getAudioContext: () => ac });
    assert.equal((await c.runFirstDemo()).code, 'PLAYBACK_FAILED');
    assert.equal(c.phase, 'idle'); assert.equal(c.seen, false);
    assert.equal(names(c).includes('playback_started'), false);
    assert.equal(names(c).includes('vibe_play'), false);
  }
});
test('failed playback propagates through generation and retains prompt', async () => {
  const c = app({ evaluate: async () => { throw Error('bad pattern'); } });
  const out = await c.vibe({ intent: 'drums', source: 'webmcp' });
  assert.equal(out.code, 'PLAYBACK_FAILED'); assert.equal(c.phase, 'idle');
  assert.equal(c.$('intent').value, 'drums'); assert.equal(names(c).includes('vibe_play'), false);
  assert.equal(names(c).includes('vibe_generate_success'), true);
});
test('successful request and playback share one attempt and source', async () => {
  const c = app(); const result = await c.vibe({ intent: 'drums', source: 'chip' });
  assert.equal(result.phase, 'playing');
  const operation = c.events.filter(e => ['vibe_generate_submit', 'vibe_generate_success', 'playback_started', 'vibe_play', 'playback_signal'].includes(e.name));
  assert.ok(operation.length >= 4);
  for (const event of operation) { assert.equal(event.props.attempt_id, result.attempt_id); assert.equal(event.props.source, 'chip'); }
  assert.equal(c.$('intent').value, '');
});
test('upstream failure retains input and restores idle', async () => {
  const c = app({ fetch: async () => ({ ok: false, status: 502, json: async () => ({ error: 'upstream' }) }) });
  assert.equal((await c.vibe({ intent: 'drums' })).code, 'GENERATE_FAILED');
  assert.equal(c.$('intent').value, 'drums'); assert.equal(c.phase, 'idle');
  assert.equal(names(c).includes('playback_started'), false);
});
test('overlapping requests return busy and stop invalidates late generation', async () => {
  const gate = deferred(); let calls = 0;
  const c = app({ fetch: async () => { calls++; await gate.promise; return { ok: true, json: async () => ({ code: 's("bd")' }) }; } });
  const pending = c.vibe({ intent: 'drums' });
  assert.equal((await c.vibe({ intent: 'other' })).code, 'BUSY');
  while (!calls) await Promise.resolve();
  c.stopPlayback('manual'); gate.resolve();
  assert.equal((await pending).code, 'ABORTED'); assert.equal(c.phase, 'idle'); assert.equal(calls, 1);
  assert.equal(names(c).includes('vibe_play'), false);
});
test('stop invalidates late engine initialization', async () => {
  const gate = deferred(); let entered = false;
  const c = app({ initStrudel: () => { entered = true; return gate.promise; } });
  const pending = c.runFirstDemo();
  while (!entered) await Promise.resolve();
  c.stopPlayback('manual'); gate.resolve({});
  assert.equal((await pending).code, 'ABORTED'); assert.equal(c.phase, 'idle'); assert.equal(c.seen, false);
  assert.equal(names(c).includes('first_demo_play'), false);
});
test('stop during evaluation cannot stop a subsequent successful play', async () => {
  const gate = deferred(); let evals = 0;
  const c = app({ evaluate: async () => { if (++evals === 1) await gate.promise; } });
  const old = c.playCode('s("bd")');
  while (!evals) await Promise.resolve();
  c.stopPlayback('manual'); const next = c.playCode('s("hh")'); gate.resolve();
  assert.equal((await old).code, 'ABORTED'); assert.equal((await next).phase, 'playing');
  assert.equal(c.phase, 'playing'); assert.equal(c.current, 's("hh")');
  c.stopPlayback('cleanup');
});
test('already aborted generation does not submit', async () => {
  const controller = new AbortController(); controller.abort();
  const c = app(); assert.equal((await c.vibe({ intent: 'drums', signal: controller.signal })).code, 'ABORTED');
  assert.equal(names(c).includes('vibe_generate_submit'), false);
});
test('first click unlocks shared audio before engine initialization or network wait', async () => {
  for (const mode of ['demo', 'generate']) {
    let resumed = false, initialized = false;
    const ac = { state: 'suspended', resume() { resumed = true; this.state = 'running'; return Promise.resolve(); } };
    const c = app({ getAudioContext: () => ac, initStrudel: async () => { assert.equal(resumed, true); initialized = true; return {}; },
      fetch: async () => { assert.equal(resumed, true); return { ok: true, json: async () => ({ code: 's("bd")' }) }; } });
    const pending = mode === 'demo' ? c.runFirstDemo() : c.vibe({ intent: 'drums' });
    assert.equal(resumed, true, 'resume is invoked in the original input turn');
    assert.equal(initialized, true, 'engine registers its click listener in the original input turn');
    assert.equal((await pending).phase, 'playing');
  }
});
test('first visit can unlock the namespaced engine before global functions exist', async () => {
  let resumed = false;
  const ac = { state: 'suspended', resume() { resumed = true; this.state = 'running'; return Promise.resolve(); } };
  const c = app({ getAudioContext: undefined, strudel: { getAudioContext: () => ac }, initStrudel: async () => { c.getAudioContext = () => ac; return {}; } });
  const result = c.runFirstDemo();
  assert.equal(resumed, true);
  assert.equal((await result).phase, 'playing');
});

const trafficScript = between('  (() => {\n    const params', '  </script>');
function traffic(hostname, search = '', webdriver = false, stored = new Map(), storageFails = false) {
  const c = { window: {}, location: { hostname, search }, navigator: { webdriver }, URLSearchParams,
    sessionStorage: { getItem(k) { if (storageFails) throw Error('denied'); return stored.get(k); }, setItem(k, v) { if (storageFails) throw Error('denied'); stored.set(k, v); } } };
  vm.createContext(c); vm.runInContext(trafficScript, c); return c;
}
test('traffic defaults to unknown on production, never infers bot from OS', () => {
  const c = traffic('jamflow-gray.vercel.app');
  assert.equal(c.window.__jamflowTraffic.traffic_class, 'unknown');
  assert.equal(c.window.__jamflowTraffic.environment, 'production');
  assert.equal(c.window.vaq[0][1]({ type: 'pageview' }).type, 'pageview');
});
test('audit persists in this session and suppresses Vercel self-test pageview', () => {
  const stored = new Map(); const c = traffic('jamflow-gray.vercel.app', '?audit=20261109', false, stored);
  assert.equal(c.window.__jamflowTraffic.traffic_class, 'internal_test');
  assert.equal(c.window.vaq[0][1]({ type: 'pageview' }), null);
  assert.equal(traffic('jamflow-gray.vercel.app', '', false, stored).window.__jamflowTraffic.traffic_class, 'internal_test');
  assert.equal(traffic('jamflow-gray.vercel.app').window.__jamflowTraffic.traffic_class, 'unknown');
});
test('declared automation is diagnostic and storage failure is tolerated', () => {
  const c = traffic('jamflow-gray.vercel.app', '', true, new Map(), true);
  assert.equal(c.window.__jamflowTraffic.traffic_class, 'automation_declared');
  assert.ok(c.window.vaq[0][1]({ type: 'pageview' }));
  assert.equal(traffic('localhost', '', false).window.__jamflowTraffic.traffic_class, 'internal_test');
});
test('Amplitude enrichment exists before init and labels automatic pageviews', async () => {
  const c = traffic('jamflow-gray.vercel.app', '?traffic=internal_test');
  let plugin; let initialized = false;
  c.amplitude = { add(p) { assert.equal(initialized, false); plugin = p; }, init() { assert.ok(plugin); initialized = true; } };
  vm.runInContext(between('  amplitude.add({', '  </script>'), c);
  const e = await plugin.execute({ event_type: '[Amplitude] Page Viewed', event_properties: { path: '/' } });
  assert.equal(e.event_properties.traffic_class, 'internal_test'); assert.equal(e.event_properties.schema_version, 2);
  assert.equal(e.event_properties.path, '/');
});
