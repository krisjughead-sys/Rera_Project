import { readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { validateRecords } from './record-validation.mjs';

const path = resolve('data/projects.json');
try { await access(path); } catch { console.log('No project dataset yet: safe prototype stage.'); process.exit(0); }
const records = JSON.parse(await readFile(path, 'utf8'));
const issues = validateRecords(records);
if (issues.length) { for (const issue of issues) console.error(issue); process.exit(1); }
console.log(`Validated ${records.length} source-linked project records.`);
