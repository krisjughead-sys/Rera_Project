// Versioned contract for a MahaRERA project snapshot and the change events that
// update it. Distinct from record-validation.mjs (the flat "facts" shape already
// published); this module models field-level state over time so a missing,
// unverified, or contradictory extraction can never silently overwrite a
// verified value, original/revised/extended dates never collide, and a
// verified change must prove it actually came from this project's own page.
export const SCHEMA_VERSION = 1;

export const FIELD_STATUSES = Object.freeze(['verified', 'unavailable', 'unknown', 'conflict']);
export const DATE_KINDS = Object.freeze(['original', 'revised', 'extended']);

const RERA_ID_PATTERN = /^P\d{11}$/;
const OFFICIAL_HOSTS = new Set(['maharera.maharashtra.gov.in', 'maharerait.mahaonline.gov.in']);
const SHA256_PATTERN = /^[a-f0-9]{64}$/i;
const DATE_FIELD_PATTERN = /(possession|completion)/i;
const TIMESTAMP_PATTERN = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/;
// A field key is canonical when it is a non-blank string with no whitespace
// anywhere (so 'promoter' and 'promoter ' cannot become two fields) and only
// contains letters, digits, '_', '.' or '-'. Identity is case-insensitive so a
// case variant of an existing key lands in the same slot instead of a new one.
const FIELD_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_.-]*$/;

// documentDate stays a calendar date: the date printed on the official record.
function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

// retrievedAt is when *we* fetched the page, which can happen more than once a
// day, so it must be a full ISO 8601 timestamp with an explicit UTC/offset
// marker (never a bare local time an absent-timezone value would imply).
function isValidTimestamp(value) {
  if (typeof value !== 'string') return false;
  const match = TIMESTAMP_PATTERN.exec(value);
  if (!match) return false;
  const [, datePart, hour, minute, second, offset] = match;
  if (!isValidDate(datePart)) return false;
  if (Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59) return false;
  if (offset !== 'Z') {
    const [, offsetHour, offsetMinute] = /^[+-](\d{2}):(\d{2})$/.exec(offset);
    if (Number(offsetHour) > 23 || Number(offsetMinute) > 59) return false;
  }
  return Number.isFinite(new Date(value).getTime());
}

function isOfficialSource(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && OFFICIAL_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

export function isCanonicalFieldKey(fieldKey) {
  return typeof fieldKey === 'string' && FIELD_KEY_PATTERN.test(fieldKey);
}

export function isDateField(fieldKey) {
  return typeof fieldKey === 'string' && DATE_FIELD_PATTERN.test(fieldKey);
}

// A date field's identity includes its dateKind so original/revised/extended
// values are separate slots that can never overwrite one another.
export function fieldIdentity(fieldKey, dateKind) {
  const key = typeof fieldKey === 'string' ? fieldKey.toLowerCase() : fieldKey;
  return isDateField(fieldKey) ? `${key}:${dateKind}` : key;
}

// Validates a single change event on its own terms (no snapshot required).
// A verified event must also prove, independently of the reraId a collector
// attached to it, that the fetched page's own content declares this same
// project ID (sourcePageReraId) — reraId alone can be mislabeled by a
// collector bug, so it cannot be the only check binding a value to a project.
export function validateChangeEvent(event) {
  const issues = [];
  if (!event || typeof event !== 'object') return ['change event: expected object'];
  if (event.schemaVersion !== SCHEMA_VERSION) issues.push('change event: unsupported schemaVersion');
  if (typeof event.reraId !== 'string' || !RERA_ID_PATTERN.test(event.reraId)) issues.push('change event: invalid MahaRERA project ID');
  if (typeof event.fieldKey !== 'string' || !event.fieldKey.trim()) issues.push('change event: missing fieldKey');
  else if (!isCanonicalFieldKey(event.fieldKey)) issues.push('change event: fieldKey must be canonical (no whitespace; letters, digits, _ . - only)');

  const dateField = isDateField(event.fieldKey);
  if (dateField && !DATE_KINDS.includes(event.dateKind)) issues.push('change event: date field requires an original/revised/extended dateKind');
  if (!dateField && event.dateKind != null) issues.push('change event: dateKind only applies to date fields');

  if (!FIELD_STATUSES.includes(event.status)) issues.push('change event: invalid status');

  if (event.status === 'verified') {
    if (event.value === null || event.value === undefined || event.value === '') issues.push('change event: verified status requires a value');
    else if (dateField && !isValidDate(event.value)) issues.push('change event: invalid date value');
    if (!isOfficialSource(event.sourceUrl)) issues.push('change event: verified status requires an official source URL');
    if (!isValidDate(event.documentDate)) issues.push('change event: verified status requires a document date');
    if (!isValidTimestamp(event.retrievedAt)) issues.push('change event: verified status requires a retrieval timestamp (ISO 8601 with a timezone offset)');
    if (typeof event.snapshotHash !== 'string' || !SHA256_PATTERN.test(event.snapshotHash)) issues.push('change event: verified status requires a snapshot hash');
    if (typeof event.sourcePageReraId !== 'string' || !RERA_ID_PATTERN.test(event.sourcePageReraId)) issues.push('change event: verified status requires an independently extracted source-page project ID');
    else if (event.sourcePageReraId !== event.reraId) issues.push('change event: source-page project ID does not match the change event project ID; refusing to bind an unrelated page');
  } else if (event.value !== null && event.value !== undefined) {
    issues.push(`change event: ${event.status} status cannot carry a value; unverified changes cannot be published as verified`);
  }

  return issues;
}

// Validates the field entries of a snapshot. parentReraId (when known) is the
// snapshot's own registration ID, checked against each verified field's
// independently bound sourcePageReraId.
function validateFieldEntries(fields, parentReraId) {
  const issues = [];
  const identities = new Set();
  for (const [fieldIndex, field] of fields.entries()) {
    const label = `field ${fieldIndex + 1}`;
    if (!field || typeof field !== 'object' || Array.isArray(field)) { issues.push(`${label}: expected object`); continue; }

    if (typeof field.key !== 'string' || !field.key.trim()) issues.push(`${label}: missing key`);
    else if (!isCanonicalFieldKey(field.key)) issues.push(`${label}: key must be canonical (no whitespace; letters, digits, _ . - only)`);

    const dateField = isDateField(field.key);
    if (dateField && !DATE_KINDS.includes(field.dateKind)) issues.push(`${label}: date field requires an original/revised/extended dateKind`);
    if (!dateField && field.dateKind != null) issues.push(`${label}: dateKind only applies to date fields`);

    const identity = fieldIdentity(field.key, field.dateKind);
    if (identities.has(identity)) issues.push(`${label}: duplicate field/dateKind combination; preserve revisions as separate dateKind entries`);
    else identities.add(identity);

    if (!FIELD_STATUSES.includes(field.status)) { issues.push(`${label}: invalid status`); continue; }
    if (field.status === 'verified') {
      if (field.value === null || field.value === undefined || field.value === '') issues.push(`${label}: verified field missing value`);
      else if (dateField && !isValidDate(field.value)) issues.push(`${label}: invalid date value`);
      if (!isOfficialSource(field.sourceUrl)) issues.push(`${label}: verified field missing official source URL`);
      if (!isValidDate(field.documentDate)) issues.push(`${label}: verified field missing document date`);
      if (!isValidTimestamp(field.retrievedAt)) issues.push(`${label}: verified field missing retrieval timestamp`);
      if (typeof field.snapshotHash !== 'string' || !SHA256_PATTERN.test(field.snapshotHash)) issues.push(`${label}: verified field missing snapshot hash`);
      if (typeof field.sourcePageReraId !== 'string' || !RERA_ID_PATTERN.test(field.sourcePageReraId)) issues.push(`${label}: verified field missing independently extracted source-page project ID`);
      else if (parentReraId && field.sourcePageReraId !== parentReraId) issues.push(`${label}: source-page project ID does not match this project's registration ID`);
    } else if (field.value !== null && field.value !== undefined) {
      issues.push(`${label}: unverified field cannot carry a published value`);
    }
  }
  return issues;
}

function validateConflictEntries(conflicts) {
  const issues = [];
  for (const [index, conflict] of conflicts.entries()) {
    const label = `conflict ${index + 1}`;
    if (!conflict || typeof conflict !== 'object' || Array.isArray(conflict)) { issues.push(`${label}: expected object`); continue; }
    if (typeof conflict.fieldKey !== 'string' || !conflict.fieldKey.trim()) issues.push(`${label}: missing fieldKey`);
    if (conflict.existingValue === undefined) issues.push(`${label}: missing existingValue`);
    if (conflict.incomingValue === undefined) issues.push(`${label}: missing incomingValue`);
    if (!isValidTimestamp(conflict.detectedAt)) issues.push(`${label}: missing or malformed detectedAt timestamp`);
  }
  return issues;
}

// Structural + business-rule validation of one persisted snapshot. Safe to
// call on untrusted/malformed input: it never assumes fields/conflicts are
// arrays before checking, so a corrupted persisted snapshot yields issues
// instead of throwing.
function validateSnapshotShape(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return ['expected object'];
  const issues = [];
  if (snapshot.schemaVersion !== SCHEMA_VERSION) issues.push('unsupported schemaVersion');
  if (typeof snapshot.reraId !== 'string' || !RERA_ID_PATTERN.test(snapshot.reraId)) issues.push('invalid MahaRERA project ID');

  if (!Array.isArray(snapshot.fields)) issues.push('fields must be an array');
  else issues.push(...validateFieldEntries(snapshot.fields, RERA_ID_PATTERN.test(snapshot.reraId) ? snapshot.reraId : null));

  if (!Array.isArray(snapshot.conflicts)) issues.push('conflicts must be an array');
  else issues.push(...validateConflictEntries(snapshot.conflicts));

  return issues;
}

// Applies one validated change event to a snapshot (pass null to start one).
// Returns { snapshot, applied, reason?, issues? }. `snapshot` is always the
// snapshot to keep going forward, whether or not this event was applied.
export function applyChangeEvent(snapshot, event) {
  const eventIssues = validateChangeEvent(event);
  if (eventIssues.length) return { snapshot, applied: false, reason: 'invalid-event', issues: eventIssues };

  if (snapshot !== null && snapshot !== undefined) {
    const snapshotIssues = validateSnapshotShape(snapshot);
    if (snapshotIssues.length) return { snapshot, applied: false, reason: 'invalid-snapshot', issues: snapshotIssues };
  }

  if (snapshot && snapshot.reraId !== event.reraId) {
    return { snapshot, applied: false, reason: 'unrelated-project' };
  }

  const reraId = event.reraId;
  const fields = snapshot ? snapshot.fields.map(field => ({ ...field })) : [];
  const conflicts = snapshot ? snapshot.conflicts.map(conflict => ({ ...conflict })) : [];
  const identity = fieldIdentity(event.fieldKey, event.dateKind);
  const index = fields.findIndex(field => fieldIdentity(field.key, field.dateKind) === identity);
  const existing = index === -1 ? null : fields[index];

  // Out-of-order or replayed collection: an event retrieved earlier than the
  // reading already stored for this slot can never move the record, so
  // provenance (documentDate, retrievedAt, hash) cannot roll backwards.
  if (existing && isValidTimestamp(existing.retrievedAt) && isValidTimestamp(event.retrievedAt) &&
      Date.parse(event.retrievedAt) < Date.parse(existing.retrievedAt)) {
    return {
      snapshot: { schemaVersion: SCHEMA_VERSION, reraId, fields, conflicts },
      applied: false,
      reason: 'stale-event-older-than-stored-reading',
    };
  }

  if (existing && existing.status === 'verified') {
    if (event.status !== 'verified') {
      return {
        snapshot: { schemaVersion: SCHEMA_VERSION, reraId, fields, conflicts },
        applied: false,
        reason: 'unverified-extraction-cannot-overwrite-verified-value',
      };
    }
    if (event.value !== existing.value) {
      const conflictRecord = {
        fieldKey: existing.key,
        dateKind: event.dateKind ?? null,
        existingValue: existing.value,
        incomingValue: event.value,
        incomingSourceUrl: event.sourceUrl,
        incomingDocumentDate: event.documentDate,
        detectedAt: event.retrievedAt,
      };
      // A replayed contradiction (same incoming evidence) is recorded once.
      const duplicate = conflicts.some(c => ['fieldKey', 'dateKind', 'existingValue', 'incomingValue', 'incomingSourceUrl', 'incomingDocumentDate', 'detectedAt']
        .every(k => c[k] === conflictRecord[k]));
      return {
        snapshot: { schemaVersion: SCHEMA_VERSION, reraId, fields, conflicts: duplicate ? conflicts : [...conflicts, conflictRecord] },
        applied: false,
        reason: 'contradictory-verified-value',
      };
    }
  }

  const nextField = {
    // Keep the stored spelling of an existing slot's key.
    key: existing ? existing.key : event.fieldKey,
    dateKind: event.dateKind ?? null,
    status: event.status,
    value: event.status === 'verified' ? event.value : null,
    sourceUrl: event.sourceUrl ?? null,
    documentDate: event.documentDate ?? null,
    retrievedAt: event.retrievedAt ?? null,
    snapshotHash: event.snapshotHash ?? null,
    sourcePageReraId: event.status === 'verified' ? event.sourcePageReraId : null,
  };
  const nextFields = index === -1 ? [...fields, nextField] : fields.map((field, i) => (i === index ? nextField : field));

  return { snapshot: { schemaVersion: SCHEMA_VERSION, reraId, fields: nextFields, conflicts }, applied: true };
}

// Validates a batch of snapshots as they would be published: shape, per-field
// evidence and source-page binding for anything claiming to be verified, and
// duplicate project IDs across the batch.
export function validateSnapshotBatch(snapshots) {
  const issues = [];
  if (!Array.isArray(snapshots)) return ['snapshot batch: expected an array'];

  const ids = new Set();
  for (const [index, snapshot] of snapshots.entries()) {
    const prefix = `snapshot ${index + 1}`;
    for (const issue of validateSnapshotShape(snapshot)) issues.push(`${prefix}: ${issue}`);

    if (Array.isArray(snapshot?.fields) && !snapshot.fields.length) issues.push(`${prefix}: no fields`);

    if (typeof snapshot?.reraId === 'string' && RERA_ID_PATTERN.test(snapshot.reraId)) {
      if (ids.has(snapshot.reraId)) issues.push(`${prefix}: duplicate project ID`);
      else ids.add(snapshot.reraId);
    }
  }
  return issues;
}
