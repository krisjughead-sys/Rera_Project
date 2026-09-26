const validDate = value => { if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false; const d = new Date(`${value}T00:00:00Z`); return Number.isFinite(d.getTime()) && d.toISOString().slice(0,10) === value; };
const officialSource = url => { try { const parsed = new URL(url); return parsed.protocol === 'https:' && (parsed.hostname === 'maharera.maharashtra.gov.in' || parsed.hostname === 'maharerait.mahaonline.gov.in'); } catch { return false; } };

export function validateRecords(records) {
  const issues=[];
  if (!Array.isArray(records)) return ['Dataset must be an array.'];
  const ids=new Set();
  for (const [index, record] of records.entries()) {
    const prefix=`record ${index + 1}`;
    if (!record || typeof record !== 'object' || Array.isArray(record)) { issues.push(`${prefix}: expected object`); continue; }
    if (typeof record.reraId !== 'string' || !/^P\d{11}$/.test(record.reraId)) issues.push(`${prefix}: invalid MahaRERA project ID`);
    else if (ids.has(record.reraId)) issues.push(`${prefix}: duplicate project ID`);
    else ids.add(record.reraId);
    if (!Array.isArray(record.facts) || !record.facts.length) { issues.push(`${prefix}: no verified facts`); continue; }
    const fields=new Set();
    for (const [factIndex, fact] of record.facts.entries()) {
      const label=`${prefix} fact ${factIndex + 1}`;
      if (!fact || typeof fact !== 'object') { issues.push(`${label}: expected object`); continue; }
      if (typeof fact.field !== 'string' || !fact.field.trim()) issues.push(`${label}: missing field`);
      else if (fields.has(fact.field)) issues.push(`${label}: duplicate field; preserve revisions as separate named fields/events`);
      else fields.add(fact.field);
      if (fact.value === null || fact.value === '' || fact.value === undefined) issues.push(`${label}: missing value cannot be published as verified`);
      if (!officialSource(fact.sourceUrl)) issues.push(`${label}: source URL is not a recognized official MahaRERA host`);
      if (!validDate(fact.documentDate)) issues.push(`${label}: missing or invalid document date`);
      if (!validDate(fact.retrievedAt)) issues.push(`${label}: missing or invalid retrieval date`);
      if (typeof fact.snapshotHash !== 'string' || !/^[a-f0-9]{64}$/i.test(fact.snapshotHash)) issues.push(`${label}: missing SHA-256 snapshot hash`);
      if (typeof fact.field === 'string' && fact.field.toLowerCase().includes('completion') && !validDate(fact.value)) issues.push(`${label}: invalid completion date`);
    }
  }
  return issues;
}
