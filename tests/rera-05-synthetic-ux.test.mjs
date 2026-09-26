import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

// RERA-05 guard: the UX spec and the unshipped prototype must stay synthetic
// and must keep rendering non-verified states as explicit words.
const html = await readFile(resolve('prototypes/rera-05-synthetic/index.html'), 'utf8');
const uxDir = resolve('docs/ux');
const docs = await Promise.all((await readdir(uxDir)).filter(f => f.startsWith('RERA-05')).map(f => readFile(resolve(uxDir, f), 'utf8')));
const all = [html, ...docs].join('\n');
const data = JSON.parse(html.match(/<script type="application\/json" id="synthetic-data">([\s\S]*?)<\/script>/)[1]);
const SYNTHETIC_ID = /^P0000\d{7}$/;
const STATUSES = ['verified', 'unavailable', 'unknown', 'conflict'];

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
  assert.equal(html.match(/<(script|link)[^>]+(src|href)=["']https?:/g), null, 'no external scripts or stylesheets');
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
  assert.deepEqual(mismatches.map(p => p.reraId), ['P00000000004']);
});

test('unavailable fields never render as blank or dash, and missing data is never read as absence', () => {
  assert.match(html, /This does not mean there is no case\./);
  assert.match(html, /This does not mean there is no revision\./);
  assert.match(html, /This does not mean no extension exists\./);
  assert.doesNotMatch(html, /['"`>](—|–|-|N\/A|n\/a)<\//, 'a dash or N/A placeholder is rendered');
  for (const banned of ['on time', 'overdue', 'delayed', 'no litigation', 'no revision published', 'no extension on record']) {
    assert.ok(!html.toLowerCase().includes(banned), `prototype must not state "${banned}"`);
  }
});

test('ad slot contains no official-record words and sits outside record cards', () => {
  const ads = html.match(/<aside class="ad"[\s\S]*?<\/aside>/g) ?? [];
  assert.ok(ads.length >= 2);
  for (const ad of ads) {
    assert.match(ad, /<small>Sponsored<\/small>/);
    for (const w of ['official', 'verified', 'maharera', 'rera', 'record', 'registered']) assert.ok(!ad.toLowerCase().replace('<aside class="ad"', '').includes(w), `ad slot contains "${w}"`);
  }
  for (const card of html.match(/<section class="card record">[\s\S]*?<\/section>/g) ?? []) assert.ok(!card.includes('class="ad"'), 'ad inside the official record card');
  assert.ok(!/renderCompare[\s\S]*?class="ad"[\s\S]*?function renderChanges/.test(html), 'compare screen must be ad-free');
});

test('a page-ID mismatch renders the whole card as unavailable', () => {
  assert.match(html, /if \(p\.pageId !== p\.reraId\) \{[\s\S]*?stateBadge\('unavailable'\)[\s\S]*?No fields are shown/);
});
