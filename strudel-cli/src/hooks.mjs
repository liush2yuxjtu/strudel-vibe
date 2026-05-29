// ESM resolve hook: redirect the browser-only @kabelsalat/web (which @strudel/core's
// bundled dist hard-imports but never uses on the terminal path) to a local stub so
// the Strudel packages load in plain Node.
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve as resolvePath } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const stubUrl = pathToFileURL(resolvePath(here, '..', 'stubs', 'kabelsalat-web', 'index.mjs')).href;

export async function resolve(specifier, context, next) {
  if (specifier === '@kabelsalat/web') {
    return { url: stubUrl, shortCircuit: true };
  }
  return next(specifier, context);
}
