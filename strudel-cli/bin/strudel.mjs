#!/usr/bin/env node
// Entry point. Registers the @kabelsalat/web resolve shim BEFORE any Strudel
// import (see src/hooks.mjs), then dispatches the command.
import { register } from 'node:module';
register(new URL('../src/hooks.mjs', import.meta.url));
const { main } = await import('../src/cli.mjs');
main(process.argv.slice(2)).catch((e) => {
  console.error(e && e.stack ? e.stack : String(e));
  process.exit(1);
});
