import assert from "node:assert/strict";
import {
  existsSync,
} from "node:fs";
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
import {
  spawnSync,
} from "node:child_process";
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

const distModule =
  join(
    repositoryRoot,
    "dist",
    "content-intelligence",
    "index.js",
  );

if (!existsSync(distModule)) {
  const command =
    process.platform === "win32"
      ? "npm.cmd"
      : "npm";

  const result =
    spawnSync(
      command,
      ["run", "build"],
      {
        cwd: repositoryRoot,
        stdio: "inherit",
      },
    );

  if (result.status !== 0) {
    throw new Error(
      "Could not build Content Intelligence test target.",
    );
  }
}

const contentIntelligence =
  await import(
    pathToFileURL(
      distModule,
    ).href
  );

const {
  assertContentIntelligenceGrounding,
  classifyContentIntelligenceDeterministically,
  ContentIntelligenceGroundingError,
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

test("Content Intelligence validates the six-item synthetic fixture", () => {
  const records =
    validateContentIntelligenceDataset(
      sample,
    );

  assert.equal(
    records.length,
    6,
  );
});

test("Content Intelligence rejects duplicate content IDs", () => {
  const duplicate =
    structuredClone(sample);

  duplicate[1].id =
    duplicate[0].id;

  assert.throws(
    () =>
      validateContentIntelligenceDataset(
        duplicate,
      ),
    /Duplicate content ID/u,
  );
});

test("Content Intelligence rejects negative metrics", () => {
  const invalid =
    structuredClone(sample[0]);

  invalid.metrics.views =
    -1;

  assert.throws(
    () =>
      validateContentIntelligenceRecord(
        invalid,
      ),
    /non-negative/u,
  );
});

test("Content Intelligence rejects malformed source URLs", () => {
  const invalid =
    structuredClone(sample[0]);

  invalid.sourceUrl =
    "not a url";

  assert.throws(
    () =>
      validateContentIntelligenceRecord(
        invalid,
      ),
    /valid URL/u,
  );
});

test("Content Intelligence rejects malformed timestamps", () => {
  const invalid =
    structuredClone(sample[0]);

  invalid.publishedAt =
    "not-a-date";

  assert.throws(
    () =>
      validateContentIntelligenceRecord(
        invalid,
      ),
    /valid timestamp/u,
  );
});

test("deterministic Content Intelligence produces repeatable output", () => {
  const record =
    validateContentIntelligenceRecord(
      sample[2],
    );

  const first =
    classifyContentIntelligenceDeterministically(
      record,
    );

  const second =
    classifyContentIntelligenceDeterministically(
      record,
    );

  assert.deepEqual(
    first,
    second,
  );
});

test("question and list patterns classify deterministically", () => {
  const record =
    validateContentIntelligenceRecord(
      sample[1],
    );

  const classification =
    classifyContentIntelligenceDeterministically(
      record,
    );

  assert.equal(
    classification.hookType,
    "Question",
  );

  assert.equal(
    classification.structure,
    "List",
  );
});

test("contrarian mistake-to-fix content classifies deterministically", () => {
  const record =
    validateContentIntelligenceRecord(
      sample[2],
    );

  const classification =
    classifyContentIntelligenceDeterministically(
      record,
    );

  assert.equal(
    classification.hookType,
    "Contrarian",
  );

  assert.equal(
    classification.structure,
    "Mistake → Fix",
  );
});

test("demonstration content classifies deterministically", () => {
  const record =
    validateContentIntelligenceRecord(
      sample[3],
    );

  const classification =
    classifyContentIntelligenceDeterministically(
      record,
    );

  assert.equal(
    classification.hookType,
    "Demonstration",
  );

  assert.equal(
    classification.structure,
    "Demonstration",
  );
});

test("deterministic classifications remain grounded in source transcripts", () => {
  const records =
    validateContentIntelligenceDataset(
      sample,
    );

  for (const record of records) {
    const classification =
      classifyContentIntelligenceDeterministically(
        record,
      );

    assert.doesNotThrow(
      () =>
        assertContentIntelligenceGrounding(
          record,
          classification,
        ),
    );
  }
});

test("fabricated hook text is rejected by grounding validation", () => {
  const record =
    validateContentIntelligenceRecord(
      sample[0],
    );

  const classification =
    classifyContentIntelligenceDeterministically(
      record,
    );

  const fabricated = {
    ...classification,
    hookText:
      "This sentence never appeared in the transcript.",
  };

  assert.throws(
    () =>
      assertContentIntelligenceGrounding(
        record,
        fabricated,
      ),
    ContentIntelligenceGroundingError,
  );
});

test("fabricated evidence quotes are rejected by grounding validation", () => {
  const record =
    validateContentIntelligenceRecord(
      sample[0],
    );

  const classification =
    classifyContentIntelligenceDeterministically(
      record,
    );

  const fabricated = {
    ...classification,

    evidenceQuotes: [
      ...classification.evidenceQuotes,
      "Fabricated evidence quote.",
    ],
  };

  assert.throws(
    () =>
      assertContentIntelligenceGrounding(
        record,
        fabricated,
      ),
    ContentIntelligenceGroundingError,
  );
});

test("Content Intelligence does not manufacture an opaque viral score", () => {
  const record =
    validateContentIntelligenceRecord(
      sample[5],
    );

  const classification =
    classifyContentIntelligenceDeterministically(
      record,
    );

  assert.equal(
    "viralScore" in classification,
    false,
  );

  assert.equal(
    "opportunityScore" in classification,
    false,
  );
});
