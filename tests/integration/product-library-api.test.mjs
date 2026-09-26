import assert from "node:assert/strict";

import {
  mkdtemp,
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
  DEMO_PRODUCT_ID,
} from "../../scripts/product-intelligence-demo-seed.mjs";

import {
  createProductLibraryServer,
} from "../../scripts/product-library-server.mjs";

async function fixture(context) {
  const directory = await mkdtemp(
    join(
      tmpdir(),
      "ecom-library-api-",
    ),
  );

  const databasePath =
    join(directory, "library.sqlite");

  const {
    server,
  } = createProductLibraryServer({
    databasePath,
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();

  if (
    !address ||
    typeof address === "string"
  ) {
    throw new Error(
      "Product Library test server did not expose a TCP address.",
    );
  }

  const baseUrl =
    `http://127.0.0.1:${address.port}`;

  context.after(async () => {
    await new Promise((resolve) =>
      server.close(resolve),
    );

    await rm(directory, {
      recursive: true,
      force: true,
    });
  });

  return {
    baseUrl,
  };
}

test("Product Library health exposes local-only safety state", async (context) => {
  const {
    baseUrl,
  } = await fixture(context);

  const response =
    await fetch(`${baseUrl}/health`);

  assert.equal(response.status, 200);

  const body =
    await response.json();

  assert.equal(body.externalWrites, false);
  assert.equal(body.livePublishing, false);
});

test("Product Library API lists persistent products", async (context) => {
  const {
    baseUrl,
  } = await fixture(context);

  const response =
    await fetch(`${baseUrl}/api/products`);

  assert.equal(response.status, 200);

  const body =
    await response.json();

  assert.ok(body.products.length >= 2);

  assert.ok(
    body.products.some(
      (product) => product.id === DEMO_PRODUCT_ID,
    ),
  );
});

test("Product Library API returns complete product intelligence snapshot", async (context) => {
  const {
    baseUrl,
  } = await fixture(context);

  const response =
    await fetch(
      `${baseUrl}/api/products/${DEMO_PRODUCT_ID}`,
    );

  assert.equal(response.status, 200);

  const body =
    await response.json();

  assert.ok(body.evidence.length >= 5);
  assert.equal(body.competitors.length, 1);
  assert.equal(body.visuals.length, 5);
});

test("Product Library renders library and product detail pages", async (context) => {
  const {
    baseUrl,
  } = await fixture(context);

  const library =
    await fetch(`${baseUrl}/products`);

  assert.equal(library.status, 200);

  const libraryHtml =
    await library.text();

  assert.match(
    libraryHtml,
    /Product Intelligence Library/,
  );

  const detail =
    await fetch(
      `${baseUrl}/products/${DEMO_PRODUCT_ID}`,
    );

  assert.equal(detail.status, 200);

  const detailHtml =
    await detail.text();

  assert.match(
    detailHtml,
    /Portable Espresso Maker/,
  );

  assert.match(
    detailHtml,
    /Revision history/,
  );
});

test("Product Library returns 404 for unknown products", async (context) => {
  const {
    baseUrl,
  } = await fixture(context);

  const api =
    await fetch(
      `${baseUrl}/api/products/missing-product`,
    );

  assert.equal(api.status, 404);

  const page =
    await fetch(
      `${baseUrl}/products/missing-product`,
    );

  assert.equal(page.status, 404);
});
