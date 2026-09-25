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

import {
  buildDemoProductPagePreview,
} from "./product-preview-demo.mjs";

import {
  storeProductPagePreview,
} from "./product-preview-store.mjs";

function pass(
  name,
  detail,
) {
  console.log(
    `[PASS] ${name} -> ${detail}`,
  );
}

function fail(
  name,
  detail,
) {
  console.error(
    `[FAIL] ${name} -> ${detail}`,
  );

  process.exitCode = 1;
}

console.log("");
console.log(
  "PHASE 5 PRODUCT PAGE PREVIEW AUDIT",
);

console.log(
  "----------------------------------",
);

const temp =
  await mkdtemp(
    join(
      tmpdir(),
      "ecom-phase5-",
    ),
  );

try {
  const {
    preview,
    visualPack,
  } =
    buildDemoProductPagePreview();

  if (!preview.qa.passed) {
    throw new Error(
      `preview QA returned ${preview.qa.errors} error(s)`,
    );
  }

  pass(
    "Preview QA",
    `${preview.qa.renderedVisualCount}/${preview.qa.requiredVisualCount} required visuals rendered`,
  );

  if (
    !preview.html.includes(
      "@media(max-width:900px)",
    ) ||
    !preview.html.includes(
      "@media(max-width:560px)",
    )
  ) {
    throw new Error(
      "responsive breakpoints are missing",
    );
  }

  pass(
    "Responsive layout",
    "desktop, tablet and mobile CSS present",
  );

  if (
    preview.html.includes(
      "<script",
    ) ||
    preview.html.includes(
      "javascript:",
    )
  ) {
    throw new Error(
      "executable JavaScript was found in the static preview",
    );
  }

  pass(
    "Static preview safety",
    "no executable JavaScript",
  );

  if (
    !preview.html.includes(
      'data-external-writes="false"',
    ) ||
    !preview.html.includes(
      'data-live-publishing="false"',
    )
  ) {
    throw new Error(
      "draft safety flags are missing",
    );
  }

  pass(
    "Publishing boundary",
    "externalWrites=false, livePublishing=false",
  );

  if (
    preview.html.includes(
      "/checkout",
    )
  ) {
    throw new Error(
      "live checkout path found",
    );
  }

  pass(
    "Checkout boundary",
    "no live checkout target",
  );

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

  if (
    !html.includes(
      "Portable Espresso Maker",
    )
  ) {
    throw new Error(
      "stored preview does not contain the demo product",
    );
  }

  pass(
    "Local preview artifact",
    "index.html written successfully",
  );

  console.log("");
  console.log(
    "PHASE 5 AUDIT PASSED",
  );
} catch (error) {
  fail(
    "Phase 5 preview",
    error instanceof Error
      ? error.message
      : String(error),
  );

  console.error("");
  console.error(
    "PHASE 5 AUDIT FAILED",
  );
} finally {
  await rm(
    temp,
    {
      recursive: true,
      force: true,
    },
  );
}
