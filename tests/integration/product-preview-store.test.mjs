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
  buildDemoProductPagePreview,
} from "../../scripts/product-preview-demo.mjs";

import {
  storeProductPagePreview,
} from "../../scripts/product-preview-store.mjs";

test("preview store writes local HTML, QA report and visual assets", async (context) => {
  const temp =
    await mkdtemp(
      join(
        tmpdir(),
        "ecom-preview-",
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

  const {
    preview,
    visualPack,
  } =
    buildDemoProductPagePreview();

  const stored =
    await storeProductPagePreview(
      preview,
      visualPack,
      temp,
    );

  const html =
    await readFile(
      stored.htmlPath,
      "utf8",
    );

  assert.match(
    html,
    /Portable Espresso Maker/,
  );

  const qa =
    JSON.parse(
      await readFile(
        stored.qaPath,
        "utf8",
      ),
    );

  assert.equal(
    qa.passed,
    true,
  );

  assert.equal(
    qa.renderedVisualCount,
    5,
  );
});
