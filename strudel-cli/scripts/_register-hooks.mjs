// Registers the @kabelsalat/web resolve shim before any @strudel import.
// Use via:  node --import ./scripts/_register-hooks.mjs scripts/render-soundtrack.mjs
import { register } from 'node:module';
register(new URL('../src/hooks.mjs', import.meta.url));
