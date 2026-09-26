# RERA-02: Official source inventory and field-level provenance map (Maharashtra)

Issue: [krisjughead-sys/Rera_Project#3](https://github.com/krisjughead-sys/Rera_Project/issues/3). Research pass only. No live collector, no public `dist/` change, no real-project facts. Base commit `ba14305` on `main`.

**Read this first.** Every official host probed from this session was denied by the session's own network egress policy, not by the source. Nothing below was retrieved first-hand. Rows are built from the public search index (official page titles and URLs, plus snippets) and are labelled with an evidence level. Treat every field claim as **unverified until a first-hand retrieval pass (proposed RERA-03) confirms it**.

## 1. Outcome in one paragraph

MahaRERA's public site (`maharera.maharashtra.gov.in`) is the only candidate for **first-release** project facts. Everything about what it offers below is an **unverified lead from the public search index, not a confirmed fact** (see section 4 for the evidence level of each item): the index indicates it hosts a project search, a registered-projects list, a map search that may expose coordinates and administrative location, separate lists for lapsed, deregistered, revoked and abeyance projects, orders that are reported to define a quarterly update duty, and Terms, Copyright and Disclaimer pages that must be read and quoted before any reuse is decided. All other official sources found (IGR ready reckoner, land records, BMC and PMC planning portals, transit authorities, environmental clearance) are **locality context** that the index suggests needs per-plot manual lookup, captcha or login, or owner approval (row-by-row, unconfirmed; see section 4), and belong in the backlog. The block on this session's network means no restriction (robots, terms, captcha, rate limit) on any host is confirmed yet; the document says so per row instead of guessing.

## 2. Evidence levels and timestamps

| Level | Meaning |
|---|---|
| L0 | Retrieved first-hand in this session (HTTP status, robots.txt, page text). **None achieved.** |
| L1 | Official URL and page title present in the public search index; page body not read. |
| L2 | Field or behaviour described only by search snippets (official or third-party); needs confirmation. |
| L3 | Hypothesis or inference; no citation. |

Retrieval timestamps in this document are the UTC time of the search-index query or egress probe, not of a page fetch. Search batches: A = 2026-09-26T15:13Z, B = 2026-09-26T15:14Z, C = 2026-09-26T15:15Z. Egress probes: 2026-09-26T15:12:26Z to 15:12:28Z.

## 3. Access log: `source-blocked (environment)`

Probe: `curl` HEAD-equivalent GET of `/` and `/robots.txt` per host, 25 s timeout, descriptive User-Agent, one request per URL, no retries. The session's egress proxy refused every CONNECT with HTTP 403 before any packet reached the source. The built-in fetch tool returned `EGRESS_BLOCKED` for the three hosts tried (`maharera.maharashtra.gov.in`, `www.data.gov.in`, `igrmaharashtra.gov.in`).

| Host | Result | Timestamp (UTC) |
|---|---|---|
| maharera.maharashtra.gov.in | CONNECT 403 (proxy) | 2026-09-26T15:12:26Z |
| maharerait.mahaonline.gov.in | CONNECT 403 (proxy) | 2026-09-26T15:12:26Z |
| maharera.mahaonline.gov.in | CONNECT 403 (proxy) | 2026-09-26T15:12:26Z |
| portal.mcgm.gov.in, dpremarks.mcgm.gov.in | CONNECT 403 (proxy) | 2026-09-26T15:12:26Z |
| www.pmc.gov.in, www.pcmcindia.gov.in, thanecity.gov.in, www.nmmc.gov.in | CONNECT 403 (proxy) | 2026-09-26T15:12:26Z to 15:12:27Z |
| cidco.maharashtra.gov.in, mmrda.maharashtra.gov.in, www.pmrda.gov.in | CONNECT 403 (proxy) | 2026-09-26T15:12:27Z |
| mmrcl.com, mmmocl.co.in, www.punemetrorail.org, www.mahametro.org, www.msrdc.org, nhai.gov.in | CONNECT 403 (proxy) | 2026-09-26T15:12:27Z |
| mrvc.indianrail.gov.in (wrong host; official is mrvc.indianrailways.gov.in, not probed) | CONNECT 403 (proxy) | 2026-09-26T15:12:27Z |
| bhulekh.mahabhumi.gov.in, mahabhunakasha.mahabhumi.gov.in, igrmaharashtra.gov.in, freesearchigrservice.maharashtra.gov.in | CONNECT 403 (proxy) | 2026-09-26T15:12:27Z |
| mrsac.gov.in, bhuvan.nrsc.gov.in, parivesh.nic.in, www.data.gov.in | CONNECT 403 (proxy) | 2026-09-26T15:12:28Z |
| www.maharashtra.gov.in, udd.maharashtra.gov.in, mahaulb.maharashtra.gov.in | CONNECT 403 (proxy) | 2026-09-26T15:12:28Z |

What this is not: it is not evidence of a robots.txt rule, captcha, login wall or rate limit on any source. Remedy is an owner decision: add the first-release hosts (section 8) to the cloud environment's allowed domains, then run the first-hand pass. The Parallel Search MCP tool hit its free-tier limit during this pass; per the issue's budget rule no key was added.

## 4. Source inventory

Columns: fields the source can supply; how dates are expressed; published update cadence; access method; restrictions (observed vs hypothesised); retrieved-at; evidence level; disposition. `?` means not established. Registration numbers are never reproduced here; the format is written as `P` + 11 digits (`P5XXXXXXXXXX`).

### 4.1 MahaRERA (issuing authority: Maharashtra Real Estate Regulatory Authority)

| ID | Source and URL | Fields | Date form | Cadence | Access | Restrictions | Retrieved-at | Level | Disposition |
|---|---|---|---|---|---|---|---|---|---|
| S01 | Project search, https://maharera.maharashtra.gov.in/projects-search-result | project name, registration (certificate) number, promoter, district, status filter; snippet shows a `certificate_no` query parameter accepting a registration number | ? (third-party snippets show dd.mm.yyyy on project pages) | reported live (unverified) | HTML form, GET query parameter | ? robots, terms, captcha, rate limit all unverified | 2026-09-26T15:13Z | L1 | first-release candidate |
| S02 | Registered Real Estate Projects list, https://maharera.maharashtra.gov.in/registered-real-estate-projects | list of registered projects (columns unknown) | ? | ? | HTML list, possibly paginated | ? | 2026-09-26T15:13Z | L1 | first-release candidate |
| S03 | Map search, https://maharera.maharashtra.gov.in/map-projects-search-result | project name, plot bearing, street, locality, latitude, longitude, certificate number, village, taluka, district, state, pincode (per snippet; coordinate provenance, e.g. promoter-entered vs surveyed, not established) | n/a | reported live (unverified) | HTML map page; data likely loaded by script | ? Google Maps terms may apply to the embed, not to MahaRERA's own coordinate values | 2026-09-26T15:15Z | L2 | first-release candidate for location; confirm data endpoint, coordinate provenance and terms first |
| S04 | Legacy portal project search, https://maharerait.mahaonline.gov.in/searchlist/searchlist | same project set as S01 (pre-September-2024 system) | ? | unclear since MahaCRITI go-live (1 Sept 2024 per press snippets) | HTML | ? | 2026-09-26T15:14Z | L1 | do not use as primary; freshness unknown |
| S05 | Legacy project summary by QR, https://maharerait.mahaonline.gov.in/ProjectSummaryView/ProjectSummaryQRCodeView?id=(base64 token) | certificate-level project summary; the `id` is a base64 token containing the certificate number and a scan type | ? | ? | GET with opaque token | ? one indexed variant is titled "Login Page", so some tokens require login | 2026-09-26T15:15Z | L2 | backlog; do not construct tokens |
| S06 | Project detail page tabs, entered from a S01 result at https://maharera.maharashtra.gov.in/projects-search-result (detail-page URL pattern not captured in this pass): project details, promoter details, agent details, project documents, project updates, litigation details, FSI, bank details, building details, professionals | proposed date of completion; revised proposed date of completion (third-party snippets); promoter name and address; litigation case list; quarterly progress content | dd.mm.yyyy in one third-party quote; label text unconfirmed | promoter-driven; see S09 | HTML | ? | 2026-09-26T15:14Z | L2 | first-release candidate once labels are read first-hand |
| S07 | Lapsed projects list, https://maharera.maharashtra.gov.in/lapsed-projects-detail | projects whose completion date lapsed | ? | ? (press snippets describe periodic bulk actions) | HTML list | ? | 2026-09-26T15:14Z | L1 | first-release candidate (status flag) |
| S08 | Deregistered projects list, https://maharera.maharashtra.gov.in/list_of_projects_deregistered ; revoked / ab initio void list and abeyance list (titles seen, URLs not captured) | deregistered, revoked, abeyance flags | ? | ? | HTML list | ? | 2026-09-26T15:14Z | L1 | first-release candidate (status flags) |
| S09 | Orders and circulars, https://maharera.maharashtra.gov.in/order , https://maharera.maharashtra.gov.in/circular , https://maharera.maharashtra.gov.in/circular-notice-and-office-order | Reported (per third-party/press snippets, not read from the order text itself): Order 18/2021 dated 28 July 2021 on quarterly updates; a QPR due-within-20-days-of-quarter-end rule (20 Jul, Oct, Jan, Apr); extension guidance (Section 7(3), Form E). None of this is confirmed against the order PDF | order dates as written in PDFs | per order | HTML index of PDFs | ? | 2026-09-26T15:14Z | L2 | first-release: cite and quote the order text itself before any rule built on it is used |
| S10 | Guidance pages, https://maharera.maharashtra.gov.in/guidance-project-update-quarterly-annually , https://maharera.maharashtra.gov.in/guidance-extension-application , https://maharera.maharashtra.gov.in/due-lapse-completion-date | definitions of quarterly/annual update, extension application, lapse handling | n/a | static | HTML | ? | 2026-09-26T15:14Z | L1 | first-release: interpretation source |
| S11 | Project Updates page, https://maharera.maharashtra.gov.in/project-updates | ? (title only) | ? | ? | HTML | ? | 2026-09-26T15:14Z | L1 | read in RERA-03 |
| S12 | Site policies: https://maharera.maharashtra.gov.in/terms-conditions , https://maharera.maharashtra.gov.in/copyright-policy , https://maharera.maharashtra.gov.in/disclaimer , hyperlinking policy (title seen, URL not captured), https://maharera.maharashtra.gov.in/website-user-manual | reuse, linking and liability terms; disclaimer snippet: MahaRERA "does not take responsibility on how this information is used" | n/a | static | HTML | **must be read before any collector is written** | 2026-09-26T15:14Z | L1 | gate for first release |
| S13 | MahaCRITI (new MahaRERA system, live 1 Sept 2024 per press) | promoter/agent/complaint workflows; public project view path unknown | ? | ? | login for promoters; public URL unconfirmed | ? | 2026-09-26T15:14Z | L3 | hypothesis; establish whether S01 is its public face |
| S14 | Old portal root, https://maharera.mahaonline.gov.in/ | ? | ? | ? | ? | ? | 2026-09-26T15:14Z | L1 | exclude until relationship to S01/S04 is known |

### 4.2 Locality, planning, land and infrastructure context

| ID | Source and URL | Authority | Fields | Date form | Cadence | Access | Restrictions | Retrieved-at | Level | Disposition |
|---|---|---|---|---|---|---|---|---|---|---|
| S20 | e-ASR ready reckoner, https://igrmaharashtra.gov.in/ (Stamps, e-ASR) | Inspector General of Registration and Stamps, Maharashtra | annual statement of rates by district/taluka/village/zone | financial year, effective 1 April (snippets) | annual | map UI; per-zone lookup | ? | 2026-09-26T15:14Z | L2 | backlog: needs approval and manual zone matching |
| S21 | e-Search of registered documents, https://freesearchigrservice.maharashtra.gov.in/ | IGR Maharashtra | registered agreements (encumbrance evidence) | ? | reported live (unverified) | web form | ? captcha likely (third-party snippets); unverified | 2026-09-26T15:14Z | L3 | backlog: manual only |
| S22 | Mahabhulekh 7/12 extract, https://bhulekh.mahabhumi.gov.in/ | Revenue Department, Maharashtra | land ownership and survey numbers | ? | reported live (unverified) | web form | captcha and mobile OTP per third-party snippets; signed copies via a separate portal | 2026-09-26T15:14Z | L2 | backlog: manual only, never automated |
| S23 | MahaBhunakasha maps, https://mahabhunakasha.mahabhumi.gov.in/ | Revenue Department | cadastral map by survey number | n/a | ? | web map | ? | 2026-09-26T15:14Z | L1 | backlog |
| S24 | DP 2034 remarks, https://dpremarks.mcgm.gov.in/dp2034/ and https://dpremarks.mcgm.gov.in/dp2034/help | Brihanmumbai Municipal Corporation | development plan zoning and reservations by CTS/CS or FP number | n/a | plan revisions | web form per plot | ? ; help page states CS/CTS boundaries in City Survey records supersede the DP remark plan | 2026-09-26T15:14Z | L2 | backlog: manual, per plot |
| S25 | Building plan approval system, https://autodcr.mcgm.gov.in/BPAMSClient2/ (FAQ, downloads, "Citizen Search") | BMC | IOD, commencement certificate, completion certificate status | ? | reported live (unverified) | architect login; a citizen search is mentioned | login for most functions | 2026-09-26T15:14Z | L2 | backlog: verify citizen search terms |
| S26 | DCPR 2034 PDF, https://portal.mcgm.gov.in/irj/go/km/docs/documents/MCGM%20Department%20List/Chief%20Engineer%20(Development%20Plan)/Docs/SANCTIONED%20DP2034/DCPR/DCPR%202034.pdf | BMC | regulations, not project facts | n/a | static | PDF | ? | 2026-09-26T15:14Z | L1 | interpretation source only |
| S27 | PMC building permission, https://autodcr.pmc.gov.in/SWC.Client/login.aspx and https://www.pmc.gov.in/en/d/building-development | Pune Municipal Corporation | permissions, summary statistics | ? | ? | login; a public summary page exists | login | 2026-09-26T15:14Z | L1 | backlog |
| S28 | NMMC permissions, https://www.nmmc.gov.in/permission and https://www.nmmc.gov.in/town-planning | Navi Mumbai Municipal Corporation | permissions, town planning notices | ? | ? | HTML | ? | 2026-09-26T15:14Z | L1 | backlog |
| S29 | PCMC, Thane MC building permission portals | respective corporations | ? | ? | ? | ? | ? | 2026-09-26T15:14Z | L3 | not found in this pass; unresearched |
| S30 | MMRDA project pages, https://mmrda.maharashtra.gov.in/en/projects/transport/metro-line-4/overview (pattern repeats for lines 2B, 5, 6) | Mumbai Metropolitan Region Development Authority | corridor length, stations, status text | prose | irregular | HTML | ? | 2026-09-26T15:14Z | L1 | backlog: infra context; no dates without the page's own "as on" date |
| S31 | MMRC, https://corporate.mmrcl.com/en and https://mmrcl.com/ | Mumbai Metro Rail Corporation | Line 3 status | prose | irregular | HTML | ? | 2026-09-26T15:14Z | L1 | backlog |
| S32 | MMMOCL, https://mmmocl.co.in/ | Maha Mumbai Metro Operation Corporation | operating lines | prose | irregular | HTML | ? | 2026-09-26T15:14Z | L1 | backlog |
| S33 | Maha-Metro, https://www.mahametro.org/about.html | Maharashtra Metro Rail Corporation | Pune and Nagpur metro | prose | irregular | HTML | ? | 2026-09-26T15:14Z | L1 | backlog |
| S34 | MSRDC projects, https://msrdc.in/site/common/ProjectListView.aspx | Maharashtra State Road Development Corporation | road and sea-link projects | prose | irregular | ASP.NET pages | ? | 2026-09-26T15:14Z | L1 | backlog |
| S35 | MRVC, https://mrvc.indianrailways.gov.in/ | Mumbai Railway Vikas Corporation | MUTP suburban rail works | prose | irregular | HTML | ? | 2026-09-26T15:14Z | L1 | backlog |
| S36 | MRSAC geoportal, https://mrsac.gov.in/MRSAC/pages/web_applications , https://geoportal.mrsac.org.in/explore/ | Maharashtra Remote Sensing Application Centre | state GIS layers | n/a | ? | web GIS | ? | 2026-09-26T15:14Z | L1 | backlog |
| S37 | Bhuvan Maharashtra, https://bhuvan-app1.nrsc.gov.in/state/MH | ISRO NRSC | base maps, thematic layers | n/a | ? | web GIS | ? | 2026-09-26T15:14Z | L1 | backlog |
| S38 | PARIVESH, https://parivesh.nic.in/ and https://environmentclearance.nic.in/search.aspx | MoEFCC; SEIAA Maharashtra decides building ECs | environmental clearance proposals and letters | as written in letters | per decision | search form | ? | 2026-09-26T15:14Z | L1 | backlog: manual per project |
| S39 | Open Government Data, https://www.data.gov.in/ | NIC | no MahaRERA dataset found in this pass | n/a | n/a | n/a | n/a | 2026-09-26T15:14Z | L3 | none found; do not assume a bulk source |

### 4.3 Excluded (not official)

Kaggle "RERA Dataset from Maharashtra", mhrera.com, reradetails.in, developer and brokerage blogs, Wikipedia. Useful only as hints for what labels to look for; never a citation.

## 5. Field-level provenance map (proposed, unverified)

Field names on the right match `scripts/record-validation.mjs`, which requires per-fact `sourceUrl` on a MahaRERA host, `documentDate`, `retrievedAt` and `snapshotHash`, rejects duplicate field names, and treats any field containing `completion` as a date.

**"If unavailable" is a state, not a finding.** It applies whenever the field could not be read at all (page unreachable, not yet inspected, or this research pass) — the correct value is **"unavailable / could not verify"**, never a specific negative claim like "no revision" or "none listed". A specific negative claim (for example, that a project has no litigation, no revised date, or no update this quarter) may be written **only** after a first-hand, date-stamped inspection of the actual page confirms that the page itself explicitly shows that absence, and the fact record then cites that page and date as the source of the negative claim, exactly like any other fact.

| Buyer field | Primary source | What counts as the document | Date handling | If unavailable | Record field |
|---|---|---|---|---|---|
| Project ID | S01 or S06 page for that certificate | page showing the certificate number | n/a | do not create the record | `reraId` (`P` + 11 digits; validator regex `^P\d{11}$`) |
| Project name, promoter | S06 promoter details | same page snapshot | n/a | unavailable / could not verify | `projectName`, `promoter` |
| Registration status | S01 status plus S07/S08 lists | list page snapshot naming the project | list "as on" date if printed, else retrieval date | unavailable / could not verify | `registrationStatus` |
| Original proposed completion date | S06 label "Proposed Date of Completion" (label text unconfirmed) | project page snapshot | convert dd.mm.yyyy to ISO; keep the printed string too | unavailable / could not verify | `originalCompletion` |
| Revised proposed completion date | S06 label "Revised Proposed Date of Completion" (unconfirmed) | project page snapshot | as above; store separately, never overwrite original | unavailable / could not verify; never infer a revision, and never infer an extension, from absence of data | `revisedCompletion` |
| Extension under Section 7(3) | S09 order or S06 documents tab (Form E outcome) | the order or certificate PDF | order date is `documentDate` | unavailable / could not verify | `extensionCompletion` plus `extensionOrderUrl` |
| Last quarterly update | S06 project updates tab | update entry | quarter end date if the page states one; do not compute an "overdue" flag until S09's own due-date rule is read first-hand (see section 7) | unavailable / could not verify | `lastQuarterlyUpdate` |
| Location: address, village, taluka, district, pincode | S03 or S06 | page snapshot | n/a | unavailable / could not verify | `location.*` |
| Coordinates | S03 latitude/longitude | S03 record | n/a | unavailable / could not verify; never geocode from address | `location.lat`, `location.lng` |
| Litigation | S06 litigation tab | tab snapshot | case dates as printed | unavailable / could not verify (with the retrieval date); write "no litigation on record" only once an inspected page explicitly shows an empty litigation list, citing that page and its retrieval date | `litigation[]` |
| Ready reckoner zone rate | S20 | e-ASR page for the zone | financial year | omit | backlog |
| DP zoning, permissions, EC, transit | S24, S25, S27, S38, S30 to S35 | per-plot manual lookups | as printed | omit | backlog |

Field-level citation means: URL of the exact page, `documentDate` (the date printed on the page or order; retrieval date only when no document date exists and that is stated), `retrievedAt`, and a SHA-256 of the saved snapshot. A homepage link fails review.

## 6. Conflicts, missing values and ID-matching risks

- **Three MahaRERA hostnames** (S01, S04, S14) may present the same project with different freshness. Only S01 is assumed current after the September 2024 migration; that assumption is L3.
- **Original vs revised vs extended**: three distinct dates can exist. Absence of a revised date is not "on time". An extension order changes validity of registration, which is not the same as a promoter-declared revised date.
- **Status vocabulary** ("registered", "lapsed", "deregistered", "revoked / ab initio void", "abeyance") comes from separate lists (S07, S08). A project can appear in a status list while its page still shows an old status.
- **Identity collisions**: phases of one development carry different registration numbers; several projects share names; promoter names vary in spelling and entity suffix. Match on the certificate number only. The legacy QR token (S05) embeds the certificate number in base64; do not derive URLs from it.
- **Coordinates**: S03 values are reported to be promoter-entered rather than surveyed (unconfirmed; see S03 disposition). Treat provenance as unverified and the pin as potentially wrong by kilometres; do not label it "promoter-declared" as fact until that provenance is confirmed first-hand, and show it as "unavailable / could not verify" until then.
- **Locality context** rarely shares a key with MahaRERA (CTS/CS number, survey number, zone code vs registration number). Joining requires the project's plot numbers from S06, then a manual lookup.

## 7. Adversarial review

**Date ambiguity.** Indian portals print dd.mm.yyyy; a naive parser reads 03.04.2027 as March 4. Store the printed string and the ISO conversion, and add a fixture where day and month are both 12 or under. "Proposed date of completion" in the registration is not "possession date" in the buyer's agreement. The quarterly update may carry an "expected completion" text that is neither the original nor a formally revised date; do not promote it to `revisedCompletion`. Times are IST; `retrievedAt` must be UTC with offset recorded.

**Source freshness.** S09 is reported (per third-party/press snippets, not the order text itself) to set a quarterly promoter-update duty with a due-within-20-days rule. **Do not operationalize this into an "overdue" flag, a staleness threshold, or any other rule until the order text is read first-hand and quoted**; an unread order is not a basis for computing silence windows. Lapsed and abeyance lists are reported (unverified) to be updated in bulk actions; if that holds, a project could be lapsed for a period before appearing there, but this is a lead to confirm, not an established cadence. The reported 2024 platform migration (S13, evidence level L3, not confirmed) would mean legacy pages (S04, S05, S14) may be frozen; treat that as a reason for caution, not a fact, and never mix hosts within one record regardless of which is current. Infrastructure pages (S30 to S35) rarely carry an "as on" date in the snippets seen; without one, do not quote a completion year.

**Project-identity collisions.** Multiple registrations per township, same-name projects across districts, promoter entity renames, and the `certificate_no` query parameter accepting any string. Validation already rejects duplicate IDs; add a check that the page title or certificate on the snapshot equals the requested ID before a fact is stored.

**Website access restrictions.** This session could not read any robots.txt or terms page; the first collector must not be written until S12 is read and quoted in the PR. Land records and document search (S21, S22) show captcha and OTP in third-party descriptions; they are manual-only forever, not "solve later". Building-approval systems (S25, S27) are login-gated for most functions. Rate limits are unknown; the first pass should use one request per page, a fixed delay, an identifying User-Agent and a hard cap per run, and must stop on the first 403 or 429 and report `source-blocked`.

## 8. Minimal first-release source set and backlog

**First release (after RERA-03 confirms terms and labels):** S01, S03, S06, S07, S08, S09, S10, S12. All on `maharera.maharashtra.gov.in`, which is already the only host the validator accepts alongside the legacy host.

**Backlog requiring owner approval or manual verification:** S20 (annual, licence unknown), S24 and S25 (per plot, BMC), S27 and S28 (Pune, Navi Mumbai), S38 (EC letters), S30 to S37 (transit and maps; useful only with an "as on" date), S21 to S23 (manual only, never automated).

**Blocked in this environment (not by the source):** every host in section 3 until the allowed-domain list is changed.

**Do not pursue:** constructing S05 tokens, any non-official mirror, any dataset without a licence.

## 9. Proposed next issue (RERA-03)

First-hand verification pass with `maharera.maharashtra.gov.in` allow-listed: first confirm the exact domain and access path in use (S01 vs the legacy S04/S14 hosts, and whether a separate MahaCRITI public URL per S13 exists) before reading anything else. Then read and quote S12 (terms, copyright, hyperlinking, disclaimer) and fetch and store robots.txt. Open any one publicly reachable, currently registered project page reached through the ordinary search (S01), selected by its own registration ID from a search result — no manual owner selection is needed unless a specific access or consent restriction on the source requires it — and record exact field labels and date formats as text only; no project values, names, registration IDs or coordinates are copied into this or any tracked document. Confirm the S03 data path and its coordinate provenance, and convert the L1/L2 rows above to L0 or strike them. Only then decide whether a read-only collector is permitted.

## 10. Checks run for this change

```
node --test tests/*.test.mjs        # includes tests/source-inventory.test.mjs
node scripts/check-project-data.mjs  # "No project dataset yet: safe prototype stage."
```

The inventory test asserts that every `S` row in this document carries an https URL or an explicit `?`/`n/a`, a UTC retrieved-at timestamp, an evidence level L0 to L3, and that the document contains no string shaped like a real registration number.

## 11. Independent review dispositions

Review: [Codex, PR #4 review #5326387028](https://github.com/krisjughead-sys/Rera_Project/pull/4#pullrequestreview-5326387028), separate context from the authoring session, submitted against commit `9e98133`.

| # | Finding (Codex) | Disposition | Fixed in |
|---|---|---|---|
| 1 | Section 5's "if unavailable" column wrote, for several fields (a revised date, an extension, this quarter's update, litigation), a specific claim that the fact was confirmed absent, despite the underlying source being inaccessible/unread. | Fixed. Every such cell was replaced with the single phrase "unavailable / could not verify", and a new rule states that a specific negative claim may only be written after a first-hand, date-stamped page inspection explicitly shows the absence, citing that page. | this commit |
| 2 | Sections 1, 4 and 7 stated L1/L2-sourced claims as fact: verbs like "publishes", a cadence label implying confirmed real-time freshness, a staleness rule computed from an unread promoter-update order, an unqualified claim about who enters map coordinates, the platform-migration date, and itemised source feature lists. | Fixed. Section 1 now frames the feature list as an unverified index lead. Every affected cadence cell now reads "reported live (unverified)". The computed staleness rule was removed rather than reworded; section 7 now says explicitly to wait for a first-hand read of the order text before any such rule is used. Coordinate-entry provenance and the platform-migration date are now marked unconfirmed wherever mentioned. Guarded by new regression tests in `tests/source-inventory.test.mjs`. | this commit |
| 3 | Section 9 proposed opening a project page "chosen by the owner"; manual owner selection isn't necessary unless source policy requires it, and the exact domain/access path should be confirmed first. | Fixed. Section 9 now asks to confirm the exact domain and access path first (S01 vs legacy S04/S14 vs a possible MahaCRITI public URL), and to pick any publicly reachable project page by its own registration ID rather than by owner selection, unless a specific access or consent restriction requires sign-off. Kept "no values published". | this commit |

CI on this commit: see section 10; the PR body records the exact run link and conclusion once pushed.
