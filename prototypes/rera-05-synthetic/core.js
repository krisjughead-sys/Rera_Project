// RERA-05 synthetic prototype core. Classic script (works from file://) that
// also loads in Node for behavioural tests. Pure: takes data, a store and a
// clock; returns HTML strings. No network, no real project facts.
(function (root) {
  'use strict';
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const SYNTHETIC_ID = /^P0000\d{7}$/;
  const GLYPH = { verified:'✓', older:'⚠', unavailable:'?', unknown:'·', conflict:'⚠' };
  const LABEL = { verified:'Official record', older:'Older snapshot', unavailable:'Could not verify', unknown:'Not checked yet', conflict:'Official sources disagree' };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmtDate = iso => { if (!iso) return ''; const [y,m,d] = iso.split('-'); return `${d} ${MONTHS[+m-1]} ${y}`; };
  const isDate = v => /^\d{4}-\d{2}-\d{2}$/.test(v || '');

  function createPrototype(DATA, store, clock) {
    const KEY = 'rera05-synthetic-shortlist-v1', VISIT = 'rera05-synthetic-last-visit-v1';
    const now = () => (clock ? clock() : new Date());
    const todayIso = () => now().toISOString().slice(0, 10);
    const daysSince = iso => Math.round((now() - new Date(iso + 'T00:00:00Z')) / 86400000);
    // The date of our reading comes from the dataset, never from the visitor's
    // device clock: a "could not verify on D" sentence must name a day on which
    // a read was actually attempted.
    const readingDate = () => fmtDate(DATA.generatedAt);
    // Latest retrieval date across every field of a record, including the
    // sides of a conflict. Null when nothing has been read.
    const fieldReadAt = f => f.status === 'conflict' ? (f.values || []).map(v => v.retrievedAt).filter(Boolean).sort().pop() || null : (f.retrievedAt || null);
    const latestReadAt = p => p.fields.map(fieldReadAt).filter(Boolean).sort().pop() || null;

    // Data/view boundary: a record whose page carried a different registration
    // number than requested is a mismatch. Its fields are dropped here, so no
    // view (search, project, compare, changes, shortlist) can show them.
    const RECORDS = DATA.projects.map(p => {
      if (p.pageId === p.reraId) return { ...p, mismatch: false };
      return { reraId: p.reraId, name: p.name, locality: p.locality, promoter: p.promoter, mismatch: true, pageId: p.pageId, fields: [] };
    });
    const byId = id => RECORDS.find(p => p.reraId === id) || null;

    const readStore = k => { try { return store.get(k); } catch { return null; } };
    const writeStore = (k, v) => { try { store.set(k, v); } catch {} };
    const read = () => { try { const a = JSON.parse(readStore(KEY) || '[]'); return Array.isArray(a) ? a.filter(x => SYNTHETIC_ID.test(x)).slice(0, 30) : []; } catch { return []; } };
    const write = list => writeStore(KEY, JSON.stringify(list.slice(0, 30)));
    // Last visit: { date: 'YYYY-MM-DD', illustrative: boolean }. A real visit is
    // recorded from the clock; an illustrative one is set by the QA control.
    const lastVisit = () => { try { const v = JSON.parse(readStore(VISIT) || 'null'); return v && isDate(v.date) ? v : null; } catch { return null; } };
    const recordVisit = () => writeStore(VISIT, JSON.stringify({ date: todayIso(), illustrative: false }));
    const recordIllustrativeVisit = date => writeStore(VISIT, JSON.stringify({ date, illustrative: true }));

    // Returns true if the list changed. A mismatched or unknown record is never added.
    function toggleShortlist(id) {
      const list = read();
      if (list.includes(id)) { write(list.filter(x => x !== id)); return true; }
      const p = byId(id);
      if (!p || p.mismatch) return false;
      write([id, ...list]); return true;
    }

    function effState(f) {
      if (f.status === 'verified' && daysSince(f.retrievedAt) > DATA.freshnessWindowDays) return 'older';
      return f.status;
    }
    const stateBadge = s => `<span class="state ${s}"><span aria-hidden="true">${GLYPH[s]}</span> ${LABEL[s]}</span>`;

    // The one function that turns a non-verified field into buyer-facing words. No dashes, no blanks.
    function stateText(f) {
      const s = effState(f);
      if (s === 'unavailable') {
        const base = `Could not verify on ${fmtDate(f.retrievedAt)}.`;
        if (f.key === 'litigation') return `${base} This does not mean there is no case.`;
        if (f.dateKind === 'revised') return `${base} This does not mean there is no revision.`;
        if (f.dateKind === 'extended') return `${base} This does not mean no extension exists.`;
        return `${base} This does not mean the field is empty.`;
      }
      if (s === 'unknown') return 'Not checked yet';
      return '';
    }
    const mismatchText = p => `Could not verify in our reading dated ${readingDate()}: the page we read carried a different registration number (${p.pageId}) from the one requested (${p.reraId}). No fields are shown and this record cannot be shortlisted.`;

    function valueHtml(f) {
      const v = isDate(f.value) ? `<time datetime="${f.value}">${fmtDate(f.value)}</time>` : esc(f.value);
      const printed = f.printed && f.printed !== f.value ? ` <details class="printed"><summary>as printed</summary><span class="id">${esc(f.printed)}</span></details>` : '';
      return `<span class="value">${v}</span>${printed}`;
    }
    const provHtml = f => `<div class="prov">Document dated ${fmtDate(f.documentDate)} · Last verified ${fmtDate(f.retrievedAt)} (${daysSince(f.retrievedAt)} days ago) · <a href="${esc(f.sourceUrl)}" rel="noopener">View ›</a></div>`;

    function fieldRow(f) {
      const s = effState(f);
      let body;
      if (s === 'verified' || s === 'older') {
        body = `${valueHtml(f)} ${stateBadge(s)}${provHtml(f)}` +
          (s === 'older' ? `<div class="prov">Last verified ${daysSince(f.retrievedAt)} days ago. Re-check on the official site before deciding.</div>` : '') +
          (f.change ? `<div class="change">Changed: this row was added on our read of ${fmtDate(f.change.afterRetrievedAt)} (was: ${f.change.before ? fmtDate(f.change.before) : 'not present'} on ${fmtDate(f.change.beforeRetrievedAt)})</div>` : '');
      } else if (s === 'conflict') {
        body = `${stateBadge(s)}` + f.values.map(v => `<div><span class="value">${isDate(v.value) ? fmtDate(v.value) : esc(v.value)}</span> <span class="meta">(${esc(v.sourceLabel)}, document dated ${fmtDate(v.documentDate)}, <a href="${esc(v.sourceUrl)}" rel="noopener">View ›</a>)</span></div>`).join('') +
          `<div class="prov">Neither is shown as current. Confirm on MahaRERA.</div>`;
      } else {
        body = `${stateBadge(s)}<div class="prov">${esc(stateText(f))}</div>`;
      }
      return `<div class="field"><dt>${esc(f.label)}</dt><dd>${body}</dd></div>`;
    }

    // Per-field return-later summary. Never speaks for fields that were not re-read.
    function visitSummary(p) {
      const lv = lastVisit();
      if (!lv || p.mismatch) return null;
      const later = f => { const r = fieldReadAt(f); return !!(r && r > lv.date); };
      const changed = p.fields.filter(f => f.change && f.change.afterRetrievedAt > lv.date).map(f => f.label);
      // "No change detected" is only ever said about a field whose later
      // reading was itself verified. A later reading that came back
      // unavailable, unknown or contradictory proves nothing about change.
      const checked = p.fields.filter(f => later(f) && f.status === 'verified' && !changed.includes(f.label)).map(f => f.label);
      const couldNotVerify = p.fields.filter(f => later(f) && f.status !== 'verified' && !changed.includes(f.label)).map(f => f.label);
      const notChecked = p.fields.filter(f => !later(f)).map(f => f.label);
      return { lv, changed, checked, couldNotVerify, notChecked };
    }
    function shortlistChip(p) {
      const v = visitSummary(p);
      if (!v) return '';
      const since = `since your ${v.lv.illustrative ? 'illustrative ' : ''}last visit on ${fmtDate(v.lv.date)}`;
      const parts = [];
      if (v.changed.length) parts.push(`Changed ${since}: ${v.changed.join(', ')}`);
      if (v.checked.length) parts.push(`Re-checked ${since}, no change detected: ${v.checked.join(', ')}`);
      if (v.couldNotVerify.length) parts.push(`Could not verify on the later check ${since}: ${v.couldNotVerify.join(', ')}`);
      if (v.notChecked.length) parts.push(`Not re-checked ${since}: ${v.notChecked.join(', ')}`);
      return parts.map(t => `<span class="chip">${esc(t)}</span>`).join(' ');
    }

    // Headline: the registration-status field when present, else the first
    // field, else an explicit "Not checked yet". Never assumes fields[0] exists.
    function headline(p) {
      const f = p.fields.find(x => x.key === 'registrationStatus') || p.fields[0];
      if (!f) return stateBadge('unknown');
      return `${stateBadge(effState(f))}${f.status === 'verified' ? ': ' + esc(f.value) : ''}`;
    }

    function projectCard(p, inList) {
      const head = `<h3>${esc(p.name)}</h3><span class="id">${esc(p.reraId)}</span><div class="meta">${esc(p.locality)}</div><div class="meta">${esc(p.promoter)}</div>`;
      if (p.mismatch) {
        return `<article class="card mismatch">${head}<div>${stateBadge('unavailable')}</div><p class="prov">${esc(mismatchText(p))}</p>` +
          (inList ? `<div class="row-actions"><button class="btn secondary" data-toggle="${esc(p.reraId)}">Remove from shortlist</button></div>` : '') + `</article>`;
      }
      return `<article class="card">${head}
    <div>${headline(p)}</div>
    ${shortlistChip(p)}
    <div class="row-actions"><button class="btn secondary" data-toggle="${esc(p.reraId)}">${inList ? 'Remove from shortlist' : 'Add to shortlist'}</button><a class="btn" href="#project/${esc(p.reraId)}">Open</a></div></article>`;
    }

    function renderSearch(q) {
      const list = read();
      const query = (q || '').trim().toLowerCase();
      const results = query ? RECORDS.filter(p => p.name.toLowerCase().includes(query) || p.reraId.toLowerCase() === query) : [];
      let html = `<h1>Find a project</h1><form class="search" id="f"><input type="search" id="q" aria-label="Project name or MahaRERA registration number" value="${esc(q || '')}" placeholder="Name or MahaRERA number"><button class="btn" type="submit">Search</button></form>
    <p class="hint">A name finds candidates. Only the exact registration number confirms which project you are looking at; two phases of one township have different numbers.</p>`;
      if (query && !results.length) html += `<div class="card"><p>No official record matched. Try the registration number from your allotment letter or the official MahaRERA search.</p><a class="btn secondary" href="https://maharera.maharashtra.gov.in/projects-search-result" rel="noopener noreferrer" target="_blank">Open official search ↗</a></div>`;
      html += results.map(p => projectCard(p, list.includes(p.reraId))).join('');
      html += `<h2>Your shortlist</h2>`;
      if (!list.length) html += `<p class="hint">Your shortlist is empty. It is saved in this browser only.</p>`;
      html += list.map(id => { const p = byId(id); return p ? projectCard(p, true) : `<article class="card"><span class="id">${esc(id)}</span><p>Record not found in our reading dated ${readingDate()}. Check MahaRERA.</p><button class="btn secondary" data-toggle="${esc(id)}">Remove</button></article>`; }).join('');
      if (results.length) html += `<hr class="rule"><aside class="ad" aria-label="Sponsored"><small>Sponsored</small>Placeholder for a labelled advertisement. It never sits inside a project card.</aside>`;
      return html;
    }

    function renderProject(id) {
      const p = byId(id);
      if (!p) return `<a href="#search">‹ Back</a><h1>Record not found</h1><span class="id">${esc(id)}</span><p>Record not found in our reading dated ${readingDate()}. Check MahaRERA. No similarly named project is shown in its place.</p>`;
      const head = `<a href="#search">‹ Back</a><h1>${esc(p.name)}</h1><span class="id">${esc(p.reraId)}</span><div class="meta">${esc(p.locality)}</div><div class="meta">${esc(p.promoter)}</div>`;
      if (p.mismatch) return head + `<section class="card record mismatch"><h2>Official record</h2>${stateBadge('unavailable')}<p>${esc(mismatchText(p))}</p></section>`;
      const list = read();
      return head +
        `<section class="card record"><h2>Official record</h2><dl>${p.fields.map(fieldRow).join('')}</dl><div class="foot">Readings dated ${fmtDate(DATA.generatedAt)} (synthetic). Registration number verified on the page: <span class="id inline">${esc(p.pageId)}</span></div></section>
     <section class="explain"><h2>What this means</h2><p>A revised date on the register is the promoter's declaration to the authority. It is not the possession date in your agreement. Compare both, and treat any row marked "Could not verify" as unread, not as empty.</p></section>
     <hr class="rule"><aside class="ad" aria-label="Sponsored"><small>Sponsored</small>Placeholder for a labelled advertisement. Dotted border, no state colours, outside the card.</aside>
     <div class="row-actions"><button class="btn secondary" data-toggle="${esc(p.reraId)}">${list.includes(p.reraId) ? 'Remove from shortlist' : 'Add to shortlist'}</button><a class="btn" href="https://maharera.maharashtra.gov.in/projects-search-result" rel="noopener noreferrer" target="_blank">Open on MahaRERA ↗</a></div>`;
    }

    function cellFor(p, key, kind) {
      const f = p.fields.find(x => x.key === key && (x.dateKind || null) === (kind || null));
      if (!f) return 'Not checked yet';
      const s = effState(f);
      if (s === 'verified' || s === 'older') return `${isDate(f.value) ? fmtDate(f.value) : esc(f.value)}<br>${stateBadge(s)}`;
      if (s === 'conflict') return `${stateBadge(s)}<br>${f.values.map(v => esc(v.value)).join(' / ')}`;
      return esc(stateText(f));
    }

    function renderCompare() {
      const ids = read().filter(byId).slice(0, 2);
      if (ids.length < 2) return `<h1>Compare</h1><p>Add two projects to your shortlist to compare their records.</p>`;
      const [a, b] = ids.map(byId);
      const sharePrefix = a.name.split(' ').slice(0, 2).join(' ') === b.name.split(' ').slice(0, 2).join(' ');
      const th = p => `<th scope="col">${esc(p.name)}<br><span class="id">${esc(p.reraId)}</span>${sharePrefix ? `<br><span class="meta">${esc(p.promoter)}<br>${esc(p.locality)}</span>` : ''}</th>`;
      const rows = [['Registration status','registrationStatus',null],['Promoter','__promoter',null],['Proposed completion (as registered)','completionDate','original'],['Revised proposed completion','completionDate','revised'],['Extension of registration','completionDate','extended'],['Last verified','__lastVerified',null],['Litigation','litigation',null]];
      const cell = (p, key, kind) => {
        if (p.mismatch) return `${stateBadge('unavailable')}<br>${esc(mismatchText(p))}`;
        if (key === '__promoter') return esc(p.promoter);
        if (key === '__lastVerified') { const r = latestReadAt(p); if (!r) return 'Not checked yet'; const older = daysSince(r) > DATA.freshnessWindowDays; return `${fmtDate(r)} (${daysSince(r)} days ago)${older ? '<br>' + stateBadge('older') : ''}`; }
        return cellFor(p, key, kind);
      };
      return `<h1>Compare</h1><p class="hint">This compares official records as we read them. It does not rank projects.</p><table><thead><tr><th scope="col" data-col=""></th>${th(a)}${th(b)}</tr></thead><tbody>` +
        rows.map(([label, key, kind]) => `<tr><th scope="row" data-col="">${esc(label)}</th><td data-col="${esc(a.name)}">${cell(a, key, kind)}</td><td data-col="${esc(b.name)}">${cell(b, key, kind)}</td></tr>`).join('') + `</tbody></table>`;
    }

    // Renders the Changes screen and then records this visit (real clock).
    function renderChanges() {
      const lv = lastVisit();
      const list = read();
      const cards = [];
      for (const p of RECORDS.filter(p => list.includes(p.reraId) || !list.length)) {
        if (p.mismatch) continue;
        for (const f of p.fields) {
          if (f.change) cards.push(`<article class="card"><h3>${esc(p.name)}</h3><span class="id">${esc(p.reraId)}</span><div><b>${esc(f.label)}</b></div><div>Before: ${f.change.before ? fmtDate(f.change.before) : 'not present'} (read ${fmtDate(f.change.beforeRetrievedAt)})</div><div>After: ${fmtDate(f.change.after)} (read ${fmtDate(f.change.afterRetrievedAt)})</div><div class="prov">Document dated ${fmtDate(f.documentDate)} · <a href="${esc(f.sourceUrl)}" rel="noopener">View ›</a></div><div class="explain compact"><b>What this means:</b> the register now shows a revised date. Your agreement date may differ.</div></article>`);
          if (f.status === 'conflict') cards.push(`<article class="card"><h3>${esc(p.name)}</h3><span class="id">${esc(p.reraId)}</span><div><b>${esc(f.label)}</b></div>${fieldRow(f)}</article>`);
        }
      }
      const visitLine = lv ? `Since your ${lv.illustrative ? 'illustrative ' : ''}last visit on ${fmtDate(lv.date)}.` : 'First visit: recorded now.';
      const html = `<h1>Changes on your shortlist</h1><p class="hint">${visitLine} Readings are synthetic and dated ${fmtDate(DATA.generatedAt)}. Shown: ${list.length ? 'your shortlist' : 'all synthetic projects (shortlist empty)'}.</p>` +
        (cards.length ? cards.join('') : '<p>No change detected in our readings. This is not a statement that nothing changed on the official site.</p>') +
        `<div class="qa"><b>QA control (illustrative):</b> <button class="btn secondary" type="button" data-illustrative-visit="2026-09-01">Pretend my last visit was 01 Sep 2026</button> <span class="meta">Marks the stored visit as illustrative so the shortlist chips can show a change on this fixed dataset.</span></div>`;
      recordVisit();
      return html;
    }

    return { RECORDS, byId, read, toggleShortlist, lastVisit, recordIllustrativeVisit, visitSummary, shortlistChip, stateText, mismatchText, latestReadAt, headline, renderSearch, renderProject, renderCompare, renderChanges, fmtDate, daysSince };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { createPrototype };
  else root.Rera05 = { createPrototype };
})(typeof globalThis !== 'undefined' ? globalThis : this);
