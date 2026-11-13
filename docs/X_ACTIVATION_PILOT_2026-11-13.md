# JamFlow · X-attributed activation pilot · 2026-11-13

## Goal
Validate first-generation activation among Strudel beginners before scaling distribution. Expansion gate remains **at least 5 distinct eligible submitters AND at least 25% Page→submit conversion**. Neither condition is currently verified.

## Experiment record
- Account: https://x.com/liushiyumath
- Published post: https://x.com/liushiyumath/status/2121081161996968444
- Published at: 2026-11-13 03:22:11 UTC
- Campaign: `activation_v3_pilot_20261113`
- URL: https://jamflow-gray.vercel.app/?lang=en&utm_source=x&utm_medium=organic_social&utm_campaign=activation_v3_pilot_20261113&utm_content=strudel_beginner
- Audience hypothesis: Strudel newcomers or live-coding music makers.
- Treatment: one organic public X post, asking for a first editable Strudel pattern and a specific usability blocker.
- Scope: small pilot only, no paid ads and no mass promotion.
- API readback: post exists. Initial public metrics: impressions 0, likes 0, replies 0 at immediate observation. These metrics are a snapshot, not a result.

## Attribution and data integrity
1. Amplitude project: `893642` in `cold-bar-959821`.
2. Funnel: `[Amplitude] Page Viewed` → `vibe_generate_submit`, ordered, 24h, count group User (distinct), production + unknown applied to both steps.
3. Conversion numerator = distinct eligible users who submit within 24h after their Page Viewed event; success and playback are separate diagnostics.
4. Separate internal_test and automation_declared; unknown does **not** mean verified real human.
5. Include `activation_version=activation-entry-v3-20261111` when data supports it. Retain `release=funnel-reliability-v2`, `schema_version=3` as distinct properties; do not call release v2 the activation version.
6. UTM capture is provided by Amplitude `autocapture.attribution=true`; verify both landing-page UTM and attribution persisted in backend before calling any X cohort results attributable. Do not assume UTM query parameters alone establish successful tracking.
7. Explicitly lock `start`/`end` in UTC. Require 24-hour maturity of entry cohorts. Calculate historical and new cohorts with identical filters; never combine totals for different cohorts or sum daily unique users.
8. The historic reference 9→1 (11.11%) had cutoff 2026-11-10 16:08 UTC and included production+unknown. It is not current rolling seven-day performance, nor confirmed human users.
9. Initial new post release queries: fixed 2026-11-11T00:00:00Z to 2026-11-12T03:00:00Z with v3 filters yielded empty CSV; broader 2026-11-11 to 2026-11-13T03:00 UTC with production+unknown likewise yielded empty CSV. Neither permits calculation of 0% conversion. A query of historical 2026-11-04 to 2026-11-09T16:08 with production+unknown returned 1 entrant, 0 converted; it is **not** a like-for-like replication of original 9→1.
10. Attribution problem remains UNKNOWN until observed X visits have matching source properties on backend. No synthetic conversions or relabeling.

## Next measurement
After traffic arrives, compute and retain: (A) qualified X Page visitors, (B) distinct X visitors with submit within 24h, (C) submit→API success→software playback→engine signal for the same attempt_id, (D) qualitative responses. Require 5 eligible submitters, 25% conversion, coherent event schema, and genuine source attribution before broad distribution. If insufficient qualified data, keep pilot running through existing daily check rather than asserting improvement.

## Verification
- PASS: X post API creation and get-by-ID readback.
- PASS: read repo's source-level traffic context, Amplitude project context, and submitted event property taxonomy.
- PASS: ran fixed UTC exploratory Amplitude funnel queries.
- UNKNOWN: post-click qualified-user cohort, specific X UTM ingestion, v3 lift, causal effect.
- BLOCKED: expansion gate not met.
- No production data mutation, no change to generation API, no paid spend.
- Repository docs-only update: JamFlow /verify A–J SKIP by documented diff scope.
