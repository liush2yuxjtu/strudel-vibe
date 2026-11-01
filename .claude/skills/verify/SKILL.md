---
name: verify
description: >-
  Use before any JamFlow (strudel-vibe / vibe-web) git commit or Vercel deploy,
  and when the user says /verify for this repo: run the checklist; FAIL or
  BLOCKED blocks commit/deploy until fixed and re-verified.
---

# JamFlow `/verify`

Gate for **JamFlow** (`liush2yuxjtu/strudel-vibe`, UI in `vibe-web/`, live https://jamflow-gray.vercel.app/). Before commit or deploy, run this checklist. Any **FAIL** or **BLOCKED** → do not commit, do not deploy, fix and re-run.

Shared copy also as [verify-jamflow](sand-workflow:verify-jamflow).

## Iron rules

- HTTP 200 alone is not PASS.
- Do not change `/api/vibe` music logic unless the task explicitly asks; if the change was UI-only, prove the API handler/prompt files are untouched.
- Do not claim `jamflow.vercel.app` (unrelated product). Promote **jamflow-gray.vercel.app** only.
- Prefer local executor for coding; no CloudAgent for this repo unless the user overrides.

## Status vocabulary

Each check: **PASS** | **FAIL** | **BLOCKED** | **SKIP** (with reason). No “partial pass”.

## Surfaces (pick by diff)

| Changed | Run |
|---|---|
| `vibe-web/index.html` UI/CSS/i18n only | A, B, C, D, E |
| `vibe-web/api/**` or DeepSeek/Strudel generation | A, B, F (+ E if shipped) |
| Deploy / aliases / branding | A, E, G |
| Docs only | all SKIP |
| First-time / unclear scope | A–G |

### A — Syntax & structure
1. Extract inline `<script>` from `vibe-web/index.html` (or the edited JS) and run `node --check` on a temp file.
2. Confirm single-page shell still has: prompt `#intent`, send/generate, pads or transport, language toggle, footer.
3. **FAIL** if parse error or critical ids removed without replacement.

### B — API boundary
1. Grep that client still posts to `/api/vibe` (path string present).
2. If task was UI-only: `md5sum` (or git diff) on `vibe-web/api/**` and any SYSTEM_PROMPT / DeepSeek server files must show **no** unintended edits.
3. **FAIL** if music prompt/logic changed without being in scope.

### C — First-run UX regressions (Impeccable baseline)
From production HTML or local `index.html` source:
1. Idle-auto: new users default **off** (no unconditional `checked` / default-true without LS); when on, countdown + dismiss control exist.
2. Chips: progressive disclosure (`CHIP_PREVIEW` or equivalent ≤4 visible before More).
3. Dual CTA: generate/primary vs play secondary until playable (or documented equivalent).
4. Scribble: first-enable coach copy exists in i18n + DOM.
5. Contrast tokens: `--faint` / muted text not rolled back to ultra-gray without reason.
6. Visible footer must **not** show `/vibe-music` pill; JamFlow link OK. JSON-LD `alternateName` may still mention vibe-music (SKIP, not FAIL).
7. EN locale: API-ready (and similar) strings come from i18n, not hard-coded Chinese.

### D — Accessibility / viewport sanity
1. Prefer not reintroducing `maximum-scale=1` if it was removed; if still present, note as known debt (WARN in report, not auto-FAIL unless this verify run’s goal was a11y).
2. Interactive pads must not be both clickable and `aria-hidden` without a documented exception (WARN → FAIL if the change touched pads).

### E — Live / deploy smoke
1. `curl -fsSL https://jamflow-gray.vercel.app/` → 200.
2. Body contains `JamFlow` and title/meta promise still coherent.
3. After a deploy: HTML contains markers for the change under test (string grep), or Vercel deployment for the commit SHA is READY.
4. **FAIL** if live still serves old markers after deploy claimed success (CDN wait ~30s then recheck once).

### F — Generation path (only if API/music changed)
1. One real or mocked `/api/vibe` round-trip: non-empty Strudel-ish code, no 5xx.
2. Do not burn paid quota in a loop; one probe is enough.
3. **BLOCKED** if no API key in env — say so; do not invent success.

### G — Brand / alias hygiene
1. Do not advertise `jamflow.vercel.app`.
2. `vibe-web-gray.vercel.app` may 307 to jamflow-gray (OK).
3. **FAIL** if commit copy or UI claims the wrong product domain.

## Report format (required)

```
JamFlow /verify
A … PASS|FAIL|BLOCKED|SKIP — note
B …
…
Verdict: PASS → ok to commit/push main
         FAIL/BLOCKED → stop; list fixes
```

## After PASS

Per user rule: commit and push **directly to main** (no feature branch / no waiting for a second ask to push), unless the user said otherwise.
