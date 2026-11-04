# JamFlow WebMCP — Autonomous Mode design notes (Stages 1–4)

Product: JamFlow (`vibe-web/`) — type Chinese/English → DeepSeek → Strudel play in browser; chips; play/stop; i18n; scribble (pointer).

Framework: Vanilla JS → native `document.modelContext.registerTool` (D2-migratable). Not React/Angular/declarative forms.

## Stage 1 — Goal portfolio

### Goal A — Describe music and hear it
- Ideal: User’s NL intent becomes audible Strudel in the tab.
- Context: Intent text; optional current pattern for “modify this”.
- Boundary: Agent must not fire endless generates; one clear intent per call. No deploy/API-key changes.

### Goal B — Control playback
- Ideal: Play or stop the current pattern without regenerating.
- Context: Current code / textarea; phase idle|playing|….
- Boundary: Stop is always OK. Play needs existing code — ask or generate first if empty.

### Goal C — Explore without typing
- Ideal: Run a curated chip or surprise prompt; optionally switch ZH/EN UI.
- Context: Chip list for current language; language preference.
- Boundary: Running a chip spends a generate (same as Goal A). Language switch is UI-only.

**Selected coherent set (Portfolio-First):** A + B + C → tools below after Stages 2–4.

Self-critique (portfolio): Scribble is pointer-driven; exposing “draw notes” would invent UX the agent can’t perform well — omit music-from-scribble tools. Idle-auto is preference chrome, not a primary agent task — omit.

## Stage 2 — Starting states (per goal)

| Goal | Route | Entities | Session | Constraints |
|------|-------|----------|---------|-------------|
| A | `/` (SPA) | intent empty or filled; `current` pattern maybe set | Fresh or mid-session; lang zh\|en | `/api/vibe` must be reachable; DeepSeek key server-side |
| B | `/` | code textarea / `current`; phase | Same | Empty code → cannot play |
| C | `/` | chips for lang; lang toggle | localStorage lang | Chip text must match list (or surprise) |

Pruned: battery, GPU, DPI, network RTT.

## Stage 3 — Role-play summaries + self-critique

### Goal A (happy path)
- User: “做一段赛博朋克鼓点”
- Agent → `generate_music({ intent: "赛博朋克鼓点" })`
- Tool → `{ ok:true, code:"s(\"bd*4, hh*8\")…", phase:"playing" }` (code truncated in payload)
- UI: composing → code LCD updates → pads flash / playing LED
- Agent: “已经开始演奏赛博鼓点。”
- **Critique**: Tone concise OK. Clarifying: if intent empty, ask — don’t invent genre. Boundary: generate is routine mutation (no consequentialHint); returns model code → untrustedContentHint.

### Goal B
- User: “先停一下”
- Agent → `control_playback({ action: "stop" })`
- Tool → `{ ok:true, phase:"idle" }`
- UI: hush, LED idle
- Critique: Don’t require confirm for stop. If user says “再放一次” with no code → ask to generate or report NO_PATTERN.

### Goal C
- User: “用英文界面，随便来一首”
- Agent → `set_ui_language({ language:"en" })` then `run_example({ surprise:true })`
- Critique: Order language before surprise so chip language matches. Ambiguous “随便” → surprise OK.

## Stage 4 — Variations

1. Missing intent → generate_music returns `{ error, code:"INTENT_REQUIRED", retryable:false }`; agent asks.
2. Play with no code → `{ code:"NO_PATTERN", suggestion:"Call generate_music or run_example first." }`
3. Unknown chip label → `{ code:"CHIP_NOT_FOUND", suggestion:"Call get_jam_status for examples." }`
4. Coreference “再来一次那种” → agent reuses prior intent or current pattern via generate_music with same intent / modify phrasing.
5. No payment/delete actions → no consequentialHint tools; no initiate_* hand-off needed.

## Consolidated tools (Stage 5 input)

1. `get_jam_status` — readOnly
2. `generate_music` — mutate + untrustedContentHint
3. `control_playback` — play|stop
4. `run_example` — chip label or surprise
5. `set_ui_language` — zh|en
