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
  retrievedAt: '2026-09-01T09:00:00Z',
  snapshotHash: 'a'.repeat(64),
  sourcePageReraId: RERA_ID,
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
    retrievedAt: '2026-09-02T09:00:00Z',
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
  const snapshotA = { schemaVersion: 1, reraId: RERA_ID, conflicts: [], fields: [{ key: 'promoterName', dateKind: null, status: 'verified', value: 'Synthetic Promoter Pvt Ltd', sourceUrl: OFFICIAL_URL, documentDate: '2026-01-02', retrievedAt: '2026-09-01T09:00:00Z', snapshotHash: 'a'.repeat(64), sourcePageReraId: RERA_ID }] };
  const duplicateBatch = [snapshotA, structuredClone(snapshotA)];
  assert.ok(validateSnapshotBatch(duplicateBatch).some(issue => issue.includes('duplicate project ID')));

  const first = applyChangeEvent(null, verifiedEvent());
  const unrelatedPageEvent = verifiedEvent({ reraId: OTHER_RERA_ID, sourcePageReraId: OTHER_RERA_ID });
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
    conflicts: [],
    fields: [{ key: 'promoterName', dateKind: null, status: 'unknown', value: 'Guessed Promoter Name' }],
  }];
  assert.ok(validateSnapshotBatch(publishedBatch).some(issue => issue.includes('unverified field cannot carry a published value')));
});

test('a contradictory verified extraction is logged as a conflict, not a silent overwrite', () => {
  const first = applyChangeEvent(null, verifiedEvent());
  const contradiction = applyChangeEvent(first.snapshot, verifiedEvent({
    value: '2027-06-30',
    documentDate: '2026-05-01',
    retrievedAt: '2026-09-03T09:00:00Z',
    snapshotHash: 'c'.repeat(64),
  }));

  assert.equal(contradiction.applied, false);
  assert.equal(contradiction.reason, 'contradictory-verified-value');
  assert.equal(contradiction.snapshot.fields[0].value, '2027-12-31');
  assert.equal(contradiction.snapshot.conflicts.length, 1);
  assert.equal(contradiction.snapshot.conflicts[0].incomingValue, '2027-06-30');
});

// --- Codex review findings on 4e56418 (PR #8) ---

test('retrievedAt must be an ISO 8601 timestamp with an explicit timezone offset, distinct from documentDate', () => {
  const noOffset = verifiedEvent({ retrievedAt: '2026-09-01T09:00:00' });
  assert.ok(validateChangeEvent(noOffset).some(issue => issue.includes('retrieval timestamp')));

  const dateOnly = verifiedEvent({ retrievedAt: '2026-09-01' });
  assert.ok(validateChangeEvent(dateOnly).some(issue => issue.includes('retrieval timestamp')));

  const malformedOffsetNoColon = verifiedEvent({ retrievedAt: '2026-09-01T09:00:00+0530' });
  assert.ok(validateChangeEvent(malformedOffsetNoColon).some(issue => issue.includes('retrieval timestamp')));

  const outOfRangeOffset = verifiedEvent({ retrievedAt: '2026-09-01T09:00:00+25:00' });
  assert.ok(validateChangeEvent(outOfRangeOffset).some(issue => issue.includes('retrieval timestamp')));

  const impossibleTime = verifiedEvent({ retrievedAt: '2026-09-01T24:61:00Z' });
  assert.ok(validateChangeEvent(impossibleTime).some(issue => issue.includes('retrieval timestamp')));

  // documentDate is unaffected: it stays a plain calendar date.
  const validEvent = verifiedEvent({ retrievedAt: '2026-09-01T09:00:00+05:30' });
  assert.deepEqual(validateChangeEvent(validEvent), []);
  assert.equal(validEvent.documentDate, '2026-01-02');

  const applied = applyChangeEvent(null, verifiedEvent({ retrievedAt: '2026-09-01T09:00:00.500Z' }));
  assert.equal(applied.applied, true);
  assert.equal(applied.snapshot.fields[0].retrievedAt, '2026-09-01T09:00:00.500Z');
});

test('a malformed persisted snapshot is safely rejected, not thrown', () => {
  const fieldsNotArray = { schemaVersion: 1, reraId: RERA_ID, fields: 'not-an-array', conflicts: [] };
  const result1 = applyChangeEvent(fieldsNotArray, verifiedEvent());
  assert.equal(result1.applied, false);
  assert.equal(result1.reason, 'invalid-snapshot');
  assert.ok(result1.issues.some(issue => issue.includes('fields must be an array')));

  const conflictsNotArray = { schemaVersion: 1, reraId: RERA_ID, fields: [], conflicts: null };
  const result2 = applyChangeEvent(conflictsNotArray, verifiedEvent());
  assert.equal(result2.applied, false);
  assert.equal(result2.reason, 'invalid-snapshot');
  assert.ok(result2.issues.some(issue => issue.includes('conflicts must be an array')));

  const malformedConflictEntry = { schemaVersion: 1, reraId: RERA_ID, fields: [], conflicts: [{}] };
  const result3 = applyChangeEvent(malformedConflictEntry, verifiedEvent());
  assert.equal(result3.applied, false);
  assert.equal(result3.reason, 'invalid-snapshot');
  assert.ok(result3.issues.some(issue => issue.includes('missing fieldKey')));
  assert.ok(result3.issues.some(issue => issue.includes('detectedAt')));
});

test('a verified possession date lacking dateKind or carrying an impossible date is rejected', () => {
  const missingDateKind = {
    schemaVersion: 1,
    reraId: RERA_ID,
    conflicts: [],
    fields: [{ key: 'possessionDate', status: 'verified', value: '2027-12-31', sourceUrl: OFFICIAL_URL, documentDate: '2026-01-02', retrievedAt: '2026-09-01T09:00:00Z', snapshotHash: 'a'.repeat(64), sourcePageReraId: RERA_ID }],
  };
  assert.ok(validateSnapshotBatch([missingDateKind]).some(issue => issue.includes('date field requires an original/revised/extended dateKind')));

  const impossibleDate = {
    schemaVersion: 1,
    reraId: RERA_ID,
    conflicts: [],
    fields: [{ key: 'possessionDate', dateKind: 'original', status: 'verified', value: '2027-02-30', sourceUrl: OFFICIAL_URL, documentDate: '2026-01-02', retrievedAt: '2026-09-01T09:00:00Z', snapshotHash: 'a'.repeat(64), sourcePageReraId: RERA_ID }],
  };
  assert.ok(validateSnapshotBatch([impossibleDate]).some(issue => issue.includes('invalid date value')));

  // applyChangeEvent refuses the same malformed persisted state rather than merging into it.
  const applied = applyChangeEvent(missingDateKind, verifiedEvent({ dateKind: 'revised', value: '2028-06-30', snapshotHash: 'b'.repeat(64) }));
  assert.equal(applied.applied, false);
  assert.equal(applied.reason, 'invalid-snapshot');
});

test('a verified change requires an independently extracted source-page project ID that matches, and mismatches are rejected', () => {
  const missingBinding = verifiedEvent({ sourcePageReraId: undefined });
  assert.ok(validateChangeEvent(missingBinding).some(issue => issue.includes('independently extracted source-page project ID')));

  const mismatchedBinding = verifiedEvent({ sourcePageReraId: OTHER_RERA_ID });
  assert.ok(validateChangeEvent(mismatchedBinding).some(issue => issue.includes('does not match the change event project ID')));

  const rejectedApply = applyChangeEvent(null, mismatchedBinding);
  assert.equal(rejectedApply.applied, false);
  assert.equal(rejectedApply.reason, 'invalid-event');

  // Same rule applies to a persisted, already-published field.
  const publishedWithWrongBinding = {
    schemaVersion: 1,
    reraId: RERA_ID,
    conflicts: [],
    fields: [{ key: 'promoterName', dateKind: null, status: 'verified', value: 'Synthetic Promoter Pvt Ltd', sourceUrl: OFFICIAL_URL, documentDate: '2026-01-02', retrievedAt: '2026-09-01T09:00:00Z', snapshotHash: 'a'.repeat(64), sourcePageReraId: OTHER_RERA_ID }],
  };
  assert.ok(validateSnapshotBatch([publishedWithWrongBinding]).some(issue => issue.includes("source-page project ID does not match this project's registration ID")));

  // A correctly bound event still applies normally.
  const accepted = applyChangeEvent(null, verifiedEvent());
  assert.equal(accepted.applied, true);
  assert.equal(accepted.snapshot.fields[0].sourcePageReraId, RERA_ID);
});
