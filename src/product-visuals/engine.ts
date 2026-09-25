import {
  escapeXml,
  svgMutedTextLines,
  svgTextLines,
  wrapVisualText,
} from "./svg.js";

import type {
  GroundedVisualStatement,
  ProductVisualAsset,
  ProductVisualInput,
  ProductVisualPack,
  ProductVisualQaIssue,
  ProductVisualQaReport,
} from "./types.js";

const width = 1200;
const height = 1200;

function unique(
  values: readonly string[],
): string[] {
  return [
    ...new Set(
      values.filter(Boolean),
    ),
  ];
}

function imageElement(
  url: string | null,
): string {
  if (!url) {
    return `
      <rect x="665" y="175" width="445" height="650" rx="36" fill="#111827" stroke="#334155" stroke-width="3"/>
      <text x="887" y="475" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" fill="#94a3b8">PRODUCT IMAGE</text>
      <text x="887" y="515" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#64748b">SOURCE REQUIRED</text>
    `;
  }

  return `
    <rect x="665" y="175" width="445" height="650" rx="36" fill="#ffffff"/>
    <image x="685" y="195" width="405" height="610"
      preserveAspectRatio="xMidYMid meet"
      href="${escapeXml(url)}"/>
  `;
}

function baseSvg(
  inner: string,
): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#090d16"/>
  <circle cx="1060" cy="130" r="220" fill="#12223a"/>
  <circle cx="90" cy="1080" r="260" fill="#121c2f"/>
  ${inner}
</svg>`;
}

function footer(): string {
  return `
    <text x="70" y="1130" font-family="Arial, Helvetica, sans-serif" font-size="17" fill="#64748b">Evidence-grounded visual Â· Human review required</text>
  `;
}

function statementEvidence(
  statements: readonly GroundedVisualStatement[],
): string[] {
  return unique(
    statements.flatMap(
      (item) =>
        item.evidenceIds,
    ),
  );
}

function renderHero(
  input: ProductVisualInput,
): ProductVisualAsset {
  const title =
    wrapVisualText(
      input.productTitle,
      24,
    ).slice(0, 4);

  const subtitle =
    wrapVisualText(
      input.subtitle,
      42,
    ).slice(0, 5);

  const svg =
    baseSvg(`
      <rect x="70" y="90" width="230" height="46" rx="23" fill="#1d4ed8"/>
      <text x="185" y="121" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" fill="#ffffff">PRODUCT OVERVIEW</text>

      ${svgTextLines(title, 70, 250, 72, 62, 800)}
      ${svgMutedTextLines(subtitle, 70, 250 + title.length * 72 + 55, 42, 28)}

      ${imageElement(input.sourceImage?.url ?? null)}

      ${footer()}
    `);

  return {
    assetId:
      `${input.jobId}-visual-hero`,
    kind: "hero",
    filename:
      "01-hero.svg",
    width,
    height,
    status:
      input.sourceImage
        ? "READY"
        : "NEEDS_SOURCE",
    svg,
    evidenceIds:
      unique([
        ...input.titleEvidenceIds,
        ...(
          input.sourceImage
            ? [
                input.sourceImage
                  .evidenceId,
              ]
            : []
        ),
      ]),
    sourceImageUrl:
      input.sourceImage?.url ??
      null,
    rightsStatus:
      input.sourceImage?.rightsStatus ??
      null,
  };
}

function renderStatementCard(
  input: ProductVisualInput,
  kind: "benefit" | "feature",
  statements: readonly GroundedVisualStatement[],
): ProductVisualAsset {
  const label =
    kind === "benefit"
      ? "WHY IT MATTERS"
      : "PRODUCT DETAILS";

  const heading =
    kind === "benefit"
      ? "Benefits grounded in product evidence"
      : "Verified product features";

  const visible =
    statements.slice(0, 4);

  const cards =
    visible
      .map((item, index) => {
        const y =
          315 + index * 150;

        const lines =
          wrapVisualText(
            item.text,
            42,
          ).slice(0, 3);

        return `
          <rect x="70" y="${y - 65}" width="520" height="120" rx="24" fill="#111827" stroke="#243247"/>
          <circle cx="112" cy="${y - 5}" r="18" fill="#2563eb"/>
          <text x="112" y="${y + 2}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="800" fill="#ffffff">${index + 1}</text>
          ${svgTextLines(lines, 150, y - 20, 31, 22, 650)}
        `;
      })
      .join("");

  const svg =
    baseSvg(`
      <text x="70" y="105" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="800" fill="#60a5fa">${label}</text>
      ${svgTextLines(wrapVisualText(heading, 30), 70, 185, 54, 44, 800)}
      ${cards}
      ${imageElement(input.sourceImage?.url ?? null)}
      ${footer()}
    `);

  return {
    assetId:
      `${input.jobId}-visual-${kind}`,
    kind,
    filename:
      kind === "benefit"
        ? "02-benefits.svg"
        : "03-features.svg",
    width,
    height,
    status:
      input.sourceImage
        ? "READY"
        : "NEEDS_SOURCE",
    svg,
    evidenceIds:
      unique([
        ...statementEvidence(
          visible,
        ),
        ...(
          input.sourceImage
            ? [
                input.sourceImage
                  .evidenceId,
              ]
            : []
        ),
      ]),
    sourceImageUrl:
      input.sourceImage?.url ??
      null,
    rightsStatus:
      input.sourceImage?.rightsStatus ??
      null,
  };
}

function renderComparison(
  input: ProductVisualInput,
): ProductVisualAsset {
  const claims =
    input.comparisonClaims.slice(
      0,
      4,
    );

  const rows =
    claims
      .map((claim, index) => {
        const y =
          280 + index * 170;

        const lines =
          wrapVisualText(
            claim.text,
            58,
          ).slice(0, 3);

        return `
          <rect x="70" y="${y - 70}" width="1060" height="135" rx="26" fill="#111827" stroke="#243247"/>
          <rect x="90" y="${y - 48}" width="130" height="34" rx="17" fill="#1e40af"/>
          <text x="155" y="${y - 25}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="800" fill="#ffffff">${escapeXml(claim.field.toUpperCase())}</text>
          ${svgTextLines(lines, 90, y + 18, 31, 22, 650)}
        `;
      })
      .join("");

  const empty =
    claims.length === 0
      ? `
        <rect x="70" y="270" width="1060" height="200" rx="28" fill="#111827" stroke="#334155"/>
        <text x="600" y="355" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700" fill="#cbd5e1">No safe numeric comparison claims available</text>
        <text x="600" y="410" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="20" fill="#64748b">More verified comparable evidence is required.</text>
      `
      : "";

  const svg =
    baseSvg(`
      <text x="70" y="105" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="800" fill="#60a5fa">VERIFIED COMPARISON</text>
      <text x="70" y="175" font-family="Arial, Helvetica, sans-serif" font-size="46" font-weight="800" fill="#f8fafc">Compare the listed facts</text>
      ${rows}
      ${empty}
      ${footer()}
    `);

  return {
    assetId:
      `${input.jobId}-visual-comparison`,
    kind: "comparison",
    filename:
      "04-comparison.svg",
    width,
    height,
    status: "READY",
    svg,
    evidenceIds:
      unique(
        claims.flatMap(
          (claim) =>
            claim.evidenceIds,
        ),
      ),
    sourceImageUrl: null,
    rightsStatus: null,
  };
}

function renderOffer(
  input: ProductVisualInput,
): ProductVisualAsset {
  const offer =
    wrapVisualText(
      input.offer.text,
      34,
    ).slice(0, 5);

  const svg =
    baseSvg(`
      <text x="70" y="105" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="800" fill="#60a5fa">CURRENT LISTED OFFER</text>

      ${svgTextLines(
        wrapVisualText(
          input.productTitle,
          28,
        ).slice(0, 3),
        70,
        220,
        60,
        48,
        800,
      )}

      <rect x="70" y="470" width="520" height="260" rx="34" fill="#1e3a8a"/>
      ${svgTextLines(offer, 110, 555, 53, 38, 800)}

      ${imageElement(input.sourceImage?.url ?? null)}

      <text x="70" y="860" font-family="Arial, Helvetica, sans-serif" font-size="20" fill="#94a3b8">Pricing and offer details must be re-verified before publication.</text>

      ${footer()}
    `);

  return {
    assetId:
      `${input.jobId}-visual-offer`,
    kind: "offer",
    filename:
      "05-offer.svg",
    width,
    height,
    status:
      input.sourceImage
        ? "READY"
        : "NEEDS_SOURCE",
    svg,
    evidenceIds:
      unique([
        ...input.offer
          .evidenceIds,
        ...(
          input.sourceImage
            ? [
                input.sourceImage
                  .evidenceId,
              ]
            : []
        ),
      ]),
    sourceImageUrl:
      input.sourceImage?.url ??
      null,
    rightsStatus:
      input.sourceImage?.rightsStatus ??
      null,
  };
}

function qaIssue(
  code: string,
  severity: "error" | "warning",
  message: string,
  assetId: string | null,
): ProductVisualQaIssue {
  return {
    code,
    severity,
    message,
    assetId,
  };
}

export function auditProductVisualAssets(
  assets: readonly ProductVisualAsset[],
  knownEvidenceIds: readonly string[],
): ProductVisualQaReport {
  const issues:
    ProductVisualQaIssue[] = [];

  const known =
    new Set(
      knownEvidenceIds,
    );

  const required = [
    "hero",
    "benefit",
    "feature",
    "comparison",
    "offer",
  ] as const;

  for (const kind of required) {
    if (
      !assets.some(
        (asset) =>
          asset.kind === kind,
      )
    ) {
      issues.push(
        qaIssue(
          "missing_visual",
          "error",
          `Required visual is missing: ${kind}`,
          null,
        ),
      );
    }
  }

  const prohibited =
    /\b(best|winner|superior|beats?|outperforms?)\b/i;

  for (const asset of assets) {
    if (
      !asset.svg.includes(
        "<svg",
      ) ||
      !asset.svg.includes(
        "</svg>",
      )
    ) {
      issues.push(
        qaIssue(
          "invalid_svg",
          "error",
          "Visual does not contain a complete SVG document.",
          asset.assetId,
        ),
      );
    }

    if (
      /<script\b/i.test(
        asset.svg,
      ) ||
      /javascript:/i.test(
        asset.svg,
      )
    ) {
      issues.push(
        qaIssue(
          "unsafe_svg_content",
          "error",
          "Visual contains executable SVG content.",
          asset.assetId,
        ),
      );
    }

    if (
      prohibited.test(
        asset.svg,
      )
    ) {
      issues.push(
        qaIssue(
          "unsupported_superiority_language",
          "error",
          "Visual contains unsupported winner/superiority language.",
          asset.assetId,
        ),
      );
    }

    for (
      const evidenceId of
      asset.evidenceIds
    ) {
      if (
        !known.has(
          evidenceId,
        )
      ) {
        issues.push(
          qaIssue(
            "unknown_visual_evidence",
            "error",
            `Visual references unknown evidence ID ${evidenceId}.`,
            asset.assetId,
          ),
        );
      }
    }

    if (
      asset.status ===
      "NEEDS_SOURCE"
    ) {
      issues.push(
        qaIssue(
          "visual_needs_source",
          "warning",
          "Visual is structurally generated but still needs a real product image source.",
          asset.assetId,
        ),
      );
    }

    if (
      asset.sourceImageUrl &&
      asset.rightsStatus ===
        "UNKNOWN_RIGHTS"
    ) {
      issues.push(
        qaIssue(
          "image_rights_unknown",
          "warning",
          "Source image usage rights have not been confirmed.",
          asset.assetId,
        ),
      );
    }
  }

  const errors =
    issues.filter(
      (issue) =>
        issue.severity ===
        "error",
    ).length;

  const warnings =
    issues.filter(
      (issue) =>
        issue.severity ===
        "warning",
    ).length;

  return {
    passed: errors === 0,
    errors,
    warnings,
    readyAssetCount:
      assets.filter(
        (asset) =>
          asset.status ===
          "READY",
      ).length,
    needsSourceCount:
      assets.filter(
        (asset) =>
          asset.status ===
          "NEEDS_SOURCE",
      ).length,
    issues,
  };
}

export function buildProductVisualPack(
  input: ProductVisualInput,
  generatedAt =
    new Date().toISOString(),
): ProductVisualPack {
  if (!input.jobId.trim()) {
    throw new Error(
      "visual jobId is required",
    );
  }

  if (
    !input.productTitle.trim()
  ) {
    throw new Error(
      "visual productTitle is required",
    );
  }

  if (
    !Number.isFinite(
      Date.parse(
        generatedAt,
      ),
    )
  ) {
    throw new Error(
      "visual generatedAt must be ISO-like",
    );
  }

  const assets = [
    renderHero(input),
    renderStatementCard(
      input,
      "benefit",
      input.benefits,
    ),
    renderStatementCard(
      input,
      "feature",
      input.features,
    ),
    renderComparison(input),
    renderOffer(input),
  ];

  const qa =
    auditProductVisualAssets(
      assets,
      input.knownEvidenceIds,
    );

  return {
    jobId:
      input.jobId,
    generatedAt,
    assets,
    qa,
  };
}
