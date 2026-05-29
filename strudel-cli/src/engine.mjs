// Strudel evaluation engine for Node.
// Bootstraps the global eval scope (core + mini + tonal) once, then compiles
// user code into a queryable Pattern. The @kabelsalat/web import that core's
// bundled dist hard-requires is redirected to a stub by src/hooks.mjs (see bin).

let _evaluate;
let _ready;

export async function bootstrap() {
  if (_ready) return _ready;
  _ready = (async () => {
    const core = await import('@strudel/core');
    const transpiler = await import('@strudel/transpiler');
    await core.evalScope(
      import('@strudel/core'),
      import('@strudel/mini'),
      import('@strudel/tonal'),
    );
    _evaluate = transpiler.evaluate;
  })();
  return _ready;
}

// Compile a block of Strudel code into a Pattern. Throws on syntax/eval error.
export async function compile(code) {
  await bootstrap();
  const trimmed = (code || '').trim();
  if (!trimmed) return silence();
  const { pattern } = await _evaluate(trimmed);
  if (!pattern || typeof pattern.queryArc !== 'function') {
    throw new Error('code did not evaluate to a pattern');
  }
  return pattern;
}

export function silence() {
  // globalThis.silence is registered by evalScope
  return globalThis.silence;
}

// Query one cycle [cycle, cycle+1) and return only haps that have an onset.
export function queryCycle(pattern, cycle) {
  const haps = pattern.queryArc(cycle, cycle + 1);
  return haps.filter((h) => (h.hasOnset ? h.hasOnset() : true));
}
