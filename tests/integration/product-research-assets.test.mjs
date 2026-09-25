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
  storeProductAsset,
} from "../../scripts/product-research-asset-store.mjs";

test("safe asset store hashes and persists approved MIME data locally", async (context) => {
  const directory =
    await mkdtemp(
      join(
        tmpdir(),
        "ecom-asset-store-",
      ),
    );

  context.after(
    async () =>
      await rm(
        directory,
        {
          recursive: true,
          force: true,
        },
      ),
  );

  const buffer =
    Buffer.from(
      "fixture-image-bytes",
      "utf8",
    );

  const stored =
    await storeProductAsset({
      jobId: "job-asset",
      assetId: "image-1",
      sourceEvidenceId:
        "supplier-e0001",
      sourceUrl:
        "https://cdn.example.invalid/image.jpg",
      kind: "image",
      mimeType: "image/jpeg",
      buffer,
      outputRoot: directory,
    });

  assert.equal(
    stored.mimeType,
    "image/jpeg",
  );

  assert.equal(
    stored.rightsStatus,
    "UNKNOWN_RIGHTS",
  );

  assert.equal(
    stored.sha256.length,
    64,
  );

  const bytes =
    await readFile(
      stored.localPath,
    );

  assert.deepEqual(
    bytes,
    buffer,
  );

  const metadata =
    JSON.parse(
      await readFile(
        `${stored.localPath}.json`,
        "utf8",
      ),
    );

  assert.equal(
    metadata.sourceEvidenceId,
    "supplier-e0001",
  );
});
