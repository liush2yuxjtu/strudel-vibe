# 🎛️ vibe-music (strudel-vibe)

Turn a sentence into live music. Type an intent in **中文 or English**, an LLM
([MiniMax](https://www.minimaxi.com/)) writes [Strudel](https://strudel.cc) code,
and your browser (or terminal) plays it immediately.

> 打字就能做音乐 — 一句话 → MiniMax 写 Strudel 代码 → 浏览器/终端实时出声。

## Surfaces

| Folder | What it is |
|--------|------------|
| **`vibe-web/`** | Static page + `/api/vibe`. Plays in the browser via [`@strudel/web`](https://www.npmjs.com/package/@strudel/web) (WebAudio). The engine (`vendor/`) and samples (`samples/`) are **vendored same-origin** — no unpkg / GitHub at runtime, so it works in mainland China once the page is reachable. Runs on Vercel (`vercel dev`) **or** as a zero-dependency Node server (`node server.mjs`) for an Aliyun/Tencent box. Live: **https://vibe-web-gray.vercel.app** · 国内部署见 [`vibe-web/DEPLOY-CN.md`](vibe-web/DEPLOY-CN.md) |
| **`strudel-cli/`** | Terminal live-coding CLI: evaluates Strudel in plain Node, real-time software synth piped to `ffplay`, tmux live session (`append` / `set` / `hush` / `cps`). |
| **`demo/`** | Playwright recorders that drive vibe-web and capture the **real WebAudio** output (the browser has no audio track + headless has no speakers, so the AudioContext is tapped and recorded). |
| **`video/`** | [Remotion](https://www.remotion.dev/) project: viral / RedNote cuts of the demo with real captured audio + an audio-reactive spectrum. Plus `mobile-mock/` and `design-candidates/` — pure-HTML design explorations for the mobile app & video look. |
| **`media/`** | Static images / assets. |

## Quick start

### Web (vibe-web)
Needs a MiniMax key as an environment variable — **never commit it**:

```bash
export MINIMAX_API_KEY=...        # required
# optional: MINIMAX_BASE_URL, MINIMAX_MODEL
cd vibe-web && vercel dev          # international: Vercel
# or, mainland-China host (zero deps, serves static + /api/vibe):
PORT=8080 node server.mjs          # see DEPLOY-CN.md for ICP + Aliyun/Tencent + HTTPS
```

### Terminal (strudel-cli)
```bash
cd strudel-cli && npm install
node bin/strudel.mjs start          # tmux live session (needs ffplay + tmux)
node bin/strudel.mjs append 's("bd*4, hh*8")'
```

### Video (Remotion)
```bash
cd video && npm install
npx remotion studio                 # preview
npx remotion render ViralCNVertical out/vibe-rednote.mp4
```
Compositions: `ViralVertical`, `ViralLandscape`, `ViralCNVertical` (小红书竖版).
Source clips/audio live in `video/public/`.

## Design explorations
- `video/mobile-mock/index.html` — 3 mobile-first app layouts (Chat / Player / Bold)
- `video/mobile-mock/douyin.html` — 3 抖音-style layouts (black + cyan/red glitch, collapsible code, scrolling feed)
- `video/design-candidates/index.html` — 9 video visual directions

Open any of them in a browser to see the animated mock loop.

## Notes
- The vendored upstream **Strudel** monorepo is intentionally **not** included
  (it's a separate AGPL project; nothing here imports it). Get it from
  [tidalcycles/strudel](https://github.com/tidalcycles/strudel) if you want it.
- `vibe-web` spends MiniMax tokens per request — keep your key private.

## License
Strudel is AGPL-3.0; this project's glue code follows suit. See upstream Strudel
for its full license.
