// Command dispatcher for the strudel CLI.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import {
  ensureHome, initLive, liveFile, writeState, readState,
  appendLayer, setBuffer, hush as hushFile, DEFAULT_LIVE,
} from './livefile.mjs';
import { readFileSync, existsSync } from 'node:fs';
import * as tmux from './tmux.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BIN = join(__dirname, '..', 'bin', 'strudel.mjs');

const HELP = `🌀 strudel-cli — terminal live-coding for Strudel

Usage: strudel <command> [args]

Session (tmux):
  start [file]        Launch a detached tmux session ('${tmux.SESSION}') playing the live buffer
  attach              Attach to the live session (Ctrl-b d to detach)
  stop                Kill the live session
  status              Show session + buffer state

Live coding:
  append "<code>"     Add a Strudel layer (stacked with current) — the core "vibe-add"
  set "<code>"        Replace the whole buffer with one pattern
  hush                Silence (keeps the session running)
  show                Print the current live buffer
  cps <n>             Set cycles-per-second (tempo)

Direct play / inspect:
  play [file]         Run the live player in the foreground (used inside tmux)
  eval "<code>" [n]   Evaluate code and print n cycles of events (no audio)

Flags: --no-audio (visual only), --file <path>
`;

function parseFlags(args) {
  const flags = { audio: true, file: null };
  const rest = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--no-audio') flags.audio = false;
    else if (a === '--file') flags.file = args[++i];
    else rest.push(a);
  }
  return { flags, rest };
}

export async function main(argv) {
  const { flags, rest } = parseFlags(argv);
  const cmd = rest[0];
  const file = flags.file || liveFile();

  switch (cmd) {
    case undefined:
    case 'help': case '-h': case '--help':
      process.stdout.write(HELP); return;

    case 'start': {
      ensureHome();
      const target = rest[1] ? resolve(rest[1]) : DEFAULT_LIVE;
      initLive(target);
      writeState({ file: target, session: tmux.SESSION, startedAt: Date.now() });
      if (!tmux.hasTmux()) { console.error('tmux not found. Run `strudel play` directly instead.'); process.exit(1); }
      if (tmux.sessionExists()) { console.log(`session '${tmux.SESSION}' already running. \`strudel attach\` to view.`); return; }
      const audioFlag = flags.audio ? '' : ' --no-audio';
      const playCmd = `node ${BIN} play --file ${target}${audioFlag}`;
      tmux.newSession(tmux.SESSION, playCmd);
      console.log(`▶  started session '${tmux.SESSION}' playing ${target}`);
      console.log(`   vibe it:  strudel append "s(\\"bd*4, hh*8\\")"`);
      console.log(`   watch it: strudel attach`);
      return;
    }

    case 'play': {
      const { Player } = await import('./player.mjs');
      const p = new Player(file, { audio: flags.audio });
      await p.start();
      // keep alive
      await new Promise(() => {});
      return;
    }

    case 'append': {
      if (!rest[1]) { console.error('usage: strudel append "<code>"'); process.exit(1); }
      appendLayer(file, rest[1]);
      console.log(`＋ layer added → ${file}`);
      return;
    }
    case 'set': {
      if (!rest[1]) { console.error('usage: strudel set "<code>"'); process.exit(1); }
      setBuffer(file, rest[1]);
      console.log(`✓ buffer set → ${file}`);
      return;
    }
    case 'hush': {
      hushFile(file);
      console.log('🤫 hushed');
      return;
    }
    case 'cps': {
      if (!rest[1]) { console.error('usage: strudel cps <n>'); process.exit(1); }
      const cur = existsSync(file) ? readFileSync(file, 'utf8') : 'silence';
      // prepend a setcps directive (compose picks up the last one)
      setBuffer(file, `setcps(${parseFloat(rest[1])})\n${cur}`);
      console.log(`⏱  cps → ${parseFloat(rest[1])}`);
      return;
    }
    case 'show': {
      console.log(existsSync(file) ? readFileSync(file, 'utf8') : '(empty)');
      return;
    }
    case 'status': {
      const st = readState();
      console.log('file:    ', file);
      console.log('session: ', tmux.SESSION, tmux.sessionExists() ? '(running)' : '(stopped)');
      console.log('started: ', st.startedAt ? new Date(st.startedAt).toLocaleString() : '-');
      return;
    }
    case 'attach': {
      if (!tmux.sessionExists()) { console.error("no session. run 'strudel start' first."); process.exit(1); }
      await tmux.attach();
      return;
    }
    case 'stop': {
      tmux.killSession();
      console.log('■ stopped');
      return;
    }
    case 'eval': {
      const code = rest[1];
      const n = parseInt(rest[2] || '1', 10);
      if (!code) { console.error('usage: strudel eval "<code>" [cycles]'); process.exit(1); }
      const { compile, queryCycle } = await import('./engine.mjs');
      const pat = await compile(code);
      for (let c = 0; c < n; c++) {
        const haps = queryCycle(pat, c);
        for (const h of haps) {
          console.log(`${c}+${Number(h.part.begin) - c}\t${JSON.stringify(h.value)}`);
        }
      }
      return;
    }
    default:
      console.error(`unknown command: ${cmd}\n`);
      process.stdout.write(HELP);
      process.exit(1);
  }
}
