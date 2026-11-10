---
name: verify
description: >-
  Use before any JamFlow (strudel-vibe / vibe-web) direct commit, push, or Vercel deploy,
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
| Playback, generation client, analytics, or funnel changes | A–E, H before commit; I before push; J after deploy |
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

### I — Browser acceptance before direct push

Run `npm run test:browser` from `vibe-web` when Playwright and Chromium are available. `PLAYWRIGHT_MODULE_PATH` and `CHROMIUM_PATH` select existing installations. This suite uses real Strudel and samples, mocks API responses, and blocks external requests. Do not describe it as a real AI generation test.

If local Chromium cannot launch, use the actual isolated Vercel preview in an accessible browser. Record the exact preview deployment and commit. Use `?audit=<run-id>` for every verification visit. Reuse authorized Vercel access; do not disable deployment protection.

1. On a fresh visit, check empty input feedback and focus in Chinese and English.
2. Click the local demo. Read WebMCP `get_jam_status`: require `phase=playing`, `audio_state=running`, and `playback_evidence=engine_signal` after the observation period. An engine signal is not human hearing.
3. Submit invalid Strudel through Apply or `control_playback`. Require `PLAYBACK_FAILED`, an idle phase, and no playback evidence. Then replay valid code to prove recovery.
4. Stop playback. Require idle, `playing=false`, and `playback_evidence=none`.
5. Verify request failure restores controls and retains input. A preview without a DeepSeek key can prove this failure path, not successful AI generation.
6. Run `npm run test:mobile` for 360px and 390px Chromium touch emulation against production, or set `JAMFLOW_URL` for a preview. The script rejects non-empty generation requests, tests local audio and the previously returned AI pattern, and checks overflow, empty-input focus, invalid-code rejection, and Stop. Record emulation separately from physical-device or Safari coverage.

Both browser scripts require Playwright and its browser. If the runner lacks them, use `npm install --no-save --package-lock=false playwright@1.62.1` and `npx playwright install --with-deps --only-shell chromium`, or select installed dependencies with `PLAYWRIGHT_MODULE_PATH` and `CHROMIUM_PATH`. If the local execution environment cannot launch Chromium, use an isolated short-lived test runner within the authorized cost budget, then stop it. A one-vCPU, non-persistent Vercel Sandbox with a five-minute timeout was sufficient for this project. Do not leave test compute running.

Report I as PASS only for the named checks actually completed. List mocked generation, real generation, and human listening separately. Do not invent evidence for an unavailable check.

### Paste bridge acceptance

For changes to import, editor ownership, sound maps, or code feedback, run
`npm run test:paste` against the exact verified checkout or preview before push and the production
domain after release. Use `JAMFLOW_URL`, `JAMFLOW_EVIDENCE`,
`PLAYWRIGHT_MODULE_PATH`, and `CHROMIUM_PATH` to select the target and runner.

Require the official `tr909` fixture to reach `engine_signal` after explicit
Apply. Paste alone must only stage a draft. Check both languages at desktop,
390px and 360px touch emulation. Require at least a 44px paste target, editor
focus, no overflow, invalid syntax recovery, missing-sound feedback and the
compatible-example action. Keep actual played code distinct from unapplied
editor text. Check paste, Apply, playback and signal share an attempt and source.

Keep delayed-clipboard Stop, replacement, edit and generation races in the
offline regressions. Do not call their deferred clipboard doubles real browser
acceptance. For the final generation check, set `JAMFLOW_REAL_GENERATION=1` once
within the standing task budget. Require the same generation attempt across
submit, response, software start and engine signal. Busy paste and Apply must
preserve the editor and composing status. No response mock may satisfy this run.

Download and validate the evidence files before stopping temporary test compute.
A failed download is an evidence gap. Stop the compute after saving evidence.
Continue to label physical-device, Safari and human-listening coverage separately.

### J — Production deployment provenance and acceptance

Use team `team_1VUYYia3RReNLUn2r8ciX2Nb`. Resolve the production domain before deploying. `jamflow-gray.vercel.app` belongs to project `jamflow` (`prj_Wkevgdev2NAkRjZmHJujgmQ40Rhj`). The Git-linked `vibe-web` project (`prj_w4TPAEtA5B3bbkzekIFMz61I9tMJ`) supplies separate builds/previews; its successful build does not prove that the JamFlow production domain changed.

1. Record the current production deployment as the rollback target. Fetch current main, verify the intended checkout, and use a non-force push or expected-head lease to avoid overwriting concurrent changes.
2. Confirm the verified direct commit is on `main`. Deploy that exact commit to the production project with source root `vibe-web`, preserving its existing server-side environment. Do not copy secrets into source or promote a keyless preview as production.
3. Require a READY production deployment for the intended commit. Check the domain alias maps to that deployment. Check served HTML contains `funnel-reliability-v2`, `playback_evidence`, and `repl.state.evalError` for this release.
4. Repeat I's local-demo, invalid-code, replay, Stop, and empty-input checks on `https://jamflow-gray.vercel.app/?audit=<run-id>`. Capture the actual returned status. A build badge or HTTP 200 is insufficient.
5. Use the existing empty-body API health probe to check configuration without a model request. For real generation, read the standing development-cost authorization in root `AGENTS.md`; it is sufficient authorization for necessary task usage estimated below US$5. Do not ask again for the same approved small-cost category. Record the real response, playback evidence, and whether a model request ran. Never expose the key or count health probes as generated music.
6. If production fails an applicable acceptance check, do not report deployment success. Restore the recorded deployment if safe, or fix and repeat the failed check. Keep a short evidence record in the project Page or scoped repository docs.

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

Follow the project AGENTS.md delivery policy. Commit directly to main after the applicable checks pass, refresh remote main, and push without overwriting concurrent work. Do not create an Issue or PR and do not add CI workflows. Run these checks directly; no CI badge or review bot replaces them. When shipping is requested, verify the exact production target after deployment. Store commit and runtime evidence in the project Page or scoped repository docs. A docs-only update uses SKIP with reasons for product checks and must not relabel existing product blockers.

### Feedback entry

For feedback UI changes, run offline privacy checks and `npm run test:feedback`.
Require Chinese/English desktop and mobile, default exclusion of prompt/code,
explicit editable opt-in, cancellation and blocked-submission draft retention.
Use `FEEDBACK_REAL_SUBMIT=1` once on production and read the resulting labelled
submission from the Jotform inbox. A new tab or client event is not delivery.
Keep the standalone form usable if the popup or native POST fails.

When provider CAPTCHA requires a human, retain the automated result as BLOCKED.
Explicit owner confirmation of a successful manual user-path test may complete
that path's acceptance. Record who confirmed, the date, and separately any
provider receipt/count actually read. Do not label this an automated E2E PASS
or claim submission contents were inspected when only a count was available.

### First-generation onboarding regression

When changing the hero, starter chips or first-demo flow, run `npm test` and the actual Chromium `npm run test:browser` suite from `vibe-web`. Verify that Generate remains a visible primary action before demo, a completed first demo shows Make it mine, its click prefills/focuses without an API request, submission is explicit, and English mobile remains usable. Separate mocked API tests from real API verification, and do not claim that traffic conversion improved without eligible post-release Amplitude data. See `docs/COMPETITOR_ACTIVATION_2026-11-10.md`.
