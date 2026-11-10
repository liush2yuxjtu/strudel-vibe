# JamFlow project instructions

## Execution

- Continue the requested development and verification work without repeated permission checks for routine reversible actions.
- Follow `.claude/skills/verify/SKILL.md` before direct commits, pushes, and deployments. Verify the actual production domain when shipping is requested.
- Distinguish an attempted action, API success, software playback, engine audio signal, and human hearing. Do not use event counts as proof of completion.

## Delivery workflow

The owner selected this workflow on 2026-11-10.

- Use direct commits to `main` after the applicable `/verify` checks pass. Fetch current `main` before writing; preserve concurrent changes and use a non-force push or an expected-head lease. Never force-push shared history.
- Do not create GitHub Issues or pull requests for routine project work. Track pending work and evidence in the project Page or scoped repository docs instead. Consolidate existing feature work into `main` after verification and close superseded Issues/PRs without discarding unresolved work.
- Use `.claude/skills/verify/SKILL.md` as the quality gate instead of CI. Do not add GitHub Actions workflows or require PR checks/review bots. Keep executable tests and run the checks appropriate to the diff locally or in a bounded test runner.
- CI removal does not remove Vercel builds or production acceptance. A direct commit does not prove deployment or user-path success.
- Record the commit, checks, evidence, and any FAIL/BLOCKED/UNKNOWN result. Never turn an unresolved external gate, including the feedback CAPTCHA, into PASS because a ticket was closed or code was committed. Docs-only changes do not inherit unrelated product-path blockers.

## Standing development cost authorization

The owner authorized this policy on 2026-11-09 for this project.

- Proceed with necessary development, testing, API probes, build, deployment, and short-lived test compute when the reasonably estimated total incremental cost of the current task is below US$5. Do not pause development or repeatedly ask permission because of these small costs.
- Reuse existing authorized accounts and credentials. Use reasonable estimates; do not turn each small API call into a billing investigation.
- Count costs across the task. Do not split one operation into smaller requests to evade the US$5 threshold. If the task is expected to reach US$5 or more, obtain approval for the additional spend before incurring it.
- This authorization covers project usage, not unrelated purchases, new subscriptions, or billing-plan changes.
- Use bounded probes and reuse successful results. Report paid calls and available usage evidence. Do not invent exact charges when billing data is unavailable.
- Follow platform safety controls. If a tool rejects an action, resolve the stated reason or report it; do not route around the rejection.

## Approval ledger

| Date | Scope | Authorization |
| --- | --- | --- |
| 2026-11-09 | JamFlow development and verification | Necessary task usage below US$5 may proceed automatically. |
| 2026-11-09 | Production generation acceptance | One real generation, output limit 2,000 tokens, explicitly approved and completed. Replay reused the returned pattern. Exact charge was not returned by the application. |
