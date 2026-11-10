# JamFlow funnel verification

The client distinguishes an attempted operation, an API response, software playback, and a measured engine signal. None proves that a person heard the audio.

## Events

| Event | Evidence |
| --- | --- |
| `first_demo_exposed` | At least half of the demo region entered the viewport. |
| `first_demo_click` | A local demo attempt began. |
| `vibe_generate_submit` | A non-empty generation attempt began. This does not prove an API response. |
| `vibe_generate_request_sent` | Audio initialization finished and the client began its API fetch. `elapsed_ms` starts at submit. |
| `vibe_generate_success` | The API returned a successful response with non-empty code. This does not prove valid or audible code. |
| `vibe_generate_failed` | Generation did not complete, including cancellation or audio initialization failure. |
| `playback_started`, legacy `vibe_play` | Code evaluation completed and the AudioContext was running. |
| Legacy `first_demo_play` | The local demo reached the same software playback state. |
| `playback_failed` | Playback failed or its attempt was cancelled. |
| `playback_signal` | A scheduled trigger for this attempt coincided with non-zero analyser RMS and a running context. |
| `playback_signal_unconfirmed` | The client did not observe that signal within four seconds. This is not an API failure. |
| `generate_validation_failed` | The submitted description was empty. |

Operation events carry `attempt_id` and `source`. A generation response and its playback use the same attempt. Exposure and validation events have no completed operation. Events carry lengths, not prompt text or generated code.

The signal uses the existing Strudel analyser through `.analyze(9001)`. It can include overlapping voices or effect tails. Device volume, output routing, and human hearing remain outside this evidence.

WebMCP status includes `audio_state`, `attempt_id`, and `playback_evidence`. Evidence is `none`, `software_started`, or `engine_signal`. A logical `playing` status alone is not a listening result.

## Traffic cohorts

Every Amplitude event, including automatic pageviews, receives these properties before it leaves the client:

| Property | Values |
| --- | --- |
| `traffic_class` | `internal_test`, `automation_declared`, `unknown` |
| `environment` | `local`, `preview`, `production` |
| `schema_version` | `3` |
| `release` | `funnel-reliability-v2` (legacy compatibility) |
| `activation_version` | `activation-entry-v3-20261111` |
| `page_instance_id` | Random per document load; not a person ID |
| `viewport_bucket` | `mobile` (≤520px), `desktop` |
| `entry_language` | `zh`, `en` at entry |
| `entry_state` | `demo_seen`, `demo_unseen`, `storage_unavailable`; not a new-user flag |

Localhost, `?audit=...`, and `?traffic=internal_test` mark a known test. The explicit test mark persists within sessionStorage for that tab. A fresh tab session without the mark returns to normal classification. Declared WebDriver automation receives a diagnostic label, not a claim that a visitor is a crawler. Country, Linux, and missing referrers do not determine classification.

Amplitude retains test events with their label. Vercel's beforeSend hook excludes only `internal_test`. These platforms therefore remain separate measurements. Vercel visitor hashes and Amplitude anonymous identifiers cannot be joined as person IDs.

For the new release, report production `unknown`, production `automation_declared`, and known tests separately. Do not erase unclassified history or call `unknown` verified humans. Keep existing promotion thresholds on their original Page-to-submit metric. Report API success, software playback, and signal rates beside it. Do not count submits as sound or require the optional demo in the direct-generation path.

## Local checks

Run `npm test` from `vibe-web`. The preload disables optional SDK telemetry and replaces global fetch with a rejecting function before SDK imports. The telemetry flag alone does not disable the SDK collection transport. The tests use mock dependencies and cannot call DeepSeek or send SDK collection requests.

Run `npm run test:browser` with Playwright available and Chromium installed. `PLAYWRIGHT_MODULE_PATH` can select an existing Playwright module, and `CHROMIUM_PATH` can select Chromium. The suite starts a temporary local server, uses real Strudel and samples, and mocks API responses. It blocks external browser requests and disables SDK telemetry. It does not replace a real AI generation or a human listening check.

The browser checks cover empty input, demo playback, initialization retry, blocked audio, invalid generated code, failed requests, Stop during pending work, duplicate submission, and a mobile viewport. The browser runs with the normal autoplay policy.

## Release acceptance

1. Run the project `/verify` checklist and Node regressions before commit.
2. Open an isolated preview with an explicit audit mark. Check both languages, demo replay, Stop, and empty input on desktop and mobile.
3. Inspect the network and compare one attempt across submit, response, playback, and signal events. Confirm that the automatic pageview carries traffic classification.
4. Perform one authorized real generation and a human listening check before claiming that the complete production experience works. A successful mocked request is not that evidence.
5. Compare eligible cohorts after release. This patch does not identify historical visitors or establish improved conversion by itself.

## Production acceptance on 2026-11-09

Production commit `bc9bb3b` passed one authorized real generation at `jamflow-gray.vercel.app` with the `full-verify-bc9bb3b` audit mark. The description requested a light four-beat rhythm with a soft C minor bassline. The returned pattern was:

```js
stack(s("bd*4, ~ cp, hh*8").gain(0.8), note("<c2 c2 eb2 g2>").s("sine").lpf(500).gain(0.5).room(0.2))
```

The generation attempt `c1af2c78-0a91-4d42-ab98-2d18d594e858` reached `phase=playing`, `audio_state=running`, and `playback_evidence=engine_signal`. Stop returned `idle`, `playing=false`, and `none`. Replay of the same returned code again reached engine signal without another generation request. Final playback was stopped.

This is evidence of a real model response and engine signal, not a human listening result. The application did not return provider token usage or the exact charge.

Chromium mobile emulation at 390×844 and 360×844 also passed. There was no horizontal overflow; the demo target was 48px tall; empty input focused the description; demo and replay of the returned AI pattern reached engine signal; invalid code returned `PLAYBACK_FAILED`; Stop cleared playback evidence. These mobile checks made zero generation requests and blocked external browser requests. Physical devices and Safari were not tested.

Reproduce this with `npm run test:mobile`. The script accepts `PLAYWRIGHT_MODULE_PATH`, `CHROMIUM_PATH`, and `JAMFLOW_URL`; it refuses non-empty generation requests so it cannot consume model quota.

The complete `test:browser` suite also passed all 10 scenarios in a short-lived Vercel Sandbox with Playwright 1.62.1. Its API responses were mocked; Strudel and samples were real. The failure fixture installs its evaluation override after engine initialization because Strudel installs global functions during startup. Both temporary sandboxes were stopped after verification.

## Strudel import contract

The paste chip imports a draft. It does not evaluate clipboard contents. The
user chooses Apply & play after reviewing the draft. Import while an existing
pattern plays preserves that pattern and its attempt. Stop, a newer import,
manual editing during a read, or a new operation invalidates a delayed clipboard
result.

`paste_bridge_open`, `paste_bridge_ready`, `paste_bridge_apply`, playback and
signal events share `attempt_id` and `source=paste_bridge` for the first Apply of
an imported draft. `paste_bridge_failed` records clipboard failures.
`paste_bridge_cancelled` records invalidated imports. These events do not prove
playback or human hearing. Stop preserves the operation source and records its
physical control as `trigger`.

Status returns `code_preview` for the last applied code, `editor_code_preview`
for the draft, and `editor_dirty` when they differ. `import_stage` and
`import_attempt_id` identify a pending import without replacing the playing
attempt.

The app loads `samples/tr909.json` beside its existing map. It references the
original TR909 recordings from the upstream tidal-drum-machines commit
`6577395a4d05031728ced2ec3e5637fa89d8be48`. `rolandtr909_*` aliases derive from
registered `tr909_*` sounds. It does not substitute another instrument under the
TR909 name. Other unavailable sounds found in the first queried cycle return
`SOUND_UNAVAILABLE`, preserve the draft, and offer an explicit compatible-example
action. That action fills the editor and still requires Apply.

Run `npm run test:paste` for the actual clipboard, engine, sample URLs, local
recovery and four language/viewport combinations. Set `JAMFLOW_URL` to select the
verified deployment and `JAMFLOW_EVIDENCE` for screenshots and JSON. The script
mocks no API responses or engine calls. It blocks non-empty model requests by
default. Set `JAMFLOW_REAL_GENERATION=1` to perform one real generation on the
Chinese desktop case, including busy controls and correlated signal evidence.
The original offline and mocked browser regressions remain separate checks.

## Anonymous feedback

The bilingual footer opens a local feedback dialog. The required message and
optional contact are posted to the owner's Jotform inbox without a GitHub login.
Diagnostics are limited to feedback release, language, traffic class, playback
state and last error code/time. Prompt and editor code are disabled by default;
the user can opt in and edit that attachment before sending. Do not send form
content to Amplitude.

Submission uses a native POST to the action observed on the hosted form. The
provider opens a receipt or error in a new tab. JamFlow retains the draft and
shows a standalone-form fallback. Handoff is not a delivery acknowledgement.
Manage form and responses: https://www.jotform.com/build/263132663005044
Public fallback: https://form.jotform.com/263132663005044

Run `npm run test:feedback` for Chinese/English desktop and mobile. The default
run aborts provider POSTs to test retained drafts. Set `FEEDBACK_REAL_SUBMIT=1`
once to submit a labelled internal test, then read the actual inbox submission.
Do not count that test as user feedback or conversion.

### Feedback acceptance, 2026-11-10

PASS by owner-reported manual acceptance: the owner explicitly confirmed testing
the feedback path successfully. A subsequent Jotform metadata read returned
submission_count=1. The connector did not expose a submission ID or answer body
in this read, so that counter is supporting evidence, not an independently
matched receipt. Earlier automated POSTs stopped at CAPTCHA and remain recorded
as blocked automation; they are not retroactively successful automated E2E runs.
The manual acceptance resolves the outstanding user-path acceptance item. No
CAPTCHA protection was disabled. Physical-device/Safari coverage and conversion
improvement are not established by this confirmation.

## First-generation activation iteration — 2026-11-10

See [competitor research and experiment definition](../docs/COMPETITOR_ACTIVATION_2026-11-10.md).

The first-visit local demo no longer visually suppresses the Generate button. Starter chips keep their one-click generation. A completed local demo displays a bilingual **Make it mine** action, which prefills an editable prompt and focuses the input without spending model tokens or submitting. No changes to `/api/vibe`, prompt generation, or the audio engine.

New event names: `intent_first_focus`, `intent_first_input`, `demo_next_shown`, and `demo_to_prompt`. Properties exclude actual prompt text. Treat their first post-deploy cohort separately from history. The new assisted conversion flow is **optional**, not a mandatory step of the main Page→generate funnel.

Validation: `npm test` 49/49 PASS; `npm run test:browser` 12/12 PASS using real Chromium / Strudel and mocked model responses (the two new cases cover the demo bridge and mobile English). A real DeepSeek request, physical device, and production conversion uplift are not established by these checks.

## Activation reliability — 2026-11-11

See [diagnosis, fixed baseline and release evidence](../docs/ACTIVATION_P0_2026-11-11.md).

`activation_ready` means controls were bound. `generate_entry_exposed` means at least half of Generate stayed in a visible document viewport continuously for one second, once per page instance. It does not prove attention. `activation_first_action` records only a trusted pointer/keyboard category, never key values or text. Automation can still produce trusted browser input; this event does not certify a human.

`intent_prefilled` distinguishes programmatic draft filling from the native `intent_first_input` event. Generation attempts carry `input_origin` and `trigger` through submit, request, response and playback. Demo customization remains prefill plus an explicit Generate; it never counts as a submit by itself. Existing exposure events and the Page→submit definition are preserved.

Busy controls cannot overwrite the draft, including when language switches rebuild chips. IME confirmation does not submit. Stop and the nearby Cancel abort the owning client fetch; stale cleanup cannot affect a newer attempt. The 60-second deadline covers initialization and API response, retains the prompt, and enables retry. It does not promise upstream billing cancellation or a 60-second playback SLA.

Compare production `unknown` unique users with the same ordered 24-hour funnel, explicit UTC endpoints and matured entrants. Segment the new activation version and report internal tests separately. Historical builds lack this version field; the old cohort is a historical reference, not a randomized control. Zero eligible entrants means conversion is UNKNOWN. Preserve the ≥25% and ≥5 distinct generating-user promotion gate.
