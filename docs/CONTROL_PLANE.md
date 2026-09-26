# Unattended control plane

**Current stage:** prepared, not activated. Source files have been copied to this GitHub repository. GitHub Actions and agent routines need separate activation and verification before unattended work begins.

## Task state

`agent-ready` → `agent-working` → draft PR → CI + separate Codex review → `qa-failed` or `needs-owner` → merge → `done`.

Failure states: `source-blocked` (source access or provenance), `cost-paused` (quota/spend), `stale` (no heartbeat), and `needs-owner` (publication, account or access decision). A failed job cannot silently relabel itself ready. The coordinator checks evidence URLs, PR status, CI conclusion and review findings before changing a label.

## Credentials and execution

- GitHub Actions: read-only CI without source or deploy secrets. Keep production publishing in a separate protected environment.
- Claude cloud: repository access limited to draft branches; subscription use only, no metered overage by default. One eligible task per run, one daily scheduled run initially.
- Codex cloud: automatic PR reviewer using `AGENTS.md`. A separate manual/cloud coding task may be assigned an independent issue.
- Hermes: initially on Sid's continuously awake Mac as a supervised gateway; checks repo queue, source-freshness evidence and run health. If Mac-off resilience becomes necessary, install the gateway on a supervised remote host. No deploy key.
- Owner: approves merges/public project facts when disputed, account connections, changes to cost ceilings and external publishing.

## QA evidence required in every PR

1. Issue ID and one-sentence root cause.
2. List of source snapshots and official URLs used, or explicit `no real project facts changed`.
3. One new regression scenario for a defect and before/after result.
4. Exact commands and CI run links.
5. Independent review findings with dispositions.
6. Preview link and buyer-task QA result when UI changes.

## First drill

Run five bounded issues with no human prompting between issue pickup and PR review. Verify: no invented public project facts, no bypassed source rule, all CI results attached, blocked jobs labelled, no automatic merge, and no unapproved paid usage. Measure time-to-PR and human review load. Increase concurrency only after the drill.

## Activation checklist

1. Confirm this repository's desired visibility (currently public); verify the copied source and run Actions.
2. Connect Claude cloud routines, Codex cloud PR review and Hermes GitHub access to **that same repository**.
3. Add branch protection requiring CI and separate reviewer resolution.
4. Run CI once on a test PR; run Claude routine once manually with a safe documentation issue, and verify a Codex review actually arrives.
5. Enable daily Claude routine and Hermes queue watchdog; audit the first five unattended PRs before expanding scope.
