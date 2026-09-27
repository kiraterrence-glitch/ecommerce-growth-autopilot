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
  createProductLibraryServer,
} from "../../scripts/product-library-server.mjs";

const fixture =
  JSON.parse(
    await readFile(
      new URL(
        "../../examples/content-intelligence/sample-content.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );

async function createHarness() {
  const directory =
    await mkdtemp(
      join(
        tmpdir(),
        "content-library-api-",
      ),
    );

  const databasePath =
    join(
      directory,
      "product-intelligence.sqlite",
    );

  const {
    server,
    demoProductId,
  } =
    createProductLibraryServer({
      databasePath,
      seedDemo: true,
    });

  await new Promise(
    (resolve, reject) => {
      server.once(
        "error",
        reject,
      );

      server.listen(
        0,
        "127.0.0.1",
        resolve,
      );
    },
  );

  const address =
    server.address();

  assert.ok(
    address &&
    typeof address === "object",
  );

  return {
    base:
      `http://127.0.0.1:${address.port}`,

    demoProductId,

    async close() {
      if (server.listening) {
        await new Promise(
          (resolve, reject) => {
            server.close(
              (error) => {
                if (error) {
                  reject(error);
                  return;
                }

                resolve();
              },
            );
          },
        );
      }

      await rm(
        directory,
        {
          recursive: true,
          force: true,
        },
      );
    },
  };
}

test("GET Content Intelligence returns empty safe state before analysis", async () => {
  const harness =
    await createHarness();

  try {
    const response =
      await fetch(
        `${harness.base}/api/products/${encodeURIComponent(harness.demoProductId)}/content-intelligence`,
      );

    assert.equal(
      response.status,
      200,
    );

    const body =
      await response.json();

    assert.equal(
      body.status,
      "NO_CONTENT_INTELLIGENCE",
    );

    assert.equal(
      body.latest,
      null,
    );

    assert.deepEqual(
      body.runs,
      [],
    );

    assert.equal(
      body.safety.externalWrites,
      false,
    );

    assert.equal(
      body.safety.livePublishing,
      false,
    );
  } finally {
    await harness.close();
  }
});

test("POST Content Intelligence analyzes and persists a product-bound run", async () => {
  const harness =
    await createHarness();

  try {
    const response =
      await fetch(
        `${harness.base}/api/products/${encodeURIComponent(harness.demoProductId)}/content-intelligence`,
        {
          method:
            "POST",

          headers: {
            "content-type":
              "application/json",
          },

          body:
            JSON.stringify({
              input:
                fixture,

              runId:
                "integration-run",

              createdAt:
                "2026-09-27T00:00:00Z",
            }),
        },
      );

    assert.equal(
      response.status,
      201,
    );

    const body =
      await response.json();

    assert.equal(
      body.status,
      "CREATED",
    );

    assert.equal(
      body.result.runId,
      "integration-run",
    );

    assert.equal(
      body.result.itemCount,
      6,
    );

    assert.equal(
      body.result.briefCount,
      4,
    );

    assert.equal(
      body.externalWrites,
      false,
    );

    assert.equal(
      body.livePublishing,
      false,
    );
  } finally {
    await harness.close();
  }
});

test("GET latest Content Intelligence returns persisted analysis", async () => {
  const harness =
    await createHarness();

  try {
    await fetch(
      `${harness.base}/api/products/${encodeURIComponent(harness.demoProductId)}/content-intelligence`,
      {
        method:
          "POST",

        headers: {
          "content-type":
            "application/json",
        },

        body:
          JSON.stringify({
            input:
              fixture,

            runId:
              "latest-run",
          }),
      },
    );

    const response =
      await fetch(
        `${harness.base}/api/products/${encodeURIComponent(harness.demoProductId)}/content-intelligence`,
      );

    assert.equal(
      response.status,
      200,
    );

    const body =
      await response.json();

    assert.equal(
      body.status,
      "READY",
    );

    assert.equal(
      body.latest.runId,
      "latest-run",
    );

    assert.equal(
      body.latest.items.length,
      6,
    );

    assert.equal(
      body.latest.activationBriefs.length,
      4,
    );

    assert.equal(
      body.safety.sourceContentPolicy,
      "messaging_signals_only",
    );

    assert.equal(
      body.safety.productFactPolicy,
      "verified_product_evidence_only",
    );
  } finally {
    await harness.close();
  }
});

test("GET specific Content Intelligence run returns product-bound snapshot", async () => {
  const harness =
    await createHarness();

  try {
    await fetch(
      `${harness.base}/api/products/${encodeURIComponent(harness.demoProductId)}/content-intelligence`,
      {
        method:
          "POST",

        headers: {
          "content-type":
            "application/json",
        },

        body:
          JSON.stringify({
            input:
              fixture,

            runId:
              "specific-run",
          }),
      },
    );

    const response =
      await fetch(
        `${harness.base}/api/products/${encodeURIComponent(harness.demoProductId)}/content-intelligence/runs/specific-run`,
      );

    assert.equal(
      response.status,
      200,
    );

    const body =
      await response.json();

    assert.equal(
      body.run.runId,
      "specific-run",
    );

    assert.equal(
      body.run.productId,
      harness.demoProductId,
    );

    assert.equal(
      body.run.items.length,
      6,
    );
  } finally {
    await harness.close();
  }
});

test("missing Content Intelligence run returns 404", async () => {
  const harness =
    await createHarness();

  try {
    const response =
      await fetch(
        `${harness.base}/api/products/${encodeURIComponent(harness.demoProductId)}/content-intelligence/runs/missing-run`,
      );

    assert.equal(
      response.status,
      404,
    );

    const body =
      await response.json();

    assert.equal(
      body.error,
      "CONTENT_INTELLIGENCE_RUN_NOT_FOUND",
    );
  } finally {
    await harness.close();
  }
});

test("unknown product fails closed with 404", async () => {
  const harness =
    await createHarness();

  try {
    const response =
      await fetch(
        `${harness.base}/api/products/missing-product/content-intelligence`,
      );

    assert.equal(
      response.status,
      404,
    );

    const body =
      await response.json();

    assert.equal(
      body.error,
      "PRODUCT_NOT_FOUND",
    );
  } finally {
    await harness.close();
  }
});

test("POST rejects non-JSON Content Intelligence requests", async () => {
  const harness =
    await createHarness();

  try {
    const response =
      await fetch(
        `${harness.base}/api/products/${encodeURIComponent(harness.demoProductId)}/content-intelligence`,
        {
          method:
            "POST",

          headers: {
            "content-type":
              "text/plain",
          },

          body:
            "not-json",
        },
      );

    assert.equal(
      response.status,
      415,
    );

    const body =
      await response.json();

    assert.equal(
      body.error,
      "CONTENT_INTELLIGENCE_REQUEST_FAILED",
    );

    assert.match(
      body.message,
      /application\/json/u,
    );
  } finally {
    await harness.close();
  }
});

test("POST rejects malformed JSON without persisting a run", async () => {
  const harness =
    await createHarness();

  try {
    const response =
      await fetch(
        `${harness.base}/api/products/${encodeURIComponent(harness.demoProductId)}/content-intelligence`,
        {
          method:
            "POST",

          headers: {
            "content-type":
              "application/json",
          },

          body:
            "{bad json",
        },
      );

    assert.equal(
      response.status,
      400,
    );

    const body =
      await response.json();

    assert.equal(
      body.error,
      "CONTENT_INTELLIGENCE_REQUEST_FAILED",
    );

    assert.match(
      body.message,
      /Malformed JSON/u,
    );

    const latest =
      await fetch(
        `${harness.base}/api/products/${encodeURIComponent(harness.demoProductId)}/content-intelligence`,
      );

    const latestBody =
      await latest.json();

    assert.equal(
      latestBody.status,
      "NO_CONTENT_INTELLIGENCE",
    );
  } finally {
    await harness.close();
  }
});
