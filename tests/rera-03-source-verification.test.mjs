import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Lints docs/RERA-03-source-verification.md so that the findings report can
// never carry a real project value or an overstated evidence claim.
const doc = await readFile(resolve('docs/RERA-03-source-verification.md'), 'utf8');
const section = (from, to) => doc.slice(doc.indexOf(from), to ? doc.indexOf(to) : undefined);
const tableRows = text => text.split('\n').filter(line => /^\| /.test(line) && !/^\|---/.test(line)).map(line => line.slice(1, -1).split('|').map(cell => cell.trim()));

test('report contains no real-project registration number or coordinate pair', () => {
  assert.equal(doc.match(/\bP\d{11}\b/g), null, 'registration-number-shaped string present');
  assert.equal(doc.match(/\b1[6-9]\.\d{4,}\s*,\s*7[2-9]\.\d{4,}\b/g), null, 'Maharashtra-range coordinate pair present');
});

test('every access-log row carries a UTC timestamp', () => {
  const rows = tableRows(section('### 2.1', '### 2.3')).filter(row => row.length >= 4 && !/^(Route|Request)$/.test(row[0]));
  assert.ok(rows.length >= 6, `found ${rows.length} access rows`);
  for (const row of rows) assert.ok(row.some(cell => /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?Z|see section 2\.4/.test(cell)), `${row[0]}: missing UTC timestamp`);
});

test('no first-hand (L0) evidence is claimed anywhere while the direct block is recorded', () => {
  assert.ok(/CONNECT` refused, HTTP 403/.test(doc), 'direct block must be recorded');
  const rows = tableRows(section('## 4.', '## 6.'));
  for (const row of rows) for (const cell of row) assert.ok(!/^L0$/.test(cell), `${row[0]}: claims L0`);
  assert.ok(/None achieved/.test(section('## 1.', '## 2.')), 'L0 row must say none achieved');
});

test('every mediated capture in section 2.3 carries a footer date and a hash', () => {
  const rows = tableRows(section('### 2.3', '### 2.4')).filter(row => row.length === 4 && row[0] !== 'Page');
  assert.ok(rows.length >= 8, `found ${rows.length} capture rows`);
  for (const row of rows) {
    assert.match(row[1], /^\d{2}\/\d{2}\/\d{4}$/, `${row[0]}: footer date`);
    assert.match(row[3], /^`[a-f0-9]{16}`$/, `${row[0]}: hash prefix`);
  }
});

test('the verification matrix never turns a missing reading into a negative claim', () => {
  const rows = tableRows(section('## 5.', '## 6.')).filter(row => row.length === 6 && row[0] !== 'Buyer field');
  assert.ok(rows.length >= 9, `found ${rows.length} matrix rows`);
  for (const row of rows) {
    const cell = row[5];
    if (/\b(no litigation|no revision|no extension|on time|registered)\b/i.test(cell)) {
      assert.ok(/never|cannot|not mean|is not/i.test(cell), `${row[0]}: unhedged negative claim: "${cell}"`);
    }
  }
});
