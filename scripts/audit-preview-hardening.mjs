
import {
  readFile,
} from "node:fs/promises";

import {
  buildDemoProductPagePreview,
} from "./product-preview-demo.mjs";

function pass(
  label,
  detail,
) {
  console.log(
    `[PASS] ${label} -> ${detail}`,
  );
}

function fail(
  message,
) {
  throw new Error(
    message,
  );
}

const {
  preview,
  visualPack,
} =
  buildDemoProductPagePreview();

const corruptedPatterns = [
  "USD 39.90 ? Demo fixture",
  "Local product-page preview ? Human approval required before publication",
  "Evidence-grounded ? Draft only",
  "DEMO PREVIEW ? NO LIVE CHECKOUT",
  "Local preview only ? externalWrites=false ? livePublishing=false",
  'class="trust-icon">?</span>',
  "<b>?</b>",
];

for (
  const corrupted of
  corruptedPatterns
) {
  if (
    preview.html.includes(
      corrupted,
    )
  ) {
    fail(
      `Encoding regression detected: ${corrupted}`,
    );
  }
}

if (
  /\uFFFD/.test(
    preview.html,
  )
) {
  fail(
    "Unicode replacement character detected in preview HTML.",
  );
}

pass(
  "Encoding regression",
  "no corrupted separator characters",
);

if (
  !preview.html.includes(
    "&#10003;",
  ) ||
  !preview.html.includes(
    "&middot;",
  )
) {
  fail(
    "Encoding-safe HTML entities are missing.",
  );
}

pass(
  "Encoding-safe entities",
  "checkmarks and separators are entity encoded",
);

const htmlBytes =
  Buffer.byteLength(
    preview.html,
    "utf8",
  );

const svgBytes =
  visualPack.assets.reduce(
    (total, asset) =>
      total +
      Buffer.byteLength(
        asset.svg,
        "utf8",
      ),
    0,
  );

if (
  htmlBytes >= 250_000
) {
  fail(
    `HTML performance budget exceeded: ${htmlBytes} bytes`,
  );
}

if (
  svgBytes >= 250_000
) {
  fail(
    `SVG performance budget exceeded: ${svgBytes} bytes`,
  );
}

pass(
  "Performance budgets",
  `${htmlBytes} HTML bytes / ${svgBytes} SVG bytes`,
);

if (
  /<script\b/i.test(
    preview.html,
  ) ||
  /javascript:/i.test(
    preview.html,
  )
) {
  fail(
    "Executable client-side content detected.",
  );
}

pass(
  "Static security boundary",
  "no executable client-side JavaScript",
);

const report =
  JSON.parse(
    await readFile(
      "docs/portfolio-proof/product-page-demo/browser-qa-report.json",
      "utf8",
    ),
  );

if (
  !report.passed
) {
  fail(
    "Browser QA report is not passing.",
  );
}

if (
  report.viewports.length <
  8
) {
  fail(
    `Expected at least 8 stress viewports, received ${report.viewports.length}.`,
  );
}

for (
  const viewport of
  report.viewports
) {
  if (
    !viewport.passed
  ) {
    fail(
      `${viewport.name} failed browser stress QA.`,
    );
  }

  if (
    viewport.inspection
      .horizontalOverflow
  ) {
    fail(
      `${viewport.name} has horizontal overflow.`,
    );
  }
}

pass(
  "Responsive stress matrix",
  `${report.viewports.length} browser sizes passed`,
);

console.log("");
console.log(
  "PHASE 8 HARDENING AUDIT PASSED",
);
