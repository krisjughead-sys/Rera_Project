# Cloud routine: one bounded coding task

Schedule once daily after the GitHub repo and subscription usage limits are confirmed. Model: Sonnet. Repository: krisjughead-sys/Rera_Project GitHub repo.

Prompt:

> Read `AGENTS.md`, `docs/CONTROL_PLANE.md` and open GitHub Issues with `agent-ready`. If none is eligible, report no work and stop. Choose exactly one issue with no existing active branch/PR and explicit acceptance criteria. Inspect the repository. Implement the smallest change in a fresh branch, add a regression case for a defect, run applicable CI checks locally, open a draft PR with issue ID and evidence. Never merge or publish real project facts. If the source, credential or quota blocks progress, leave a concise comment and stop. Do not run a second issue in the same session. Do not use Fable, paid API overage or a different provider without explicit approval.

Success is a linked draft PR with evidence, not a green routine exit status. A routine using GitHub events should filter its triggers to avoid every PR comment becoming another coding run.
