// Stub for @kabelsalat/web so @strudel/core's bundled dist loads in plain Node.
// SalatRepl is only used by the (browser-only) kabelsalat sound path, which the
// terminal CLI never invokes. Constructing it throws to fail loud if ever hit.
export class SalatRepl {
  constructor() {
    throw new Error('[strudel-cli] kabelsalat (SalatRepl) is browser-only and not supported in the terminal CLI.');
  }
}
export default { SalatRepl };
