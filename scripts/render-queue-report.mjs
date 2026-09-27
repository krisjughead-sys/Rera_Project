import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const labelsOf = (issue) => new Set((issue.labels ?? []).map((label) => typeof label === 'string' ? label : label.name));
const safe = (value) => String(value ?? 'Unavailable').replace(/[\r\n|]/g, ' ').trim();
const link = (title, rawUrl) => {
  const url = new URL(rawUrl);
  if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.username || url.password) {
    throw new Error('Report links must be github.com HTTPS URLs');
  }
  const escapedTitle = [...safe(title)].map((ch) => '\\[]()`*_!'.includes(ch) ? '\\' + ch : ch).join('');
  return `[${escapedTitle}](${url.href.replace(/\)/g, '%29').replace(/\(/g, '%28')})`;
};

export function renderQueueReport(snapshot, now = new Date()) {
  if (!Array.isArray(snapshot?.issues) || !Array.isArray(snapshot?.pullRequests)) {
    throw new Error('Snapshot needs issues and pullRequests arrays');
  }
  if (Number.isNaN(new Date(now).getTime())) throw new Error('Invalid report time');
  const sections = { Done: [], 'In progress': [], Blocked: [], 'Owner decisions': [] };
  const issueNumbers = new Set();
  for (const issue of snapshot.issues) {
    if (!Number.isInteger(issue.number) || !issue.title || !issue.url || !issue.state) {
      throw new Error('Each issue needs number, title, url and state');
    }
    if (issueNumbers.has(issue.number)) throw new Error(`Duplicate issue #${issue.number}`);
    issueNumbers.add(issue.number);
    const state = String(issue.state).toLowerCase();
    if (state !== 'open' && state !== 'closed') throw new Error(`Unknown issue state for #${issue.number}`);
    const labels = labelsOf(issue);
    const prs = snapshot.pullRequests.filter((pr) => pr.issueNumber === issue.number);
    const flags = [];
    if (state === 'open') {
      const updated = Date.parse(issue.updatedAt);
      if (!Number.isFinite(updated)) flags.push('last update unavailable');
      else if (new Date(now).getTime() - updated > 24 * 60 * 60 * 1000) flags.push('stale >24h');
      if (!prs.length) flags.push('no linked PR');
    } else if (state === 'closed' && issue.stateReason !== 'completed') {
      flags.push(issue.stateReason === 'not_planned' ? 'closed as not planned' : 'closure reason unavailable');
    }
    for (const pr of prs) {
      if (!pr.ci || !pr.ci.conclusion) flags.push(`PR #${pr.number}: CI unavailable`);
      else if (pr.ci.conclusion !== 'success') flags.push(`PR #${pr.number}: CI ${safe(pr.ci.conclusion)}`);
      const latest = new Map();
      for (const review of pr.reviews ?? []) if (review.author) latest.set(review.author, review);
      const independent = [...latest.values()].filter((review) => pr.author && review.author !== pr.author);
      const independentApproval = independent.some((review) => review.state === 'APPROVED' &&
        pr.headSha && review.commitId === pr.headSha) &&
        !independent.some((review) => review.state === 'CHANGES_REQUESTED');
      if (pr.draft && !independentApproval) flags.push(`PR #${pr.number}: independent review unavailable`);
    }
    const detail = [link(`#${issue.number} ${issue.title}`, issue.url)];
    if (prs.length) detail.push(`PR ${prs.map((pr) => link(`#${pr.number}`, pr.url)).join(', ')}`);
    detail.push(`updated ${safe(issue.updatedAt)}`);
    if (flags.length) detail.push(flags.join('; '));
    const line = `- ${detail.join(' — ')}`;
    const section = state === 'closed' && issue.stateReason === 'completed' ? 'Done'
      : state === 'closed' ? 'Blocked'
      : labels.has('needs-owner') ? 'Owner decisions'
      : ['qa-failed', 'source-blocked', 'cost-paused'].some((label) => labels.has(label)) ? 'Blocked'
      : 'In progress';
    sections[section].push(line);
  }
  for (const pr of snapshot.pullRequests) {
    if (issueNumbers.has(pr.issueNumber)) continue;
    if (!Number.isInteger(pr.number) || !pr.url) throw new Error('Each unlinked PR needs number and url');
    const flags = [Number.isInteger(pr.issueNumber) ? `issue #${pr.issueNumber} unavailable` : 'linked issue unavailable'];
    if (!pr.ci?.conclusion) flags.push('CI unavailable');
    else if (pr.ci.conclusion !== 'success') flags.push(`CI ${safe(pr.ci.conclusion)}`);
    if (pr.draft && !pr.reviews?.length) flags.push('independent review unavailable');
    sections.Blocked.push(`- ${link(`PR #${pr.number}`, pr.url)} — ${flags.join('; ')}`);
  }
  return Object.entries(sections).map(([heading, lines]) =>
    `## ${heading}\n\n${lines.length ? lines.join('\n') : 'None.'}`).join('\n\n') + '\n';
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (!process.argv[2]) throw new Error('Usage: node scripts/render-queue-report.mjs <local-snapshot.json> [now-ISO]');
    const snapshot = JSON.parse(readFileSync(process.argv[2], 'utf8'));
    process.stdout.write(renderQueueReport(snapshot, process.argv[3] ? new Date(process.argv[3]) : new Date()));
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
