import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRecords } from '../scripts/record-validation.mjs';

const sample=()=>[{reraId:'P12345678901',facts:[{field:'originalCompletion',value:'2027-12-31',sourceUrl:'https://maharera.maharashtra.gov.in/example',documentDate:'2026-01-02',retrievedAt:'2026-09-26',snapshotHash:'a'.repeat(64)},{field:'revisedCompletion',value:'2028-12-31',sourceUrl:'https://maharera.maharashtra.gov.in/example',documentDate:'2026-04-02',retrievedAt:'2026-09-26',snapshotHash:'b'.repeat(64)}]}];
test('synthetic fixture proves separate original and revised dates can coexist',()=>assert.deepEqual(validateRecords(sample()),[]));
test('rejects unsupported facts and missing source evidence',()=>{const rows=sample();rows[0].facts[0].sourceUrl='https://example.com/unverified';rows[0].facts[0].snapshotHash='';assert.equal(validateRecords(rows).length,2)});
test('rejects duplicate project IDs and silently overwritten date fields',()=>{const rows=sample();rows[0].facts.push({...rows[0].facts[0]});rows.push(structuredClone(rows[0]));assert.ok(validateRecords(rows).some(x=>x.includes('duplicate project ID')));assert.ok(validateRecords(rows).some(x=>x.includes('duplicate field')))});
