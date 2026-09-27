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

import {
  renderProductDetail,
} from "../../scripts/product-library-renderer.mjs";

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
        "ci-library-ui-",
      ),
    );

  const {
    server,
    repository,
    contentIntelligenceApi,
    demoProductId,
  } =
    createProductLibraryServer({
      databasePath:
        join(
          directory,
          "product.sqlite",
        ),

      seedDemo:
        true,
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

    repository,

    contentIntelligenceApi,

    demoProductId,

    async analyze(
      runId = "ui-test-run",
    ) {
      const response =
        await fetch(
          `http://127.0.0.1:${address.port}/api/products/${encodeURIComponent(demoProductId)}/content-intelligence`,
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

                runId,
              }),
          },
        );

      assert.equal(
        response.status,
        201,
      );
    },

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
          recursive:
            true,

          force:
            true,
        },
      );
    },
  };
}

test("Product Library shows empty Content Intelligence state before analysis", async () => {
  const harness =
    await createHarness();

  try {
    const response =
      await fetch(
        `${harness.base}/products`,
      );

    assert.equal(
      response.status,
      200,
    );

    const html =
      await response.text();

    assert.match(
      html,
      /NO CONTENT INTELLIGENCE/u,
    );
  } finally {
    await harness.close();
  }
});

test("Product Library card shows persisted Content Intelligence summary", async () => {
  const harness =
    await createHarness();

  try {
    await harness.analyze(
      "library-summary-run",
    );

    const response =
      await fetch(
        `${harness.base}/products`,
      );

    assert.equal(
      response.status,
      200,
    );

    const html =
      await response.text();

    assert.match(
      html,
      /CONTENT INTELLIGENCE READY/u,
    );

    assert.match(
      html,
      /Content Intelligence/u,
    );

    assert.match(
      html,
      /6 items/u,
    );

    assert.match(
      html,
      /17 patterns/u,
    );

    assert.match(
      html,
      /20 signals/u,
    );

    assert.match(
      html,
      /4 draft briefs/u,
    );
  } finally {
    await harness.close();
  }
});

test("Product detail renders Content Intelligence safety dashboard", async () => {
  const harness =
    await createHarness();

  try {
    await harness.analyze(
      "detail-dashboard-run",
    );

    const response =
      await fetch(
        `${harness.base}/products/${encodeURIComponent(harness.demoProductId)}`,
      );

    assert.equal(
      response.status,
      200,
    );

    const html =
      await response.text();

    assert.match(
      html,
      /CONTENT INTELLIGENCE READY/u,
    );

    assert.match(
      html,
      /MESSAGING SIGNALS ONLY/u,
    );

    assert.match(
      html,
      /VERIFIED PRODUCT EVIDENCE ONLY/u,
    );

    assert.match(
      html,
      /DRAFT ONLY/u,
    );

    assert.match(
      html,
      /Observed patterns/u,
    );

    assert.match(
      html,
      /Customer signals/u,
    );

    assert.match(
      html,
      /Activation briefs/u,
    );

    assert.match(
      html,
      /descriptive, not causal/u,
    );
  } finally {
    await harness.close();
  }
});

test("Content Intelligence UI escapes hostile stored text and adds no client script", async () => {
  const harness =
    await createHarness();

  try {
    await harness.analyze(
      "escaping-run",
    );

    const snapshot =
      harness.repository.getSnapshot(
        harness.demoProductId,
      );

    assert.ok(
      snapshot,
    );

    const run =
      structuredClone(
        harness.contentIntelligenceApi.latest(
          harness.demoProductId,
        ),
      );

    assert.ok(
      run,
    );

    assert.ok(
      Array.isArray(
        run.activationBriefs,
      ),
    );

    assert.ok(
      run.activationBriefs.length > 0,
    );

    run.activationBriefs[0].title =
      '<script>alert("x")</script>';

    const html =
      renderProductDetail(
        snapshot,
        null,
        run,
      );

    assert.ok(
      html,
    );

    assert.equal(
      html.includes(
        '<script>alert("x")</script>',
      ),
      false,
    );

    assert.match(
      html,
      /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/u,
    );

    assert.equal(
      /<script\b/iu.test(
        html,
      ),
      false,
    );
  } finally {
    await harness.close();
  }
});
