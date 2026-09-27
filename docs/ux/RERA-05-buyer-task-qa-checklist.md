# RERA-05: Buyer-task QA checklist

Use this against `prototypes/rera-05-synthetic/index.html` opened from the file system on a phone-sized viewport (360 × 740 first, then 390 × 844), and later against any real UI change that touches search, project page, compare or changes. Every step names the expected observation. A step passes only if the observation matches exactly; "looks fine" is not a result.

Record: date, viewport, browser, commit, and the row results in the PR body.

## 0. Preconditions

- [ ] Page shows a persistent "Synthetic data" ribbon (prototype) or, in a real build, no ribbon and a footer stating the site is not affiliated with MahaRERA.
- [ ] `<meta name="robots">` is `noindex,nofollow` for the prototype.
- [ ] No network requests on load (prototype must open offline).

## 1. Shortlist

- [ ] Search "Sample Heights". Four cards appear: three candidates plus the stale-link fixture P00000000004, which shows "Could not verify" naming both numbers and has no "Add to shortlist" button. Each candidate card shows the full registration number on its own line, the locality and the promoter.
- [ ] The permanent hint "A name finds candidates. Only the exact registration number confirms which project you are looking at" is visible without scrolling on 360 px.
- [ ] Add Phase 1 and Phase 2. The bottom bar reads "Shortlist (2)".
- [ ] Search "Sampel Heights" (misspelt). The empty state offers the official search link and asks for the registration number. It offers no similar projects.
- [ ] Reload. The shortlist persists and still shows two entries with their IDs.

## 2. Compare

- [ ] Open Compare. Column headers show both IDs; because the names share a prefix, promoter and locality also appear in the headers.
- [ ] Phase 2's "Revised proposed completion" cell reads "Could not verify on 20 Sep 2026" as a full sentence. There is no dash, blank or "N/A" anywhere in the table.
- [ ] Phase 2's "Last verified" cell shows "N days ago" with N at least 103 (ages use the device clock against readings dated 26 Sep 2026) and the words "Older snapshot" with a glyph.
- [ ] No cell shows a score, rank, "better", "delayed", "on time" or "overdue".
- [ ] At 360 px, no horizontal scrollbar; cells are stacked.
- [ ] No "Sponsored" block exists on this screen.

## 3. Inspect provenance and last-verified timestamp

- [ ] Open Phase 1. Directly under the title is the ID; the record card is headed "Official record".
- [ ] The status row shows the value, the text "Official record" with a glyph, "Document dated 02 Jan 2026", "Last verified 20 Sep 2026" and a "View" link. Tapping the value's date reveals the "as printed" string `02.01.2026`.
- [ ] The card footer reads "Readings dated 26 Sep 2026 (synthetic). Registration number verified on the page: P00000000001".
- [ ] The Litigation row reads "Could not verify on 20 Sep 2026. This does not mean there is no case."
- [ ] The Extension row reads "Not checked yet" and shows no date.
- [ ] The "What this means" block sits after the card on a different background and is not inside any row.
- [ ] The "Sponsored" block sits after the "What this means" block, has a dotted border, a "Sponsored" label, and none of the words official, verified, MahaRERA, RERA, record, registered.

## 4. Review a changed date

- [ ] On Phase 1, the "Revised proposed completion" row carries a change note: "added on our read of 20 Sep 2026 (was: not present on 15 Jun 2026)".
- [ ] Open Changes. The Phase 1 card shows Before (with its read date), After (with its read date), the document date and a View link.
- [ ] The P00000000003 card shows "Official sources disagree" with two values, two document dates, two links, and "Neither is shown as current".
- [ ] Nothing on the Changes screen states or implies that a missing revised date means the project is on time, or that a missing litigation entry means no case.

## 5. Project-identity traps

- [ ] From the search list, the unrelated "Sample Heights" (P00000000003) shows a different promoter spelling and a different district on its card.
- [ ] Open P00000000003 then use the browser back button. The Phase 1 page still shows Phase 1's fields under Phase 1's ID (no stale field bleed).
- [ ] Navigate to `#project/P00000000009` (does not exist). The page shows "Record not found in our reading" and no field rows, and does not fall back to a similarly named project.
- [ ] Prototype-only: navigate to `#project/P00000000004`. This fixture has a deliberate page-ID mismatch and must render as "Could not verify" for the whole card, with no field values and no shortlist button.
- [ ] Add Phase 1, then edit the browser's stored shortlist to include P00000000004 (or use a shortlist saved before this fix). The shortlist shows the fixture with the warning and a Remove button only. Open Compare: every cell in the fixture's column carries the warning; no status, promoter, date or "days ago" appears there.

## 6. Return later

- [ ] Open Changes for the first time. The hint reads "First visit: recorded now." Reload and open the shortlist: each card shows "Not re-checked since your last visit on <today>: <all field names>" and no "Changed" chip, because every synthetic reading predates today.
- [ ] On Changes, press "Pretend my last visit was 01 Sep 2026". The shortlist chip on Phase 1 reads "Changed since your illustrative last visit on 01 Sep 2026: Revised proposed completion", plus a "Re-checked ... no change detected: <fields>" chip and a "Not re-checked ...: Extension of registration" chip. No chip says "No change detected" for the project as a whole.
- [ ] Remove Phase 2 and reload. It stays removed. Add an ID that does not resolve (P00000000009) and reload. It remains in the list with "Record not found in our reading" and a Remove button.

## 7. Accessibility spot checks

- [ ] Every button and link is at least 44 px tall on touch.
- [ ] Tab order follows visual order; a visible focus ring appears on each control.
- [ ] With a screen reader, the status row is announced as term, value, state label and dates in that order.
- [ ] Under `prefers-reduced-motion: reduce`, no animation occurs when expanding "Details".
- [ ] Text remains readable with the browser font size at 200%.

## Result line for the PR body

`Buyer-task QA: <pass|fail> on <viewport>, <browser>, commit <sha>; failed rows: <list or none>.`
