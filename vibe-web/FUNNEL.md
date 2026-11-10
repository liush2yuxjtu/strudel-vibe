# JamFlow funnel verification

The client distinguishes an attempted operation, an API response, software playback, and a measured engine signal. None proves that a person heard the audio.

## Events

| Event | Evidence |
| --- | --- |
| `first_demo_exposed` | At least half of the demo region entered the viewport. |
| `first_demo_click` | A local demo attempt began. |
| `vibe_generate_submit` | A non-empty generation attempt began. This does not prove an API response. |
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
| `schema_version` | `2` |
| `release` | `funnel-reliability-v2` |

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
