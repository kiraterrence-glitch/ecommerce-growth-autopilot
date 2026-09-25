import {
  mkdtemp,
  readFile,
  rm,
} from "node:fs/promises";

import {
  tmpdir,
} from "node:os";

import {
  join,
} from "node:path";

import {
  buildProductVisualPack,
} from "../dist/index.js";

import {
  storeProductVisualPack,
} from "./product-visual-store.mjs";

function pass(
  name,
  detail,
) {
  console.log(
    `[PASS] ${name} -> ${detail}`,
  );
}

function fail(
  name,
  detail,
) {
  console.error(
    `[FAIL] ${name} -> ${detail}`,
  );

  process.exitCode = 1;
}

console.log("");
console.log(
  "PHASE 4 VISUAL PRODUCTION AUDIT",
);

console.log(
  "-------------------------------",
);

const temp =
  await mkdtemp(
    join(
      tmpdir(),
      "ecom-phase4-",
    ),
  );

try {
  const knownEvidenceIds = [
    "title-e1",
    "image-e1",
    "benefit-e1",
    "benefit-e2",
    "feature-e1",
    "feature-e2",
    "price-e1",
    "primary-capacity",
    "competitor-capacity",
  ];

  const pack =
    buildProductVisualPack(
      {
        jobId:
          "phase-4-audit",
        productTitle:
          "Portable Espresso Maker",
        subtitle:
          "Compact manual espresso for travel and work.",
        titleEvidenceIds: [
          "title-e1",
        ],
        knownEvidenceIds,
        sourceImage: {
          url:
            "https://cdn.example.invalid/espresso.jpg",
          evidenceId:
            "image-e1",
          rightsStatus:
            "APPROVED_FOR_DEMO",
        },
        benefits: [
          {
            text:
              "Portable for travel and work",
            evidenceIds: [
              "benefit-e1",
            ],
          },
          {
            text:
              "No electricity required",
            evidenceIds: [
              "benefit-e2",
            ],
          },
        ],
        features: [
          {
            text:
              "Listed capacity: 500 ml",
            evidenceIds: [
              "feature-e1",
            ],
          },
          {
            text:
              "Stainless-steel construction",
            evidenceIds: [
              "feature-e2",
            ],
          },
        ],
        offer: {
          text:
            "Current listed price: USD 39.90",
          evidenceIds: [
            "price-e1",
          ],
        },
        comparisonClaims: [
          {
            claimId:
              "comparison-1",
            competitorId:
              "competitor-a",
            field:
              "Capacity",
            direction:
              "higher",
            text:
              "Our product has a higher listed Capacity than Competitor A (500 ml vs 350 ml).",
            evidenceIds: [
              "primary-capacity",
              "competitor-capacity",
            ],
          },
        ],
      },
      "2026-09-25T00:00:00Z",
    );

  if (!pack.qa.passed) {
    throw new Error(
      `visual QA returned ${pack.qa.errors} error(s)`,
    );
  }

  if (
    pack.assets.length !== 5
  ) {
    throw new Error(
      `expected 5 visuals, received ${pack.assets.length}`,
    );
  }

  pass(
    "Visual generation",
    "hero, benefits, features, comparison and offer generated",
  );

  if (
    pack.assets.some(
      (asset) =>
        !asset.evidenceIds.length,
    )
  ) {
    throw new Error(
      "one or more visuals have no evidence provenance",
    );
  }

  pass(
    "Visual provenance",
    "every visual retains supporting evidence IDs",
  );

  const comparison =
    pack.assets.find(
      (asset) =>
        asset.kind ===
        "comparison",
    );

  if (
    !comparison?.svg.includes(
      "500 ml vs 350 ml",
    )
  ) {
    throw new Error(
      "comparison visual is missing verified comparison copy",
    );
  }

  pass(
    "Comparison graphic",
    "verified numeric comparison rendered",
  );

  if (
    pack.assets.some(
      (asset) =>
        /\b(best|winner|superior|beats?|outperforms?)\b/i.test(
          asset.svg,
        ),
    )
  ) {
    throw new Error(
      "unsupported superiority language entered a visual",
    );
  }

  pass(
    "Claim safety",
    "no unsupported winner/superiority language",
  );

  const stored =
    await storeProductVisualPack(
      pack,
      temp,
    );

  if (
    stored.assets.length !== 5
  ) {
    throw new Error(
      "local visual store did not persist all assets",
    );
  }

  for (
    const asset of
    stored.assets
  ) {
    const svg =
      await readFile(
        asset.path,
        "utf8",
      );

    if (
      !svg.startsWith(
        "<svg",
      )
    ) {
      throw new Error(
        `${asset.filename} is not a valid SVG document`,
      );
    }
  }

  pass(
    "Local visual files",
    `${stored.assets.length} SVG assets written successfully`,
  );

  pass(
    "Rights boundary",
    "source image explicitly marked APPROVED_FOR_DEMO",
  );

  console.log("");
  console.log(
    "PHASE 4 AUDIT PASSED",
  );
} catch (error) {
  fail(
    "Phase 4 visuals",
    error instanceof Error
      ? error.message
      : String(error),
  );

  console.error("");
  console.error(
    "PHASE 4 AUDIT FAILED",
  );
} finally {
  await rm(
    temp,
    {
      recursive: true,
      force: true,
    },
  );
}
