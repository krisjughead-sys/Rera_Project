# RERA-03: MahaRERA source verification, first pass (mediated retrieval)

Issue: [krisjughead-sys/Rera_Project#5](https://github.com/krisjughead-sys/Rera_Project/issues/5). Read-only investigation. No collector, no `dist/` change, no real-project values, no change to the author branches of PRs #4, #8 or #9. Base commit `ba14305` on `main`. Session date 2026-09-27 (UTC).

**Read this first.** This container still cannot reach any MahaRERA host directly (section 2). Eight official pages were nevertheless read in full through the session's attached Parallel Search connector, a third-party fetch service. That is a permitted route, but it is *mediated*: the service may have served cached captures, and the page footers show it did (section 2.3). Everything read that way is labelled **L0m**. Nothing in this document is L0 (first-hand from a permitted browser). Search-index excerpts remain L1/L2 and are marked as such. The report separates verified facts (section 3 to 6), interpretation (section 7), the PR comparison (section 8) and open decisions (section 9).

## 1. Evidence levels used here

| Level | Meaning |
|---|---|
| L0 | Read first-hand from a permitted browser or from this container. **None achieved.** |
| L0m | Full page text returned by the Parallel Search `web_fetch` connector; page body read in full and hashed; capture date inferred from the page footer, not controlled by us. |
| L0m-x | Excerpts of a page returned by the same connector (partial text chosen by the service); labels quoted from it are real page text, but the rest of the page was not seen. |
| L1 | Official URL and page title present in a search index; body not read. |
| L2 | Field or behaviour described only by search excerpts (including excerpts of official PDFs); needs confirmation. |
| L3 | Hypothesis or inference; no citation. |

Retrieval timestamps are the UTC time of the request from this session. For L0m rows the *capture* time is unknown; the footer `Last Updated` date and visitor counter on each page are recorded as the best available capture indicator (section 2.3).

## 2. Access log

### 2.1 Direct routes from this container: blocked by the environment, not the source

| Route | Target | Result | Timestamp (UTC) |
|---|---|---|---|
| `curl` GET, 25 s timeout, descriptive User-Agent, one request each | `https://maharera.maharashtra.gov.in/` | proxy `CONNECT` refused, HTTP 403; no packet reached the source | 2026-09-27T08:58:02Z |
| same | `https://maharera.maharashtra.gov.in/robots.txt` | proxy `CONNECT` refused, HTTP 403 | 2026-09-27T08:58:02Z |
| same | `https://maharerait.mahaonline.gov.in/` | proxy `CONNECT` refused, HTTP 403 | 2026-09-27T08:58:03Z |
| built-in `WebFetch` tool | `/robots.txt`, `/terms-conditions` | `EGRESS_BLOCKED` for `maharera.maharashtra.gov.in` | 2026-09-27T08:58:40Z (approx.) |

The proxy status endpoint reports `connect_rejected (the egress proxy denied the CONNECT (organization policy) ...)`. This is the cloud environment's network policy. Remedy is an owner action: add `maharera.maharashtra.gov.in` (and `maharerait.mahaonline.gov.in` if the legacy host is ever needed) to the environment's allowed domains, or run the pass from a permitted browser as the issue proposes. No bypass was attempted.

### 2.2 Mediated route: Parallel Search connector (attached to the session, free tier)

| Request | URLs | Result | Request time (UTC) |
|---|---|---|---|
| `web_fetch` #1 | terms-conditions, copyright-policy, disclaimer, robots.txt | terms and copyright: full text returned; disclaimer: body not extracted (only "Skip to main content"); robots.txt: `network_error`, no status code | 2026-09-27T08:58:45Z (approx.) |
| `web_fetch` #2 | hyperlinking-policy, privacy-policy, disclaimer, guidance-project-update-quarterly-annually, guidance-extension-application, due-lapse-completion-date, project-updates | all seven returned; disclaimer again body-less | 2026-09-27T08:59:07Z (saved) |
| `web_fetch` #3 | projects-search-result, registered-real-estate-projects, lapsed-projects-detail, list_of_projects_deregistered, map-projects-search-result, order | **free-tier rate limit**; nothing returned | 2026-09-27T08:59:59Z (approx.) |
| `web_search` | order PDFs and project-detail label queries | returned official PDF excerpts (L2), see section 6 | 2026-09-27T08:59:50Z (approx.) |
| `web_search` #2 | project-detail URL pattern | rate limit | 2026-09-27T09:00:20Z (approx.) |
| `web_fetch` #4 (retry after a 4-minute pause, quota had reset) | projects-search-result, robots.txt, Order_No_33_2022.pdf, 28.pdf, lapsed-projects-detail, disclaimer | five returned as excerpts; robots.txt `network_error` again; disclaimer body-less again | 2026-09-27T09:04:30Z (approx.) |
| `web_fetch` #5 | the detail page linked from the first search result, and its `?isOriginal=true` variant | only an interstitial returned (section 4, row "detail page"); stopped, no bypass | 2026-09-27T09:05:30Z (approx.) |
| `web_fetch` #6 | registered-real-estate-projects, list_of_projects_deregistered, map-projects-search-result, order | three returned as excerpts; registered list body not extracted | 2026-09-27T09:06:30Z (approx.) |

Per the issue's budget rule no API key was added. The rate limit is a tool quota, not a MahaRERA restriction.

### 2.3 Capture-date caveat for every L0m page

Each captured page ends with a site footer. The footer values differ from page to page in a way that only makes sense if the connector served captures taken on different days:

| Page | Footer `Last Updated` | Footer `Total Visitors` | SHA-256 of captured body text (first 16 hex) |
|---|---|---|---|
| project-updates | 24/09/2025 | 53,223,984 | `6fd190b3b9f39a14` |
| hyperlinking-policy | 14/01/2026 | 63,279,880 | `35320492a455348b` |
| copyright-policy | 17/07/2026 | 81,537,840 | `6793a477041931be` |
| due-lapse-completion-date | 27/07/2026 | 82,352,759 | `bde4f5aea65415ba` |
| terms-conditions | 11/08/2026 | 84,171,088 | `09c5f99a95e87c3f` |
| privacy-policy | 11/08/2026 | 84,191,063 | `88fd712747d7abd1` |
| guidance-extension-application | 27/08/2026 | 86,128,931 | `2e011ceb25979936` |
| guidance-project-update-quarterly-annually | 08/09/2026 | 87,536,358 | `30b43c8cfa01fc85` |

The visitor counter rises monotonically with the footer date, so the footer date is a plausible capture date. What "Last Updated" means on this site (page edit, site build, or render date) is **not confirmed**. Hashes are SHA-256 over the body text as extracted by the connector (terms and copyright: over the quoted paragraphs in section 3). The raw captures are kept only in the session scratchpad because the abeyance list contains real project rows; they are not committed.

Consequence: no L0m row below can carry a retrieval timestamp that is ours. Any fact record built from these captures would fail the `retrievedAt` rule in both `record-validation.mjs` and PR #8's contract, correctly. This pass therefore verifies **labels, page structure and policy wording**, not project values.

### 2.4 Pacing and stop points

Six connector requests in total, at most 7 URLs each, one retry after the quota error, roughly one request per minute. Stopped on: the detail-page interstitial (treated as a challenge page; never bypassed), the second `robots.txt` failure, and the second empty disclaimer. Excerpt-mode responses (requests #4 to #6) are partial page text chosen by the connector; they are labelled **L0m-x** below because the whole page was not read.

## 3. Site policy pages (L0m, quoted)

**Copyright Policy** (`https://maharera.maharashtra.gov.in/copyright-policy`, capture footer 17/07/2026):

> Material featured on this portal may be reproduced free of charge in any format or media without requiring specific permission. This is subject to the material being reproduced accurately and not being used in a derogatory manner or in a misleading context. Where the material is being published or issued to others, the source must be prominently acknowledged. However, the permission to reproduce this material does not extend to any material on this site which is identified as being the copyright of the third party. Authorization to reproduce such material is obtained from the copyright holders concerned.

**Hyperlinking Policy** (`/hyperlinking-policy`, capture footer 14/01/2026):

> We do not object you for linking directly to the information that is hosted on our site and no prior permission is required for the same.We do not permit our pages to be loaded into frames on your site. Our Department's pages must load into a newly opened browser window of the user.

**Terms & Conditions** (`/terms-conditions`, capture footer 11/08/2026), the three sentences that matter:

> Efforts have been made to ensure the accuracy and currency of the content on this website; however, the same should not be interpreted as a statement of law or used for any legal purposes. In case of any ambiguity or doubts, users are advised to verify / check with the concerned Department(s) and / or other source(s), and obtain appropriate professional advice.

> Under no circumstances Maharashtra Real Estate Regulatory Authority. will be liable for any expense, loss or damage including, without limitation, indirect or consequential loss or damage or any expense, whatsoever arising from use, or loss of use, of data, arising out of or in connection with the use of this website.

> These terms and conditions shall be governed by and construed in accordance with the Indian Laws. Any dispute arising under these terms and conditions shall be subject to the jurisdiction of the courts of India.

The full terms text contains no clause about automated access, scraping, rate limits or bulk download. The **Privacy Policy** (`/privacy-policy`, footer 11/08/2026) says the portal logs IP address, browser, OS, visit time and pages visited for statistics; nothing about bots.

**Disclaimer** (`/disclaimer`): body not returned by the connector on two attempts (only the skip-link text). Status: **inaccessible via this route, not absent**. The snippet quoted in PR #4 S12 ("does not take responsibility on how this information is used") remains L2.

**robots.txt**: not obtained by any route. Status: **inaccessible**. Nothing can be said about crawl permissions until it is read.

## 4. Field labels and page structure observed (L0m unless marked)

| Observed official label or heading | Where | Level | Note |
|---|---|---|---|
| `Certificate No.` | column heading, abeyance list "Due to Lapse of Completion Date" | L0m | This is the official column label for the registration number. All 4,258 rows carried exactly one value matching `P` + 11 digits in that column, which confirms the validator regex `^P\d{11}$` on a large official sample. |
| `Sr. No.`, `Certificate No.`, `Name of Promoter`, `Name of Project`, `District` | the five columns of that list | L0m | No per-row date, no "as on" date, no status column. The only date on the page is the site footer. |
| Intro sentence on that list | same page | L0m | "The following projects are kept in abeyance, the bank accounts of these projects are frozen, and the concerned promoter is prohibited from executing agreements for sale/sale deeds with buyers until further compliances are fulfilled by the promoter." |
| `Revised Proposed date of Completion` | guidance-project-update-quarterly-annually | L0m | Sentence: "Update the building-wise completion date (This date cannot be beyond the Revised Proposed date of Completion) in the Add building tab under Project details." |
| `Building-wise Completion Date` | same page, list of update sections | L0m | A per-building date, distinct from the project-level date, entered under "Add building tab under Project details". Not modelled in PR #4, #8 or #9. |
| `Proposed date of completion` | FAQ PDF (`/sites/default/files/inline-files/FAQ_1.pdf`) | L2 | Q25: "Proposed date of completion is part of extension or correction? Ans: Proposed date of completion is part of extension." Q32: advanced search can filter by "proposed date of completion". |
| Extension types: `Extension under section 6` (max 1 year), `Extension Application under 7(3)` A) with consent of allottees (Format B, circular 28/2021), B) without consent (order 40/2022 dated 27/12/2022) | guidance-extension-application | L0m | Promoter flow: "Select the extended date and provide reasons. Choose extension under 7(3) option if applying for extension for period exceeding one year." |
| Home Buyers navigation: `Registered Real Estate Projects`, `View Projects on Map`, `Lapsed Projects`, `Registration Revoked / Ab initio void`, `Abeyance Project List` with four sub-lists (`Due to Lapse of Completion date`, `Due to Non Compliance of QPR`, `Due to Common Bank Account`, `As per Authorities order & other reasons`), `NCLT Projects`, `Project De-registration Notices`, `List of Projects Deregistered` | site navigation captured with project-updates | L0m | This is the official status-list vocabulary. PR #4 section 6 lists five states; the site exposes at least nine list types. |
| `Project Updates` categories: `Quarterly Updates`, `Updating Forms for Withdrawal of Money`, `Annual Updates`, `Other Regular Updates`, `Updates at time of completion of project` | project-updates | L0m | Category headings only; the page links onward for details. |
| Promoter login and update flows are on `https://maharerait.maharashtra.gov.in/login/` | several pages | L0m | A third hostname, which also serves the public project view (see the search-page row below). Neither validator accepts it today. |
| `Sr. No`, `Name of Promoter`, `Name of the Project`, `Certificate No.`, `Proposed Date of Completion`, `District`, `Taluka`, `Division` | column headings, "List of Lapsed Projects" (`/lapsed-projects-detail`) | L0m-x | **Official label `Proposed Date of Completion` confirmed on an official page.** Dates in that column are printed `dd-mm-yyyy` with hyphens, not `dd.mm.yyyy`. No per-row lapse date; no "as on" date. |
| `Sr.No`, `Circular/ Orders No.`, `File No.`, `Issue Date`, `Abstract`, `Document` | orders page (`/order`), year filter 2015 to 2030 | L0m-x | Issue dates printed `dd/mm/yyyy`. Rows seen include Order No - 66/2026 (07/08/2026, "Extension of registration of real estate projects due to Force Manjeure" [sic]), **Order No - 65A/2026 (08/05/2026, "Closure of the old MahaRERA portal with effect from 11th May 2026")**, Order No- 64/2025 (02/05/2025, "Guidelines for Go-Live of Project Lifecycle Management Module in MahaRERA"), Order No-62/2024 (22/10/2024, "Completion of Project under UDCPR"). Footer 23/09/2026. |
| Deregistered list row shape: serial, project name, promoter, `Certificate No.`, planning authority, link `order` to a per-project PDF | `/list_of_projects_deregistered` | L0m-x | Column headings not in the excerpt; shape inferred from rows. Each row links its own deregistration order PDF, so a **dated document per project exists** for this status (unlike the lapsed and abeyance lists). Footer 18/06/2026. |
| Search Project page: filters `Select Project Type`, `Select Carpet Area` (30-45 SQM, 45-60 SQM, 60-80 SQM, More than 80 SQM), `Completion Percentage(%)` (10-25%, 25-50%, 50-75%, 75-100%); each result shows a project name, a second name line, and three links: `View Details`, `View Original Application`, `View QR` | `/projects-search-result` | L0m-x | **The three links point at a third host**: `https://maharerait.maharashtra.gov.in/public/project/view/<numeric id>`, the same with `?isOriginal=true`, and `https://maharerait.maharashtra.gov.in/project/view/<numeric id>`. The path key is an internal numeric id, **not** the certificate number. Pagination control lists offsets 1, 6, 11, ... beyond 2100, so results come five per page. |
| Detail page (`/public/project/view/<id>` on `maharerait.maharashtra.gov.in`) | the first result's `View Details` link and its `?isOriginal=true` variant | inaccessible | Both returned only: "Please note that this is the beta version of the public view, launched for improved user experience.", a refresh glyph and a `Submit` button. That shape is consistent with a challenge (captcha) or a script-rendered gate. **No field label from the detail page was read.** Stopped per the issue's rule. |
| Map page (`/map-projects-search-result`, "Search GIS Map") | page body embeds a JSON array with keys seen: `projectName`, `plotBearing`, `street`, `locality`, `project_State`, `pincode` | L0m-x | Keys for latitude/longitude and certificate number were not in the excerpt (PR #4 S03 lists them from a snippet, still L2). Several `projectName` values look like promoter or company names, so that key's meaning is ambiguous. Footer 14/01/2026, so this capture is old. |
| Registered Real Estate Projects list | `/registered-real-estate-projects` | inaccessible via this route | body not extracted (only the skip link); `publish_date` 2026-09-23 reported by the connector. Not evidence of an empty page. |
| `Project Status`, `Last Modified`, litigation tab, building tab, coordinates on the detail page | not read | untested | Behind the detail-page gate above. |

## 5. Per-field verification matrix

Columns: proposed buyer-facing field (from PRs #4, #8, #9); official source; how it is tied to the registration number; official label and meaning; status; what a later missing reading can and cannot mean.

| Buyer field | Official source (URL) | Tie to registration number | Official label and meaning | Status | A later missing / unavailable reading means |
|---|---|---|---|---|---|
| Project ID | any list page; detail page (gated) | the value itself, column `Certificate No.`; **the detail-page URL does not contain it** | `Certificate No.`; format `P` + 11 digits confirmed on 4,258 rows (L0m) | **confirmed (format and label)**; page-to-ID binding must come from page content, exactly as PR #8's `sourcePageReraId` requires | n/a; without the ID there is no record |
| Registration status | the nine official lists (section 4); a per-project status label on the detail page is unread | list row keyed by `Certificate No.` | Lists are named by reason (lapsed, revoked/ab initio void, abeyance × 4 reasons, NCLT, deregistration notice, deregistered). Lapsed and abeyance rows carry no date; deregistered rows link a per-project order PDF. | **ambiguous**: presence in a list is verifiable; the *date* the project entered or left a list is not printed, except where a per-row order PDF exists | absence from a list on a later read can mean the project complied, was moved to another list, or the page failed to load; it never means "registered". Presence on an earlier read is not contradicted by absence later. A list-derived fact has no printed `documentDate` (section 8, C3). |
| Proposed date of completion (original) | lapsed list column (L0m-x); detail page (gated); FAQ (L2) | lapsed list: same row as `Certificate No.`; detail page: page content only, since the URL key is an internal id | `Proposed Date of Completion` (label confirmed on the lapsed list, `dd-mm-yyyy`). FAQ says it "is part of extension", i.e. it changes through the extension process. The search page's separate `View Original Application` link means the portal itself keeps the original application distinct from the current view. | **label confirmed; detail-page placement untested (gated)** | if the field is missing later while an extension exists, the original may have been replaced rather than removed; keep the first verified value and never overwrite (existing rule). |
| Revised proposed date of completion | guidance page (L0m); detail page (unread) | same | `Revised Proposed date of Completion` exists as an official term (L0m). Official guidance ties it to the extension process (Section 6, Section 7(3)), which the Authority grants; it is not shown to be a free promoter declaration. | **confirmed as a term; placement on the detail page untested; meaning ambiguous** (section 7) | a later "not present" cannot mean "no extension": the field may live under a tab that failed to load. Say "could not verify". |
| Extension of registration (PR #8/#9 `extended`) | guidance-extension-application (L0m) | same | No official field labelled "extended date" was observed. Extension is a *process* with two legal bases; its visible output on the public page is unknown and may simply be the revised date above. | **ambiguous / untested** | nothing; the field may not exist as a separate label |
| Building-wise completion date | guidance page (L0m); detail page (unread) | per building under the project | `Building-wise Completion Date`, bounded by the revised proposed date | **confirmed as a term; not modelled by any PR** | as above |
| Last quarterly update | project-updates (L0m categories); order PDFs (L2); detail page tab (unread) | unread | Duty under Section 11; timing per Orders 18/2021 and 33/2022 (section 6). An official "Due to Non Compliance of QPR" abeyance list exists (L0m). | **timing rule L2; page tab untested** | a missing update on our read is not non-compliance; only the official QPR non-compliance list may be used to say so, and it has no date either. |
| Litigation | detail page tab (unread) | unread | unconfirmed | **untested** | never "no litigation" |
| Location, coordinates | "View Projects on Map" exists (L0m nav); map page unread | unread | unconfirmed; coordinate provenance unknown | **untested** | never geocode |
| Promoter, project name, district | list pages (L0m columns) | list row | `Name of Promoter`, `Name of Project`, `District` | **confirmed (labels, on list pages)** | a later missing row is a page-load or list-membership question, not a name change |

## 6. Quarterly-update timing: what the orders say (L2, excerpts of official PDFs)

The first excerpt was returned by `web_search` and then again by `web_fetch` #4 directly from the official PDF; the second came from `web_search` and, partially, from `web_fetch` #4. Both are OCR text of scanned PDFs with OCR errors, reproduced as returned. Neither PDF was read in full, so both stay **L2 / L0m-x**.

- **Order No. 18/2021**, `https://maharera.maharashtra.gov.in/sites/default/files/Orders_and_circulars/28.pdf`, dated 28/07/2021 (OCR: "Datei2gloT l202l"), file no. MahaRERA/Secy/File No.27/148/2021, subject "Quarterly Update for Registered Projects": "MahaRERA shall implement 'Financial Quarter Based Project Progress Reporting System' for all MahaRERA registered real estate projects. Promoters shall file Quarterly Progress Reports (QPR) as per Financial Quarters within **7 days** of the Quarter End (Due Dates will be every 7th day of July, October, January and April respectively)." First QPR due 15 August 2021. The order lists what a QPR must cover (building plan approvals, physical and financial progress with Forms 1, 2, 2A, 3; Form 5 in Quarter II; Form 4 if applicable; bookings of units, garages and parking; project professionals; encumbrances; association of allottees; conveyance; any other change).
- **Order No. 33/2022**, `https://maharera.maharashtra.gov.in/sites/default/files/Orders_and_circulars/Order_No_33_2022.pdf`, connector `publish_date` 2022-07-06; the PDF excerpt reads "Amended pursuant to the directions issued by the Authorify in its meeting held on 22nd October 2021. Accordingly, Ordcr No. 18/2021 dated 28th July ..." and, per the earlier search excerpt: "MahaRERA had issued an Order no: 18/2021 dated 28 July 2021 on Quarterly updates for registered projects ... Promoters shall file Quarterly Progress Reports (QPR) as per Financial Quarters within **20 days** of the Quarter End (Due Dates will be 20th of July, October, January and April respectively)."
- **Guidance page** (L0m): "Failure to make quarterly project update will violate Section 11 of the Real Estate (Regulation and Development) Act, 2016 and would make the concerned promoter liable for penal action." No due date is stated on the guidance page.

So the 20-day rule that PR #4 S09 attributes to Order 18/2021 is, on this evidence, the **amended** rule from Order 33/2022; the original 18/2021 rule was 7 days. Both remain L2 until the PDFs are read. Neither PR #4 nor PR #9 computes an overdue flag, and this pass confirms they should not: the official site publishes its own "Due to Non Compliance of QPR" list, so the site can *cite* non-compliance without ever *inferring* it.

**Freshness wording in the prototype.** PR #9's 90-day "older snapshot" window is a prototype constant and is labelled as such in `RERA-05-adversarial-pass.md` ("not an official cadence"). Nothing found here gives it an official basis, and nothing contradicts using it as a purely internal re-check prompt as long as the wording keeps saying "last verified N days ago" and never "overdue". The ribbon sentence "Readings are dated 26 Sep 2026" is synthetic and is not a claim about MahaRERA.

## 7. Interpretation (not facts)

1. **Reuse looks permitted, with conditions.** The copyright policy allows free reproduction "in any format or media" provided it is accurate, not misleading, and the source is prominently acknowledged. The hyperlinking policy allows deep links without permission but forbids framing and requires a new window. Read together with the terms ("should not be interpreted as a statement of law"), a buyer site may republish project facts with a prominent per-field MahaRERA citation and a "not a statement of law" notice, and must never iframe the portal. Whether dynamically generated search results and project pages count as "material featured on this portal" is not settled by the text; and **automated collection is a separate question** that turns on robots.txt and any technical restriction, neither of which was readable. Recommendation: treat manual or low-volume reads as acceptable under the quoted policy, and keep any collector decision blocked on robots.txt.
2. **"Revised" and "extended" may be one thing.** The only official mechanism found for changing the completion date is an extension (Section 6, up to one year; Section 7(3) beyond that, with or without allottee consent). The public-facing result is called "Revised Proposed date of Completion". The PR #9 prose "A revised date on the register is the promoter's declaration to the authority" is not supported by what was read: the Authority grants extensions. Until the detail page is read, the safest buyer wording is neutral: "the revised date recorded by MahaRERA".
3. **Per-building dates matter to buyers** and are official ("Building-wise Completion Date", bounded by the project's revised date). None of the three PRs models them. Not a change request yet; a modelling decision.
4. **Status is list membership, undated.** For the lists read, "documentDate" as defined in the repo (the date printed on the document) does not exist. The footer date is site-level and of unconfirmed meaning.
5. **The old portal is closed.** The orders page lists Order No - 65A/2026 dated 08/05/2026, abstract "Closure of the old MahaRERA portal with effect from 11th May 2026" (L0m-x, abstract only; order text unread). PR #4's S04/S05/S14 rows (legacy `maharerait.mahaonline.gov.in`) and both validators' allow-listing of that host should be revisited: a citation to the old portal after 11 May 2026 is probably a citation to a closed system. Which hostnames the order covers is not established.
6. **The public project view lives on `maharerait.maharashtra.gov.in`, keyed by an internal id, behind a gate.** This host is absent from `record-validation.mjs` and from PR #8's `OFFICIAL_HOSTS`, so today no field-level citation to a project detail page can pass validation at all. Adding the host is necessary for any per-project fact; it is also where the promoter login lives, so the allow-list should be path-aware (`/public/project/view/`) if the owner wants to be strict. The `?isOriginal=true` variant is the portal's own original-vs-current separation and is the natural source for the *original* date kind.
7. **The registration-number format is solid.** 4,258 of 4,258 rows matched `^P\d{11}$`, and the leading digits cluster by district code. This supports the validator regex and PR #9's rule that synthetic IDs use a `P0000` prefix (no official row began with `P0000`; the lowest observed prefix group was `P50`).

## 8. Comparison with PR #4 (provenance map), PR #8 (contract) and PR #9 (labels)

| # | Item | PR #4 | PR #8 | PR #9 | This pass | Smallest evidence-backed change |
|---|---|---|---|---|---|---|
| C1 | Field naming for dates | `originalCompletion`, `revisedCompletion`, `extensionCompletion` (three keys) | one key + `dateKind` original / revised / extended | same as #8, rows "Proposed completion (as registered)", "Revised proposed completion", "Extension of registration" | official terms seen: "Proposed Date of Completion" (L2), "Revised Proposed date of Completion" (L0m), "Building-wise Completion Date" (L0m); no "extended" label seen | Owner decision (already open on #4 as C1). Evidence favours keeping *original* and *revised* as the two project-level kinds and treating "extended" as unconfirmed until the detail page is read; add a per-building date only if the detail page shows it. |
| C2 | Meaning of the revised date | section 6: extension order "is not the same as a promoter-declared revised date" | neutral | "What this means" prose: promoter's declaration | official guidance ties the revised date to an Authority-granted extension | PR #9: reword the explanation to "the revised date recorded by MahaRERA; it is not the possession date in your agreement". PR #4 section 6: mark the "promoter-declared" sentence unconfirmed. |
| C3 | `documentDate` for list-derived status | 'list "as on" date if printed, else retrieval date' | `documentDate` must be a calendar date; no flag saying it is really a retrieval date | shows "Document dated D" for every verified field | the abeyance list has no printed date | Decision: either add an explicit marker in the #8 contract (for example `documentDateBasis: 'printed' \| 'retrieval'`) or keep list statuses out of `verified` until a dated document exists. PR #9 would then need to render "No document date on the list; read on R" instead of "Document dated". |
| C4 | Quarterly-update rule | S09: 20-day rule attributed to Order 18/2021 (L2) | n/a | 90-day prototype window, labelled internal | 18/2021 = 7 days; 33/2022 (05/07/2022) = 20 days; both L2 | PR #4 S09: cite 33/2022 as the amending order and 18/2021 as the original with its 7-day text; keep "do not compute overdue"; add the official "Due to Non Compliance of QPR" list as the only permitted non-compliance source. |
| C5 | Status vocabulary | five states | n/a | `registrationStatus` values "Registered", "Lapsed" | nine official list types (section 4) | PR #4 S07/S08: list all nine with their URLs once read; PR #9: allow the conflict fixture wording as is (a project page vs a list is exactly the observed structure). |
| C6 | Site policy | S12 "must be read" | n/a | links open in a new tab (`target="_blank"`), no framing | copyright, hyperlinking, terms, privacy quoted (L0m); disclaimer and robots.txt still unread | PR #4 S12: convert to L0m with the quotes above; record that framing is prohibited and a new window is required, which `dist/` and the prototype already satisfy. |
| C7 | Registration-number label | "certificate number" | `reraId` | "registration number", "MahaRERA number" | official column label is `Certificate No.` | No change needed; note the official label next to the field definition so search copy can say "MahaRERA certificate (registration) number" if the owner wants the official word visible. |
| C8 | Hostnames | S04/S05/S14 treat `maharerait.mahaonline.gov.in` as legacy but possibly live | `OFFICIAL_HOSTS` = `maharera.maharashtra.gov.in`, `maharerait.mahaonline.gov.in` | prototype links only to `maharera.maharashtra.gov.in` | public detail pages are on `maharerait.maharashtra.gov.in` (not allow-listed); the old portal is closed since 11 May 2026 per Order 65A/2026's abstract | Decision: add `maharerait.maharashtra.gov.in` to both validators (path-restricted if wanted) and mark `maharerait.mahaonline.gov.in` as closed in PR #4 (keep it accepted only for pre-May-2026 snapshots, if any). |
| C10 | Printed date format | section 7: "Indian portals print dd.mm.yyyy" | n/a | `printed` fixture values use `31.12.2027` | official list prints `31-12-2017` style (`dd-mm-yyyy`); orders page prints `dd/mm/yyyy` | PR #4 section 7 and PR #9 fixtures: say "dd-mm-yyyy or dd/mm/yyyy as printed" rather than dots; the parsing warning (day before month) stands. |
| C11 | Original vs current view | S06 assumes both dates on one page | `dateKind` original / revised | two rows | the portal offers `View Details` and `View Original Application` as two pages | Record in PR #4 S06 that the original date may need the `?isOriginal=true` page as its own `sourceUrl`; PR #8 already allows a different `sourceUrl` per dateKind, so no contract change. |
| C9 | Fixture key `possessionDate` in #8 tests | n/a | test fixture uses `possessionDate` | n/a | "possession" is contractual, not a MahaRERA term seen | Optional: rename the fixture key to `completionDate` so the test file itself does not model the confusion AGENTS.md flags. Not blocking. |

## 9. Summary lists

**Confirmed (L0m, mediated, capture date from footer)**
- Copyright, hyperlinking, terms and privacy wording (section 3).
- Official label `Certificate No.` and the `P` + 11-digit format across 4,258 rows.
- List page structure: five columns, no per-row date.
- Official term "Revised Proposed date of Completion" and the separate "Building-wise Completion Date".
- Extension mechanism: Section 6 (max one year) and Section 7(3) with or without consent.
- Official status-list vocabulary (nine list types) and the Project Updates categories.
- Official label `Proposed Date of Completion` and its `dd-mm-yyyy` printing on the lapsed list; orders page columns and `dd/mm/yyyy` issue dates.
- Search page filters and the three per-result links (`View Details`, `View Original Application`, `View QR`) to `maharerait.maharashtra.gov.in/public/project/view/<id>`.
- Order 65A/2026 abstract: old portal closed from 11 May 2026 (abstract only).

**Blocked or untested**
- robots.txt (all routes), disclaimer body (extraction failed twice).
- Project detail page labels and tabs, litigation tab, `Project Status`, any "Last Modified" date: the page is behind an interstitial on `maharerait.maharashtra.gov.in`. Registered-projects list body: not extracted. Map data keys for coordinates: not in the excerpt.
- Order PDFs 18/2021, 33/2022 and 65A/2026 (excerpts or abstract only).
- Any first-hand (L0) reading. Any retrieval timestamp that is ours.

**Contradictions across the three PRs**
- C1 naming (three keys vs key + dateKind), already recorded on #4.
- C2 meaning of the revised date (#4 and #9 both assert a promoter-declared revised date; official guidance ties it to an Authority-granted extension).
- C3 `documentDate` for undated lists (#4 allows retrieval date; #8 has no way to say so; #9 would print "Document dated" over a retrieval date).
- C4 the 20-day rule's source order.
- C8 hostnames: no PR allow-lists the host that serves the public project view, and both validators allow-list a portal reported closed.
- C10 printed date format (dots in #4 and #9, hyphens and slashes on the site).

**Decisions needed from the owner**
1. Allow-list `maharera.maharashtra.gov.in` for the cloud environment, or run the L0 pass from a permitted browser. Without one of these, RERA-03 stays `source-blocked` for the detail page and robots.txt.
2. C1: which date model wins, and whether "extended" stays a dateKind before the detail page is read.
3. C3: how an undated official list becomes a verified status under the #8 contract.
4. Whether to add a per-building completion date to the model.
5. Whether "Certificate No." should appear in buyer-facing copy alongside "registration number".
6. C8: add `maharerait.maharashtra.gov.in` to the official-host allow-lists, and how to treat the closed legacy host.
7. Whether the detail-page gate (section 4) is a captcha; only a permitted browser can tell. If it is, per-project facts need a manual, authorised workflow, and RERA-03 stays `source-blocked` for per-project fields regardless of the environment allow-list.
8. Whether the Parallel connector may be used again for the remaining pages once its free quota resets, given that its captures are undated; or whether only L0 counts for statutory facts (this report's recommendation: L0m is enough for labels and policy text, L0 is required before any project value is published).

## 10. Checks run for this change

```
node --test tests/*.test.mjs        # includes tests/rera-03-source-verification.test.mjs
node scripts/check-project-data.mjs  # "No project dataset yet: safe prototype stage."
```

The new test asserts that this document contains no registration-number-shaped string and no Maharashtra-range coordinate pair, that every access-log row carries a UTC timestamp, that no row claims L0, and that every L0m row in section 2.3 carries a footer date and a hash.
