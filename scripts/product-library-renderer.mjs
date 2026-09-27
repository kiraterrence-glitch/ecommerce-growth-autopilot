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
.badge-row{
  display:flex;
  flex-wrap:wrap;
  gap:8px;
  align-items:center
}
.badge-ok{
  background:#e9f8ee;
  color:#176b36
}
.badge-warn{
  background:#fff1e8;
  color:#9a4d0a
}
.badge-neutral{
  background:#eef1f4;
  color:#566170
}
.market-summary{
  margin-top:16px;
  padding:12px 14px;
  border:1px solid var(--line);
  border-radius:12px;
  background:#fafbfc
}
.market-summary strong{
  display:block;
  margin-bottom:4px
}
.market-summary span{
  color:var(--muted);
  font-size:12px
}
.market-head{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:18px
}
.market-stats{
  display:grid;
  grid-template-columns:repeat(6,minmax(0,1fr));
  gap:10px;
  margin:18px 0
}
.market-warning{
  padding:15px 18px;
  margin:18px 0;
  background:#fff8e8;
  border:1px solid #eed8ab;
  border-radius:14px
}
.market-good{
  padding:15px 18px;
  margin:18px 0;
  background:#eef9f2;
  border:1px solid #cce5d3;
  border-radius:14px
}
.section h3{
  margin-top:28px
}
@media(max-width:900px){
  .market-stats{
    grid-template-columns:repeat(3,1fr)
  }
}
@media(max-width:700px){
  .market-stats{
    grid-template-columns:repeat(2,1fr)
  }

  .market-head{
    flex-direction:column
  }
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

function contentList(value) {
  return Array.isArray(value)
    ? value
    : [];
}

function contentField(
  item,
  keys,
  fallback = "",
) {
  if (
    typeof item !== "object" ||
    item === null
  ) {
    return fallback;
  }

  for (const key of keys) {
    const value =
      item[key];

    if (
      value !== undefined &&
      value !== null &&
      String(value).trim()
    ) {
      return String(value);
    }
  }

  return fallback;
}

function renderContentIntelligencePanel(run) {
  if (!run) {
    return `
<section class="section">
  <div class="badge-row">
    <span class="badge badge-neutral">NO CONTENT INTELLIGENCE</span>
    <span class="badge badge-neutral">MESSAGING SIGNALS ONLY</span>
  </div>

  <h2>Content Intelligence</h2>

  <p class="empty">
    No Content Intelligence analysis has been stored for this product yet.
  </p>
</section>`;
  }

  const items =
    contentList(
      run.items,
    );

  const patterns =
    contentList(
      run.patterns,
    );

  const signals =
    contentList(
      run.customerSignals,
    );

  const briefs =
    contentList(
      run.activationBriefs,
    );

  const patternRows =
    patterns
      .slice(0, 12)
      .map(
        (item) => `
<tr>
  <td>${escapeHtml(
    contentField(
      item,
      [
        "dimension",
        "type",
        "category",
      ],
      "Pattern",
    ),
  )}</td>

  <td>${escapeHtml(
    contentField(
      item,
      [
        "value",
        "pattern",
        "label",
      ],
      "",
    ),
  )}</td>

  <td>${escapeHtml(
    contentField(
      item,
      [
        "count",
        "observations",
        "sampleSize",
      ],
      "",
    ),
  )}</td>
</tr>`,
      );

  const signalRows =
    signals
      .slice(0, 16)
      .map(
        (item) => `
<tr>
  <td>${escapeHtml(
    contentField(
      item,
      [
        "signalType",
        "type",
        "category",
        "kind",
      ],
      "Signal",
    ),
  )}</td>

  <td>${escapeHtml(
    contentField(
      item,
      [
        "phrase",
        "value",
        "label",
        "text",
      ],
      "",
    ),
  )}</td>

  <td>${escapeHtml(
    contentField(
      item,
      [
        "count",
        "observations",
      ],
      "",
    ),
  )}</td>
</tr>`,
      );

  const briefRows =
    briefs.map(
      (item) => `
<tr>
  <td>${escapeHtml(
    contentField(
      item,
      [
        "channel",
        "briefType",
        "type",
        "kind",
      ],
      "Draft",
    ),
  )}</td>

  <td>${escapeHtml(
    contentField(
      item,
      [
        "title",
        "name",
        "subject",
        "headline",
      ],
      "Activation brief",
    ),
  )}</td>

  <td>DRAFT ONLY</td>
</tr>`,
    );

  return `
<section class="section">
  <div class="badge-row">
    <span class="badge badge-ok">CONTENT INTELLIGENCE READY</span>
    <span class="badge badge-neutral">MESSAGING SIGNALS ONLY</span>
    <span class="badge badge-neutral">VERIFIED PRODUCT EVIDENCE ONLY</span>
    <span class="badge badge-neutral">DRAFT ONLY</span>
  </div>

  <h2>Content Intelligence</h2>

  <p class="muted">
    Latest run:
    <span class="code">${escapeHtml(
      contentField(
        run,
        ["runId"],
        "unknown",
      ),
    )}</span>

    ${
      contentField(
        run,
        ["createdAt"],
        "",
      )
        ? ` · ${escapeHtml(
            contentField(
              run,
              ["createdAt"],
            ),
          )}`
        : ""
    }
  </p>

  <div class="stats">
    <div class="stat">
      <strong>${items.length}</strong>
      <span>Content items</span>
    </div>

    <div class="stat">
      <strong>${patterns.length}</strong>
      <span>Patterns</span>
    </div>

    <div class="stat">
      <strong>${signals.length}</strong>
      <span>Customer signals</span>
    </div>

    <div class="stat">
      <strong>${briefs.length}</strong>
      <span>Draft briefs</span>
    </div>
  </div>

  <h3>Observed patterns</h3>
  ${table(
    [
      "Dimension",
      "Pattern",
      "Observations",
    ],
    patternRows,
  )}

  <h3>Customer signals</h3>
  ${table(
    [
      "Type",
      "Signal",
      "Observations",
    ],
    signalRows,
  )}

  <h3>Activation briefs</h3>
  ${table(
    [
      "Channel",
      "Brief",
      "Safety",
    ],
    briefRows,
  )}

  <p class="muted">
    Content performance is descriptive, not causal.
    Content Intelligence cannot establish product specifications,
    guarantees, certifications, prices, discounts or performance claims.
  </p>
</section>`;
}
export function renderProductLibrary(
  repository,
  marketplaceApi = null,
  contentIntelligenceApi = null,
) {
  const products =
    repository.listProducts();

  const cards =
    products
      .map((product) => {
        const snapshot =
          repository.getSnapshot(
            product.id,
          );

        const counts =
          countSnapshot(
            snapshot,
          );

        const marketplace =
          marketplaceApi
            ? marketplaceApi.panel(
                product.id,
              )
            : null;

        const contentIntelligence =
          contentIntelligenceApi
            ? contentIntelligenceApi.latest(
                product.id,
              )
            : null;

        return `
<a class="card" href="/products/${encodeURIComponent(product.id)}">
  <div class="badge-row">
    <span class="badge">${escapeHtml(product.status)}</span>

    ${
      marketplace
        ? `<span class="badge ${
            marketplace.status === "READY"
              ? "badge-ok"
              : marketplace.status === "NEEDS_REVIEW"
                ? "badge-warn"
                : "badge-neutral"
          }">${escapeHtml(marketplace.status)}</span>`
        : ""
    }

    ${
      contentIntelligence
        ? `<span class="badge badge-ok">CONTENT INTELLIGENCE READY</span>`
        : `<span class="badge badge-neutral">NO CONTENT INTELLIGENCE</span>`
    }
  </div>

  <h2>${escapeHtml(product.title)}</h2>

  <div class="muted">
    SKU: ${escapeHtml(product.sku)}
  </div>

  <div class="stats">
    <div class="stat">
      <strong>${counts.evidence}</strong>
      <span>Evidence</span>
    </div>

    <div class="stat">
      <strong>${counts.revisions}</strong>
      <span>Revisions</span>
    </div>

    <div class="stat">
      <strong>${counts.competitors}</strong>
      <span>Competitors</span>
    </div>

    <div class="stat">
      <strong>${counts.qa}</strong>
      <span>QA runs</span>
    </div>
  </div>

  ${
    marketplace
      ? `
  <div class="market-summary">
    <strong>Marketplace intelligence</strong>

    <span>
      ${marketplace.summary.sourceCount} sources &middot;
      ${marketplace.summary.evidenceCount} evidence &middot;
      ${marketplace.summary.conflictCount} conflicts &middot;
      ${marketplace.summary.unknownRightsCount} unknown-rights
    </span>
  </div>`
      : ""
  }

  ${
    contentIntelligence
      ? `
  <div class="market-summary">
    <strong>Content Intelligence</strong>

    <span>
      ${contentList(contentIntelligence.items).length} items &middot;
      ${contentList(contentIntelligence.patterns).length} patterns &middot;
      ${contentList(contentIntelligence.customerSignals).length} signals &middot;
      ${contentList(contentIntelligence.activationBriefs).length} draft briefs
    </span>
  </div>`
      : ""
  }
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
    generated assets, QA history, approvals and Content Intelligence.
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

function renderMarketplacePanel(panel) {
  if (!panel) {
    return "";
  }

  const sourceRows =
    panel.sources.map(
      (item) => `
<tr>
  <td class="code">${escapeHtml(item.sourceId)}</td>
  <td>${escapeHtml(item.policyId)}</td>
  <td>${escapeHtml(item.captureMethod)}</td>
  <td>${escapeHtml(item.rightsStatus)}</td>
  <td class="code">${escapeHtml(item.sourceUrl)}</td>
</tr>`,
    );

  const evidenceRows =
    panel.evidence.map(
      (item) => `
<tr>
  <td>${escapeHtml(item.field)}</td>
  <td>${escapeHtml(item.rawValue)}</td>
  <td>${escapeHtml(item.normalizedValue)}</td>
  <td>${escapeHtml(item.unit ?? "")}</td>
  <td>${escapeHtml(item.status)}</td>
  <td>${escapeHtml(item.rightsStatus)}</td>
  <td class="code">${escapeHtml(item.sourceId)}</td>
</tr>`,
    );

  const assessmentRows =
    panel.summary.assessments.map(
      (item) => `
<tr>
  <td>${escapeHtml(item.field)}</td>
  <td>${escapeHtml(item.status)}</td>
  <td>${item.verified.length}</td>
  <td>${item.unverified.length}</td>
  <td>${item.canonicalValues.length}</td>
</tr>`,
    );

  const warnings =
    panel.warnings.length > 0
      ? `
<div class="market-warning">
  <strong>Review required</strong>
  <ul>
    ${panel.warnings
      .map(
        (warning) =>
          `<li>${escapeHtml(warning)}</li>`,
      )
      .join("")}
  </ul>
</div>`
      : `
<div class="market-good">
  No marketplace blocking warnings are currently present.
</div>`;

  return `
<section class="section">
  <div class="market-head">
    <div>
      <span class="badge">MARKETPLACE INTELLIGENCE</span>
      <h2>Marketplace evidence</h2>
    </div>

    <span class="badge ${
      panel.status === "READY"
        ? "badge-ok"
        : panel.status === "NEEDS_REVIEW"
          ? "badge-warn"
          : "badge-neutral"
    }">
      ${escapeHtml(panel.status)}
    </span>
  </div>

  <div class="market-stats">
    <div class="stat"><strong>${panel.summary.sourceCount}</strong><span>Sources</span></div>
    <div class="stat"><strong>${panel.summary.evidenceCount}</strong><span>Evidence</span></div>
    <div class="stat"><strong>${panel.summary.verifiedEvidenceCount}</strong><span>Verified</span></div>
    <div class="stat"><strong>${panel.summary.unverifiedEvidenceCount}</strong><span>Unverified</span></div>
    <div class="stat"><strong>${panel.summary.conflictCount}</strong><span>Conflicts</span></div>
    <div class="stat"><strong>${panel.summary.unknownRightsCount}</strong><span>Unknown rights</span></div>
  </div>

  ${warnings}

  <h3>Marketplace sources</h3>

  ${table(
    ["Source ID", "Policy", "Capture", "Rights", "Source URL"],
    sourceRows,
  )}

  <h3>Marketplace evidence records</h3>

  ${table(
    ["Field", "Raw", "Normalized", "Unit", "Verification", "Rights", "Source"],
    evidenceRows,
  )}

  <h3>Evidence assessment</h3>

  ${table(
    ["Field", "State", "Verified", "Unverified", "Canonical values"],
    assessmentRows,
  )}
</section>`;
}
export function renderProductDetail(snapshot, marketplacePanel = null, contentIntelligenceRun = null) {
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

${renderMarketplacePanel(marketplacePanel)}

${renderContentIntelligencePanel(contentIntelligenceRun)}

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
