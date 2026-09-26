import {
  escapeXml,
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

type Canvas = Readonly<{
  width: number;
  height: number;
}>;

const canvasByKind = {
  hero: {
    width: 1200,
    height: 900,
  },

  benefit: {
    width: 1200,
    height: 760,
  },

  feature: {
    width: 1200,
    height: 760,
  },

  comparison: {
    width: 1200,
    height: 650,
  },

  offer: {
    width: 1200,
    height: 700,
  },
} as const;

function unique(
  values: readonly string[],
): string[] {
  return [
    ...new Set(
      values.filter(Boolean),
    ),
  ];
}

function baseSvg(
  canvas: Canvas,
  inner: string,
): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}">
  <rect width="${canvas.width}" height="${canvas.height}" fill="#090d16"/>
  <circle cx="${canvas.width - 120}" cy="90" r="220" fill="#12223a"/>
  <circle cx="80" cy="${canvas.height + 30}" r="230" fill="#121c2f"/>
  ${inner}
</svg>`;
}

function footer(
  canvas: Canvas,
): string {
  return `
    <text x="68" y="${canvas.height - 42}" font-family="Arial, Helvetica, sans-serif" font-size="16" fill="#9aa8bb">Evidence-grounded &#183; Human review required</text>
  `;
}

function pendingBadge(): string {
  return `
    <rect x="865" y="62" width="265" height="44" rx="22" fill="#172337" stroke="#33465f"/>
    <text x="997" y="90" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="700" fill="#aebed3">APPROVED IMAGE PENDING</text>
  `;
}

function heroImage(
  input: ProductVisualInput,
): string {
  if (!input.sourceImage) {
    return `
      <rect x="190" y="160" width="820" height="560" rx="42" fill="#111a29" stroke="#33465f" stroke-width="3"/>
      <circle cx="600" cy="395" r="70" fill="#17243a"/>
      <path d="M565 410 L600 375 L635 410" fill="none" stroke="#6c87ab" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="555" y="350" width="90" height="112" rx="18" fill="none" stroke="#6c87ab" stroke-width="5"/>
      <text x="600" y="530" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="800" fill="#d7e1ee">PRODUCT IMAGE</text>
      <text x="600" y="570" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="17" fill="#8395ad">SOURCE REQUIRED</text>
      <text x="600" y="620" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="16" fill="#667890">The workflow will not fabricate a product photograph.</text>
    `;
  }

  return `
    <rect x="145" y="120" width="910" height="640" rx="42" fill="#ffffff"/>
    <image
      x="180"
      y="155"
      width="840"
      height="570"
      preserveAspectRatio="xMidYMid meet"
      href="${escapeXml(input.sourceImage.url)}"
    />
  `;
}

function renderHero(
  input: ProductVisualInput,
): ProductVisualAsset {
  const canvas =
    canvasByKind.hero;

  const svg =
    baseSvg(
      canvas,
      `
        <rect x="68" y="54" width="235" height="44" rx="22" fill="#1d4ed8"/>
        <text x="185" y="83" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="800" fill="#ffffff">PRODUCT VISUAL</text>

        ${heroImage(input)}

        ${footer(canvas)}
      `,
    );

  return {
    assetId:
      `${input.jobId}-visual-hero`,

    kind:
      "hero",

    filename:
      "01-hero.svg",

    width:
      canvas.width,

    height:
      canvas.height,

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
                input.sourceImage.evidenceId,
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

function statementCards(
  statements: readonly GroundedVisualStatement[],
): string {
  const visible =
    statements.slice(0, 4);

  return visible
    .map(
      (item, index) => {
        const column =
          index % 2;

        const row =
          Math.floor(index / 2);

        const x =
          68 +
          column * 545;

        const y =
          275 +
          row * 180;

        const lines =
          wrapVisualText(
            item.text,
            34,
          ).slice(0, 3);

        return `
          <rect x="${x}" y="${y}" width="505" height="142" rx="24" fill="#111a29" stroke="#253650"/>

          <circle cx="${x + 46}" cy="${y + 48}" r="18" fill="#2563eb"/>
          <text x="${x + 46}" y="${y + 54}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="800" fill="#ffffff">${index + 1}</text>

          ${svgTextLines(
            lines,
            x + 82,
            y + 46,
            30,
            21,
            700,
          )}
        `;
      },
    )
    .join("");
}

function renderStatementCard(
  input: ProductVisualInput,
  kind: "benefit" | "feature",
  statements: readonly GroundedVisualStatement[],
): ProductVisualAsset {
  const canvas =
    kind === "benefit"
      ? canvasByKind.benefit
      : canvasByKind.feature;

  const label =
    kind === "benefit"
      ? "WHY IT MATTERS"
      : "VERIFIED PRODUCT DETAILS";

  const heading =
    kind === "benefit"
      ? "Evidence-backed benefits"
      : "Verified product features";

  const svg =
    baseSvg(
      canvas,
      `
        <text x="68" y="88" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="800" fill="#60a5fa">${label}</text>

        ${svgTextLines(
          wrapVisualText(
            heading,
            33,
          ).slice(0, 2),
          68,
          160,
          52,
          44,
          800,
        )}

        ${
          input.sourceImage
            ? ""
            : pendingBadge()
        }

        ${statementCards(statements)}

        ${footer(canvas)}
      `,
    );

  return {
    assetId:
      `${input.jobId}-visual-${kind}`,

    kind,

    filename:
      kind === "benefit"
        ? "02-benefits.svg"
        : "03-features.svg",

    width:
      canvas.width,

    height:
      canvas.height,

    status:
      "READY",

    svg,

    evidenceIds:
      statementEvidence(
        statements.slice(0, 4),
      ),

    sourceImageUrl:
      null,

    rightsStatus:
      null,
  };
}

function comparisonValues(
  text: string,
): Readonly<{
  left: string;
  right: string;
}> | null {
  const match =
    /\(([^()]+?)\s+vs\s+([^()]+?)\)\.?$/i.exec(
      text,
    );

  if (!match?.[1] || !match?.[2]) {
    return null;
  }

  return {
    left:
      match[1].trim(),

    right:
      match[2].trim(),
  };
}

function renderComparison(
  input: ProductVisualInput,
): ProductVisualAsset {
  const canvas =
    canvasByKind.comparison;

  const claims =
    input.comparisonClaims.slice(
      0,
      3,
    );

  const rows =
    claims
      .map(
        (claim, index) => {
          const y =
            310 +
            index * 105;

          const values =
            comparisonValues(
              claim.text,
            );

          if (!values) {
            return `
              <rect x="68" y="${y - 54}" width="1064" height="84" rx="20" fill="#111a29" stroke="#253650"/>
              <text x="94" y="${y - 19}" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="800" fill="#60a5fa">${escapeXml(claim.field.toUpperCase())}</text>
              <text x="94" y="${y + 10}" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="650" fill="#f8fafc">${escapeXml(claim.text)}</text>
            `;
          }

          return `
            <rect x="68" y="${y - 60}" width="1064" height="92" rx="20" fill="#111a29" stroke="#253650"/>

            <text x="94" y="${y - 22}" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="800" fill="#8aa7ce">${escapeXml(claim.field.toUpperCase())}</text>

            <text x="560" y="${y - 24}" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="800" fill="#ffffff">${escapeXml(values.left)}</text>

            <text x="603" y="${y - 23}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700" fill="#667890">vs</text>

            <text x="646" y="${y - 24}" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="800" fill="#cbd5e1">${escapeXml(values.right)}</text>

            <text x="560" y="${y + 8}" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="13" fill="#60a5fa">OUR PRODUCT</text>

            <text x="646" y="${y + 8}" font-family="Arial, Helvetica, sans-serif" font-size="13" fill="#8a9aae">COMPETITOR</text>

            <text x="1065" y="${y + 2}" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="13" fill="#72849c">${escapeXml(values.left)} vs ${escapeXml(values.right)}</text>
          `;
        },
      )
      .join("");

  const empty =
    claims.length === 0
      ? `
        <rect x="68" y="270" width="1064" height="160" rx="24" fill="#111a29" stroke="#33465f"/>
        <text x="600" y="335" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="700" fill="#cbd5e1">No safe numeric comparison is available</text>
        <text x="600" y="382" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="17" fill="#8395ad">More comparable verified evidence is required.</text>
      `
      : "";

  const svg =
    baseSvg(
      canvas,
      `
        <text x="68" y="78" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="800" fill="#60a5fa">VERIFIED COMPARISON</text>

        <text x="68" y="148" font-family="Arial, Helvetica, sans-serif" font-size="43" font-weight="800" fill="#f8fafc">Compare the listed facts</text>

        <text x="68" y="193" font-family="Arial, Helvetica, sans-serif" font-size="17" fill="#aebed3">Only comparable, normalized evidence is shown.</text>

        <text x="560" y="228" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="800" fill="#60a5fa">OUR PRODUCT</text>

        <text x="646" y="228" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="800" fill="#8a9aae">COMPETITOR</text>

        ${rows}
        ${empty}

        ${footer(canvas)}
      `,
    );

  return {
    assetId:
      `${input.jobId}-visual-comparison`,

    kind:
      "comparison",

    filename:
      "04-comparison.svg",

    width:
      canvas.width,

    height:
      canvas.height,

    status:
      "READY",

    svg,

    evidenceIds:
      unique(
        claims.flatMap(
          (claim) =>
            claim.evidenceIds,
        ),
      ),

    sourceImageUrl:
      null,

    rightsStatus:
      null,
  };
}

function renderOffer(
  input: ProductVisualInput,
): ProductVisualAsset {
  const canvas =
    canvasByKind.offer;

  const offer =
    wrapVisualText(
      input.offer.text,
      32,
    ).slice(0, 4);

  const svg =
    baseSvg(
      canvas,
      `
        <text x="68" y="84" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="800" fill="#60a5fa">CURRENT LISTED OFFER</text>

        ${svgTextLines(
          offer,
          68,
          180,
          58,
          43,
          800,
        )}

        <rect x="690" y="145" width="440" height="340" rx="30" fill="#111a29" stroke="#2d405b"/>

        <circle cx="740" cy="220" r="18" fill="#173666"/>
        <text x="740" y="226" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="800" fill="#ffffff">&#10003;</text>
        <text x="780" y="226" font-family="Arial, Helvetica, sans-serif" font-size="19" font-weight="700" fill="#eef3f8">Price captured from evidence</text>

        <circle cx="740" cy="300" r="18" fill="#173666"/>
        <text x="740" y="306" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="800" fill="#ffffff">&#10003;</text>
        <text x="780" y="306" font-family="Arial, Helvetica, sans-serif" font-size="19" font-weight="700" fill="#eef3f8">Availability requires verification</text>

        <circle cx="740" cy="380" r="18" fill="#173666"/>
        <text x="740" y="386" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="800" fill="#ffffff">&#10003;</text>
        <text x="780" y="386" font-family="Arial, Helvetica, sans-serif" font-size="19" font-weight="700" fill="#eef3f8">No live checkout or publishing</text>

        <text x="68" y="515" font-family="Arial, Helvetica, sans-serif" font-size="17" fill="#aebed3">Pricing and merchant terms must be re-verified before publication.</text>

        ${footer(canvas)}
      `,
    );

  return {
    assetId:
      `${input.jobId}-visual-offer`,

    kind:
      "offer",

    filename:
      "05-offer.svg",

    width:
      canvas.width,

    height:
      canvas.height,

    status:
      "READY",

    svg,

    evidenceIds:
      unique(
        input.offer.evidenceIds,
      ),

    sourceImageUrl:
      null,

    rightsStatus:
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
          "Hero visual still needs an approved real product image.",
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
    passed:
      errors === 0,

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
