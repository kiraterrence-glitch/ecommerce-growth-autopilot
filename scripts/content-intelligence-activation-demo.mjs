import {
  readFile,
} from "node:fs/promises";

import {
  generateContentActivationBriefs,
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

const briefs =
  generateContentActivationBriefs(
    records,
  );

console.log(
  JSON.stringify(
    {
      mode:
        "draft_only",

      externalWrites:
        false,

      livePublishing:
        false,

      briefCount:
        briefs.length,

      briefs:
        briefs.map(
          (brief) => ({
            briefId:
              brief.briefId,

            channel:
              brief.channel,

            title:
              brief.title,

            sourceContentIds:
              brief.sourceContentIds,

            productFactPolicy:
              brief.safety.productFactPolicy,

            sourceContentPolicy:
              brief.safety.sourceContentPolicy,
          }),
        ),
    },
    null,
    2,
  ),
);
