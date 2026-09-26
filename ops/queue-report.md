# RERA-06 queue report prototype

Run `node scripts/render-queue-report.mjs tests/fixtures/rera-06-queue.json 2026-01-02T12:00:00Z` from the repository root. The optional final argument fixes the report time for reproducible checks; otherwise the current clock is used. Run `node --test tests/*.test.mjs` for validation.

Input is a **local JSON snapshot** with `issues` and `pullRequests` arrays. Each issue needs `number`, `title`, `url`, `state` (`open` or `closed`), `updatedAt` (ISO timestamp), and `labels` (names). Each PR can include `number`, `issueNumber`, `url`, `draft`, `author`, `ci.conclusion`, and `reviews` (`author`, `state`). A draft PR counts as independently reviewed only when a different author has an `APPROVED` review. Missing CI and missing reviews are reported as unavailable.

The script only reads the named local file and writes Markdown to stdout. It has no GitHub API, token, network, scheduler, or write path. The fixture contains invented `example/test` records only. This prototype is **not a live monitor** and does not replace the existing read-only Hermes 9:00 IST queue job. It does not pick up tasks or change labels.
