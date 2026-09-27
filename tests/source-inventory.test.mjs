import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const doc = await readFile(resolve('docs/RERA-02-source-inventory.md'), 'utf8');
const rows = doc.split('\n').filter(line => /^\| S\d{2} \|/.test(line)).map(line => line.split('|').map(cell => cell.trim()).filter(Boolean));
const timestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?Z$/;
const officialHost = /^https:\/\/([a-z0-9-]+\.)*(gov\.in|nic\.in|mmrcl\.com|mmmocl\.co\.in|mahametro\.org|msrdc\.in|mrsac\.org\.in)(\/|$)/i;

test('inventory has source rows', () => assert.ok(rows.length >= 20, `found ${rows.length} rows`));

test('every source row names an official https URL, or is marked as a hypothesis (L3)', () => {
  for (const row of rows) {
    const source = row[1];
    const sourceUrls = source.match(/https?:\/\/\S+/g) ?? [];
    if (sourceUrls.length === 0) assert.ok(row.includes('L3'), `${row[0]}: no URL, so it must be evidence level L3`);
    // Every cell of the row is scanned, not only the source cell, so an
    // unofficial link cannot hide in Restrictions or Disposition.
    for (const cell of row) {
      for (const url of cell.match(/https?:\/\/\S+/g) ?? []) assert.ok(officialHost.test(url), `${row[0]}: ${url} is not an official host`);
      assert.ok(!/http:\/\//.test(cell), `${row[0]}: plain-http URL`);
    }
  }
});

test('every source row carries a UTC retrieved-at and an evidence level', () => {
  for (const row of rows) {
    assert.ok(row.some(cell => timestamp.test(cell)), `${row[0]}: missing retrieved-at`);
    assert.ok(row.some(cell => /^L[0-3]$/.test(cell)), `${row[0]}: missing evidence level`);
  }
});

test('no first-hand evidence is claimed while the access log records an environment block', () => {
  const claimsFirstHand = rows.filter(row => row.includes('L0'));
  const blocked = /source-blocked \(environment\)/.test(doc);
  assert.ok(!blocked || claimsFirstHand.length === 0, `L0 claimed on ${claimsFirstHand.map(r => r[0]).join(', ')} despite environment block`);
});

test('document contains no real-project registration number or coordinate pair', () => {
  assert.equal(doc.match(/\bP\d{11}\b/g), null, 'registration-number-shaped string present');
  assert.equal(doc.match(/\b1[6-9]\.\d{4,}\s*,\s*7[2-9]\.\d{4,}\b/g), null, 'Maharashtra-range coordinate pair present');
});

// Regression: Codex review on PR #4 flagged specific negative claims and unhedged
// "live"/cadence assertions built on unread sources. These checks keep them from
// creeping back in as the document evolves.
// The section 5 "If unavailable" column may only hold one of three safe
// states. This is an allow-list on the cell's leading clause, not a blocklist
// of phrases, so "none listed", "no revision on record" or any other wording
// that asserts absence fails regardless of how it is spelled.
const SAFE_UNAVAILABLE = ['unavailable / could not verify', 'do not create the record', 'omit'];
const section5 = doc.slice(doc.indexOf('## 5.'), doc.indexOf('## 6.'));
const provenanceRows = section5.split('\n').filter(line => /^\| .+ \|$/.test(line) && !/^\| Buyer field/.test(line) && !/^\|---/.test(line))
  .map(line => line.slice(1, -1).split('|').map(cell => cell.trim()));

test('section 5 "If unavailable" cells accept only the intended safe values', () => {
  assert.ok(provenanceRows.length >= 10, `found ${provenanceRows.length} provenance rows`);
  for (const row of provenanceRows) {
    assert.equal(row.length, 6, `${row[0]}: expected 6 cells`);
    const cell = row[4];
    const leading = cell.split(/[;(]/)[0].trim();
    assert.ok(SAFE_UNAVAILABLE.includes(leading), `${row[0]}: "If unavailable" must start with one of ${SAFE_UNAVAILABLE.join(' | ')}, found "${cell}"`);
    // Any trailing guidance may only restate the rule; it must not itself be a claim of absence.
    const guidance = cell.slice(leading.length);
    assert.ok(!/^\s*[;(]?\s*(no|none|not)\b/i.test(guidance) || /never infer|only (once|after)/i.test(guidance), `${row[0]}: guidance after the safe value reads as a claim of absence: "${guidance}"`);
  }
});

test('no unhedged specific-negative "if unavailable" claim anywhere in the document', () => {
  const forbidden = ['no revision published', 'no extension on record', 'no update in current quarter', 'none listed', 'no revision on record', 'no litigation listed'];
  for (const phrase of forbidden) {
    for (const line of doc.split('\n')) {
      if (!line.includes(phrase)) continue;
      assert.ok(/only (once|after)|never|must not|may only|do not/i.test(line), `found unhedged negative claim: "${phrase}" in: ${line.slice(0, 120)}`);
    }
  }
});

test('no source-inventory table row asserts a bare "live" cadence without hedging', () => {
  for (const row of rows) assert.ok(!row.some(cell => /^live$/i.test(cell)), `${row[0]}: bare "live" cadence cell asserts freshness as fact`);
});

test('no staleness/overdue threshold is computed from the unread S09 order', () => {
  // Sentence-level: a number of days, weeks or months in the same sentence as
  // "overdue", "stale" or "silence" is a computed threshold unless the
  // sentence itself says not to use it.
  const sentences = doc.split(/(?<=[.!?])\s+|\n/);
  const threshold = /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)[\s-]*(days?|weeks?|months?|quarters?)\b/i;
  for (const sentence of sentences) {
    if (!/\b(overdue|stale|staleness|silence)\b/i.test(sentence) || !threshold.test(sentence)) continue;
    assert.ok(/do not|don't|never|must not|until|not a basis|wait/i.test(sentence), `a numeric overdue/staleness threshold is stated as if confirmed: "${sentence.trim().slice(0, 140)}"`);
  }
});
