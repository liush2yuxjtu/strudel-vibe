# JamFlow — competitor activation audit (2026-11-10)

Goal: improve qualified production Page Viewed → vibe_generate_submit, without inflating it with internal automation or conflating a submit with audible sound.

## Competitor shortlist (official evidence unless indicated)

| Product | First-value mechanism | Activation technique | Transfer to JamFlow |
| --- | --- | --- | --- |
| [Suno](https://help.suno.com/en/articles/3726657) | Describe music and tap Create in Simple Mode; generates two versions | One simple prompt with concrete examples and no technical vocabulary | Keep one prominent Generate button and low-effort idea prompts |
| [Udio](https://help.udio.com/en/articles/10715838-create-your-first-song) | Homepage prompt, dice for random idea, choose duration, Create; two songs per prompt | Random inspiration and default length | Put example starters directly by main prompt; optional random idea |
| [Udio interface](https://help.udio.com/en/articles/10716509-explore-the-udio-interface) | Spotlight, Staff Picks, Trending, persistent player | Social proof and immediate examples | Curated local loops with explicit playback, not synthetic usage claims |
| [Stable Audio](https://stableaudio.com/) | No-account sample listening → remix preset / word / dice → Make my mix | Hear before sign-up, then customize | Connect already-existing no-AI demo to focused prompt instead of competing with Generate |
| [Riffusion / Producer AI](https://riffusion.org/producer-ai) | Simple/Custom toggle and genre prompt chips | Ready-made inspiration near description box | Keep 1-click example chips, fewer first-screen controls |
| [Google Lyria](https://ai.google.dev/gemini-api/docs/music-generation) | Text prompts, fast short-clip experimentation | Specific examples, test small before long | Make rapid examples, editable Strudel and immediate replay the differentiation |

Sources reflect product instructions and visible UI descriptions. They do NOT establish any competitor conversion rates, measured uplifts or currently unrestricted free quotas.

## Important positioning limitation

JamFlow produces **editable Strudel patterns played using WebAudio**, not downloadable songs, vocals or MP3. Suno and Udio offer different outputs and audiences. Copy their low-friction interaction principles, **not** their promised output or billing model.

## Evidence and ranked causes (hypotheses, not proven causal effects)

1. **Mixed-source denominator:** A last-7-days all-traffic ordered funnel had 130 page users but only 8 submit users, while production traffic_class=unknown had 9 page users and 1 submit. Automated/internal sessions distort the total. Unknown is NOT synonymous with human.
2. **Primary-action competition:** The prior first-demo CSS visually suppressed the prompt and Generate, exactly the event of interest, until demo completion/dismissal. This is a verifiable design mechanism, not a measured cause.
3. **Syntax-heavy copy:** “Strudel”, “hihat”, and “not MP3” are important for intent matching, but can make the first interaction hard for new visitors. Keep truthful technical positioning for search and code users, add plain-language starter copy near the input.
4. **Idea blank page:** Empty input produces generate_validation_failed; starter chips already existed, but needed clearer visual explanation. A chip currently triggers a real generation immediately. Preserve this one-tap behavior.
5. **Disconnected preview:** Local demo already worked without AI but after first play did not present a distinct actionable “make it mine” control. Add an opt-in prompt bridge, never silently call paid DeepSeek.
6. **Technical failures / sound:** Distinguish no submit from failed API, software playback and audio signal. A separate post-submit funnel is essential; do not optimize submission by masking errors.
7. **Acquisition mismatch / geography:** Search Console property not readable and some visitors may be bots. Do not invent acquisition or conversion causes from nationality or Linux platform.

## Implementation in this patch

- Preserve a prominent Generate action while first-demo CTA is displayed.
- Add bilingual starter guidance next to the existing one-click chips.
- After successful demo, show **Make it mine / 改成我的版本** to prefill a real editable prompt and focus the input; do NOT auto-submit.
- Track **intent_first_focus**, **intent_first_input**, **demo_next_shown**, **demo_to_prompt**. No prompt text is transmitted, only a length and source.
- Hide the post-demo prompt bridge when an actual generate is submitted. Existing playback logic remains unchanged.

## Measurement and acceptance

For each of 7 and 14 day windows query:
- Funnel A: production unknown [Amplitude] Page Viewed → vibe_generate_submit (24 h, unique users)
- Funnel B: production automation_declared using same exact events
- Funnel C: known internal_test; separate only, never aggregate with A
- Diagnosis: page → intent_first_focus → intent_first_input → vibe_generate_submit
- Assisted path: first_demo_exposed → first_demo_click → first_demo_play → demo_next_shown → demo_to_prompt → vibe_generate_submit (do not treat this as a mandatory funnel for users who generate directly)
- Quality: vibe_generate_submit → vibe_generate_success → playback_started → playback_signal (one attempt_id when possible)
- Breakdown: language, mobile, referrer; only if each field exists and is populated. Do not infer missing traffic_class values as human.
- Exclude data collected before this deployment when comparing new events. Record version and deployment date.

Guardrails: No fabricated music previews or silent generation. No extra model calls merely for conversion optimization. Success threshold remains ≥5 eligible submit users AND ≥25% eligible Page→submit, with a meaningful sample and internal tests excluded. Never describe engine signal as human hearing.

## Validation checklist

- [x] 49/49 offline regressions pass
- [ ] New bilingual browser flow: skip/direct submit, demo→make-it-mine→submit, empty prompt, mobile touch, input event privacy
- [ ] One real API completion and WebAudio engine signal; exclude from user cohort
- [ ] Production route and deployment SHA verified
- [ ] Post-release 7/14-day production unknown funnel read from Amplitude
