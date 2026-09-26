# Hermes job: queue and incident watch

Run while the Hermes gateway is supervised on the Mac or a remote host. Start with a daily cadence. Allow only GitHub read/issue/comment access; no production write credentials.

1. Read `agent-ready`, `agent-working`, `qa-failed`, `source-blocked`, `cost-paused` and `needs-owner` issues, draft PRs and CI conclusions.
2. Report missing PR links, repeated failures and jobs with no update over 24 hours. Deduplicate by root cause and source project ID.
3. From an evidence-backed CI or source freshness failure, create one issue with source/trace, expected state and a reproducible check; never invent a project claim.
4. Summarize Done / In progress / Blocked / Owner decisions / Spend to the durable repo issue or the owner's configured private channel.
5. Stop if GitHub credentials, source access or the model quota are unavailable. Never move a blocked issue back to ready without changed evidence.
