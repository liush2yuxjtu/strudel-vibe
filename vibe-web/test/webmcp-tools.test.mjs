/**
 * Focused unit tests for JamFlow WebMCP tools.
 * Registration goes through @nekuda/webmcp-sdk (vendor copy); modelContext is injected.
 * Handler behavior is exercised via createToolHandlers; register path checks wire names + execute.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createToolHandlers,
  registerJamflowWebMcp,
  TOOL_DEFINITIONS,
  TOOL_NAMES,
  JAMFLOW_TOOLS,
  clipPayload,
} from '../lib/webmcp-tools.mjs';

/** Unwrap SDK-normalized MCP content when present; otherwise return raw. */
function unwrapExecuteResult(out) {
  if (out && Array.isArray(out.content) && out.content[0] && typeof out.content[0].text === 'string') {
    try {
      return JSON.parse(out.content[0].text);
    } catch {
      return out;
    }
  }
  return out;
}

function mockApi(overrides = {}) {
  const state = {
    lang: 'zh',
    phase: 'idle',
    current: '',
    examples: ['四拍底鼓加霓虹 hihat', 'lo-fi 灰尘钢琴软底鼓', 'acid techno bassline'],
  };
  return {
    state,
    async getStatus() {
      return {
        lang: state.lang,
        phase: state.phase,
        playing: state.phase === 'playing',
        code_preview: (state.current || '').slice(0, 120),
        examples: state.examples,
        scribble_on: false,
        idle_on: false,
      };
    },
    async generateMusic(intent, { signal } = {}) {
      if (signal && signal.aborted) {
        const e = new Error('aborted');
        e.name = 'AbortError';
        throw e;
      }
      if (!intent || !String(intent).trim()) {
        return { error: 'intent required', code: 'INTENT_REQUIRED', retryable: false };
      }
      state.current = `s("bd*4") /* ${intent.slice(0, 40)} */`;
      state.phase = 'playing';
      return { code: state.current, phase: 'playing' };
    },
    async controlPlayback(action, { code } = {}) {
      if (action === 'stop') {
        state.phase = 'idle';
        return { phase: 'idle' };
      }
      const c = (code && String(code).trim()) || state.current;
      if (!c) {
        return {
          error: 'No Strudel pattern to play.',
          code: 'NO_PATTERN',
          retryable: false,
          suggestion: 'Call generate_music or run_example first.',
        };
      }
      state.current = c;
      state.phase = 'playing';
      return { phase: 'playing', code: c };
    },
    async runExample({ label, surprise, signal } = {}) {
      let pick = label;
      if (surprise) {
        pick = state.examples[1];
      } else if (!state.examples.includes(label)) {
        return {
          error: `Chip not found: ${label}`,
          code: 'CHIP_NOT_FOUND',
          retryable: false,
          suggestion: 'Call get_jam_status for examples.',
        };
      }
      const gen = await this.generateMusic(pick, { signal });
      if (gen.error) return gen;
      return { label: pick, code: gen.code, phase: gen.phase };
    },
    async setLanguage(language) {
      state.lang = language;
      return { language, examples_preview: state.examples.slice(0, 3) };
    },
    ...overrides,
  };
}

describe('clipPayload', () => {
  it('passes small objects through', () => {
    const o = { ok: true, n: 1 };
    assert.deepEqual(clipPayload(o), o);
  });
});

describe('createToolHandlers', () => {
  it('get_jam_status returns status', async () => {
    const h = createToolHandlers(mockApi());
    const out = await h.get_jam_status();
    assert.equal(out.ok, true);
    assert.equal(out.lang, 'zh');
    assert.ok(Array.isArray(out.examples));
  });

  it('generate_music requires intent', async () => {
    const h = createToolHandlers(mockApi());
    const out = await h.generate_music({ intent: '  ' });
    assert.equal(out.code, 'INTENT_REQUIRED');
    assert.equal(out.retryable, false);
  });

  it('generate_music plays pattern', async () => {
    const h = createToolHandlers(mockApi());
    const out = await h.generate_music({ intent: '四拍底鼓' });
    assert.equal(out.ok, true);
    assert.equal(out.phase, 'playing');
    assert.match(out.code, /bd/);
  });

  it('control_playback stop works', async () => {
    const api = mockApi();
    api.state.phase = 'playing';
    api.state.current = 's("bd")';
    const h = createToolHandlers(api);
    const out = await h.control_playback({ action: 'stop' });
    assert.equal(out.ok, true);
    assert.equal(out.phase, 'idle');
  });

  it('control_playback play without pattern errors', async () => {
    const h = createToolHandlers(mockApi());
    const out = await h.control_playback({ action: 'play' });
    assert.equal(out.code, 'NO_PATTERN');
    assert.ok(out.suggestion);
  });

  it('control_playback play with code works', async () => {
    const h = createToolHandlers(mockApi());
    const out = await h.control_playback({ action: 'play', code: 's("hh*8")' });
    assert.equal(out.ok, true);
    assert.equal(out.phase, 'playing');
  });

  it('run_example requires label or surprise', async () => {
    const h = createToolHandlers(mockApi());
    const out = await h.run_example({});
    assert.equal(out.code, 'EXAMPLE_REQUIRED');
  });

  it('run_example surprise works', async () => {
    const h = createToolHandlers(mockApi());
    const out = await h.run_example({ surprise: true });
    assert.equal(out.ok, true);
    assert.ok(out.label);
  });

  it('run_example unknown chip errors', async () => {
    const h = createToolHandlers(mockApi());
    const out = await h.run_example({ label: 'not-a-real-chip' });
    assert.equal(out.code, 'CHIP_NOT_FOUND');
  });

  it('set_ui_language validates', async () => {
    const h = createToolHandlers(mockApi());
    const bad = await h.set_ui_language({ language: 'fr' });
    assert.equal(bad.code, 'INVALID_LANGUAGE');
    const ok = await h.set_ui_language({ language: 'en' });
    assert.equal(ok.ok, true);
    assert.equal(ok.language, 'en');
  });

  it('native handler resolves errors instead of throwing', async () => {
    const h = createToolHandlers({
      async getStatus() {
        throw new Error('boom');
      },
      async generateMusic() {},
      async controlPlayback() {},
      async runExample() {},
      async setLanguage() {},
    });
    const out = await h.get_jam_status();
    assert.equal(out.code, 'STATUS_FAILED');
    assert.equal(out.retryable, true);
  });
});

describe('registerJamflowWebMcp', () => {
  it('skips when modelContext missing', async () => {
    const r = await registerJamflowWebMcp(mockApi(), null);
    assert.equal(r.skipped, true);
    assert.deepEqual(r.registered, []);
  });

  it('registers all tools and execute works via mock registerTool', async () => {
    const captured = [];
    const modelContext = {
      async registerTool(tool, opts) {
        assert.ok(opts && opts.signal, 'AbortSignal required');
        captured.push(tool);
      },
    };
    const api = mockApi();
    const r = await registerJamflowWebMcp(api, modelContext);
    assert.equal(r.skipped, false);
    assert.deepEqual(r.registered, TOOL_NAMES);
    assert.equal(captured.length, TOOL_NAMES.length);

    // Budgets smoke-check (wire names + descriptions from SDK-registered tools)
    for (const t of captured) {
      assert.ok(t.name.length <= 30, t.name);
      assert.ok(t.description.length <= 500, t.name);
      if (t.annotations) {
        for (const [k, v] of Object.entries(t.annotations)) {
          assert.equal(v, true, `${t.name} annotation ${k} must be true opt-in`);
        }
      }
    }

    const gen = captured.find((t) => t.name === 'generate_music');
    const out = unwrapExecuteResult(await gen.execute({ intent: 'cyber drums' }, {}));
    assert.equal(out.ok, true);

    const play = captured.find((t) => t.name === 'control_playback');
    const stopped = unwrapExecuteResult(await play.execute({ action: 'stop' }, {}));
    assert.equal(stopped.ok, true);

    // abort unregisters future discovery — controller present
    assert.ok(r.controller);
    r.controller.abort();
  });

  it('TOOL_DEFINITIONS match schema tool count', () => {
    assert.equal(TOOL_DEFINITIONS.length, 5);
    assert.deepEqual(
      TOOL_DEFINITIONS.map((t) => t.name),
      TOOL_NAMES,
    );
  });

  it('JAMFLOW_TOOLS are SDK-defined with adopted stableKeys and explicit wire names', () => {
    assert.equal(JAMFLOW_TOOLS.length, 5);
    for (const t of JAMFLOW_TOOLS) {
      assert.equal(t.stableKey, `adopted.${t.name}`);
      assert.equal(t.source, 'merchant_authored');
      assert.ok(TOOL_NAMES.includes(t.name));
    }
    assert.deepEqual(
      JAMFLOW_TOOLS.map((t) => t.name),
      TOOL_NAMES,
    );
  });
});
