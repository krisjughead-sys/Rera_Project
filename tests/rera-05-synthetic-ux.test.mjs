import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

// RERA-05 guard: the UX spec and the unshipped prototype must stay synthetic,
// must keep rendering non-verified states as explicit words, and must reject a
// page-ID mismatch at every entry point. Behavioural tests run the prototype's
// real render functions (prototypes/rera-05-synthetic/core.js) in Node.
const html = await readFile(resolve('prototypes/rera-05-synthetic/index.html'), 'utf8');
const core = await readFile(resolve('prototypes/rera-05-synthetic/core.js'), 'utf8');
const uxDir = resolve('docs/ux');
const docs = await Promise.all((await readdir(uxDir)).filter(f => f.startsWith('RERA-05')).map(f => readFile(resolve(uxDir, f), 'utf8')));
const all = [html, core, ...docs].join('\n');
const proto = html + '\n' + core;
const data = JSON.parse(html.match(/<script type="application\/json" id="synthetic-data">([\s\S]*?)<\/script>/)[1]);
const { createPrototype } = createRequire(import.meta.url)('../prototypes/rera-05-synthetic/core.js');
const SYNTHETIC_ID = /^P0000\d{7}$/;
const STATUSES = ['verified', 'unavailable', 'unknown', 'conflict'];
const MISMATCH = 'P00000000004';

// Fresh prototype with an in-memory store and a fixed clock (readings are dated 2026-09-26).
function boot({ shortlist = [], visit = null, today = '2026-09-26' } = {}) {
  const m = new Map();
  if (shortlist.length) m.set('rera05-synthetic-shortlist-v1', JSON.stringify(shortlist));
  if (visit) m.set('rera05-synthetic-last-visit-v1', JSON.stringify(visit));
  const store = { get: k => m.get(k) ?? null, set: (k, v) => m.set(k, v) };
  return { p: createPrototype(data, store, () => new Date(today + 'T09:00:00Z')), m };
}
const textOf = h => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

test('every registration number in RERA-05 files is in the reserved synthetic range', () => {
  const ids = all.match(/\bP\d{11}\b/g) ?? [];
  assert.ok(ids.length > 0);
  for (const id of ids) assert.match(id, SYNTHETIC_ID, `${id} is not a reserved synthetic ID`);
  assert.equal(all.match(/\b1[6-9]\.\d{4,}\s*,\s*7[2-9]\.\d{4,}\b/g), null, 'Maharashtra-range coordinate pair present');
  assert.ok(!/maharera\.maharashtra\.gov\.in\/[^\s"')]*P\d{11}/.test(all), 'a synthetic ID must never be embedded in an official URL');
});

test('prototype is unshipped, offline and labelled synthetic', () => {
  assert.match(html, /<meta name="robots" content="noindex,nofollow">/);
  assert.match(html, /Synthetic data\. Unshipped prototype/);
  assert.equal(proto.match(/<(script|link)[^>]+(src|href)=["']https?:/g), null, 'no external scripts or stylesheets');
  assert.ok(!/\bfetch\(|XMLHttpRequest|navigator\.sendBeacon/.test(core), 'core must not make network requests');
});

test('synthetic fields use the contract statuses and only verified fields carry values', () => {
  for (const p of data.projects) {
    assert.match(p.reraId, SYNTHETIC_ID);
    for (const f of p.fields) {
      assert.ok(STATUSES.includes(f.status), `${p.reraId} ${f.key}: status ${f.status}`);
      if (f.status === 'verified') {
        for (const k of ['value', 'sourceUrl', 'documentDate', 'retrievedAt']) assert.ok(f[k], `${p.reraId} ${f.key}: verified without ${k}`);
        assert.match(f.sourceUrl, /^https:\/\/example\.invalid\//, 'synthetic sources must point at example.invalid');
      } else if (f.status === 'conflict') {
        assert.equal(f.value, undefined, 'a conflict must not carry a single displayed value');
        assert.ok(Array.isArray(f.values) && f.values.length >= 2);
        for (const v of f.values) for (const k of ['value', 'sourceLabel', 'sourceUrl', 'documentDate', 'retrievedAt']) assert.ok(v[k], `${p.reraId} conflict side missing ${k}`);
      } else {
        assert.equal(f.value, undefined, `${p.reraId} ${f.key}: ${f.status} field must not carry a value`);
      }
      if (f.key === 'completionDate') assert.ok(['original', 'revised', 'extended'].includes(f.dateKind), 'date fields need a dateKind');
    }
    const kinds = p.fields.filter(f => f.key === 'completionDate').map(f => f.dateKind);
    assert.equal(new Set(kinds).size, kinds.length, `${p.reraId}: duplicate dateKind`);
  }
});

test('synthetic IDs are distinct across same-name projects and exactly one page-ID mismatch fixture exists', () => {
  const ids = data.projects.map(p => p.reraId);
  assert.equal(new Set(ids).size, ids.length);
  const sameName = data.projects.filter(p => p.name.startsWith('Sample Heights'));
  assert.ok(sameName.length >= 3, 'the name-collision scenario needs at least three same-prefix projects');
  const mismatches = data.projects.filter(p => p.pageId !== p.reraId);
  assert.deepEqual(mismatches.map(p => p.reraId), [MISMATCH]);
});

test('unavailable fields never render as blank or dash, and missing data is never read as absence', () => {
  const { p } = boot();
  const page = p.renderProject('P00000000002');
  assert.match(page, /Could not verify on 20 Sep 2026\. This does not mean there is no case\./);
  assert.match(page, /Could not verify on 20 Sep 2026\. This does not mean there is no revision\./);
  assert.match(page, /Not checked yet/);
  for (const rendered of [page, p.renderSearch('Sample Heights'), boot({ shortlist: ['P00000000001', 'P00000000002'] }).p.renderCompare()]) {
    assert.doesNotMatch(rendered, />\s*(—|–|-|N\/A|n\/a)\s*</, 'a dash or N/A placeholder is rendered');
    for (const banned of ['on time', 'overdue', 'delayed', 'no litigation', 'no revision published', 'no extension on record']) {
      assert.ok(!rendered.toLowerCase().includes(banned), `prototype must not state "${banned}"`);
    }
  }
});

test('ad slot contains no official-record words and sits outside record cards', () => {
  const ads = proto.match(/<aside class="ad"[\s\S]*?<\/aside>/g) ?? [];
  assert.ok(ads.length >= 2);
  for (const ad of ads) {
    assert.match(ad, /<small>Sponsored<\/small>/);
    for (const w of ['official', 'verified', 'maharera', 'rera', 'record', 'registered']) assert.ok(!ad.toLowerCase().replace('<aside class="ad"', '').includes(w), `ad slot contains "${w}"`);
  }
  const { p } = boot({ shortlist: ['P00000000001', 'P00000000002'] });
  for (const card of p.renderProject('P00000000001').match(/<section class="card record">[\s\S]*?<\/section>/g) ?? []) assert.ok(!card.includes('class="ad"'), 'ad inside the official record card');
  assert.ok(!p.renderCompare().includes('class="ad"'), 'compare screen must be ad-free');
});

// Codex finding 1: page-ID mismatch must be rejected at the data/view boundary.
test('page-ID mismatch: the record boundary drops every field of the mismatched fixture', () => {
  const { p } = boot();
  const rec = p.byId(MISMATCH);
  assert.equal(rec.mismatch, true);
  assert.deepEqual(rec.fields, []);
  assert.equal(data.projects.find(x => x.reraId === MISMATCH).fields.length, 1, 'the raw fixture does carry a purported verified field');
});

test('page-ID mismatch: search shows an unavailable warning and no add-to-shortlist action', () => {
  const { p } = boot();
  const html = p.renderSearch('stale link');
  const card = (html.match(/<article class="card mismatch">[\s\S]*?<\/article>/g) ?? [])[0];
  assert.ok(card, 'mismatch card rendered in search');
  assert.match(card, /Could not verify/);
  assert.match(card, /carried a different registration number \(P00000000001\) from the one requested \(P00000000004\)/);
  assert.ok(!card.includes('Registered'), 'purported verified status must not appear');
  assert.ok(!card.includes('Add to shortlist'), 'no add action on a mismatched record');
});

test('page-ID mismatch: toggleShortlist refuses the record and a stale stored entry only offers Remove', () => {
  const { p } = boot();
  assert.equal(p.toggleShortlist(MISMATCH), false);
  assert.deepEqual(p.read(), []);
  assert.equal(p.toggleShortlist('P00000000001'), true);
  assert.deepEqual(p.read(), ['P00000000001']);
  const stale = boot({ shortlist: [MISMATCH, 'P00000000001'] });
  const html = stale.p.renderSearch('');
  const card = html.match(/<article class="card mismatch">[\s\S]*?<\/article>/)[0];
  assert.match(card, /Remove from shortlist/);
  assert.ok(!card.includes('Add to shortlist') && !card.includes('Registered'));
  assert.equal(stale.p.toggleShortlist(MISMATCH), true, 'removal is allowed');
  assert.deepEqual(stale.p.read(), ['P00000000001']);
});

test('page-ID mismatch: compare renders the warning in every cell of that column and no field values', () => {
  const { p } = boot({ shortlist: [MISMATCH, 'P00000000001'] });
  const html = p.renderCompare();
  const cells = [...html.matchAll(/<td data-col="Sample Heights Phase 1 \(stale link fixture\)">([\s\S]*?)<\/td>/g)].map(m => m[1]);
  assert.equal(cells.length, 7, 'one cell per compare row');
  for (const c of cells) { assert.match(c, /Could not verify/); assert.match(c, /different registration number/); }
  assert.ok(!cells.some(c => /Registered|Sample Builders|2027|days ago/.test(c)), 'no purported value leaks into the mismatched column');
  const good = [...html.matchAll(/<td data-col="Sample Heights Phase 1">([\s\S]*?)<\/td>/g)].map(m => m[1]);
  assert.ok(good.some(c => c.includes('31 Dec 2027')), 'the sound column still renders');
});

test('page-ID mismatch: project view and changes view show no fields', () => {
  const { p } = boot();
  const page = p.renderProject(MISMATCH);
  assert.match(page, /card record mismatch/);
  assert.ok(!page.includes('<dl>') && !page.includes('Registered'));
  assert.ok(!p.renderChanges().includes(MISMATCH));
});

// Codex finding 2: return-later wording must name the fields that were checked.
test('return-later: chips list changed, re-checked and not-re-checked fields separately', () => {
  const { p } = boot({ visit: { date: '2026-09-01', illustrative: true } });
  const s1 = p.visitSummary(p.byId('P00000000001'));
  assert.deepEqual(s1.changed, ['Revised proposed completion']);
  assert.deepEqual(s1.checked, ['Registration status', 'Proposed completion (as registered)']);
  assert.deepEqual(s1.couldNotVerify, ['Litigation', 'Location on map']);
  assert.deepEqual(s1.notChecked, ['Extension of registration']);
  const chip1 = textOf(p.shortlistChip(p.byId('P00000000001')));
  assert.match(chip1, /Changed since your illustrative last visit on 01 Sep 2026: Revised proposed completion/);
  assert.match(chip1, /Verified on a later check since your illustrative last visit on 01 Sep 2026; earlier value not available for comparison: Registration status, Proposed completion \(as registered\)/);
  assert.match(chip1, /Not re-checked since your illustrative last visit on 01 Sep 2026: Extension of registration/);
  assert.ok(!chip1.includes('No change detected'), 'no whole-project "No change detected" sentence');
  const s2 = p.visitSummary(p.byId('P00000000002'));
  assert.deepEqual(s2.changed, []);
  assert.ok(s2.notChecked.includes('Registration status') && s2.notChecked.includes('Proposed completion (as registered)'), 'June readings are not re-checks since a September visit');
  const chip2 = textOf(p.shortlistChip(p.byId('P00000000002')));
  assert.match(chip2, /Could not verify on the later check since your illustrative last visit on 01 Sep 2026: Revised proposed completion, Litigation, Location on map/);
  assert.ok(!chip2.includes('no change detected'), 'a failed later read must never be reported as no change');
  assert.deepEqual(s2.checked, []);
});

// Review finding: a later reading that came back unavailable is not evidence of "no change".
test('return-later: an unavailable field re-read after the visit is reported as could-not-verify, never as no change', () => {
  const { p } = boot({ visit: { date: '2026-09-01', illustrative: true } });
  for (const id of ['P00000000001', 'P00000000002', 'P00000000003']) {
    const v = p.visitSummary(p.byId(id));
    const raw = data.projects.find(x => x.reraId === id).fields;
    for (const label of v.checked) assert.equal(raw.find(f => f.label === label).status, 'verified', `${id}: "${label}" listed as re-checked but not verified`);
    for (const label of v.couldNotVerify) assert.notEqual(raw.find(f => f.label === label).status, 'verified');
    const chip = textOf(p.shortlistChip(p.byId(id)));
    assert.ok(!chip.includes('no change detected'), `${id}: no before value exists for an unchanged claim`);
  }
  // The conflict fixture's later reading is a contradiction, not a verification.
  const v3 = p.visitSummary(p.byId('P00000000003'));
  assert.ok(v3.couldNotVerify.includes('Registration status'));
  assert.ok(!v3.checked.includes('Registration status'));
});

// Review finding: a "could not verify on D" sentence must name a reading date, not the visitor's clock.
test('verification wording never derives a date from the device clock', () => {
  const { p } = boot({ shortlist: ['P00000000004', 'P00000000009'], today: '2031-01-01' });
  const search = textOf(p.renderSearch('stale link'));
  assert.ok(!search.includes('2031'), 'device-clock year leaked into verification wording');
  assert.match(search, /Could not verify in our reading dated 26 Sep 2026: the page we read carried a different registration number/);
  assert.match(search, /Record not found in our reading dated 26 Sep 2026/);
  const missing = textOf(p.renderProject('P00000000009'));
  assert.ok(!missing.includes('2031'));
  assert.match(missing, /Record not found in our reading dated 26 Sep 2026/);
  assert.match(textOf(p.renderProject('P00000000004')), /Could not verify in our reading dated 26 Sep 2026/);
});

// Review finding: "Last verified" must consider all successfully verified fields,
// while an unavailable check or a contradictory reading does not refresh it.
test('compare: Last verified excludes later failed reads and conflict sides', () => {
  const { p } = boot({ shortlist: ['P00000000003', 'P00000000001'] });
  assert.equal(p.latestVerifiedAt(p.byId('P00000000003')), '2026-09-20');
  assert.equal(p.latestVerifiedAt(p.byId('P00000000002')), '2026-06-15', 'a later unavailable read cannot refresh Last verified');
  const html = p.renderCompare();
  const row = textOf(html.match(/<tr><th scope="row"[^>]*>Last verified[^]*?<\/tr>/)[0]);
  assert.match(row, /Last verified 20 Sep 2026 \(6 days ago\) 20 Sep 2026 \(6 days ago\)/);
  assert.ok(!row.includes('Not checked yet'));
  const failed = boot({ shortlist: ['P00000000002', 'P00000000001'] });
  const failedRow = textOf(failed.p.renderCompare().match(/<tr><th scope="row"[^>]*>Last verified[^]*?<\/tr>/)[0]);
  assert.match(failedRow, /Last verified 15 Jun 2026 \(103 days ago\) .*Older snapshot 20 Sep 2026 \(6 days ago\)/);
  // Stale readings carry the older badge from the same latest date.
  const stale = boot({ shortlist: ['P00000000001', 'P00000000002'], today: '2027-01-15' });
  assert.match(textOf(stale.p.renderCompare().match(/<tr><th scope="row"[^>]*>Last verified[^]*?<\/tr>/)[0]), /Older snapshot/);
});

// Review finding: a record with no fields must render, not throw.
test('a record with an empty field list renders an explicit Not checked yet headline and compare cells', () => {
  const copy = structuredClone(data);
  copy.projects.push({ reraId: 'P00000000005', pageId: 'P00000000005', name: 'Sample Empty Record', locality: 'Testpur', promoter: 'Sample Builders Pvt Ltd', fields: [] });
  const m = new Map();
  m.set('rera05-synthetic-shortlist-v1', JSON.stringify(['P00000000005', 'P00000000001']));
  const p = createPrototype(copy, { get: k => m.get(k) ?? null, set: (k, v) => m.set(k, v) }, () => new Date('2026-09-26T09:00:00Z'));
  const card = p.renderSearch('Sample Empty');
  assert.match(textOf(card), /Sample Empty Record P00000000005 .*Not checked yet/);
  assert.equal(p.latestVerifiedAt(p.byId('P00000000005')), null);
  const cells = [...p.renderCompare().matchAll(/<td data-col="Sample Empty Record">([^]*?)<\/td>/g)].map(x => textOf(x[1]).trim());
  assert.equal(cells.length, 7);
  assert.ok(cells.every(c => c === 'Not checked yet' || c === 'Sample Builders Pvt Ltd'), JSON.stringify(cells));
  assert.doesNotThrow(() => p.renderProject('P00000000005'));
  assert.doesNotThrow(() => p.renderChanges());
});

test('compare: a project with only failed readings has no verified reading', () => {
  const copy = structuredClone(data);
  copy.projects[0].fields = [{ key: 'litigation', label: 'Litigation', status: 'unavailable', retrievedAt: '2026-09-20' }];
  const m = new Map([['rera05-synthetic-shortlist-v1', JSON.stringify(['P00000000001', 'P00000000002'])]]);
  const p = createPrototype(copy, { get: k => m.get(k) ?? null, set: (k, v) => m.set(k, v) }, () => new Date('2026-09-26T09:00:00Z'));
  assert.equal(p.latestVerifiedAt(p.byId('P00000000001')), null);
  const row = textOf(p.renderCompare().match(/<tr><th scope="row"[^>]*>Last verified[^]*?<\/tr>/)[0]);
  assert.match(row, /Last verified No verified reading yet 15 Jun 2026/);
});

test('return-later: a changed verified value without before evidence never claims no change', () => {
  const copy = structuredClone(data);
  const status = copy.projects[0].fields.find(f => f.key === 'registrationStatus');
  status.value = 'Withdrawn';
  delete status.change;
  const m = new Map([['rera05-synthetic-last-visit-v1', JSON.stringify({ date: '2026-09-01', illustrative: true })]]);
  const p = createPrototype(copy, { get: k => m.get(k) ?? null, set: (k, v) => m.set(k, v) }, () => new Date('2026-09-26T09:00:00Z'));
  const chip = textOf(p.shortlistChip(p.byId('P00000000001')));
  assert.match(chip, /earlier value not available for comparison: Registration status/);
  assert.ok(!chip.includes('no change detected'));
});

test('return-later: a real visit is recorded from the clock, and a later visit finds nothing re-checked', () => {
  const first = boot({ shortlist: ['P00000000001'], today: '2026-09-26' });
  assert.equal(first.p.lastVisit(), null);
  assert.match(first.p.renderChanges(), /First visit: recorded now\./);
  assert.deepEqual(first.p.lastVisit(), { date: '2026-09-26', illustrative: false });
  // Same store, next day: readings (2026-09-20) are all older than the visit.
  const stored = JSON.parse(first.m.get('rera05-synthetic-last-visit-v1'));
  const next = boot({ shortlist: ['P00000000001'], visit: stored, today: '2026-09-27' });
  const chip = textOf(next.p.shortlistChip(next.p.byId('P00000000001')));
  assert.match(chip, /^ ?Not re-checked since your last visit on 26 Sep 2026: /);
  assert.ok(!chip.includes('illustrative') && !chip.includes('Changed') && !chip.includes('no change detected'));
  assert.match(next.p.renderChanges(), /Since your last visit on 26 Sep 2026\./);
  next.p.recordIllustrativeVisit('2026-09-01');
  assert.deepEqual(next.p.lastVisit(), { date: '2026-09-01', illustrative: true });
  assert.match(textOf(next.p.shortlistChip(next.p.byId('P00000000001'))), /illustrative last visit/);
});

// Codex finding 3: search copy must not claim ID-only matching while names match substrings.
test('search copy: names discover candidates, only the exact ID confirms identity', () => {
  const { p } = boot();
  const html = p.renderSearch('Sample Heights');
  assert.match(html, /A name finds candidates\. Only the exact registration number confirms which project you are looking at/);
  assert.ok(!/matched on the registration number, not the name/.test(html));
  assert.equal((html.match(/<article class="card/g) ?? []).length, 4, 'three same-prefix candidates plus the mismatch fixture');
  assert.equal((p.renderSearch('p00000000002').match(/<h3>[^<]*<\/h3>/g) ?? []).length, 1, 'exact ID returns one candidate');
  assert.ok(!p.renderSearch('Sampel Heights').includes('<h3>'), 'a misspelling yields no similarity suggestions');
});
