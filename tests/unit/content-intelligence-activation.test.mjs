import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import {
  dirname,
  join,
} from "node:path";
import {
  fileURLToPath,
  pathToFileURL,
} from "node:url";
import test from "node:test";

const testDirectory =
  dirname(
    fileURLToPath(
      import.meta.url,
    ),
  );

const repositoryRoot =
  join(
    testDirectory,
    "..",
    "..",
  );

const modulePath =
  join(
    repositoryRoot,
    "dist",
    "content-intelligence",
    "index.js",
  );

const contentIntelligence =
  await import(
    pathToFileURL(
      modulePath,
    ).href
  );

const {
  assertContentActivationOriginality,
  assertContentActivationSafety,
  ContentActivationOriginalityError,
  ContentActivationSafetyError,
  generateContentActivationBriefs,
  validateContentIntelligenceDataset,
} = contentIntelligence;

const sample =
  JSON.parse(
    await readFile(
      join(
        repositoryRoot,
        "examples",
        "content-intelligence",
        "sample-content.json",
      ),
      "utf8",
    ),
  );

const records =
  validateContentIntelligenceDataset(
    sample,
  );

test("activation generates four intended draft channels", () => {
  const briefs =
    generateContentActivationBriefs(
      records,
    );

  assert.equal(
    briefs.length,
    4,
  );

  assert.deepEqual(
    briefs
      .map(
        (brief) =>
          brief.channel,
      )
      .sort(),
    [
      "creative_brief",
      "email",
      "landing_page",
      "meta_ad",
    ],
  );
});

test("all activation output is draft-only with external writes disabled", () => {
  const briefs =
    generateContentActivationBriefs(
      records,
    );

  for (const brief of briefs) {
    assert.equal(
      brief.safety.draftOnly,
      true,
    );

    assert.equal(
      brief.safety.externalWrites,
      false,
    );

    assert.equal(
      brief.safety.livePublishing,
      false,
    );
  }
});

test("activation preserves product-fact safety boundary", () => {
  const briefs =
    generateContentActivationBriefs(
      records,
    );

  for (const brief of briefs) {
    assert.equal(
      brief.safety.sourceContentPolicy,
      "messaging_signals_only",
    );

    assert.equal(
      brief.safety.productFactPolicy,
      "verified_product_evidence_only",
    );

    assert.match(
      brief.proofRequirement,
      /verified product evidence/u,
    );
  }
});

test("activation preserves correlation-not-causation", () => {
  const briefs =
    generateContentActivationBriefs(
      records,
    );

  for (const brief of briefs) {
    assert.equal(
      brief.safety.causality,
      "correlation_not_causation",
    );

    for (
      const pattern
      of brief.patternBasis
    ) {
      assert.match(
        pattern.observation,
        /not causal proof|Do not invent/u,
      );
    }
  }
});

test("activation pattern basis retains source provenance", () => {
  const briefs =
    generateContentActivationBriefs(
      records,
    );

  const knownIds =
    new Set(
      records.map(
        (record) =>
          record.id,
      ),
    );

  for (const brief of briefs) {
    assert.ok(
      brief.sourceContentIds.length > 0,
    );

    for (
      const contentId
      of brief.sourceContentIds
    ) {
      assert.equal(
        knownIds.has(
          contentId,
        ),
        true,
      );
    }
  }
});

test("generated activation briefs pass originality validation", () => {
  const briefs =
    generateContentActivationBriefs(
      records,
    );

  assert.doesNotThrow(
    () =>
      assertContentActivationOriginality(
        records,
        briefs,
      ),
  );
});

test("copied creator wording is rejected by originality validation", () => {
  const briefs =
    generateContentActivationBriefs(
      records,
    );

  const copied =
    [...briefs];

  const first =
    copied[0];

  assert.ok(first);

  copied[0] = {
    ...first,

    bodyDirection:
      records[0].transcript,
  };

  assert.throws(
    () =>
      assertContentActivationOriginality(
        records,
        copied,
      ),
    ContentActivationOriginalityError,
  );
});

test("unsafe publishing state is rejected", () => {
  const briefs =
    generateContentActivationBriefs(
      records,
    );

  const first =
    briefs[0];

  assert.ok(first);

  const unsafe = [
    {
      ...first,

      safety: {
        ...first.safety,

        externalWrites:
          true,
      },
    },

    ...briefs.slice(1),
  ];

  assert.throws(
    () =>
      assertContentActivationSafety(
        unsafe,
      ),
    ContentActivationSafetyError,
  );
});

test("activation generation is deterministic and contains no opaque scores", () => {
  const first =
    generateContentActivationBriefs(
      records,
    );

  const second =
    generateContentActivationBriefs(
      records,
    );

  assert.deepEqual(
    first,
    second,
  );

  const serialized =
    JSON.stringify(first);

  assert.equal(
    serialized.includes(
      '"viralScore"',
    ),
    false,
  );

  assert.equal(
    serialized.includes(
      '"winnerScore"',
    ),
    false,
  );

  assert.equal(
    serialized.includes(
      '"opportunityScore"',
    ),
    false,
  );
});
