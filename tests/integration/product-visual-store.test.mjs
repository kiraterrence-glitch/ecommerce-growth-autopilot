import assert from "node:assert/strict";
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
import test from "node:test";

import {
  buildProductVisualPack,
} from "../../dist/index.js";

import {
  storeProductVisualPack,
} from "../../scripts/product-visual-store.mjs";

test("visual store writes a complete local SVG pack", async (context) => {
  const temp =
    await mkdtemp(
      join(
        tmpdir(),
        "ecom-visuals-",
      ),
    );

  context.after(
    async () =>
      await rm(
        temp,
        {
          recursive: true,
          force: true,
        },
      ),
  );

  const evidence = [
    "title",
    "image",
    "benefit",
    "feature",
    "price",
    "primary-capacity",
    "competitor-capacity",
  ];

  const pack =
    buildProductVisualPack(
      {
        jobId:
          "visual-storage-test",
        productTitle:
          "Portable Espresso Maker",
        subtitle:
          "Compact manual espresso maker.",
        titleEvidenceIds: [
          "title",
        ],
        knownEvidenceIds:
          evidence,
        sourceImage: {
          url:
            "https://cdn.example.invalid/product.jpg",
          evidenceId:
            "image",
          rightsStatus:
            "APPROVED_FOR_DEMO",
        },
        benefits: [
          {
            text:
              "Portable for travel",
            evidenceIds: [
              "benefit",
            ],
          },
        ],
        features: [
          {
            text:
              "Listed capacity: 500 ml",
            evidenceIds: [
              "feature",
            ],
          },
        ],
        offer: {
          text:
            "Listed price: USD 39.90",
          evidenceIds: [
            "price",
          ],
        },
        comparisonClaims: [
          {
            claimId:
              "claim-1",
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

  const stored =
    await storeProductVisualPack(
      pack,
      temp,
    );

  assert.equal(
    stored.assets.length,
    5,
  );

  for (
    const asset of
    stored.assets
  ) {
    const contents =
      await readFile(
        asset.path,
        "utf8",
      );

    assert.match(
      contents,
      /^<svg/,
    );
  }

  const manifest =
    JSON.parse(
      await readFile(
        join(
          stored.directory,
          "visual-pack.json",
        ),
        "utf8",
      ),
    );

  assert.equal(
    manifest.assets.length,
    5,
  );

  assert.equal(
    manifest.qa.passed,
    true,
  );
});
