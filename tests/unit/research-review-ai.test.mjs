import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  generateReviewIntelligence,
  normalizeResearchProject,
  validateResearchProject,
  validateReviewIntelligence,
} from "../../dist/index.js";

const raw = JSON.parse(await readFile(new URL("../fixtures/research-project.json", import.meta.url), "utf8"));
const checked = validateResearchProject(raw);
assert.equal(checked.ok, true);
const project = normalizeResearchProject(checked.project);

test("AI review intelligence must cite real review IDs", async () => {
  const provider = {
    async generateJson() {
      return {
        themes: [
          {
            label: "Cleaning difficulty",
            category: "pain_point",
            evidenceIds: ["review-1", "review-2", "review-7"],
          },
        ],
      };
    },
  };
  const intelligence = await generateReviewIntelligence(project.reviews, provider);
  assert.equal(intelligence.themes[0].mentionCount, 3);
  assert.equal(intelligence.themes[0].confidence, "medium");
});

test("AI review intelligence fails on hallucinated evidence IDs", () => {
  const result = validateReviewIntelligence(
    { themes: [{ label: "Leak", category: "pain_point", evidenceIds: ["review-does-not-exist"] }] },
    project.reviews,
  );
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.includes("unknown review id")));
});
