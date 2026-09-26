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
  analyzeContentIntelligence,
  analyzeContentPerformance,
  summarizeContentPatterns,
  summarizeCustomerIntelligence,
  classifyContentIntelligenceBatchDeterministically,
  validateContentIntelligenceDataset,
  validateContentIntelligenceRecord,
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

function performanceFixture() {
  const input =
    structuredClone(
      sample.slice(
        0,
        3,
      ),
    );

  input[0].creator =
    "shared-creator";

  input[0].metrics = {
    views: 100,
    likes: 10,
    comments: 0,
    shares: 0,
    saves: 0,
    followers: 50,
  };

  input[1].creator =
    "shared-creator";

  input[1].metrics = {
    views: 300,
    likes: 60,
    comments: 0,
    shares: 0,
    saves: 0,
    followers: 100,
  };

  input[2].creator =
    "shared-creator";

  input[2].metrics = {
    views: 500,
    likes: 150,
    comments: 0,
    shares: 0,
    saves: 0,
    followers: 100,
  };

  return validateContentIntelligenceDataset(
    input,
  );
}

test("performance analysis calculates transparent engagement metrics", () => {
  const record =
    validateContentIntelligenceRecord({
      ...structuredClone(
        sample[0],
      ),

      metrics: {
        views: 1000,
        likes: 50,
        comments: 10,
        shares: 20,
        saves: 20,
        followers: 500,
      },
    });

  const result =
    analyzeContentPerformance(
      [record],
    )[0];

  assert.ok(result);

  assert.equal(
    result.engagementCount,
    100,
  );

  assert.equal(
    result.engagementRateByViews,
    0.1,
  );

  assert.equal(
    result.viewsPerFollower,
    2,
  );
});

test("performance analysis fails safely on zero denominators", () => {
  const record =
    validateContentIntelligenceRecord({
      ...structuredClone(
        sample[0],
      ),

      metrics: {
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
        followers: 0,
      },
    });

  const result =
    analyzeContentPerformance(
      [record],
    )[0];

  assert.ok(result);

  assert.equal(
    result.engagementRateByViews,
    null,
  );

  assert.equal(
    result.viewsPerFollower,
    null,
  );

  assert.equal(
    result.viewsVsCreatorMedianRatio,
    null,
  );

  assert.equal(
    result.engagementVsCreatorMedianRatio,
    null,
  );
});

test("creator-relative analysis uses creator medians", () => {
  const records =
    performanceFixture();

  const results =
    analyzeContentPerformance(
      records,
    );

  assert.equal(
    results.length,
    3,
  );

  for (
    const result
    of results
  ) {
    assert.equal(
      result.creatorMedianViews,
      300,
    );

    assert.equal(
      result.creatorMedianEngagementRateByViews,
      0.2,
    );
  }

  assert.equal(
    results[0].viewsVsCreatorMedianRatio,
    0.333333,
  );

  assert.equal(
    results[1].viewsVsCreatorMedianRatio,
    1,
  );

  assert.equal(
    results[2].viewsVsCreatorMedianRatio,
    1.666667,
  );

  assert.equal(
    results[0].engagementVsCreatorMedianRatio,
    0.5,
  );

  assert.equal(
    results[2].engagementVsCreatorMedianRatio,
    1.5,
  );
});

test("content without a creator has no fabricated creator baseline", () => {
  const record =
    validateContentIntelligenceRecord({
      ...structuredClone(
        sample[0],
      ),

      creator: null,
    });

  const result =
    analyzeContentPerformance(
      [record],
    )[0];

  assert.ok(result);

  assert.equal(
    result.creatorMedianViews,
    null,
  );

  assert.equal(
    result.creatorMedianEngagementRateByViews,
    null,
  );

  assert.equal(
    result.viewsVsCreatorMedianRatio,
    null,
  );
});

test("pattern summaries expose descriptive hook medians", () => {
  const records =
    performanceFixture();

  const classifications =
    classifyContentIntelligenceBatchDeterministically(
      records,
    );

  const patterns =
    summarizeContentPatterns(
      records,
      classifications,
    );

  const questionPattern =
    patterns.find(
      (item) =>
        item.dimension === "hookType" &&
        item.value === "Question",
    );

  assert.ok(
    questionPattern,
  );

  assert.equal(
    questionPattern.sampleSize,
    2,
  );

  assert.equal(
    questionPattern.medianViews,
    200,
  );

  assert.equal(
    questionPattern.medianEngagementRateByViews,
    0.15,
  );
});

test("pattern analysis covers hook structure topic format and CTA presence", () => {
  const records =
    validateContentIntelligenceDataset(
      sample,
    );

  const classifications =
    classifyContentIntelligenceBatchDeterministically(
      records,
    );

  const patterns =
    summarizeContentPatterns(
      records,
      classifications,
    );

  const dimensions =
    new Set(
      patterns.map(
        (item) =>
          item.dimension,
      ),
    );

  assert.deepEqual(
    [...dimensions].sort(),
    [
      "creativeFormat",
      "ctaPresence",
      "hookType",
      "structure",
      "topic",
    ],
  );
});

test("customer intelligence aggregates grounded signals with provenance", () => {
  const first =
    validateContentIntelligenceRecord(
      sample[0],
    );

  const second =
    validateContentIntelligenceRecord({
      ...structuredClone(
        sample[0],
      ),

      id:
        "duplicate-signal-content",

      sourceUrl:
        "https://example.com/content/duplicate",
    });

  const classifications =
    classifyContentIntelligenceBatchDeterministically(
      [
        first,
        second,
      ],
    );

  const customer =
    summarizeCustomerIntelligence(
      classifications,
    );

  const pain =
    customer.painPoints.find(
      (item) =>
        item.count === 2,
    );

  assert.ok(
    pain,
  );

  assert.equal(
    pain.contentIds.length,
    2,
  );

  assert.ok(
    first.transcript.includes(
      pain.phrase,
    ),
  );
});

test("analysis report explicitly separates correlation from causation", () => {
  const records =
    validateContentIntelligenceDataset(
      sample,
    );

  const report =
    analyzeContentIntelligence(
      records,
    );

  assert.equal(
    report.methodology.scope,
    "descriptive_observational",
  );

  assert.equal(
    report.methodology.causality,
    "correlation_not_causation",
  );

  assert.equal(
    report.methodology.productClaims,
    "content_signals_are_not_product_facts",
  );

  assert.match(
    report.methodology.note,
    /do not establish/u,
  );
});

test("Content Intelligence analysis is deterministic", () => {
  const records =
    validateContentIntelligenceDataset(
      sample,
    );

  const first =
    analyzeContentIntelligence(
      records,
    );

  const second =
    analyzeContentIntelligence(
      records,
    );

  assert.deepEqual(
    first,
    second,
  );
});

test("analysis report contains no opaque viral or winner score", () => {
  const records =
    validateContentIntelligenceDataset(
      sample,
    );

  const report =
    analyzeContentIntelligence(
      records,
    );

  const serialized =
    JSON.stringify(
      report,
    );

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

  assert.equal(
    report.methodology.scoring,
    "no_opaque_viral_score",
  );
});
