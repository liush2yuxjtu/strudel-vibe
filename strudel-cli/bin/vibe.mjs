#!/usr/bin/env node
// vibe-music TUI entry. Registers the kabelsalat shim before any Strudel import.
import { register } from 'node:module';
register(new URL('../src/hooks.mjs', import.meta.url));
const { runTui } = await import('../src/tui.mjs');
runTui().catch((e) => { console.error(e.stack || String(e)); process.exit(1); });
