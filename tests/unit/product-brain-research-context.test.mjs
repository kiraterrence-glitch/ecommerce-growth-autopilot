import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  analyzeResearchProject,
  createProductResearchContext,
  generateProductBrain,
  normalizeProduct,
  normalizeResearchProject,
  validateProduct,
  validateResearchProject,
} from "../../dist/index.js";

const rawProduct = JSON.parse(await readFile(new URL("../fixtures/valid-product.json", import.meta.url), "utf8"));
const rawResearch = JSON.parse(await readFile(new URL("../fixtures/research-project.json", import.meta.url), "utf8"));
const productChecked = validateProduct(rawProduct);
const researchChecked = validateResearchProject(rawResearch);
assert.equal(productChecked.ok, true);
assert.equal(researchChecked.ok, true);
const product = normalizeProduct(productChecked.product);
const project = normalizeResearchProject(researchChecked.project);
const context = createProductResearchContext(analyzeResearchProject(project));

test("Product Brain can consume research context without changing the core contract", async () => {
  let capturedPrompt = "";
  const provider = {
    async generateJson(request) {
      capturedPrompt = request.prompt;
      return {
        audiences: ["Travelers", "Office workers", "Campers"],
        painPoints: ["Coffee access while traveling"],
        benefits: ["Portable espresso preparation"],
        objections: ["Cleaning effort"],
        buyingTriggers: ["Travel convenience"],
        angles: [
          { name: "Travel", hook: "Espresso on the move", reason: "Portable use case" },
          { name: "Office", hook: "Coffee without another cafe run", reason: "Office use case" },
          { name: "Camping", hook: "Coffee away from outlets", reason: "Manual use case" }
        ],
        offerPositioning: "20% off current offer"
      };
    },
  };
  const brain = await generateProductBrain(product, provider, context);
  assert.equal(brain.angles.length, 3);
  assert.match(capturedPrompt, /Research context/);
  assert.match(capturedPrompt, /Cleaning difficulty/);
  assert.match(capturedPrompt, /do not convert competitor claims into facts/i);
});
