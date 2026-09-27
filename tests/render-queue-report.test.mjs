import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderQueueReport } from '../scripts/render-queue-report.mjs';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/rera-06-queue.json', import.meta.url), 'utf8'));
const now = new Date('2026-01-02T12:00:00Z');

test('classifies every synthetic issue and flags missing evidence', () => {
  const report = renderQueueReport(fixture, now);
  const sections = Object.fromEntries(report.split('## ').slice(1).map((chunk) => {
    const [heading, ...body] = chunk.split('\n');
    return [heading, body.join('\n')];
  }));
  assert.deepEqual(Object.keys(sections), ['Done', 'In progress', 'Blocked', 'Owner decisions']);
  assert.match(sections.Done, /#101 Synthetic completed task/);
  assert.match(sections['In progress'], /#102 Synthetic active task/);
  assert.match(sections['In progress'], /#105 Synthetic queued task.*stale >24h; no linked PR/);
  assert.match(sections.Blocked, /#103 Synthetic QA failure.*CI failure.*independent review unavailable/);
  assert.match(sections.Blocked, /#106 Synthetic rejected task.*closed as not planned/);
  assert.match(sections['Owner decisions'], /#104 Synthetic owner decision.*CI unavailable.*independent review unavailable/);
  assert.doesNotMatch(sections['In progress'].match(/#102 Synthetic active task[^\n]*/)?.[0] ?? '', /CI unavailable|independent review unavailable/);
});

test('outdated approval and later change request do not count as current review', () => {
  const copy = structuredClone(fixture);
  copy.pullRequests[0].reviews[0].commitId = 'older-head';
  assert.match(renderQueueReport(copy, now), /#102 Synthetic active task.*independent review unavailable/);
  copy.pullRequests[0].reviews[0].commitId = 'synthetic-current-head';
  copy.pullRequests[0].reviews.push({ author: 'reviewer', state: 'CHANGES_REQUESTED', commitId: 'synthetic-current-head' });
  assert.match(renderQueueReport(copy, now), /#102 Synthetic active task.*independent review unavailable/);
});

test('escapes Markdown title syntax and rejects unsafe links', () => {
  const copy = structuredClone(fixture);
  copy.issues[0].title = 'Synthetic ](https://other.invalid) task';
  assert.ok(renderQueueReport(copy, now).includes('Synthetic \\]\\(https://other.invalid\\) task'));
  copy.issues[0].url = 'https://github.com.evil.invalid/example';
  assert.throws(() => renderQueueReport(copy, now), /github.com HTTPS URLs/);
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

test('recognizes uppercase GitHub issue states and rejects unknown states', () => {
  const copy = structuredClone(fixture);
  copy.issues[4].state = 'OPEN';
  assert.match(renderQueueReport(copy, now), /#105 Synthetic queued task.*stale >24h; no linked PR/);
  copy.issues[4].state = 'pending';
  assert.throws(() => renderQueueReport(copy, now), /Unknown issue state for #105/);
});

test('exposes an orphan draft PR and its missing checks', () => {
  const copy = structuredClone(fixture);
  copy.pullRequests.push({ number: 299, issueNumber: 999, url: 'https://github.com/example/test/pull/299', draft: true, author: 'builder' });
  const report = renderQueueReport(copy, now);
  assert.match(report, /## Blocked[\s\S]*PR #299.*issue #999 unavailable; CI unavailable; independent review unavailable/);
});

test('rejects duplicate issue numbers that would render misleading duplicate rows', () => {
  const copy = structuredClone(fixture);
  copy.issues.push(structuredClone(copy.issues[0]));
  assert.throws(() => renderQueueReport(copy, now), /Duplicate issue #101/);
});
