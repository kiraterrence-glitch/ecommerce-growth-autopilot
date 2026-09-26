function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function layout(title, content) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
:root{
  --bg:#f6f7f9;
  --surface:#ffffff;
  --text:#111827;
  --muted:#626d7c;
  --line:#e3e7ed;
  --dark:#0b111b;
  --blue:#1558e8;
  --max:1180px;
}
*{box-sizing:border-box}
body{
  margin:0;
  background:var(--bg);
  color:var(--text);
  font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif
}
a{color:inherit;text-decoration:none}
.top{
  background:var(--dark);
  color:#fff;
  padding:12px 20px;
  font-size:13px;
  text-align:center
}
header{
  background:#fff;
  border-bottom:1px solid var(--line)
}
.header{
  max-width:var(--max);
  margin:auto;
  padding:24px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:20px
}
.brand{font-size:21px;font-weight:850}
.header a{color:var(--blue);font-weight:750}
main{
  max-width:var(--max);
  margin:auto;
  padding:42px 24px 80px
}
.hero{margin-bottom:35px}
.hero h1{
  margin:0 0 10px;
  font-size:clamp(38px,6vw,64px);
  letter-spacing:-.05em;
  line-height:1
}
.hero p{
  color:var(--muted);
  max-width:720px;
  line-height:1.6
}
.grid{
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:18px
}
.card{
  display:block;
  background:var(--surface);
  border:1px solid var(--line);
  border-radius:20px;
  padding:24px
}
.card:hover{
  box-shadow:0 18px 45px rgba(16,24,40,.08)
}
.card h2{margin:5px 0 8px}
.muted{color:var(--muted)}
.badge{
  display:inline-flex;
  border-radius:999px;
  padding:6px 10px;
  background:#eaf1ff;
  color:#174fc2;
  font-size:12px;
  font-weight:800
}
.stats{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:10px;
  margin-top:20px
}
.stat{
  border:1px solid var(--line);
  border-radius:14px;
  padding:13px;
  background:#fafbfc
}
.stat strong{
  display:block;
  font-size:20px
}
.stat span{
  color:var(--muted);
  font-size:12px
}
.section{
  margin-top:24px;
  background:#fff;
  border:1px solid var(--line);
  border-radius:20px;
  padding:24px;
  overflow-x:auto
}
.section h2{margin-top:0}
table{
  width:100%;
  border-collapse:collapse;
  font-size:14px
}
th,td{
  text-align:left;
  padding:12px 10px;
  border-bottom:1px solid var(--line);
  vertical-align:top
}
th{color:#485467}
.code{
  font-family:ui-monospace,SFMono-Regular,Consolas,monospace;
  font-size:12px
}
.empty{color:var(--muted);font-style:italic}
footer{
  text-align:center;
  color:var(--muted);
  padding:30px;
  font-size:12px
}
@media(max-width:760px){
  .grid{grid-template-columns:1fr}
  .stats{grid-template-columns:repeat(2,1fr)}
  main{padding:30px 16px 60px}
  .header{padding:18px 16px}
  table{font-size:12px}
  th,td{padding:10px 6px}
}
</style>
</head>
<body>
<div class="top">
Local Product Intelligence Library - externalWrites=false - livePublishing=false
</div>
<header>
  <div class="header">
    <div class="brand">Product Library</div>
    <a href="/products">All products</a>
  </div>
</header>
<main>
${content}
</main>
<footer>
SQLite local-first product intelligence - Human approval required
</footer>
</body>
</html>`;
}

function countSnapshot(snapshot) {
  return {
    evidence: snapshot?.evidence.length ?? 0,
    revisions: snapshot?.revisions.length ?? 0,
    competitors: snapshot?.competitors.length ?? 0,
    qa: snapshot?.qaRuns.length ?? 0,
  };
}

export function renderProductLibrary(repository) {
  const products = repository.listProducts();

  const cards = products
    .map((product) => {
      const snapshot = repository.getSnapshot(product.id);
      const counts = countSnapshot(snapshot);

      return `
<a class="card" href="/products/${encodeURIComponent(product.id)}">
  <span class="badge">${escapeHtml(product.status)}</span>
  <h2>${escapeHtml(product.title)}</h2>
  <div class="muted">SKU: ${escapeHtml(product.sku)}</div>

  <div class="stats">
    <div class="stat"><strong>${counts.evidence}</strong><span>Evidence</span></div>
    <div class="stat"><strong>${counts.revisions}</strong><span>Revisions</span></div>
    <div class="stat"><strong>${counts.competitors}</strong><span>Competitors</span></div>
    <div class="stat"><strong>${counts.qa}</strong><span>QA runs</span></div>
  </div>
</a>`;
    })
    .join("");

  return layout(
    "Product Library",
    `
<section class="hero">
  <span class="badge">LOCAL DATABASE</span>
  <h1>Product Intelligence Library</h1>
  <p>
    Persistent products, research evidence, revisions, competitors,
    generated assets, QA history and approvals.
  </p>
</section>

<section class="grid">
  ${cards || '<p class="empty">No products stored yet.</p>'}
</section>
`,
  );
}

function table(headings, rows) {
  if (rows.length === 0) {
    return '<p class="empty">No records.</p>';
  }

  return `
<table>
<thead>
<tr>
${headings.map((heading) => `<th>${escapeHtml(heading)}</th>`).join("")}
</tr>
</thead>
<tbody>
${rows.join("")}
</tbody>
</table>`;
}

export function renderProductDetail(snapshot) {
  if (!snapshot) {
    return null;
  }

  const { product } = snapshot;

  const sourceRows = snapshot.sources.map(
    (item) => `
<tr>
  <td>${escapeHtml(item.sourceType)}</td>
  <td>${escapeHtml(item.status)}</td>
  <td>${escapeHtml(item.sourceUrl ?? "Local/manual source")}</td>
  <td>${escapeHtml(item.capturedAt)}</td>
</tr>`,
  );

  const evidenceRows = snapshot.evidence.map(
    (item) => `
<tr>
  <td>${escapeHtml(item.field)}</td>
  <td>${escapeHtml(item.rawValue)}</td>
  <td>${escapeHtml(item.normalizedValue ?? "")}</td>
  <td>${escapeHtml(item.unit ?? "")}</td>
  <td>${escapeHtml(item.status)}</td>
</tr>`,
  );

  const revisionRows = snapshot.revisions.map(
    (item) => `
<tr>
  <td>${item.revisionNumber}</td>
  <td class="code">${escapeHtml(item.id)}</td>
  <td>${escapeHtml(item.createdAt)}</td>
</tr>`,
  );

  const competitorRows = snapshot.competitors.map(
    (item) => `
<tr>
  <td class="code">${escapeHtml(item.competitorProductId)}</td>
  <td>${escapeHtml(item.relationship)}</td>
  <td>${item.confirmed ? "Confirmed" : "Unconfirmed"}</td>
</tr>`,
  );

  const comparisonRows = snapshot.comparisons.map(
    (item) => `
<tr>
  <td class="code">${escapeHtml(item.competitorProductId)}</td>
  <td>${escapeHtml(item.status)}</td>
  <td>${escapeHtml(item.createdAt)}</td>
</tr>`,
  );

  const visualRows = snapshot.visuals.map(
    (item) => `
<tr>
  <td>${escapeHtml(item.kind)}</td>
  <td class="code">${escapeHtml(item.filePath)}</td>
  <td>${escapeHtml(item.rightsStatus ?? "n/a")}</td>
</tr>`,
  );

  const draftRows = snapshot.drafts.map(
    (item) => `
<tr>
  <td>${item.version}</td>
  <td>${escapeHtml(item.status)}</td>
  <td class="code">${escapeHtml(item.htmlPath)}</td>
</tr>`,
  );

  const qaRows = snapshot.qaRuns.map(
    (item) => `
<tr>
  <td>${escapeHtml(item.qaType)}</td>
  <td>${item.passed ? "PASS" : "FAIL"}</td>
  <td>${item.errors}</td>
  <td>${item.warnings}</td>
</tr>`,
  );

  const approvalRows = snapshot.approvals.map(
    (item) => `
<tr>
  <td>${escapeHtml(item.artifactType)}</td>
  <td class="code">${escapeHtml(item.artifactId)}</td>
  <td>${escapeHtml(item.status)}</td>
</tr>`,
  );

  return layout(
    `${product.title} - Product Library`,
    `
<section class="hero">
  <span class="badge">${escapeHtml(product.status)}</span>
  <h1>${escapeHtml(product.title)}</h1>
  <p>
    SKU ${escapeHtml(product.sku)} - persistent SQLite product intelligence record.
  </p>
</section>

<section class="stats">
  <div class="stat"><strong>${snapshot.evidence.length}</strong><span>Evidence</span></div>
  <div class="stat"><strong>${snapshot.revisions.length}</strong><span>Revisions</span></div>
  <div class="stat"><strong>${snapshot.visuals.length}</strong><span>Visuals</span></div>
  <div class="stat"><strong>${snapshot.qaRuns.length}</strong><span>QA runs</span></div>
</section>

<section class="section">
  <h2>Sources</h2>
  ${table(["Type", "Status", "Source", "Captured"], sourceRows)}
</section>

<section class="section">
  <h2>Evidence</h2>
  ${table(["Field", "Raw", "Normalized", "Unit", "Status"], evidenceRows)}
</section>

<section class="section">
  <h2>Revision history</h2>
  ${table(["Revision", "ID", "Created"], revisionRows)}
</section>

<section class="section">
  <h2>Competitors</h2>
  ${table(["Product", "Relationship", "Confirmation"], competitorRows)}
</section>

<section class="section">
  <h2>Comparison history</h2>
  ${table(["Competitor", "Status", "Created"], comparisonRows)}
</section>

<section class="section">
  <h2>Visual assets</h2>
  ${table(["Kind", "File", "Rights"], visualRows)}
</section>

<section class="section">
  <h2>Product-page drafts</h2>
  ${table(["Version", "Status", "File"], draftRows)}
</section>

<section class="section">
  <h2>QA history</h2>
  ${table(["Type", "Result", "Errors", "Warnings"], qaRows)}
</section>

<section class="section">
  <h2>Approvals</h2>
  ${table(["Artifact", "ID", "Status"], approvalRows)}
</section>
`,
  );
}
