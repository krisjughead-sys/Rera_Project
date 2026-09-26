import test from 'node:test';
import assert from 'node:assert/strict';
import { applyChangeEvent, validateChangeEvent, validateSnapshotBatch } from '../scripts/change-contract.mjs';

const OFFICIAL_URL = 'https://maharera.maharashtra.gov.in/example';
const RERA_ID = 'P00000000001';
const OTHER_RERA_ID = 'P00000000002';

const verifiedEvent = (overrides = {}) => ({
  schemaVersion: 1,
  reraId: RERA_ID,
  fieldKey: 'possessionDate',
  dateKind: 'original',
  status: 'verified',
  value: '2027-12-31',
  sourceUrl: OFFICIAL_URL,
  documentDate: '2026-01-02',
  retrievedAt: '2026-09-01',
  snapshotHash: 'a'.repeat(64),
  ...overrides,
});

test('a missing extraction does not overwrite a verified value', () => {
  const first = applyChangeEvent(null, verifiedEvent());
  assert.equal(first.applied, true);
  assert.equal(first.snapshot.fields[0].value, '2027-12-31');

  const missingExtraction = {
    schemaVersion: 1,
    reraId: RERA_ID,
    fieldKey: 'possessionDate',
    dateKind: 'original',
    status: 'unavailable',
    value: null,
  };
  const second = applyChangeEvent(first.snapshot, missingExtraction);

  assert.equal(second.applied, false);
  assert.equal(second.reason, 'unverified-extraction-cannot-overwrite-verified-value');
  assert.equal(second.snapshot.fields[0].value, '2027-12-31');
  assert.equal(second.snapshot.fields[0].status, 'verified');
});

test('original, revised and extended possession dates stay separate', () => {
  const original = applyChangeEvent(null, verifiedEvent());
  const revised = applyChangeEvent(original.snapshot, verifiedEvent({
    dateKind: 'revised',
    value: '2028-06-30',
    documentDate: '2026-04-02',
    retrievedAt: '2026-09-02',
    snapshotHash: 'b'.repeat(64),
  }));
  // No extension confirmed yet: the contract records "unknown" explicitly
  // rather than inferring an extended date from the absence of data.
  const extended = applyChangeEvent(revised.snapshot, {
    schemaVersion: 1,
    reraId: RERA_ID,
    fieldKey: 'possessionDate',
    dateKind: 'extended',
    status: 'unknown',
    value: null,
  });

  assert.equal(revised.applied, true);
  assert.equal(extended.applied, true);
  assert.equal(extended.snapshot.fields.length, 3);

  const byKind = Object.fromEntries(extended.snapshot.fields.map(f => [f.dateKind, f]));
  assert.equal(byKind.original.value, '2027-12-31');
  assert.equal(byKind.revised.value, '2028-06-30');
  assert.equal(byKind.extended.status, 'unknown');
  assert.equal(byKind.extended.value, null);
});

test('duplicate project IDs and unrelated project pages are rejected', () => {
  const snapshotA = { schemaVersion: 1, reraId: RERA_ID, fields: [{ key: 'promoterName', dateKind: null, status: 'verified', value: 'Synthetic Promoter Pvt Ltd', sourceUrl: OFFICIAL_URL, documentDate: '2026-01-02', retrievedAt: '2026-09-01', snapshotHash: 'a'.repeat(64) }] };
  const duplicateBatch = [snapshotA, structuredClone(snapshotA)];
  assert.ok(validateSnapshotBatch(duplicateBatch).some(issue => issue.includes('duplicate project ID')));

  const first = applyChangeEvent(null, verifiedEvent());
  const unrelatedPageEvent = verifiedEvent({ reraId: OTHER_RERA_ID });
  const result = applyChangeEvent(first.snapshot, unrelatedPageEvent);

  assert.equal(result.applied, false);
  assert.equal(result.reason, 'unrelated-project');
  assert.equal(result.snapshot.reraId, RERA_ID);
});

test('unverified changes cannot be published as verified', () => {
  const unofficialSource = verifiedEvent({ sourceUrl: 'https://example.com/unofficial-mirror' });
  assert.ok(validateChangeEvent(unofficialSource).some(issue => issue.includes('official source URL')));

  const valueWithoutVerification = {
    schemaVersion: 1,
    reraId: RERA_ID,
    fieldKey: 'promoterName',
    status: 'unknown',
    value: 'Guessed Promoter Name',
  };
  assert.ok(validateChangeEvent(valueWithoutVerification).some(issue => issue.includes('unverified changes cannot be published as verified')));

  const applyResult = applyChangeEvent(null, unofficialSource);
  assert.equal(applyResult.applied, false);
  assert.equal(applyResult.reason, 'invalid-event');

  const publishedBatch = [{
    schemaVersion: 1,
    reraId: RERA_ID,
    fields: [{ key: 'promoterName', dateKind: null, status: 'unknown', value: 'Guessed Promoter Name' }],
  }];
  assert.ok(validateSnapshotBatch(publishedBatch).some(issue => issue.includes('unverified field cannot carry a published value')));
});

test('a contradictory verified extraction is logged as a conflict, not a silent overwrite', () => {
  const first = applyChangeEvent(null, verifiedEvent());
  const contradiction = applyChangeEvent(first.snapshot, verifiedEvent({
    value: '2027-06-30',
    documentDate: '2026-05-01',
    retrievedAt: '2026-09-03',
    snapshotHash: 'c'.repeat(64),
  }));

  assert.equal(contradiction.applied, false);
  assert.equal(contradiction.reason, 'contradictory-verified-value');
  assert.equal(contradiction.snapshot.fields[0].value, '2027-12-31');
  assert.equal(contradiction.snapshot.conflicts.length, 1);
  assert.equal(contradiction.snapshot.conflicts[0].incomingValue, '2027-06-30');
});
