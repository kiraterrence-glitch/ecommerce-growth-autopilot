import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import {
  mkdtemp,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

async function getFreePort() {
  return await new Promise(
    (resolve, reject) => {
      const probe = createServer();

      probe.once("error", reject);

      probe.listen(
        0,
        "127.0.0.1",
        () => {
          const address =
            probe.address();

          const port =
            typeof address === "object" &&
            address
              ? address.port
              : null;

          probe.close((error) => {
            if (error) {
              reject(error);
            } else if (!port) {
              reject(
                new Error(
                  "failed to allocate test port",
                ),
              );
            } else {
              resolve(port);
            }
          });
        },
      );
    },
  );
}

async function waitForHealth(
  child,
  baseUrl,
) {
  const deadline =
    Date.now() + 10_000;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(
        `local API exited early with ${child.exitCode}`,
      );
    }

    try {
      const response =
        await fetch(
          `${baseUrl}/health`,
        );

      if (response.ok) return;
    } catch {
      // API is still starting.
    }

    await new Promise((resolve) =>
      setTimeout(resolve, 100),
    );
  }

  throw new Error(
    "local API did not become healthy",
  );
}

async function stopChild(child) {
  if (child.exitCode !== null) return;

  child.kill("SIGTERM");

  await Promise.race([
    new Promise((resolve) =>
      child.once("exit", resolve),
    ),
    new Promise((resolve) =>
      setTimeout(resolve, 2000),
    ),
  ]);

  if (child.exitCode === null) {
    child.kill("SIGKILL");
  }
}

test(
  "product-page API runs supplier intake, verification, page build and approval end to end",
  async (context) => {
    const port =
      await getFreePort();

    const baseUrl =
      `http://127.0.0.1:${port}`;

    const tempDir =
      await mkdtemp(
        join(
          tmpdir(),
          "ecom-product-page-",
        ),
      );

    context.after(() =>
      rm(
        tempDir,
        {
          recursive: true,
          force: true,
        },
      ),
    );

    const child = spawn(
      process.execPath,
      ["scripts/local-api.mjs"],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          LOCAL_API_PORT:
            String(port),
          AI_PROVIDER: "mock",
          LOG_LEVEL: "silent",
          PROJECT_HISTORY_PATH:
            join(
              tempDir,
              "history.jsonl",
            ),
          AUDIT_PATH:
            join(
              tempDir,
              "audit.jsonl",
            ),
          PRODUCT_PAGE_JOB_PATH:
            join(
              tempDir,
              "product-page.jsonl",
            ),
        },
        stdio: [
          "ignore",
          "pipe",
          "pipe",
        ],
        windowsHide: true,
      },
    );

    context.after(async () =>
      stopChild(child),
    );

    await waitForHealth(
      child,
      baseUrl,
    );

    const workspace =
      await fetch(
        `${baseUrl}/product-page`,
      );

    assert.equal(
      workspace.status,
      200,
    );

    assert.match(
      await workspace.text(),
      /Product Page Workspace/,
    );

    const capabilities =
      await fetch(
        `${baseUrl}/product-page/capabilities`,
      );

    const capabilityBody =
      await capabilities.json();

    assert.equal(
      capabilityBody.externalWrites,
      false,
    );

    assert.equal(
      capabilityBody.livePublishing,
      false,
    );

    const createResponse =
      await fetch(
        `${baseUrl}/product-page/jobs`,
        {
          method: "POST",
          headers: {
            "content-type":
              "application/json",
          },
          body: JSON.stringify({
            supplierUrl:
              "https://www.aliexpress.com/item/100500123456.html",
          }),
        },
      );

    assert.equal(
      createResponse.status,
      201,
    );

    const created =
      await createResponse.json();

    const jobId =
      created.job.jobId;

    assert.equal(
      created.job.status,
      "RESEARCH_REQUIRED",
    );

    const conflictResponse =
      await fetch(
        `${baseUrl}/product-page/evidence`,
        {
          method: "POST",
          headers: {
            "content-type":
              "application/json",
          },
          body: JSON.stringify({
            jobId,
            specifications: [
              {
                field: "Capacity",
                value: "500 ml",
                sourceId: "supplier",
                critical: true,
              },
              {
                field: "Capacity",
                value: "600 ml",
                sourceId: "manual",
                critical: true,
              },
            ],
          }),
        },
      );

    assert.equal(
      conflictResponse.status,
      200,
    );

    const conflict =
      await conflictResponse.json();

    assert.equal(
      conflict.job.status,
      "NEEDS_VERIFICATION",
    );

    const specifications = [
      {
        field: "Capacity",
        value: "500 ml",
        sourceId: "supplier",
        critical: true,
      },
      {
        field: "Capacity",
        value: "500ml",
        sourceId: "manual",
        critical: true,
      },
    ];

    const evidenceResponse =
      await fetch(
        `${baseUrl}/product-page/evidence`,
        {
          method: "POST",
          headers: {
            "content-type":
              "application/json",
          },
          body: JSON.stringify({
            jobId,
            specifications,
          }),
        },
      );

    assert.equal(
      evidenceResponse.status,
      200,
    );

    const evidence =
      await evidenceResponse.json();

    assert.equal(
      evidence.job.status,
      "READY_FOR_BRIEF",
    );

    const product = {
      sku: "ESP-001",
      title:
        "Portable Espresso Maker",
      description:
        "A compact manual espresso maker for travel and work.",
      price: 79,
      currency: "USD",
      cost: 31,
      inventory: 150,
      features: [
        "Portable",
        "No electricity required",
        "Easy to clean",
      ],
      benefits: [
        "Make espresso anywhere",
        "Reduce cafe spending",
      ],
      audiences: [
        "Travelers",
        "Office workers",
        "Campers",
      ],
      imageUrls: [
        "https://example.invalid/espresso-1.jpg",
      ],
      offer: {
        type: "percentage",
        value: 20,
      },
      channels: {
        shopify: true,
        amazon: true,
      },
    };

    const buildResponse =
      await fetch(
        `${baseUrl}/product-page/brief`,
        {
          method: "POST",
          headers: {
            "content-type":
              "application/json",
          },
          body: JSON.stringify({
            jobId,
            product,
            specifications,
          }),
        },
      );

    assert.equal(
      buildResponse.status,
      200,
    );

    const built =
      await buildResponse.json();

    assert.equal(
      built.quality.passed,
      true,
    );

    assert.equal(
      built.job.status,
      "WAITING_APPROVAL",
    );

    assert.equal(
      built.shopifyDraft.externalWrite,
      false,
    );

    assert.equal(
      built.gemPagesManifest.externalWrite,
      false,
    );

    const approvalResponse =
      await fetch(
        `${baseUrl}/product-page/approval`,
        {
          method: "POST",
          headers: {
            "content-type":
              "application/json",
          },
          body: JSON.stringify({
            jobId,
            status: "APPROVED",
            note:
              "integration test approval",
          }),
        },
      );

    assert.equal(
      approvalResponse.status,
      200,
    );

    const approved =
      await approvalResponse.json();

    assert.equal(
      approved.job.status,
      "APPROVED_LOCAL",
    );

    assert.equal(
      approved.externalWrite,
      false,
    );

    const readResponse =
      await fetch(
        `${baseUrl}/product-page/job?jobId=${encodeURIComponent(jobId)}`,
      );

    assert.equal(
      readResponse.status,
      200,
    );

    const stored =
      await readResponse.json();

    assert.equal(
      stored.job.status,
      "APPROVED_LOCAL",
    );
  },
);
