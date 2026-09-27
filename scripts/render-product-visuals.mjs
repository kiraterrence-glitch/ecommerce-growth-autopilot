import {
  readFile,
} from "node:fs/promises";

import {
  resolve,
} from "node:path";

import {
  buildProductVisualPack,
} from "../dist/index.js";

import {
  storeProductVisualPack,
} from "./product-visual-store.mjs";

const inputPath =
  process.argv[2];

if (!inputPath) {
  console.error(
    "Usage: node scripts/render-product-visuals.mjs <visual-input.json>",
  );

  process.exitCode = 1;
} else {
  try {
    const input =
      JSON.parse(
        await readFile(
          resolve(
            inputPath,
          ),
          "utf8",
        ),
      );

    const pack =
      buildProductVisualPack(
        input,
      );

    const stored =
      await storeProductVisualPack(
        pack,
      );

    console.log("");
    console.log(
      `Visual assets: ${stored.assets.length}`,
    );

    console.log(
      `Ready: ${stored.qa.readyAssetCount}`,
    );

    console.log(
      `Needs source: ${stored.qa.needsSourceCount}`,
    );

    console.log(
      `QA passed: ${stored.qa.passed}`,
    );

    console.log(
      `Output: ${stored.directory}`,
    );
  } catch (error) {
    console.error(
      error instanceof Error
        ? error.message
        : String(error),
    );

    process.exitCode = 1;
  }
}
