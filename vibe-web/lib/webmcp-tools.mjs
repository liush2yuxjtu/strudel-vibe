/**
 * JamFlow WebMCP tools — registered via @nekuda/webmcp-sdk (defineTool + registerTools).
 * Handlers call a bridge (window.__vibeWebMcp) so unit tests can mock the app.
 * Browser loads the SDK from ../vendor/webmcp-sdk.js (no bundler; codegen static seam).
 */

import { defineTool, registerTools } from '../vendor/webmcp-sdk.js';

export const TOOL_NAMES = [
  'get_jam_status',
  'generate_music',
  'control_playback',
  'run_example',
  'set_ui_language',
];

const MAX_OUT = 1500;

export function clipPayload(value) {
  const s = typeof value === 'string' ? value : JSON.stringify(value);
  if (s.length <= MAX_OUT) return value;
  if (typeof value === 'string') return s.slice(0, MAX_OUT - 20) + '…[truncated]';
  const copy = { ...value, truncated: true };
  if (typeof copy.code === 'string' && copy.code.length > 200) {
    copy.code = copy.code.slice(0, 200) + '…';
  }
  if (Array.isArray(copy.examples) && copy.examples.length > 8) {
    copy.examples = copy.examples.slice(0, 8);
    copy.examples_truncated = true;
  }
  const again = JSON.stringify(copy);
  if (again.length <= MAX_OUT) return copy;
  return { error: 'Payload too large', code: 'PAYLOAD_TOO_LARGE', retryable: false, truncated: true };
}

function err(message, code, retryable = false, extra = {}) {
  return { error: message, code, retryable, ...extra };
}

export function createToolHandlers(api) {
  if (!api || typeof api !== 'object') {
    throw new Error('createToolHandlers requires an api bridge');
  }

  return {
    async get_jam_status() {
      try {
        const status = await api.getStatus();
        return clipPayload({ ok: true, ...status });
      } catch (e) {
        return err(String(e && e.message || e), 'STATUS_FAILED', true);
      }
    },

    async generate_music({ intent } = {}, { signal } = {}) {
      const text = String(intent || '').trim();
      if (!text) {
        return err(
          'intent is required. Ask the user what they want to hear in Chinese or English.',
          'INTENT_REQUIRED',
          false,
        );
      }
      try {
        const result = await api.generateMusic(text, { signal });
        if (result && result.error) {
          return {
            error: result.error,
            code: result.code || 'GENERATE_FAILED',
            retryable: !!result.retryable,
            ...(result.detail ? { detail: String(result.detail).slice(0, 200) } : {}),
          };
        }
        return clipPayload({
          ok: true,
          intent: text,
          phase: result.phase || 'playing',
          code: result.code || '',
        });
      } catch (e) {
        if (signal && signal.aborted) {
          return err('Generation cancelled.', 'ABORTED', true);
        }
        return err(String(e && e.message || e), 'GENERATE_FAILED', true);
      }
    },

    async control_playback({ action, code } = {}) {
      const act = String(action || '').toLowerCase();
      if (act !== 'play' && act !== 'stop') {
        return err('action must be "play" or "stop".', 'INVALID_ACTION', false);
      }
      try {
        const result = await api.controlPlayback(act, { code });
        if (result && result.error) {
          return {
            error: result.error,
            code: result.code || 'PLAYBACK_FAILED',
            retryable: !!result.retryable,
            ...(result.suggestion ? { suggestion: result.suggestion } : {}),
          };
        }
        return clipPayload({
          ok: true,
          action: act,
          phase: result.phase,
          code: result.code,
        });
      } catch (e) {
        return err(String(e && e.message || e), 'PLAYBACK_FAILED', true);
      }
    },

    async run_example({ label, surprise } = {}, { signal } = {}) {
      const wantSurprise = !!surprise;
      const chip = String(label || '').trim();
      if (!wantSurprise && !chip) {
        return err(
          'Provide label (exact chip text) or set surprise=true. Call get_jam_status for examples.',
          'EXAMPLE_REQUIRED',
          false,
          { suggestion: 'Call get_jam_status, then run_example with a listed label.' },
        );
      }
      try {
        const result = await api.runExample({ label: chip || undefined, surprise: wantSurprise, signal });
        if (result && result.error) {
          return {
            error: result.error,
            code: result.code || 'EXAMPLE_FAILED',
            retryable: !!result.retryable,
            ...(result.suggestion ? { suggestion: result.suggestion } : {}),
          };
        }
        return clipPayload({
          ok: true,
          label: result.label,
          phase: result.phase || 'playing',
          code: result.code || '',
        });
      } catch (e) {
        if (signal && signal.aborted) {
          return err('Example run cancelled.', 'ABORTED', true);
        }
        return err(String(e && e.message || e), 'EXAMPLE_FAILED', true);
      }
    },

    async set_ui_language({ language } = {}) {
      const lang = String(language || '').toLowerCase();
      if (lang !== 'zh' && lang !== 'en') {
        return err('language must be "zh" or "en".', 'INVALID_LANGUAGE', false);
      }
      try {
        const result = await api.setLanguage(lang);
        return clipPayload({
          ok: true,
          language: result.language || lang,
          examples_preview: result.examples_preview || [],
        });
      } catch (e) {
        return err(String(e && e.message || e), 'LANGUAGE_FAILED', false);
      }
    },
  };
}

export const TOOL_DEFINITIONS = [
  {
    name: 'get_jam_status',
    description:
      'Reads JamFlow playback state, UI language, and example prompt chips. Use when checking what is playing, which language is active, or which chips are available before generating or running an example.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'generate_music',
    description:
      'Turns a Chinese or English music description into Strudel and plays it in the browser. Use when the user describes what they want to hear or asks to change the current pattern.',
    inputSchema: {
      type: 'object',
      properties: {
        intent: {
          type: 'string',
          description: 'Musical intent in Chinese or English, as the user phrased it',
        },
      },
      required: ['intent'],
      additionalProperties: false,
    },
    annotations: { untrustedContentHint: true },
  },
  {
    name: 'control_playback',
    description:
      'Starts or stops browser playback of the current Strudel pattern. Use when the user asks to play, resume, or stop the music without regenerating it.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['play', 'stop'],
          description: 'Playback action to perform',
        },
        code: {
          type: 'string',
          description: 'Optional Strudel expression to play; defaults to the editor or last pattern',
        },
      },
      required: ['action'],
      additionalProperties: false,
    },
  },
  {
    name: 'run_example',
    description:
      'Runs a curated prompt chip or a random surprise prompt, then generates and plays music. Use when the user picks an example, wants a surprise, or prefers not to type an intent.',
    inputSchema: {
      type: 'object',
      properties: {
        label: {
          type: 'string',
          description: 'Exact chip text from get_jam_status examples, when not using surprise',
        },
        surprise: {
          type: 'boolean',
          description: 'If true, pick a random example for the current language',
        },
      },
      additionalProperties: false,
    },
    annotations: { untrustedContentHint: true },
  },
  {
    name: 'set_ui_language',
    description:
      'Switches the JamFlow interface between Chinese and English and refreshes example chips. Use when the user asks for 中文, English, or a language change.',
    inputSchema: {
      type: 'object',
      properties: {
        language: {
          type: 'string',
          enum: ['zh', 'en'],
          description: 'UI language code',
        },
      },
      required: ['language'],
      additionalProperties: false,
    },
  },
];

/** Active handlers for this registration scope; set in registerJamflowWebMcp before registerTools. */
let activeHandlers = null;

function wrapExecute(name) {
  return async function execute(args, execOpts) {
    try {
      return await activeHandlers[name](args || {}, execOpts || {});
    } catch (e) {
      return err(String(e && e.message || e), 'UNHANDLED', true);
    }
  };
}

/** defineTool at module scope (SDK validates eagerly). Wire names kept explicit. */
export const JAMFLOW_TOOLS = TOOL_DEFINITIONS.map((def) =>
  defineTool({
    stableKey: `adopted.${def.name}`,
    name: def.name,
    source: 'merchant_authored',
    description: def.description,
    inputSchema: def.inputSchema,
    ...(def.annotations ? { annotations: def.annotations } : {}),
    execute: wrapExecute(def.name),
  }),
);

/**
 * Register all JamFlow tools through @nekuda/webmcp-sdk registerTools.
 * @returns {{ registered: string[], controller: AbortController|null, skipped: boolean, reason?: string }}
 */
export async function registerJamflowWebMcp(api, modelContext) {
  const ctx = modelContext !== undefined
    ? modelContext
    : (typeof document !== 'undefined' ? document.modelContext : undefined);
  if (!ctx || typeof ctx.registerTool !== 'function') {
    return { registered: [], controller: null, skipped: true, reason: 'modelContext unavailable' };
  }

  activeHandlers = createToolHandlers(api);
  const controller = new AbortController();
  const reg = registerTools(JAMFLOW_TOOLS, {
    tracking: {
      builtWith: 'webmcp-kit/connect-existing-tools@mcp',
      apiKey: 'wmk_faI6edhF1fVG7go32y9RiZ1AeBe6XiVkxcF9APJ77QQ' /* publishable key, safe to commit */,
    },
    signal: controller.signal,
    modelContext: ctx,
  });
  const results = await reg.ready;
  const registered = results
    .filter((r) => r.state === 'registered')
    .map((r) => r.name);

  return { registered, controller, skipped: false };
}
