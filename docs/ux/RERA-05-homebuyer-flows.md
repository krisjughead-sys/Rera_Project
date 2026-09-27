# RERA-05: Mobile-first homebuyer flows (synthetic specification)

Issue: [krisjughead-sys/Rera_Project#7](https://github.com/krisjughead-sys/Rera_Project/issues/7). Design pass only. **Every project ID, name, promoter, date and place in this document and in `prototypes/rera-05-synthetic/` is synthetic.** Synthetic IDs use the reserved shape `P0000000000N` (leading zeros), which no real MahaRERA registration uses. No real project facts, no source collector, no change to `dist/`, no deployment.

Companion files: `RERA-05-adversarial-pass.md` (second pass, findings and revisions), `RERA-05-buyer-task-qa-checklist.md` (what a QA reviewer clicks through), `prototypes/rera-05-synthetic/index.html` (unshipped static prototype, opens from the file system).

## 1. The mental model the buyer must leave with

A project page is **a dated reading of official records, not a description of the project**. Three things follow, and every screen is built to make them impossible to miss:

1. Each value on the page is one of five kinds (section 2). The kind is shown next to the value, in words, not only in colour.
2. "We could not verify this" is a state of *our* reading, never a statement about the project. A blank litigation tab means we could not read it, not that there is no case. A missing revised date means we saw no revised date, not that the project is on time.
3. The buyer decides on the authority's page, not ours. Every verified value carries a link to the exact official page, the date printed on that document, and the date we last read it.

## 2. Field-state taxonomy and how each state renders

Aligned with the snapshot contract proposed in the RERA-04 draft (`verified`, `unavailable`, `unknown`, `conflict`) plus the buyer-facing explanation layer. States are rendered with a text label, an icon glyph and a colour; the text label alone must be sufficient.

| State | Meaning for the buyer | Value shown? | Provenance shown | Mandatory wording (mobile) |
|---|---|---|---|---|
| **Verified (official)** | Read from an official MahaRERA page with document date, retrieval date and snapshot hash traceable | Yes | Link to exact page, "Document dated D", "Last verified R" | `Official record` |
| **Unavailable / could not verify** | The page or field could not be read in the last run | No. Never a placeholder value | Retrieval attempt date | `Could not verify on R. This does not mean the field is empty.` |
| **Unknown (not yet checked)** | No attempt has been made for this field | No | None | `Not checked yet` |
| **Older snapshot** | Verified, but the last successful read is older than the freshness window (prototype: 90 days) | Yes, visually de-emphasised | As verified, plus age in days | `Last verified N days ago. Re-check on the official site before deciding.` |
| **Contradiction (official sources disagree)** | Two official pages give different values for the same field | Both values, side by side, neither promoted | Both links, both document dates | `Official sources disagree. Confirm on MahaRERA.` |
| **Buyer explanation** | Our interpretation of what a state or value means | Prose, visually separate from the record | Links back to the field it explains | Prefixed `What this means` |

Date fields always carry a date kind. The three kinds render as three separate rows, never as one "completion date" that silently changes meaning:

| Row label | Date kind | If not verified |
|---|---|---|
| Proposed completion (as registered) | original | state label per table above |
| Revised proposed completion | revised | `Could not verify` or `Not checked yet`. **Never** "no revision" and **never** "on time" |
| Extension of registration | extended | `Could not verify` or `Not checked yet`. **Never** inferred from the revised date or from the original date having passed |

Dates are displayed as `31 Dec 2027`, with the ISO value in the element's accessible name, and the printed portal string (dd.mm.yyyy) in a "as printed" hover/expand, so a reader never has to guess day versus month.

## 3. Screens and annotated flows

Breakpoint priority: 360 px wide first, then 390, 768, 1024. Single column below 768 px. Sticky elements limited to one bottom action bar (56 px) so content is never hidden behind two bars.

### 3.1 Search and shortlist

```
┌──────────────────────────────────────┐
│ Maharashtra Project Monitor  [pilot] │  ← header, 56 px, "Synthetic data" ribbon in prototype
│ ┌──────────────────────────────────┐ │
│ │ Search by name or MahaRERA no.   │ │  ← input, 48 px tall, type=search, clear button
│ └──────────────────────────────────┘ │
│ A name finds candidates. Only the    │
│ exact registration number confirms   │
│ which project you are looking at.    │  ← permanent hint (A1)
│ ┌──────────────────────────────────┐ │
│ │ Sample Heights Phase 1           │ │
│ │ P00000000001 · Testpur, Sample D.│ │  ← ID always on the second line (A2)
│ │ Sample Builders Pvt Ltd          │ │
│ │ Official record: Registered      │ │  ← state label in words
│ │ Last verified 6 days ago         │ │
│ │ [ Add to shortlist ]  [ Open ]   │ │  ← 44 px targets, 8 px gap
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ Sample Heights Phase 2           │ │
│ │ P00000000002 · Testpur, Sample D.│ │
│ │ ...                              │ │
│ └──────────────────────────────────┘ │
│ ── Sponsored ───────────────────────  │  ← ad slot only after results, framed, labelled (section 5)
│ [ Shortlist (2) ]        [ Compare ] │  ← bottom action bar
└──────────────────────────────────────┘
```

Annotations:
- **A1** A name search is a discovery step: it matches name substrings and may return several registrations of one township and unrelated same-name projects elsewhere. Only the exact registration number confirms identity. The hint says exactly that, stays visible, and every card shows ID, locality and promoter so a buyer can tell phases apart before opening. Shortlist and compare key on the ID, never the name.
- **A2** The registration number is never truncated on mobile. If the name is long, the name wraps; the ID does not.
- Shortlist is browser-local, as in the current `dist/` pilot, capped at 30 entries, keyed by registration number and not by name.
- Empty state: "No official record matched. Try the registration number from your allotment letter or the MahaRERA search." with a link to the official search. No suggestions are generated from similar names (adversarial finding F3).

### 3.2 Project page

```
┌──────────────────────────────────────┐
│ ‹ Back      Sample Heights Phase 1    │
│ P00000000001                          │  ← ID directly under title, copyable
│ Testpur, Sample District              │
│ ┌ Official record ─────────────────┐ │
│ │ Registration status               │ │
│ │ Registered            Official ✓  │ │
│ │ Document dated 02 Jan 2026        │ │
│ │ Last verified 20 Sep 2026 · View › │ │  ← link to exact page (synthetic in prototype)
│ ├───────────────────────────────────┤ │
│ │ Proposed completion (as registered│ │
│ │ 31 Dec 2027           Official ✓  │ │
│ │ ...                               │ │
│ ├───────────────────────────────────┤ │
│ │ Revised proposed completion       │ │
│ │ 30 Jun 2028           Official ✓  │ │
│ │ Changed: this row was added on our│ │
│ │ read of 20 Sep 2026 (was: not     │ │
│ │ present on 15 Jun 2026)           │ │  ← change note attached to the field (section 3.4)
│ ├───────────────────────────────────┤ │
│ │ Extension of registration         │ │
│ │ Not checked yet                   │ │  ← no value, no inference
│ ├───────────────────────────────────┤ │
│ │ Litigation                        │ │
│ │ Could not verify on 20 Sep 2026.  │ │
│ │ This does not mean there is no    │ │
│ │ case.                             │ │
│ └───────────────────────────────────┘ │
│ ┌ What this means ─────────────────┐ │  ← explanation block, different surface, prose
│ │ A revised date on the register is │ │
│ │ the promoter's declaration; it is │ │
│ │ not the possession date in your   │ │
│ │ agreement. Compare both.          │ │
│ └───────────────────────────────────┘ │
│ ── Sponsored ───────────────────────  │  ← never inside the record card
│ [ Add to shortlist ] [ Open on MahaRERA ↗ ] │
└──────────────────────────────────────┘
```

Annotations:
- The official record card is one visual container with a heading "Official record" and a footer line "Registration number verified on the page: P00000000001" (adversarial F2: page-ID match shown to the buyer).
- **Page-ID mismatch is rejected at the data boundary, not per screen.** A record whose page carried a different registration number than requested has its fields dropped before any view runs. Search, project, compare and changes all show the same "Could not verify" warning naming both numbers, and the record cannot be added to the shortlist (a previously stored entry offers Remove only). Adversarial F14.
- Each field row is a definition-list item: term, value, state, provenance. Provenance is collapsed by default on screens under 390 px behind a "Details" disclosure but the state label and "Last verified" date remain visible.
- No field row may be empty. An unavailable field still renders its row with the mandatory wording, so the absence is visible rather than silent.
- The card never shows a computed "on time / delayed / overdue" badge. The RERA-02 draft records that the quarterly-update rule has not been read first-hand; until an official rule is quoted, nothing is derived from silence.
- Coordinates and map: rendered only when the coordinate field is verified. Otherwise the map area is replaced by "Location on map: could not verify" and the address text only. Never geocoded from the address.

### 3.3 Compare two shortlisted projects

```
┌──────────────────────────────────────┐
│ Compare              [Change pair ▾] │
│         Phase 1        Phase 2       │
│         P0000…001      P0000…002     │  ← IDs in the column header, full ID on tap
│ Promoter                              │
│  Sample Builders   Sample Builders    │
│  Official ✓        Official ✓        │
│ Proposed completion (as registered)   │
│  31 Dec 2027       31 Mar 2029        │
│  Official ✓        Official ✓        │
│ Revised proposed completion           │
│  30 Jun 2028       Could not verify   │
│  Official ✓        on 20 Sep 2026     │  ← unavailable cell keeps its wording; no dash, no "—"
│ Last verified                         │
│  6 days ago        103 days ago       │
│                    Older snapshot ⚠   │
│ Litigation                            │
│  Could not verify  Could not verify   │
└──────────────────────────────────────┘
```

Annotations:
- Two columns fixed, horizontally scroll-free at 360 px by using stacked cells below 390 px (each row becomes "label / value A / value B" vertically).
- Mismatched states across columns are the point of the screen. A verified value never sits next to an inferred one; the unavailable cell keeps its full sentence so the comparison cannot read as "Phase 2 has no revision".
- No "winner", score or ranking. The screen compares records, not projects.
- Same-name pairs (Phase 1 versus Phase 2, or the unrelated "Sample Heights" in another district) show promoter and locality in the header when names share a prefix (adversarial F1).

### 3.4 Review a changed date

Entry points: a "Changed since your last visit" chip on the shortlist card, the change note on the field row, and the Changes screen.

```
┌──────────────────────────────────────┐
│ Changes on your shortlist            │
│ Since your last visit on 01 Sep 2026 │  ← browser-local timestamp
│ ┌──────────────────────────────────┐ │
│ │ Sample Heights Phase 1            │ │
│ │ P00000000001                      │ │
│ │ Revised proposed completion       │ │
│ │ Before: not present (read 15 Jun) │ │
│ │ After:  30 Jun 2028 (read 20 Sep) │ │
│ │ Document dated 02 Apr 2026 · View ›│ │
│ │ What this means: the register now │ │
│ │ shows a revised date. Your        │ │
│ │ agreement date may differ.        │ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ Sample Heights (Other District)   │ │
│ │ P00000000003                      │ │
│ │ Registration status               │ │
│ │ Official sources disagree ⚠       │ │
│ │ Project page: Registered          │ │
│ │   (document 02 Jan 2026)          │ │
│ │ Lapsed list: Lapsed               │ │
│ │   (document 01 Aug 2026)          │ │
│ │ Neither is shown as current.      │ │
│ │ Confirm on MahaRERA ↗             │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

Annotations:
- A change is always "before / after" with both retrieval dates and the document date of the after value. "Before: not present" is a statement about our earlier read, and is worded so.
- A change from verified to unavailable is **not** shown as a change to the value. It is shown as "Could not re-verify on R; last verified value remains from R0", matching the AGENTS.md rule that a failed extraction never overwrites the last verified value.
- Contradictions are a change type of their own and never auto-resolve to the newer document.
- The Changes screen never presents an old change as new. With a saved visit it has two dated sections: "New since your last visit on <date>" (only change events whose after-read date is strictly later than the visit date) and "Earlier or undated changes" (read on or before the visit, or with no usable read date). Contradictions sit in their own "Official sources disagree" section as a current state, not a dated event. The chip and the Changes screen use one rule (`afterVisit` in `core.js`): a valid ISO date strictly later than the visit date is after it; the visit day itself, a missing date and a malformed date are not, so no "new since" claim is made that the data cannot support. A failed later read is never a change (adversarial F22).

### 3.5 Return later

- Last visit is stored in the browser with the shortlist, as the real date of the visit when the Changes screen was opened. On return, each shortlist card shows up to four chips, each listing field names: "Changed since your last visit on <date>: <fields>", "Verified on a later check since your last visit on <date>; earlier value not available for comparison: <fields>", "Could not verify on the later check since your last visit on <date>: <fields>" and "Not re-checked since your last visit on <date>: <fields>". No "no change detected" claim is made without a comparable earlier value; a later reading that came back unavailable, unknown or contradictory goes in the "Could not verify" chip (adversarial F17, F21). The compare screen uses the latest *successful verification*, not the latest failed check attempt, for "Last verified" (F20). There is no whole-project "no change" sentence (F15).
- For the synthetic prototype, a QA control on the Changes screen can set an illustrative last visit (01 Sep 2026). The stored visit is then flagged and every chip says "illustrative last visit", so a fixed dataset can demonstrate the changed-field chip without pretending to be a real visit.
- A shortlist entry whose ID no longer resolves on our side shows "Record not found in our reading dated R. Check MahaRERA." and is never silently removed.
- Nothing about a buyer's shortlist leaves the device in this pilot. No notification channel is designed here; it would need an account, which is out of scope.

## 4. Mobile accessibility constraints

- Minimum tap target 44 × 44 px; minimum 8 px between adjacent targets.
- Base text 16 px; provenance lines 14 px minimum; no text under 12 px anywhere.
- Contrast at least 4.5:1 for text and 3:1 for state icons against their background. State colours: verified teal, unavailable slate, older snapshot amber, contradiction red-brown. Every state also has a glyph and a text label.
- Screen-reader order follows the visual order: title, ID, locality, then the record card as a `<dl>`. The state label is inside the value cell so it is read with the value.
- Live regions: shortlist changes and compare-pair changes use `aria-live="polite"`. Nothing uses `assertive`.
- No horizontal scrolling at 320 px wide. Compare stacks its cells below 390 px.
- Respects `prefers-reduced-motion`; the only animation is a disclosure expand, disabled under that setting.
- Focus visible on all interactive elements with a 2 px outline offset from the element.
- Language attribute `en`; long words such as registration numbers use `overflow-wrap: anywhere` so they wrap rather than overflow.

## 5. Ad placement constraints (keeps ads distinct from official data)

The pilot has no ads. These constraints are recorded now so the layout does not later have to be rebuilt around them.

1. An ad slot is never inside, adjacent-within, or visually continuous with the official record card, the compare table or a change card. Minimum 24 px gap and a full-width rule between an ad and any record surface.
2. The slot is labelled `Sponsored` in 14 px text at its top-left, on a distinct background (prototype: dotted border, no shadow, no card styling), and never uses the words official, verified, MahaRERA, RERA, record or registered.
3. Ads are never rendered inside a field row, between two field rows, or between the "before" and "after" of a change.
4. An ad may not use the state colours or glyphs from section 2.
5. No ad appears above the first result on search, above the record card on the project page, or anywhere on the compare screen. The compare screen is ad-free because two columns leave no space that cannot be confused with a third column.
6. Interstitials, sticky-bottom ads and ads that shift layout after load are excluded outright; the bottom action bar is reserved for buyer actions.
7. Sponsored listings of projects are not ads under these rules: they are project records and must go through the same provenance and state rendering, with a `Sponsored` label added, or not appear.

## 6. Out of scope for this issue

Accounts, notifications, real data, any source collector, the `dist/` page, locality and infrastructure layers, and any ranking or recommendation logic.
