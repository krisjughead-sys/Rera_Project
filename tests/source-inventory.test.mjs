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
    const urls = source.match(/https?:\/\/\S+/g) ?? [];
    if (urls.length === 0) assert.ok(row.includes('L3'), `${row[0]}: no URL, so it must be evidence level L3`);
    for (const url of urls) assert.ok(officialHost.test(url), `${row[0]}: ${url} is not an official host`);
    assert.ok(!/http:\/\//.test(source), `${row[0]}: plain-http URL`);
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
