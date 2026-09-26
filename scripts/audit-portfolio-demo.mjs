import {
  readFile,
  stat,
} from "node:fs/promises";

import {
  join,
  resolve,
} from "node:path";

const root =
  resolve(
    "docs",
    "portfolio-proof",
    "product-page-demo",
  );

try {
  const report =
    JSON.parse(
      await readFile(
        join(
          root,
          "browser-qa-report.json",
        ),
        "utf8",
      ),
    );

  if (!report.passed) {
    throw new Error(
      "Browser QA report is not passing.",
    );
  }

  if (
    report.viewports.length <
    8
  ) {
    throw new Error(
      `Expected at least eight viewport results, received ${report.viewports.length}.`,
    );
  }

  for (
    const viewport of
    report.viewports
  ) {
    if (!viewport.passed) {
      throw new Error(
        `${viewport.name} failed browser QA.`,
      );
    }

    if (
      viewport.inspection
        .horizontalOverflow
    ) {
      throw new Error(
        `${viewport.name} contains horizontal overflow.`,
      );
    }

    if (
      viewport.inspection
        .visualCount !==
      5
    ) {
      throw new Error(
        `${viewport.name} does not contain five visual sections.`,
      );
    }

    if (
      viewport.inspection
        .externalWrites !==
        "false"
    ) {
      throw new Error(
        `${viewport.name} externalWrites safety flag failed.`,
      );
    }

    if (
      viewport.inspection
        .livePublishing !==
        "false"
    ) {
      throw new Error(
        `${viewport.name} livePublishing safety flag failed.`,
      );
    }
  }

  const pngHeader =
    Buffer.from([
      0x89,
      0x50,
      0x4e,
      0x47,
      0x0d,
      0x0a,
      0x1a,
      0x0a,
    ]);

  for (
    const name of [
      "desktop",
      "tablet",
      "mobile",
    ]
  ) {
    const screenshot =
      join(
        root,
        "screenshots",
        `${name}.png`,
      );

    const bytes =
      await readFile(
        screenshot,
      );

    const details =
      await stat(
        screenshot,
      );

    if (
      !bytes
        .subarray(0, 8)
        .equals(
          pngHeader,
        )
    ) {
      throw new Error(
        `${name}.png is not a valid PNG.`,
      );
    }

    if (
      details.size <
      10000
    ) {
      throw new Error(
        `${name}.png is unexpectedly small.`,
      );
    }
  }

  const html =
    await readFile(
      join(
        root,
        "index.html",
      ),
      "utf8",
    );

  if (
    !html.includes(
      "Portable Espresso Maker",
    )
  ) {
    throw new Error(
      "Packaged preview is missing the demo product.",
    );
  }

  if (
    !html.includes(
      'data-external-writes="false"',
    )
  ) {
    throw new Error(
      "Packaged preview is missing externalWrites=false.",
    );
  }

  if (
    !html.includes(
      'data-live-publishing="false"',
    )
  ) {
    throw new Error(
      "Packaged preview is missing livePublishing=false.",
    );
  }

  if (
    /<script\b/i.test(
      html,
    )
  ) {
    throw new Error(
      "Packaged preview contains executable script markup.",
    );
  }

  console.log(
    "[PASS] desktop browser QA",
  );

  console.log(
    "[PASS] tablet browser QA",
  );

  console.log(
    "[PASS] mobile browser QA",
  );

  console.log(
    "[PASS] three PNG screenshots",
  );

  console.log(
    "[PASS] no horizontal overflow",
  );

  console.log(
    "[PASS] local-only safety state",
  );

  console.log("");
  console.log(
    "PHASE 6 PORTFOLIO AUDIT PASSED",
  );
} catch (error) {
  console.error(
    error instanceof Error
      ? error.message
      : String(error),
  );

  console.error("");
  console.error(
    "PHASE 6 PORTFOLIO AUDIT FAILED",
  );

  process.exitCode = 1;
}
