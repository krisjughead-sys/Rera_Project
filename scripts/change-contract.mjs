// Versioned contract for a MahaRERA project snapshot and the change events that
// update it. Distinct from record-validation.mjs (the flat "facts" shape already
// published); this module models field-level state over time so a missing,
// unverified, or contradictory extraction can never silently overwrite a
// verified value, and original/revised/extended dates never collide.
export const SCHEMA_VERSION = 1;

export const FIELD_STATUSES = Object.freeze(['verified', 'unavailable', 'unknown', 'conflict']);
export const DATE_KINDS = Object.freeze(['original', 'revised', 'extended']);

const RERA_ID_PATTERN = /^P\d{11}$/;
const OFFICIAL_HOSTS = new Set(['maharera.maharashtra.gov.in', 'maharerait.mahaonline.gov.in']);
const SHA256_PATTERN = /^[a-f0-9]{64}$/i;
const DATE_FIELD_PATTERN = /(possession|completion)/i;

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isOfficialSource(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && OFFICIAL_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

export function isDateField(fieldKey) {
  return typeof fieldKey === 'string' && DATE_FIELD_PATTERN.test(fieldKey);
}

// A date field's identity includes its dateKind so original/revised/extended
// values are separate slots that can never overwrite one another.
export function fieldIdentity(fieldKey, dateKind) {
  return isDateField(fieldKey) ? `${fieldKey}:${dateKind}` : fieldKey;
}

// Validates a single change event on its own terms (no snapshot required).
export function validateChangeEvent(event) {
  const issues = [];
  if (!event || typeof event !== 'object') return ['change event: expected object'];
  if (event.schemaVersion !== SCHEMA_VERSION) issues.push('change event: unsupported schemaVersion');
  if (typeof event.reraId !== 'string' || !RERA_ID_PATTERN.test(event.reraId)) issues.push('change event: invalid MahaRERA project ID');
  if (typeof event.fieldKey !== 'string' || !event.fieldKey.trim()) issues.push('change event: missing fieldKey');

  const dateField = isDateField(event.fieldKey);
  if (dateField && !DATE_KINDS.includes(event.dateKind)) issues.push('change event: date field requires an original/revised/extended dateKind');
  if (!dateField && event.dateKind != null) issues.push('change event: dateKind only applies to date fields');

  if (!FIELD_STATUSES.includes(event.status)) issues.push('change event: invalid status');

  if (event.status === 'verified') {
    if (event.value === null || event.value === undefined || event.value === '') issues.push('change event: verified status requires a value');
    else if (dateField && !isValidDate(event.value)) issues.push('change event: invalid date value');
    if (!isOfficialSource(event.sourceUrl)) issues.push('change event: verified status requires an official source URL');
    if (!isValidDate(event.documentDate)) issues.push('change event: verified status requires a document date');
    if (!isValidDate(event.retrievedAt)) issues.push('change event: verified status requires a retrieval date');
    if (typeof event.snapshotHash !== 'string' || !SHA256_PATTERN.test(event.snapshotHash)) issues.push('change event: verified status requires a snapshot hash');
  } else if (event.value !== null && event.value !== undefined) {
    issues.push(`change event: ${event.status} status cannot carry a value; unverified changes cannot be published as verified`);
  }

  return issues;
}

// Applies one validated change event to a snapshot (pass null to start one).
// Returns { snapshot, applied, reason?, issues? }. `snapshot` is always the
// snapshot to keep going forward, whether or not this event was applied.
export function applyChangeEvent(snapshot, event) {
  const eventIssues = validateChangeEvent(event);
  if (eventIssues.length) return { snapshot, applied: false, reason: 'invalid-event', issues: eventIssues };

  if (snapshot && snapshot.reraId !== event.reraId) {
    return { snapshot, applied: false, reason: 'unrelated-project' };
  }

  const reraId = event.reraId;
  const fields = snapshot ? snapshot.fields.map(field => ({ ...field })) : [];
  const conflicts = snapshot ? snapshot.conflicts.map(conflict => ({ ...conflict })) : [];
  const identity = fieldIdentity(event.fieldKey, event.dateKind);
  const index = fields.findIndex(field => fieldIdentity(field.key, field.dateKind) === identity);
  const existing = index === -1 ? null : fields[index];

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
        fieldKey: event.fieldKey,
        dateKind: event.dateKind ?? null,
        existingValue: existing.value,
        incomingValue: event.value,
        incomingSourceUrl: event.sourceUrl,
        incomingDocumentDate: event.documentDate,
        detectedAt: event.retrievedAt,
      };
      return {
        snapshot: { schemaVersion: SCHEMA_VERSION, reraId, fields, conflicts: [...conflicts, conflictRecord] },
        applied: false,
        reason: 'contradictory-verified-value',
      };
    }
  }

  const nextField = {
    key: event.fieldKey,
    dateKind: event.dateKind ?? null,
    status: event.status,
    value: event.status === 'verified' ? event.value : null,
    sourceUrl: event.sourceUrl ?? null,
    documentDate: event.documentDate ?? null,
    retrievedAt: event.retrievedAt ?? null,
    snapshotHash: event.snapshotHash ?? null,
  };
  const nextFields = index === -1 ? [...fields, nextField] : fields.map((field, i) => (i === index ? nextField : field));

  return { snapshot: { schemaVersion: SCHEMA_VERSION, reraId, fields: nextFields, conflicts }, applied: true };
}

// Validates a batch of snapshots as they would be published: shape, per-field
// evidence for anything claiming to be verified, and duplicate project IDs.
export function validateSnapshotBatch(snapshots) {
  const issues = [];
  if (!Array.isArray(snapshots)) return ['snapshot batch: expected an array'];

  const ids = new Set();
  for (const [index, snapshot] of snapshots.entries()) {
    const prefix = `snapshot ${index + 1}`;
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) { issues.push(`${prefix}: expected object`); continue; }
    if (snapshot.schemaVersion !== SCHEMA_VERSION) issues.push(`${prefix}: unsupported schemaVersion`);
    if (typeof snapshot.reraId !== 'string' || !RERA_ID_PATTERN.test(snapshot.reraId)) issues.push(`${prefix}: invalid MahaRERA project ID`);
    else if (ids.has(snapshot.reraId)) issues.push(`${prefix}: duplicate project ID`);
    else ids.add(snapshot.reraId);

    if (!Array.isArray(snapshot.fields) || !snapshot.fields.length) { issues.push(`${prefix}: no fields`); continue; }
    const identities = new Set();
    for (const [fieldIndex, field] of snapshot.fields.entries()) {
      const label = `${prefix} field ${fieldIndex + 1}`;
      if (!field || typeof field !== 'object') { issues.push(`${label}: expected object`); continue; }

      const identity = fieldIdentity(field.key, field.dateKind);
      if (identities.has(identity)) issues.push(`${label}: duplicate field/dateKind combination; preserve revisions as separate dateKind entries`);
      else identities.add(identity);

      if (!FIELD_STATUSES.includes(field.status)) { issues.push(`${label}: invalid status`); continue; }
      if (field.status === 'verified') {
        if (field.value === null || field.value === undefined || field.value === '') issues.push(`${label}: verified field missing value`);
        if (!isOfficialSource(field.sourceUrl)) issues.push(`${label}: verified field missing official source URL`);
        if (!isValidDate(field.documentDate)) issues.push(`${label}: verified field missing document date`);
        if (!isValidDate(field.retrievedAt)) issues.push(`${label}: verified field missing retrieval date`);
        if (typeof field.snapshotHash !== 'string' || !SHA256_PATTERN.test(field.snapshotHash)) issues.push(`${label}: verified field missing snapshot hash`);
      } else if (field.value !== null && field.value !== undefined) {
        issues.push(`${label}: unverified field cannot carry a published value`);
      }
    }
  }
  return issues;
}
