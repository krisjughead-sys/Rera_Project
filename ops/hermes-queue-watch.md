# Hermes queue monitor (read-only pilot)

Repository: `krisjughead-sys/Rera_Project`. Schedule: once daily, initially. Delivery: local Hermes cron output.

## Monitoring prompt

Inspect the repository using GitHub authentication from the active Hermes profile. Never print, log, or transmit the token. Check the latest GitHub Actions workflow conclusion, open issues and draft pull requests. For each issue in `agent-ready`, `agent-working`, `qa-failed`, `source-blocked`, `cost-paused` or `needs-owner`, report its URL, current status, linked PR and last update. Flag stalled work (>24 hours with no update), failed CI, missing evidence and duplicate issues. Return a short report headed Done / In progress / Blocked / Owner decisions. If nothing is queued, say so explicitly. If authenticated GitHub access or CI status cannot be verified, report the failure and stop. Do not create issues, write comments, change labels, merge, deploy, infer project facts or use a paid provider fallback.

## Activation check

1. Verify the active Hermes profile can authenticate to GitHub as `krisjughead-sys` without exposing its token.
2. Create a daily Hermes cron job with the monitoring prompt and local delivery.
3. Run it manually once and check the run log and output. A chat response or a saved job alone does not prove unattended execution.
4. Confirm the Hermes gateway service is running; the scheduler needs a running gateway on the Mac. A Mac shutdown or sleep prevents local runs. For Mac-off execution, move the monitor to an always-on hosted runtime.
5. Revisit permissions only when a specific issue-writing task is ready. The initial token grants read-only GitHub access.
