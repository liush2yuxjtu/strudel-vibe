# evals.md — vibe·music mobile flow user stories

> Source: 20 yes/no UX decisions collected against `design/mobile-flow.html`
> (flow: 01 empty → 02 input → 03 MiniMax composing → 04 live play → 05 edit → 06 stop/share).
> Format: `/user-stories`. Each story is independently deliverable with testable acceptance criteria.
> Decision legend: ✅ = decided IN, ❌ = decided OUT (kept here as explicit Out-of-Scope guardrails).

---

## Epic Summary

- **Epic name:** vibe·music mobile — natural-language → live Strudel music, one-thumb flow
- **Goal:** Let a phone user go from a one-sentence vibe to looping, editable, shareable music with zero setup.
- **Context:** Mobile flow board (`design/mobile-flow.html`) is the redesign baseline. These 20 binary decisions lock scope before implementation so the single-column mobile build doesn't drift.

### Decision tally (traceability)

| # | Decision | Verdict | Story |
|---|---|---|---|
| 1 | Preload audio/samples on first load | ❌ No | S1 / OOS |
| 2 | Tappable example chips | ✅ Yes | S1 |
| 3 | Enter key submits | ✅ Yes | S2 |
| 4 | Bilingual (zh/en) prompts | ✅ Yes | S2 |
| 5 | Live composing log | ❌ No | S3 / OOS |
| 6 | Cancelable composition | ❌ No | S3 / OOS |
| 7 | Auto-play on generate | ✅ Yes | S4 |
| 8 | Line-by-line code reveal | ✅ Yes | S4 |
| 9 | Directly editable code | ❌ No | S5 / OOS |
| 10 | Hot-reload edits (no audio cut) | ✅ Yes | S5 |
| 11 | Syntax highlighting | ✅ Yes | S5 |
| 12 | Undo edits | ❌ No | OOS |
| 13 | Copy-code button | ❌ No | OOS |
| 14 | Share link | ✅ Yes | S6 |
| 15 | Remix / 再来一段 | ❌ No | OOS |
| 16 | CLI-twin (/vibe-music) pointer | ❌ No | OOS |
| 17 | Visualizer on by default | ✅ Yes | S4 |
| 18 | Light mode offered | ✅ Yes | S7 |
| 19 | Save/favorite library | ✅ Yes | S8 |
| 20 | First-run onboarding | ❌ No | OOS |

> ⚠️ **Open conflict to resolve before build:** #9 *editable code = No* but #10 *hot-reload edits = Yes* and #11 *syntax highlighting = Yes*. If the code block is non-editable, there is nothing to hot-reload or highlight-for-editing. See **Story 5** — most likely intent is "edits happen via a controlled mechanism, not free-text editing." Confirm before implementing S5.

---

## User Stories

### Story 1: Start from empty state with tappable examples
**Story:** As a first-time mobile visitor, I want tappable example chips that fill the prompt, so that I can make music without thinking of a phrase myself.

**Priority:** Must-have · **Size:** S

**Acceptance Criteria:**
- Given the empty state (screen 01), When the page loads, Then the audio engine and drum samples are **not** preloaded (load is deferred to first submit). *(#1=No)*
- Given example chips are shown, When I tap a chip (e.g. "四拍鼓 + 八分 hihat"), Then the prompt field is filled with that chip's text and focused, ready to submit. *(#2=Yes)*
- Given a chip filled the prompt, When I submit, Then composition proceeds identically to a typed prompt.

**Edge Cases:**
- What happens when the user taps a chip, edits the text, then taps a different chip? (Latest chip replaces field contents.)
- What happens on first submit if sample download is slow/offline? (Show loading; surface a retry if it fails — samples were intentionally not preloaded.)

**Notes:** Deferred audio means the *first* play pays the sample-load cost. Keep that load visible so it doesn't read as a hang.

---

### Story 2: Enter a bilingual prompt and submit
**Story:** As a mobile user, I want to type a Chinese or English sentence and press Enter (or the vibe button) to submit, so that I can compose in whichever language is natural.

**Priority:** Must-have · **Size:** S

**Acceptance Criteria:**
- Given a non-empty prompt, When I press the keyboard Enter key, Then composition is triggered (same as tapping vibe ⏎). *(#3=Yes)*
- Given a Chinese, English, or mixed prompt, When I submit, Then it is accepted and sent to MiniMax without language restriction. *(#4=Yes)*
- Given a non-empty prompt, When the field has content, Then the vibe button shows its active/"hot" state.

**Edge Cases:**
- What happens when Enter is pressed on an empty/whitespace prompt? (No-op; vibe button stays inactive.)
- What happens with very long prompts? (Field scrolls/truncates visually; full text still submitted.)

**Notes:** Enter-submits means no multiline prompt input on mobile — acceptable for one-sentence vibes.

---

### Story 3: Wait through composition with a calm composing state
**Story:** As a user who just submitted, I want a clear "composing" indicator, so that I know MiniMax is working and the app didn't freeze.

**Priority:** Must-have · **Size:** S

**Acceptance Criteria:**
- Given a submitted prompt, When MiniMax is composing, Then a composing animation (equalizer) is shown **without** a streaming token/progress log. *(#5=No)*
- Given composition is in flight, When the user views the screen, Then **no** cancel/abort control is presented; composition runs to completion. *(#6=No)*
- Given composition completes, When code is ready, Then the app transitions automatically to the live-play screen (04).

**Edge Cases:**
- What happens when MiniMax errors or times out? (Show an error state with a way to re-submit — there is no cancel, but a failed run must not strand the user.)
- What happens if the user backgrounds the app mid-compose? (On return, either show result or the error/retry state.)

**Notes:** No log + no cancel = the composing state must feel short and trustworthy. Keep it visually alive (equalizer) so the absence of detail doesn't read as a stall.

---

### Story 4: Hear it auto-play with reveal and live visualizer
**Story:** As a user, I want the generated music to start playing automatically while the code reveals and a visualizer reacts, so that I get instant payoff with no extra tap.

**Priority:** Must-have · **Size:** M

**Acceptance Criteria:**
- Given composition succeeded, When code returns, Then audio begins playing automatically with no additional tap. *(#7=Yes)*
- Given the code block renders, When it appears, Then lines reveal sequentially (staggered), not all at once. *(#8=Yes)*
- Given audio is playing, When sound is active, Then the bar visualizer is visible by default and reacts to the audio. *(#17=Yes)*
- Given playback started, When I tap stop (⏹), Then audio halts (hush).

**Edge Cases:**
- What happens if the device blocks autoplay (no prior user gesture)? (The submit tap should count as the gesture; if still blocked, show a single tap-to-play fallback.)
- What happens if the generated code is invalid/won't play? (Surface an error; allow re-submit.)
- What happens to the visualizer when audio is silent/idle? (Idle "breathing" state, not frozen.)

**Notes:** Autoplay relies on the submit interaction satisfying the browser's user-gesture requirement for WebAudio.

---

### Story 5: Tune the sound with hot-reload + syntax-highlighted code
**Story:** As a user who likes the result, I want to adjust the pattern and have the sound update seamlessly, so that I can refine the vibe without restarting playback.

**Priority:** Should-have · **Size:** M · **⚠ blocked on conflict resolution (see below)**

**Acceptance Criteria:**
- Given the code block is shown, When tokens render, Then functions/strings/numbers are syntax-highlighted. *(#11=Yes)*
- Given an applied change (e.g. `gain .7 → .5`), When "应用编辑" is pressed, Then the audio hot-reloads with the change and playback never cuts out. *(#10=Yes)*
- Given the code block, When the user inspects it, Then it is **not** a free-text editor — changes go through the controlled apply mechanism, not arbitrary typing. *(#9=No)*
- Given an edit was applied, When the user wants to revert, Then **no** built-in undo is provided — they re-apply or re-prompt. *(#12=No)*

**Edge Cases:**
- What happens when an applied edit produces invalid code? (Keep last good sound playing; show error; do not crash playback. Critical because there's no undo — #12.)
- What happens to highlighting on an unparseable snippet?

**⚠ Conflict — resolve before building:** #9 (not directly editable) contradicts #10/#11 (hot-reload + syntax highlight, which imply editing). Two viable readings:
- **(A) Parameter-knob model:** code is read-only display; edits happen via controlled controls (sliders/steppers for gain/lpf/bpm) that hot-reload. Highlighting is for *readability*, not editing.
- **(B) Editable after all:** #9 was answered conservatively; code is editable with hot-reload + highlighting.
Pick A or B with the user before implementation. This story assumes **(A)** until told otherwise.

---

### Story 6: Stop and share a reproducible link
**Story:** As a user with a pattern I like, I want to share a link that plays the same thing for someone else, so that I can show friends without sending code.

**Priority:** Should-have · **Size:** M

**Acceptance Criteria:**
- Given a generated pattern, When I tap share, Then I get a URL that, when opened, loads and plays the same pattern. *(#14=Yes)*
- Given the stop/share screen (06), When shown, Then there is **no** standalone "copy code" button. *(#13=No)*
- Given the stop/share screen, When shown, Then there is **no** "remix / 再来一段" regenerate button. *(#15=No)*
- Given the stop/share screen, When shown, Then there is **no** pointer/link to the `/vibe-music` CLI twin. *(#16=No)*

**Edge Cases:**
- What happens when the share link is opened on a device that blocks autoplay? (Falls back to Story 4's tap-to-play.)
- What happens if the pattern is too large to encode in a URL? (Define a fallback: hosted short link vs. inline encoding.)
- What happens when an old share link points to a pattern format no longer supported? (Graceful "couldn't load" state.)

**Notes:** Share is the *only* outbound action on screen 06 — copy/remix/CLI were all explicitly cut, so the share affordance must be unmistakable.

---

### Story 7: Choose a light or dark theme
**Story:** As a user in a bright environment, I want a light theme option, so that the app is comfortable to read outside the default neon-on-black.

**Priority:** Nice-to-have · **Size:** M

**Acceptance Criteria:**
- Given the app, When I open theme settings, Then I can switch between the dark neon theme and a light theme. *(#18=Yes)*
- Given I select a theme, When I return later, Then my choice persists.
- Given either theme, When active, Then visualizer, code highlighting, and chips remain legible and on-brand.

**Edge Cases:**
- What happens with `prefers-color-scheme`? (Respect system default on first visit, then honor explicit user choice.)
- What happens to neon glow effects in light mode? (Define light-mode equivalents so contrast/readability hold.)

**Notes:** The mockup is dark-only; a light palette must be designed, not just inverted.

---

### Story 8: Save and revisit favorite patterns
**Story:** As a returning user, I want to save patterns I like and find them later, so that I don't lose a good vibe when the session ends.

**Priority:** Should-have · **Size:** L

**Acceptance Criteria:**
- Given a generated pattern, When I save/favorite it, Then it is added to a personal library. *(#19=Yes)*
- Given saved patterns exist, When I open the library, Then I can list, open, play, and delete them.
- Given a saved pattern, When I open it, Then it loads and plays identically (ties to Story 6's reproducibility).

**Edge Cases:**
- What happens to saved patterns across devices / cleared storage? (Define: local-only vs. account-backed; communicate persistence guarantees.)
- What happens when the library is empty? (Helpful empty state.)
- What happens at storage limits? (Cap or warn.)

**Notes:** Decide storage model (localStorage vs. backend) — interacts with whether share links (S6) and library entries use the same encoding.

---

## Dependencies

**Between stories:**
- S2 → S3 → S4 are the linear happy path; S3/S4 cannot ship before S2.
- S5 depends on S4 (something must be playing to hot-reload) **and is blocked** on resolving the #9↔#10/#11 conflict.
- S6 (share) and S8 (save) should share one pattern-serialization format; build that format once, consume in both.
- S8 reproducibility reuses S6's load-from-encoded-pattern path.

**External / technical:**
- MiniMax-M2.7 NL→Strudel endpoint (powers S3/S4).
- Strudel/WebAudio runtime for playback + hot-reload (S4/S5).
- Browser autoplay/user-gesture policy (S4, S6 shared links).
- Persistence layer for S7 theme choice and S8 library (and possibly S6 links).

## Out of Scope (explicitly decided OUT)

- **Audio/sample preloading on first load** (#1) — load deferred to first submit.
- **Streaming composing log** (#5) — composing state is animation-only.
- **Canceling an in-flight composition** (#6) — runs to completion.
- **Free-text code editing** (#9) — pending conflict resolution; default is controlled-edit only.
- **Undo for edits** (#12) — no revert; re-apply or re-prompt.
- **Copy-code button** (#13).
- **Remix / 再来一段 regenerate button** (#15).
- **CLI-twin (`/vibe-music`) pointer in the UI** (#16).
- **First-run onboarding / tutorial overlay** (#20) — empty state + tappable chips carry discovery.

## Clarifying questions before build

1. **S5 conflict:** Is generated code read-only with controlled edits (model A) or freely editable (model B)? Everything in S5 hinges on this.
2. **S6/S8 persistence:** Local-only or account-backed? Determines cross-device behavior and share-link longevity.
3. **S3 failure UX:** With no cancel and no log, what exactly does a MiniMax timeout/error show?
