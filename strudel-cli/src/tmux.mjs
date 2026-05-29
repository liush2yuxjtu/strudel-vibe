// Thin tmux helpers for the live-coding session.
import { spawnSync, spawn } from 'node:child_process';

export const SESSION = process.env.STRUDEL_CLI_SESSION || 'strudel';

export function hasTmux() {
  return spawnSync('tmux', ['-V'], { stdio: 'ignore' }).status === 0;
}

export function sessionExists(name = SESSION) {
  return spawnSync('tmux', ['has-session', '-t', name], { stdio: 'ignore' }).status === 0;
}

export function newSession(name, cmd) {
  // start a detached session running `cmd` in a login shell
  return spawnSync('tmux', ['new-session', '-d', '-s', name, cmd], { stdio: 'ignore' }).status === 0;
}

export function killSession(name = SESSION) {
  return spawnSync('tmux', ['kill-session', '-t', name], { stdio: 'ignore' }).status === 0;
}

export function attach(name = SESSION) {
  const p = spawn('tmux', ['attach', '-t', name], { stdio: 'inherit' });
  return new Promise((res) => p.on('close', res));
}

export function capture(name = SESSION) {
  const r = spawnSync('tmux', ['capture-pane', '-p', '-t', name], { encoding: 'utf8' });
  return r.stdout || '';
}
