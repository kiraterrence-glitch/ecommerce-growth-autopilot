import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  analyzeResearchProject,
  assessResearchQuality,
  calculateUnitEconomics,
  createProductResearchContext,
  normalizeResearchProject,
  validateResearchProject,
} from "../../dist/index.js";

const raw = JSON.parse(await readFile(new URL("../fixtures/research-project.json", import.meta.url), "utf8"));

test("research project validates and produces evidence-backed analysis", () => {
  const checked = validateResearchProject(raw);
  assert.equal(checked.ok, true, JSON.stringify(checked.issues, null, 2));
  const project = normalizeResearchProject(checked.project);
  const analysis = analyzeResearchProject(project);
  assert.equal(analysis.competitorCount, 4);
  assert.equal(analysis.reviewCount, 8);
  assert.equal(analysis.price.min, 69.99);
  assert.equal(analysis.price.median, 76.75);
  assert.equal(analysis.price.max, 89);
  assert.equal(analysis.features[0].feature, "Portable");
  assert.equal(analysis.features[0].count, 4);
  assert.ok(analysis.reviewIntelligence.themes.some((theme) => theme.label === "Cleaning difficulty"));
  assert.equal(analysis.economics.breakEvenCpa, 29.5);
  assert.equal(analysis.economics.contributionAfterAds, 19.5);
  const quality = assessResearchQuality(project, analysis);
  assert.equal(quality.passed, true, JSON.stringify(quality.issues, null, 2));
  assert.ok(quality.issues.some((issue) => issue.code === "demand_not_measured"));
  const context = createProductResearchContext(analysis);
  assert.equal(context.priceBand.median, 76.75);
  assert.ok(context.topPainPoints.includes("Cleaning difficulty"));
});

test("research validation rejects fabricated sales/opportunity fields", () => {
  const corrupted = structuredClone(raw);
  corrupted.competitors[0].estimatedMonthlySales = 4000;
  corrupted.opportunityScore = 92;
  const checked = validateResearchProject(corrupted);
  assert.equal(checked.ok, false);
  assert.ok(checked.issues.some((issue) => issue.message.includes("estimated-sales/opportunity")));
});

test("research quality rejects demand claims without demand-data evidence", () => {
  const checked = validateResearchProject(raw);
  assert.equal(checked.ok, true);
  const project = normalizeResearchProject(checked.project);
  const analysis = analyzeResearchProject(project);
  const injected = {
    ...analysis,
    findings: [
      ...analysis.findings,
      {
        id: "fake-demand",
        category: "demand_signal",
        statement: "Demand is strong.",
        confidence: "high",
        evidenceIds: ["comp-1"],
        sourceIds: ["source-competitors"],
        evidenceCount: 1,
      },
    ],
  };
  const quality = assessResearchQuality(project, injected);
  assert.equal(quality.passed, false);
  assert.ok(quality.issues.some((issue) => issue.code === "unsupported_demand_claim"));
});

test("unit economics exposes break-even CPA instead of an opaque score", () => {
  const result = calculateUnitEconomics({
    sellingPrice: 100,
    cogs: 30,
    shippingCost: 8,
    marketplaceFees: 15,
    paymentFees: 3,
    discountAmount: 10,
    adAllowance: 12,
  });
  assert.equal(result.revenueAfterDiscount, 90);
  assert.equal(result.contributionBeforeAds, 34);
  assert.equal(result.breakEvenCpa, 34);
  assert.equal(result.contributionAfterAds, 22);
});
