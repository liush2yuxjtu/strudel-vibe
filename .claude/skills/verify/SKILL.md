---
name: verify
description: >-
  Use before any JamFlow (strudel-vibe / vibe-web) git commit, merge, or Vercel deploy,
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
| Playback, generation client, analytics, or funnel changes | A–E, H before commit; I before merge; J after deploy |
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

### H — Playback and funnel regressions

Run `cd vibe-web && npm test`. This includes the existing WebMCP tests and `test/funnel.test.mjs`. The committed preload disables SDK telemetry and replaces global fetch with a rejecting function before SDK imports. Keep unit tests offline; the telemetry flag alone does not disable the SDK collection transport.

Require these outcomes:

- Keep the demo available after initialization or playback fails. Reset failed initialization so retry can succeed.
- Start audio unlock and engine initialization in the original click. Before Strudel installs global functions, use its exported namespace. Do not use a permissive autoplay flag to hide a missing user gesture.
- Inspect both the evaluation result and `repl.state.evalError`. The vendored engine can resolve its Promise after recording a syntax error. A resolved Promise alone is not success.
- Propagate failed playback through generation and WebMCP. Retain the prompt and restore controls after failure.
- Reject overlapping work. Stop must invalidate delayed initialization, generation, and evaluation without stopping a newer attempt.
- Correlate submit, API response, and playback with one `attempt_id` and `source`.
- Label automatic Amplitude pageviews as well as custom events before SDK initialization. Keep known tests, declared automation, and unknown traffic separate. Never infer a crawler from country, Linux, or an empty referrer.
- Treat submit, software start, engine signal, and human hearing as different evidence. See `vibe-web/FUNNEL.md` for event definitions.

### I — Browser acceptance before merge

Run `npm run test:browser` from `vibe-web` when Playwright and Chromium are available. `PLAYWRIGHT_MODULE_PATH` and `CHROMIUM_PATH` select existing installations. This suite uses real Strudel and samples, mocks API responses, and blocks external requests. Do not describe it as a real AI generation test.

If local Chromium cannot launch, use the actual isolated Vercel preview in an accessible browser. Record the exact preview deployment and commit. Use `?audit=<run-id>` for every verification visit. Reuse authorized Vercel access; do not disable deployment protection.

1. On a fresh visit, check empty input feedback and focus in Chinese and English.
2. Click the local demo. Read WebMCP `get_jam_status`: require `phase=playing`, `audio_state=running`, and `playback_evidence=engine_signal` after the observation period. An engine signal is not human hearing.
3. Submit invalid Strudel through Apply or `control_playback`. Require `PLAYBACK_FAILED`, an idle phase, and no playback evidence. Then replay valid code to prove recovery.
4. Stop playback. Require idle, `playing=false`, and `playback_evidence=none`.
5. Verify request failure restores controls and retains input. A preview without a DeepSeek key can prove this failure path, not successful AI generation.
6. Record mobile coverage separately. An unavailable mobile browser is SKIP with the actual reason; desktop acceptance does not prove mobile behavior.

Report I as PASS only for the named checks actually completed. List mocked generation, real generation, and human listening separately. Do not invent evidence for an unavailable check.

### J — Production deployment provenance and acceptance

Use team `team_1VUYYia3RReNLUn2r8ciX2Nb`. Resolve the production domain before deploying. `jamflow-gray.vercel.app` belongs to project `jamflow` (`prj_Wkevgdev2NAkRjZmHJujgmQ40Rhj`). The Git-linked `vibe-web` project (`prj_w4TPAEtA5B3bbkzekIFMz61I9tMJ`) supplies PR previews; its successful build does not prove that the JamFlow production domain changed.

1. Record the current production deployment as the rollback target. Read the PR head and required checks again before merging with an expected-head lease.
2. Confirm the PR is merged into `main`. Deploy the merged commit to the production project with source root `vibe-web`, preserving its existing server-side environment. Do not copy secrets into source or promote a keyless preview as production.
3. Require a READY production deployment for the intended commit. Check the domain alias maps to that deployment. Check served HTML contains `funnel-reliability-v2`, `playback_evidence`, and `repl.state.evalError` for this release.
4. Repeat I's local-demo, invalid-code, replay, Stop, and empty-input checks on `https://jamflow-gray.vercel.app/?audit=<run-id>`. Capture the actual returned status. A build badge or HTTP 200 is insufficient.
5. Use the existing empty-body API health probe to check configuration without a model request. For real generation, read the standing development-cost authorization in root `AGENTS.md`; it is sufficient authorization for necessary task usage estimated below US$5. Do not ask again for the same approved small-cost category. Record the real response, playback evidence, and whether a model request ran. Never expose the key or count health probes as generated music.
6. If production fails an applicable acceptance check, do not report deployment success. Restore the recorded deployment if safe, or fix and repeat the failed check. Keep a short evidence record on the PR.

## Report format (required)

```
JamFlow /verify
A … PASS|FAIL|BLOCKED|SKIP — note
B …
…
H …
I …
J …
Verdict: PASS → applicable checks completed for the stated phase
         FAIL/BLOCKED → stop; list fixes
```

## After PASS

Follow the user's authorized delivery path. For a PR, update its branch, re-check the head, merge when authorized, and verify the actual production target when deployment is requested. Do not infer that a commit or a preview build has shipped.
