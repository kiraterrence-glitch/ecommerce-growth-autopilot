import type {
  ProductVisualAsset,
  ProductVisualKind,
} from "../product-visuals/types.js";

import type {
  ProductPagePreview,
  ProductPagePreviewInput,
  ProductPreviewQaIssue,
  ProductPreviewQaReport,
} from "./types.js";

function escapeHtml(
  value: string,
): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function requiredVisual(
  input: ProductPagePreviewInput,
  kind: ProductVisualKind,
): ProductVisualAsset {
  const asset =
    input.visualPack.assets.find(
      (candidate) =>
        candidate.kind === kind,
    );

  if (!asset) {
    throw new Error(
      `required preview visual is missing: ${kind}`,
    );
  }

  return asset;
}

function visualFigure(
  asset: ProductVisualAsset,
  label: string,
): string {
  return `
    <figure class="visual-card" data-visual-kind="${escapeHtml(asset.kind)}">
      <div class="visual-frame">
        ${asset.svg}
      </div>
      <figcaption>
        ${escapeHtml(label)}
      </figcaption>
    </figure>
  `;
}

function faqMarkup(
  input: ProductPagePreviewInput,
): string {
  return input.faq
    .map(
      (item) => `
        <details class="faq-item">
          <summary>${escapeHtml(item.question)}</summary>
          <p>${escapeHtml(item.answer)}</p>
        </details>
      `,
    )
    .join("");
}

export function auditProductPagePreview(
  input: ProductPagePreviewInput,
  html: string,
): ProductPreviewQaReport {
  const issues:
    ProductPreviewQaIssue[] = [];

  const requiredKinds:
    ProductVisualKind[] = [
      "hero",
      "benefit",
      "feature",
      "comparison",
      "offer",
    ];

  const renderedKinds =
    new Set(
      input.visualPack.assets.map(
        (asset) =>
          asset.kind,
      ),
    );

  for (const kind of requiredKinds) {
    if (!renderedKinds.has(kind)) {
      issues.push({
        code:
          "missing_preview_visual",
        severity: "error",
        message:
          `Preview is missing required visual ${kind}.`,
      });
    }
  }

  if (!input.visualPack.qa.passed) {
    issues.push({
      code:
        "visual_pack_failed_qa",
      severity: "error",
      message:
        "The visual pack failed its upstream QA gate.",
    });
  }

  if (
    !html.includes(
      'name="viewport"',
    )
  ) {
    issues.push({
      code:
        "missing_viewport",
      severity: "error",
      message:
        "Responsive viewport metadata is missing.",
    });
  }

  if (
    !html.includes(
      "@media(max-width:900px)",
    )
  ) {
    issues.push({
      code:
        "missing_mobile_layout",
      severity: "error",
      message:
        "Mobile layout breakpoint is missing.",
    });
  }

  if (
    /<script\b/i.test(html)
  ) {
    issues.push({
      code:
        "preview_script_present",
      severity: "error",
      message:
        "Static product preview must not contain executable scripts.",
    });
  }

  if (
    /javascript:/i.test(html)
  ) {
    issues.push({
      code:
        "unsafe_javascript_url",
      severity: "error",
      message:
        "Preview contains an unsafe javascript URL.",
    });
  }

  if (
    !html.includes(
      'data-external-writes="false"',
    ) ||
    !html.includes(
      'data-live-publishing="false"',
    )
  ) {
    issues.push({
      code:
        "missing_safety_flags",
      severity: "error",
      message:
        "Preview does not expose local-only safety state.",
    });
  }

  if (
    !html.includes(
      'data-preview-cta="true"',
    )
  ) {
    issues.push({
      code:
        "missing_preview_cta",
      severity: "error",
      message:
        "Product-page CTA is missing.",
    });
  }

  if (
    /\/checkout\b/i.test(html) ||
    /shopify\.com\/checkout/i.test(
      html,
    )
  ) {
    issues.push({
      code:
        "live_checkout_detected",
      severity: "error",
      message:
        "Preview must not connect to a live checkout.",
    });
  }

  if (input.demoMode) {
    issues.push({
      code:
        "demo_mode",
      severity: "warning",
      message:
        "Preview is explicitly running in demo mode.",
    });
  }

  const needsSource =
    input.visualPack.assets.filter(
      (asset) =>
        asset.status ===
        "NEEDS_SOURCE",
    ).length;

  if (needsSource > 0) {
    issues.push({
      code:
        "visual_sources_missing",
      severity: "warning",
      message:
        `${needsSource} visual(s) still need real product imagery.`,
    });
  }

  const unknownRights =
    input.visualPack.assets.filter(
      (asset) =>
        asset.rightsStatus ===
        "UNKNOWN_RIGHTS",
    ).length;

  if (unknownRights > 0) {
    issues.push({
      code:
        "visual_rights_unknown",
      severity: "warning",
      message:
        `${unknownRights} visual(s) use imagery with unconfirmed rights.`,
    });
  }

  const errors =
    issues.filter(
      (issue) =>
        issue.severity === "error",
    ).length;

  const warnings =
    issues.filter(
      (issue) =>
        issue.severity === "warning",
    ).length;

  return {
    passed: errors === 0,
    errors,
    warnings,
    requiredVisualCount:
      requiredKinds.length,
    renderedVisualCount:
      requiredKinds.filter(
        (kind) =>
          renderedKinds.has(kind),
      ).length,
    issues,
  };
}

export function renderProductPagePreview(
  input: ProductPagePreviewInput,
): ProductPagePreview {
  if (!input.previewId.trim()) {
    throw new Error(
      "previewId is required",
    );
  }

  if (!input.productTitle.trim()) {
    throw new Error(
      "productTitle is required",
    );
  }

  if (!input.ctaLabel.trim()) {
    throw new Error(
      "ctaLabel is required",
    );
  }

  const hero =
    requiredVisual(
      input,
      "hero",
    );

  const benefits =
    requiredVisual(
      input,
      "benefit",
    );

  const features =
    requiredVisual(
      input,
      "feature",
    );

  const comparison =
    requiredVisual(
      input,
      "comparison",
    );

  const offer =
    requiredVisual(
      input,
      "offer",
    );

  const demoBadge =
    input.demoMode
      ? `<span class="demo-badge">DEMO PREVIEW · NO LIVE CHECKOUT</span>`
      : "";

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(input.productTitle)} · Product Preview</title>
<meta
  name="description"
  content="${escapeHtml(input.subtitle)}"
>
<style>
:root{
  --bg:#f7f7f4;
  --surface:#ffffff;
  --text:#111318;
  --muted:#626a78;
  --line:#e3e6eb;
  --dark:#0b1019;
  --accent:#1358e8;
  --accent2:#0b3da5;
  --max:1240px;
}

*{
  box-sizing:border-box;
}

html{
  scroll-behavior:smooth;
}

body{
  margin:0;
  background:var(--bg);
  color:var(--text);
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

img,
svg{
  display:block;
  max-width:100%;
}

a{
  color:inherit;
}

.preview-shell{
  min-height:100vh;
}

.preview-bar{
  background:var(--dark);
  color:#fff;
  text-align:center;
  padding:10px 20px;
  font-size:13px;
  letter-spacing:.04em;
}

.site-header{
  background:rgba(255,255,255,.95);
  border-bottom:1px solid var(--line);
  position:sticky;
  top:0;
  z-index:10;
  backdrop-filter:blur(12px);
}

.header-inner{
  max-width:var(--max);
  margin:auto;
  height:72px;
  padding:0 24px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:20px;
}

.brand{
  font-size:19px;
  font-weight:850;
  letter-spacing:-.03em;
}

.header-note{
  font-size:13px;
  color:var(--muted);
}

.main{
  max-width:var(--max);
  margin:auto;
  padding:52px 24px 90px;
}

.hero{
  display:grid;
  grid-template-columns:
    minmax(0,1fr)
    minmax(460px,.95fr);
  gap:54px;
  align-items:center;
  margin-bottom:82px;
}

.eyebrow{
  margin:0 0 14px;
  color:var(--accent);
  font-size:13px;
  font-weight:850;
  letter-spacing:.12em;
  text-transform:uppercase;
}

.product-title{
  margin:0;
  max-width:720px;
  font-size:clamp(44px,6vw,78px);
  line-height:.98;
  letter-spacing:-.055em;
}

.product-subtitle{
  max-width:650px;
  margin:26px 0 0;
  color:var(--muted);
  font-size:20px;
  line-height:1.65;
}

.price{
  margin:30px 0 0;
  font-size:28px;
  font-weight:850;
}

.cta-row{
  display:flex;
  flex-wrap:wrap;
  gap:14px;
  margin-top:32px;
}

.preview-cta{
  appearance:none;
  border:0;
  border-radius:14px;
  background:var(--accent);
  color:#fff;
  padding:17px 25px;
  font:inherit;
  font-weight:800;
  cursor:default;
  box-shadow:
    0 12px 30px
    rgba(19,88,232,.22);
}

.preview-cta:hover{
  background:var(--accent2);
}

.demo-badge{
  display:inline-flex;
  align-items:center;
  border:1px solid #d5d8df;
  border-radius:999px;
  padding:10px 14px;
  color:#555e6e;
  background:#fff;
  font-size:12px;
  font-weight:750;
}

.safety-note{
  margin-top:20px;
  color:#747c89;
  font-size:13px;
}

.visual-card{
  margin:0;
}

.visual-frame{
  border-radius:26px;
  overflow:hidden;
  background:#0b1019;
  box-shadow:
    0 24px 70px
    rgba(16,24,40,.12);
}

.visual-frame svg{
  width:100%;
  height:auto;
}

.visual-card figcaption{
  margin-top:12px;
  color:var(--muted);
  font-size:12px;
}

.trust-strip{
  display:grid;
  grid-template-columns:
    repeat(3,1fr);
  gap:1px;
  border:1px solid var(--line);
  border-radius:20px;
  overflow:hidden;
  background:var(--line);
  margin-bottom:94px;
}

.trust-item{
  background:#fff;
  padding:24px;
}

.trust-item strong{
  display:block;
  margin-bottom:6px;
  font-size:15px;
}

.trust-item span{
  color:var(--muted);
  font-size:13px;
  line-height:1.5;
}

.section{
  margin:0 0 100px;
}

.section-heading{
  max-width:760px;
  margin-bottom:38px;
}

.section-heading h2{
  margin:0;
  font-size:clamp(34px,5vw,58px);
  line-height:1.02;
  letter-spacing:-.045em;
}

.section-heading p{
  margin:18px 0 0;
  color:var(--muted);
  font-size:18px;
  line-height:1.65;
}

.split-section{
  display:grid;
  grid-template-columns:
    minmax(0,1fr)
    minmax(0,1fr);
  gap:28px;
}

.offer-section{
  display:grid;
  grid-template-columns:
    minmax(0,1.15fr)
    minmax(300px,.65fr);
  gap:36px;
  align-items:center;
}

.offer-copy{
  background:#fff;
  border:1px solid var(--line);
  border-radius:26px;
  padding:34px;
}

.offer-copy h2{
  margin:0;
  font-size:38px;
  letter-spacing:-.035em;
}

.offer-copy p{
  color:var(--muted);
  line-height:1.7;
}

.faq{
  background:#fff;
  border:1px solid var(--line);
  border-radius:26px;
  padding:10px 28px;
}

.faq-item{
  border-bottom:1px solid var(--line);
  padding:20px 0;
}

.faq-item:last-child{
  border-bottom:0;
}

.faq-item summary{
  cursor:pointer;
  font-weight:800;
  font-size:17px;
}

.faq-item p{
  color:var(--muted);
  line-height:1.7;
  margin-bottom:0;
}

.shipping{
  background:#111722;
  color:#fff;
  border-radius:28px;
  padding:38px;
}

.shipping h2{
  margin-top:0;
}

.shipping p{
  color:#c8cfda;
  line-height:1.7;
  margin-bottom:0;
}

.footer{
  border-top:1px solid var(--line);
  padding:34px 24px 48px;
  text-align:center;
  color:var(--muted);
  font-size:13px;
}

@media(max-width:900px){
  .main{
    padding-top:34px;
  }

  .hero,
  .split-section,
  .offer-section{
    grid-template-columns:1fr;
  }

  .hero{
    gap:36px;
  }

  .trust-strip{
    grid-template-columns:1fr;
  }

  .product-title{
    font-size:clamp(42px,12vw,68px);
  }
}

@media(max-width:560px){
  .header-inner{
    height:62px;
    padding:0 16px;
  }

  .header-note{
    display:none;
  }

  .main{
    padding:
      28px 16px
      64px;
  }

  .product-subtitle{
    font-size:17px;
  }

  .section{
    margin-bottom:70px;
  }

  .visual-frame{
    border-radius:18px;
  }

  .offer-copy,
  .faq,
  .shipping{
    border-radius:20px;
    padding:24px;
  }
}
</style>
</head>

<body
  data-preview-id="${escapeHtml(input.previewId)}"
  data-external-writes="false"
  data-live-publishing="false"
>
<div class="preview-shell">

  <div class="preview-bar">
    Local product-page preview · Human approval required before publication
  </div>

  <header class="site-header">
    <div class="header-inner">
      <div class="brand">
        Product Preview
      </div>
      <div class="header-note">
        Evidence-grounded · Draft only
      </div>
    </div>
  </header>

  <main class="main">

    <section class="hero">
      <div>
        <p class="eyebrow">
          Product overview
        </p>

        <h1 class="product-title">
          ${escapeHtml(input.productTitle)}
        </h1>

        <p class="product-subtitle">
          ${escapeHtml(input.subtitle)}
        </p>

        <p class="price">
          ${escapeHtml(input.priceLine)}
        </p>

        <div class="cta-row">
          <button
            class="preview-cta"
            type="button"
            data-preview-cta="true"
            aria-disabled="true"
          >
            ${escapeHtml(input.ctaLabel)}
          </button>

          ${demoBadge}
        </div>

        <p class="safety-note">
          This preview cannot purchase, publish, or write to an external store.
        </p>
      </div>

      ${visualFigure(
        hero,
        "Product hero visual",
      )}
    </section>

    <section class="trust-strip">
      <div class="trust-item">
        <strong>
          Verified evidence
        </strong>
        <span>
          Product facts remain linked to captured source evidence.
        </span>
      </div>

      <div class="trust-item">
        <strong>
          Comparison safeguards
        </strong>
        <span>
          Competitor claims require comparable verified values.
        </span>
      </div>

      <div class="trust-item">
        <strong>
          Human approval
        </strong>
        <span>
          No external publishing occurs from this preview.
        </span>
      </div>
    </section>

    <section class="section">
      <div class="section-heading">
        <p class="eyebrow">
          Benefits
        </p>
        <h2>
          Built around the reasons a shopper would consider the product
        </h2>
      </div>

      ${visualFigure(
        benefits,
        "Evidence-grounded benefits visual",
      )}
    </section>

    <section class="section">
      <div class="section-heading">
        <p class="eyebrow">
          Product details
        </p>
        <h2>
          Important product information, without invented specifications
        </h2>
      </div>

      ${visualFigure(
        features,
        "Verified features visual",
      )}
    </section>

    <section class="section">
      <div class="section-heading">
        <p class="eyebrow">
          Comparison
        </p>
        <h2>
          Compare the facts that can actually be supported
        </h2>
        <p>
          Missing or conflicting evidence stays unresolved rather than becoming a marketing claim.
        </p>
      </div>

      ${visualFigure(
        comparison,
        "Evidence-backed comparison visual",
      )}
    </section>

    <section class="section offer-section">
      ${visualFigure(
        offer,
        "Current offer visual",
      )}

      <div class="offer-copy">
        <p class="eyebrow">
          Review the offer
        </p>

        <h2>
          ${escapeHtml(input.priceLine)}
        </h2>

        <p>
          Pricing, availability and merchant terms should be re-verified before publication.
        </p>

        <button
          class="preview-cta"
          type="button"
          data-preview-cta="true"
          aria-disabled="true"
        >
          ${escapeHtml(input.ctaLabel)}
        </button>
      </div>
    </section>

    <section class="section">
      <div class="section-heading">
        <p class="eyebrow">
          Questions
        </p>

        <h2>
          Helpful information before purchasing
        </h2>
      </div>

      <div class="faq">
        ${faqMarkup(input)}
      </div>
    </section>

    <section class="shipping">
      <h2>
        Shipping and returns
      </h2>

      <p>
        ${escapeHtml(input.shippingReturns)}
      </p>
    </section>

  </main>

  <footer class="footer">
    Local preview only · externalWrites=false · livePublishing=false
  </footer>

</div>
</body>
</html>`;

  const qa =
    auditProductPagePreview(
      input,
      html,
    );

  return {
    previewId:
      input.previewId,
    html,
    qa,
    externalWrites: false,
    livePublishing: false,
  };
}
