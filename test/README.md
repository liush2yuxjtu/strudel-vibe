# eval harness — third-party judge for `eval.md`

Runs all 5 points of [`../eval.md`](../eval.md) with fixed tools and prints one
JSON verdict (plus raw evidence to `test/evidence/verdict.json`). No self-grading:
each point passes only if observable output matches a fixed predicate.

## Run
```bash
export MINIMAX_API_KEY=sk-...                       # needed for #3, #4, #5
node test/run-evals.mjs                             # judges the deployed site
node test/run-evals.mjs --url http://localhost:8080/   # or a local server.mjs
```
Exit code is `0` only when all five pass.

## What each check observes
| # | Tool | Pass predicate (observable) |
|---|---|---|
| 1 | `strudel eval 's("bd*4")' 1` | 4 events, all `s:"bd"`, begins {0,.25,.5,.75} |
| 2 | tmux `start`→`append`×2→`show`+`capture-pane` | buffer = 2 blocks, `layers: 2`, cycle increases |
| 3 | `strudel translate "四拍鼓加八分hihat" --json` | `ok:true` + one Strudel expression that compiled |
| 4 | HTTP + headless Chromium | home 200, `/api/vibe`→`{code}`, `AudioContext.state==='running'` after play |
| 5 | headless Chromium timeline | click→composing < 100ms, UI never static >1s while composing, bars animate while playing |

## Requirements
- Node 18+ (CLI), `tmux` (#2)
- Python `playwright` with Chromium (#4/#5): `pip install playwright && playwright install chromium`

`browser-eval.py` can also be run standalone: `python3 test/browser-eval.py <url>`.
