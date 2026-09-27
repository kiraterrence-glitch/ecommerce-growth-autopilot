import {
  readFile,
} from "node:fs/promises";

import {
  classifyContentIntelligenceBatchDeterministically,
  assertContentIntelligenceGrounding,
  validateContentIntelligenceDataset,
} from "../dist/content-intelligence/index.js";

const fixture =
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
    fixture,
  );

const classifications =
  classifyContentIntelligenceBatchDeterministically(
    records,
  );

for (
  let index = 0;
  index < records.length;
  index += 1
) {
  const record =
    records[index];

  const classification =
    classifications[index];

  if (
    record === undefined ||
    classification === undefined
  ) {
    throw new Error(
      "Content Intelligence demo index mismatch.",
    );
  }

  assertContentIntelligenceGrounding(
    record,
    classification,
  );
}

console.log(
  JSON.stringify(
    {
      mode: "deterministic",

      contentItems:
        records.length,

      classifications:
        classifications.map(
          (item) => ({
            contentId:
              item.contentId,

            hookType:
              item.hookType,

            structure:
              item.structure,

            topic:
              item.topic,

            evidenceQuotes:
              item.evidenceQuotes.length,
          }),
        ),
    },
    null,
    2,
  ),
);
