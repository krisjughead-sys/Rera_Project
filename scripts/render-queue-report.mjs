import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const labelsOf = (issue) => new Set((issue.labels ?? []).map((label) => typeof label === 'string' ? label : label.name));
const safe = (value) => String(value ?? 'Unavailable').replace(/[\r\n|]/g, ' ').trim();

export function renderQueueReport(snapshot, now = new Date()) {
  if (!Array.isArray(snapshot?.issues) || !Array.isArray(snapshot?.pullRequests)) {
    throw new Error('Snapshot needs issues and pullRequests arrays');
  }
  if (Number.isNaN(new Date(now).getTime())) throw new Error('Invalid report time');
  const sections = { Done: [], 'In progress': [], Blocked: [], 'Owner decisions': [] };
  for (const issue of snapshot.issues) {
    if (!Number.isInteger(issue.number) || !issue.title || !issue.url || !issue.state) {
      throw new Error('Each issue needs number, title, url and state');
    }
    const labels = labelsOf(issue);
    const prs = snapshot.pullRequests.filter((pr) => pr.issueNumber === issue.number);
    const flags = [];
    if (issue.state === 'open') {
      const updated = Date.parse(issue.updatedAt);
      if (!Number.isFinite(updated)) flags.push('last update unavailable');
      else if (new Date(now).getTime() - updated > 24 * 60 * 60 * 1000) flags.push('stale >24h');
      if (!prs.length) flags.push('no linked PR');
    }
    for (const pr of prs) {
      if (!pr.ci || !pr.ci.conclusion) flags.push(`PR #${pr.number}: CI unavailable`);
      else if (pr.ci.conclusion !== 'success') flags.push(`PR #${pr.number}: CI ${safe(pr.ci.conclusion)}`);
      const independentApproval = Array.isArray(pr.reviews) && pr.reviews.some((review) =>
        review.state === 'APPROVED' && pr.author && review.author && review.author !== pr.author);
      if (pr.draft && !independentApproval) flags.push(`PR #${pr.number}: independent review unavailable`);
    }
    const detail = [`[#${issue.number} ${safe(issue.title)}](${issue.url})`];
    if (prs.length) detail.push(`PR ${prs.map((pr) => `[#${pr.number}](${pr.url})`).join(', ')}`);
    detail.push(`updated ${safe(issue.updatedAt)}`);
    if (flags.length) detail.push(flags.join('; '));
    const line = `- ${detail.join(' — ')}`;
    const section = issue.state === 'closed' ? 'Done'
      : labels.has('needs-owner') ? 'Owner decisions'
      : ['qa-failed', 'source-blocked', 'cost-paused'].some((label) => labels.has(label)) ? 'Blocked'
      : 'In progress';
    sections[section].push(line);
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
