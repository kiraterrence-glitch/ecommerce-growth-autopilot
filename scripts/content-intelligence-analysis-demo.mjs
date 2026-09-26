import {
  readFile,
} from "node:fs/promises";

import {
  analyzeContentIntelligence,
  validateContentIntelligenceDataset,
} from "../dist/content-intelligence/index.js";

const input =
  JSON.parse(
    await readFile(
      new URL(
        "../examples/content-intelligence/sample-content.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );

const records =
  validateContentIntelligenceDataset(
    input,
  );

const report =
  analyzeContentIntelligence(
    records,
  );

console.log(
  JSON.stringify(
    {
      methodology:
        report.methodology,

      contentItems:
        records.length,

      performance:
        report.performance,

      patternCount:
        report.patterns.length,

      patterns:
        report.patterns.slice(
          0,
          12,
        ),

      customerIntelligence:
        report.customerIntelligence,
    },
    null,
    2,
  ),
);
