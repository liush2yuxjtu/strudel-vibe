// Natural-language TUI: type intent in Chinese/English, MiniMax turns it into a
// Strudel pattern, and it is vibe-added to the live buffer that the player is
// hot-reloading. Keeps no tmux logic so it composes into any pane layout.
import readline from 'node:readline';
import { readFileSync, existsSync } from 'node:fs';
import { compile } from './engine.mjs';
import { translateValid } from './translate.mjs';
import {
  liveFile, initLive, appendLayer, setBuffer, hush as hushFile,
} from './livefile.mjs';

const C = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  mag: (s) => `\x1b[35m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

function readBuf(file) {
  return existsSync(file) ? readFileSync(file, 'utf8') : 'silence';
}

export async function runTui() {
  const file = liveFile();
  initLive(file);
  // verify the key early
  try {
    const { getKey } = await import('./translate.mjs');
    getKey();
  } catch {
    console.error(C.red('MINIMAX_API_KEY is not set. Export it before launching vibe.'));
    process.exit(1);
  }

  console.log(C.bold(C.mag('\n  🎹 vibe-music')) + C.dim('  — type what you want, in 中文 or English'));
  console.log(C.dim(`  buffer: ${file}`));
  console.log(C.dim('  it evolves the whole groove each time — try "加一条贝斯" then "鼓声小一点".'));
  console.log(C.dim('  commands: =<literal strudel>  /show  /hush  /quit\n'));

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const prompt = () => rl.setPrompt(C.mag('🎹 vibe> ')) || rl.prompt();
  prompt();

  let chain = Promise.resolve();
  rl.on('line', (raw) => { chain = chain.then(() => handleLine(raw)); });

  async function handleLine(raw) {
    const line = raw.trim();
    if (!line) return prompt();

    if (line === '/quit' || line === '/exit' || line === '/q') { rl.close(); return; }
    if (line === '/hush') { hushFile(file); console.log(C.yellow('  🤫 hushed')); return prompt(); }
    if (line === '/show') { console.log(C.dim('  ─ buffer ─\n') + readBuf(file).replace(/^/gm, '  ')); return prompt(); }

    const intent = line;
    // literal code escape hatch
    if (line.startsWith('=')) {
      const code = line.slice(1).trim();
      try { await compile(code); appendLayer(file, code); console.log(C.green('  ＋ ') + C.cyan(code)); }
      catch (e) { console.log(C.red('  ✗ ' + e.message)); }
      return prompt();
    }

    process.stdout.write(C.dim('  …vibing\r'));
    try {
      const current = readBuf(file);
      const { code, ok, error, repaired } = await translateValid(intent, current, compile);
      if (!ok) { console.log(C.red('  ✗ could not make that play: ' + error)); return prompt(); }
      setBuffer(file, code);
      console.log(`  ${C.green('♪ now playing')}${repaired ? C.dim(' (auto-fixed)') : ''}  ${C.cyan(code)}`);
    } catch (e) {
      console.log(C.red('  ✗ ' + e.message));
    }
    prompt();
  }

  let closing = false;
  rl.on('close', () => {
    if (closing) return; closing = true;
    chain.then(() => { console.log(C.dim('\n  bye 👋')); process.exit(0); });
  });
}
