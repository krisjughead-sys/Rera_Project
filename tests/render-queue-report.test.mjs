import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderQueueReport } from '../scripts/render-queue-report.mjs';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/rera-06-queue.json', import.meta.url), 'utf8'));
const now = new Date('2026-01-02T12:00:00Z');

test('renders each section and flags missing evidence without treating it as success', () => {
  const report = renderQueueReport(fixture, now);
  for (const heading of ['Done', 'In progress', 'Blocked', 'Owner decisions']) {
    assert.match(report, new RegExp(`## ${heading}`));
  }
  assert.match(report, /#101 Synthetic completed task/);
  assert.match(report, /#102 Synthetic active task/);
  assert.match(report, /#103 Synthetic QA failure.*CI failure.*independent review unavailable/);
  assert.match(report, /#104 Synthetic owner decision.*CI unavailable.*independent review unavailable/);
  assert.match(report, /#105 Synthetic queued task.*stale >24h; no linked PR/);
  assert.doesNotMatch(report.match(/#102 Synthetic active task[^\n]*/)?.[0] ?? '', /CI unavailable|independent review unavailable/);
});

test('24-hour boundary is not stale and missing update is explicit', () => {
  const copy = structuredClone(fixture);
  copy.issues[4].updatedAt = '2026-01-01T12:00:00Z';
  assert.doesNotMatch(renderQueueReport(copy, now).match(/#105 Synthetic queued task[^\n]*/)[0], /stale/);
  delete copy.issues[4].updatedAt;
  assert.match(renderQueueReport(copy, now), /#105 Synthetic queued task.*last update unavailable/);
});

test('rejects malformed input instead of producing a misleading empty report', () => {
  assert.throws(() => renderQueueReport({ issues: [] }, now), /issues and pullRequests arrays/);
  assert.throws(() => renderQueueReport({ issues: [{}], pullRequests: [] }, now), /Each issue needs/);
});
