const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Counts findings per platform across all scanned images. */
export function summarize(results) {
  const byPlatform = {};
  for (const r of results) {
    for (const f of r.findings ?? []) {
      const p = (byPlatform[f.platform] ??= { full: 0, partial: 0 });
      p[f.match]++;
    }
  }
  return Object.entries(byPlatform)
    .map(([platform, c]) => ({ platform, ...c, total: c.full + c.partial }))
    .sort((a, b) => b.full - a.full || b.total - a.total);
}

export function renderHtml(results, scannedAt = new Date().toISOString()) {
  const summary = summarize(results);
  const rows = summary.map(s => `<tr><td>${esc(s.platform)}</td><td>${s.full}</td><td>${s.partial}</td></tr>`).join('');
  const sections = results.map(r => {
    if (r.error) return `<section><h2>${esc(r.input)}</h2><p class="err">Error: ${esc(r.error)}</p></section>`;
    const items = r.findings.map(f => `
      <li class="${f.match}">
        <span class="tag">${f.match === 'full' ? 'Exact copy' : 'Edited / cropped'}</span>
        <span class="plat">${esc(f.platform)}</span>
        ${f.pageUrl ? `<a href="${esc(f.pageUrl)}" target="_blank" rel="noopener">${esc(f.title || f.pageUrl)}</a>` : '<em>image only, no page found</em>'}
        ${f.asin ? `<span class="asin">ASIN ${esc(f.asin)}</span>` : ''}
        ${f.imageUrl ? `<a class="img" href="${esc(f.imageUrl)}" target="_blank" rel="noopener">matched image</a>` : ''}
      </li>`).join('');
    return `<section>
      <h2>${esc(r.input)}</h2>
      <p class="meta">${r.findings.length} suspected copies · ${r.similarCount} visually similar (not listed)${r.bestGuess.length ? ` · Google sees: ${esc(r.bestGuess.join(', '))}` : ''}</p>
      ${items ? `<ul>${items}</ul>` : '<p>No copies found.</p>'}
    </section>`;
  }).join('');

  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Photo copy scan</title>
<style>
  body{font:15px/1.5 system-ui,sans-serif;max-width:960px;margin:0 auto;padding:24px 16px;color:#1a1a1a;background:#fafafa}
  h1{margin:0 0 4px} .meta,.sub{color:#666;font-size:13px}
  table{border-collapse:collapse;margin:16px 0} td,th{border:1px solid #ddd;padding:6px 12px;text-align:left}
  section{background:#fff;border:1px solid #e5e5e5;border-radius:8px;padding:16px;margin:16px 0}
  h2{font-size:15px;margin:0 0 4px;word-break:break-all}
  ul{list-style:none;padding:0;margin:8px 0 0} li{padding:8px 0;border-top:1px solid #f0f0f0;display:flex;flex-wrap:wrap;gap:8px;align-items:baseline}
  .tag{font-size:12px;font-weight:600;padding:1px 8px;border-radius:10px} .full .tag{background:#fde2e2;color:#9b1c1c} .partial .tag{background:#fef3c7;color:#92400e}
  .plat{font-weight:600} .asin,.img{font-size:13px;color:#666} a{color:#1d4ed8;word-break:break-all} .err{color:#9b1c1c}
</style></head><body>
<h1>Photo copy scan</h1>
<p class="sub">Scanned ${esc(scannedAt)} · ${results.length} image(s) · Source: Google Cloud Vision web detection (only pages Google has indexed)</p>
<table><thead><tr><th>Platform</th><th>Exact copies</th><th>Edited / cropped</th></tr></thead><tbody>${rows || '<tr><td colspan="3">Nothing found</td></tr>'}</tbody></table>
${sections}
</body></html>`;
}
