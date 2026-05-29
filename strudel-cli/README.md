# strudel-cli

Terminal live-coding for [Strudel](https://strudel.cc). Evaluate Strudel patterns
in plain Node, hear them through a real-time software synth (piped to `ffplay`),
and **vibe-code them live** by appending layers from the command line or a tmux
session — perfect for agents driving the music programmatically.

## Requirements
- Node 18+
- `ffplay` (from ffmpeg) for audio — `brew install ffmpeg`
- `tmux` for the live session workflow

## Install
```bash
cd strudel-cli && npm install
npm link            # optional: exposes `strudel` globally
# or call directly: node bin/strudel.mjs <cmd>
```

## Live-coding workflow
```bash
strudel start                     # launch a detached tmux session playing the live buffer
strudel append 's("bd*4, hh*8")'  # add a drum layer (stacked) — the core "vibe-add"
strudel append 'note("c2 eb2 g2 bb2").s("sawtooth").gain(0.6)'   # add a bassline
strudel cps 0.6                   # change tempo (cycles per second)
strudel show                      # print the current buffer
strudel hush                      # silence (session keeps running)
strudel attach                    # watch the live player (Ctrl-b d to detach)
strudel stop                      # kill the session
```
Every `append`/`set` edits the live buffer file; the player hot-reloads it and
swaps the pattern at the next cycle — that's the live-coding loop.

## The live buffer
A plain file (`~/.strudel-cli/live.strudel`) of Strudel expressions separated by
`// ---` markers. Each block is one pattern; blocks are `stack()`ed so appends are
additive. `setcps(n)` / `setcpm(n)` anywhere sets the tempo.

## Natural language → Strudel (MiniMax)
```bash
export MINIMAX_API_KEY=sk-...
strudel translate "四拍鼓加八分hihat"          # → s("bd*4, hh*8")
strudel translate "a dreamy minor bassline" --json   # → {"code":"...","ok":true}
```
`translate` calls MiniMax's Anthropic-compatible endpoint, then compile-checks the
result (self-repairing once on failure), so the printed expression is guaranteed
to load. Pipe it straight into the live buffer: `strudel append "$(strudel translate '加重的 techno')"`.

## Other commands
```bash
strudel play [file]        # run the player in the foreground (used inside tmux)
strudel eval '<code>' [n]  # print n cycles of events as JSON (no audio) — agent-friendly
strudel play --no-audio    # visual-only (no ffplay)
```

## How it works
- `@strudel/transpiler` + `@strudel/core` + `@strudel/mini` + `@strudel/tonal`
  evaluate code into a `Pattern`; `queryArc` yields timed events (haps).
- A wall-clock-paced producer turns scheduled events into f32le PCM and pipes it
  to `ffplay`. Drum names (`bd`,`sd`,`hh`,…) map to synth presets; `note(...)`
  drives oscillators (`sine`/`sawtooth`/`square`/`triangle`).
- The npm build of `@strudel/core` hard-imports the browser-only
  `@kabelsalat/web`; `src/hooks.mjs` redirects it to a stub so everything loads
  in plain Node (it's never used on the terminal path).

AGPL-3.0-or-later (same as Strudel).
