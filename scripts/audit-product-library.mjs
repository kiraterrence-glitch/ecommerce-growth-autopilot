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

import {
  DEMO_PRODUCT_ID,
} from "./product-intelligence-demo-seed.mjs";

import {
  createProductLibraryServer,
} from "./product-library-server.mjs";

const directory =
  await mkdtemp(
    join(
      tmpdir(),
      "ecom-library-audit-",
    ),
  );

const databasePath =
  join(
    directory,
    "library.sqlite",
  );

const {
  server,
} = createProductLibraryServer({
  databasePath,
});

try {
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
      "Product Library audit server did not expose a TCP address.",
    );
  }

  const baseUrl =
    `http://127.0.0.1:${address.port}`;

  const health =
    await fetch(`${baseUrl}/health`);

  if (!health.ok) {
    throw new Error(
      "Product Library health failed.",
    );
  }

  const healthJson =
    await health.json();

  if (
    healthJson.externalWrites !== false ||
    healthJson.livePublishing !== false
  ) {
    throw new Error(
      "Product Library safety state failed.",
    );
  }

  console.log(
    "[PASS] local-only safety state",
  );

  const library =
    await fetch(`${baseUrl}/products`);

  const libraryHtml =
    await library.text();

  if (
    !libraryHtml.includes(
      "Portable Espresso Maker",
    )
  ) {
    throw new Error(
      "Product Library did not render seeded product.",
    );
  }

  console.log(
    "[PASS] Product Library rendered",
  );

  const detail =
    await fetch(
      `${baseUrl}/products/${DEMO_PRODUCT_ID}`,
    );

  const detailHtml =
    await detail.text();

  for (const section of [
    "Sources",
    "Evidence",
    "Revision history",
    "Competitors",
    "Comparison history",
    "Visual assets",
    "Product-page drafts",
    "QA history",
    "Approvals",
  ]) {
    if (!detailHtml.includes(section)) {
      throw new Error(
        `Missing product detail section: ${section}`,
      );
    }
  }

  console.log(
    "[PASS] complete product detail rendered",
  );

  const api =
    await fetch(
      `${baseUrl}/api/products/${DEMO_PRODUCT_ID}`,
    );

  const snapshot =
    await api.json();

  if (
    snapshot.evidence.length < 5 ||
    snapshot.visuals.length !== 5 ||
    snapshot.competitors.length !== 1
  ) {
    throw new Error(
      "Product intelligence API snapshot is incomplete.",
    );
  }

  console.log(
    "[PASS] persistent Product Intelligence API",
  );

  if (
    /<script\b/i.test(libraryHtml) ||
    /<script\b/i.test(detailHtml)
  ) {
    throw new Error(
      "Product Library contains executable client JavaScript.",
    );
  }

  console.log(
    "[PASS] static no-client-JavaScript UI",
  );

  console.log("");
  console.log(
    "PHASE 10 PRODUCT LIBRARY AUDIT PASSED",
  );
} finally {
  await new Promise((resolve) =>
    server.close(resolve),
  );

  await rm(directory, {
    recursive: true,
    force: true,
  });
}
