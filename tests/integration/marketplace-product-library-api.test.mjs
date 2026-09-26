import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  DEMO_PRODUCT_ID,
} from "../../scripts/product-intelligence-demo-seed.mjs";

import {
  createProductLibraryServer,
} from "../../scripts/product-library-server.mjs";

async function fixture(context) {
  const directory =
    await mkdtemp(
      join(tmpdir(), "market-library-regression-"),
    );

  const { server } =
    createProductLibraryServer({
      databasePath:
        join(directory, "library.sqlite"),
    });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();

  assert.ok(
    address &&
    typeof address !== "string",
  );

  context.after(async () => {
    await new Promise(
      (resolve) => server.close(resolve),
    );

    await rm(directory, {
      recursive: true,
      force: true,
    });
  });

  return {
    base:
      `http://127.0.0.1:${address.port}`,
  };
}

function makeCsv(...rows) {
  return [
    "product_id,source_url,source_id,field,raw_value,normalized_value,unit,status,rights_status,captured_at",
    ...rows,
  ].join("\n");
}

function row({
  productId = DEMO_PRODUCT_ID,
  sourceId = "source-a",
  sourceUrl = "https://supplier.example.com/product",
  raw = "500 ml",
  normalized = "500",
  capturedAt = "2026-09-26T00:00:00Z",
} = {}) {
  return [
    productId,
    sourceUrl,
    sourceId,
    "capacity",
    raw,
    normalized,
    "ml",
    "VERIFIED",
    "UNKNOWN_RIGHTS",
    capturedAt,
  ].join(",");
}

async function importCsv(base, csv) {
  return fetch(
    `${base}/api/products/${DEMO_PRODUCT_ID}/marketplace/import`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ csv }),
    },
  );
}

test("marketplace summary begins empty", async (context) => {
  const { base } = await fixture(context);

  const response =
    await fetch(
      `${base}/api/products/${DEMO_PRODUCT_ID}/marketplace`,
    );

  assert.equal(response.status, 200);

  const body = await response.json();

  assert.equal(
    body.status,
    "NO_MARKETPLACE_EVIDENCE",
  );

  assert.equal(
    body.summary.evidenceCount,
    0,
  );
});

test("verified CSV evidence persists through local API", async (context) => {
  const { base } = await fixture(context);

  const response =
    await importCsv(
      base,
      makeCsv(row()),
    );

  assert.equal(response.status, 201);

  const body = await response.json();

  assert.equal(
    body.import.insertedEvidence,
    1,
  );

  assert.equal(
    body.marketplace.status,
    "READY",
  );
});

test("marketplace CSV import is idempotent", async (context) => {
  const { base } = await fixture(context);

  const csv =
    makeCsv(row());

  await importCsv(base, csv);

  const response =
    await importCsv(base, csv);

  assert.equal(response.status, 200);

  const body = await response.json();

  assert.equal(
    body.import.insertedEvidence,
    0,
  );

  assert.equal(
    body.import.skippedEvidence,
    1,
  );
});

test("evidence endpoint exposes persisted sources and facts", async (context) => {
  const { base } = await fixture(context);

  await importCsv(
    base,
    makeCsv(row()),
  );

  const response =
    await fetch(
      `${base}/api/products/${DEMO_PRODUCT_ID}/marketplace/evidence`,
    );

  assert.equal(response.status, 200);

  const body = await response.json();

  assert.equal(body.sources.length, 1);
  assert.equal(body.evidence.length, 1);
  assert.equal(
    body.evidence[0].status,
    "VERIFIED",
  );
});

test("conflicting verified evidence fails closed", async (context) => {
  const { base } = await fixture(context);

  await importCsv(
    base,
    makeCsv(
      row({
        sourceId: "source-a",
        raw: "500 ml",
        normalized: "500",
      }),
      row({
        sourceId: "source-b",
        sourceUrl:
          "https://supplier-b.example.com/product",
        raw: "350 ml",
        normalized: "350",
        capturedAt:
          "2026-09-26T00:01:00Z",
      }),
    ),
  );

  const body =
    await fetch(
      `${base}/api/products/${DEMO_PRODUCT_ID}/marketplace`,
    ).then(
      (response) => response.json(),
    );

  assert.equal(
    body.status,
    "NEEDS_REVIEW",
  );

  assert.equal(
    body.summary.conflictCount,
    1,
  );
});

test("product ID mismatch is rejected", async (context) => {
  const { base } = await fixture(context);

  const response =
    await importCsv(
      base,
      makeCsv(
        row({
          productId: "wrong-product",
        }),
      ),
    );

  assert.equal(response.status, 400);

  assert.equal(
    (await response.json()).error,
    "PRODUCT_ID_MISMATCH",
  );
});

test("invalid request formats fail closed", async (context) => {
  const { base } = await fixture(context);

  const malformed =
    await fetch(
      `${base}/api/products/${DEMO_PRODUCT_ID}/marketplace/import`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: "{\"csv\":",
      },
    );

  assert.equal(
    malformed.status,
    400,
  );

  assert.equal(
    (await malformed.json()).error,
    "INVALID_JSON",
  );

  const wrongType =
    await fetch(
      `${base}/api/products/${DEMO_PRODUCT_ID}/marketplace/import`,
      {
        method: "POST",
        headers: {
          "content-type": "text/plain",
        },
        body: "not-json",
      },
    );

  assert.equal(
    wrongType.status,
    415,
  );

  assert.equal(
    (await wrongType.json()).error,
    "UNSUPPORTED_MEDIA_TYPE",
  );
});

test("Product Library UI displays marketplace state and provenance", async (context) => {
  const { base } = await fixture(context);

  await importCsv(
    base,
    makeCsv(row()),
  );

  const listHtml =
    await fetch(
      `${base}/products`,
    ).then(
      (response) => response.text(),
    );

  assert.match(
    listHtml,
    /Marketplace intelligence/,
  );

  assert.match(
    listHtml,
    /READY/,
  );

  const detailHtml =
    await fetch(
      `${base}/products/${DEMO_PRODUCT_ID}`,
    ).then(
      (response) => response.text(),
    );

  assert.match(
    detailHtml,
    /Marketplace evidence/,
  );

  assert.match(
    detailHtml,
    /Marketplace sources/,
  );

  assert.match(
    detailHtml,
    /UNKNOWN_RIGHTS/,
  );

  assert.match(
    detailHtml,
    /capacity/,
  );

  assert.ok(
    !/<script\b/i.test(detailHtml),
  );
});

test("unknown marketplace product returns 404", async (context) => {
  const { base } = await fixture(context);

  const response =
    await fetch(
      `${base}/api/products/missing-product/marketplace`,
    );

  assert.equal(
    response.status,
    404,
  );
});
