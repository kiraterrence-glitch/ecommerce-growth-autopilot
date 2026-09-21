import { readFile } from "node:fs/promises";
import { normalizeProduct, validateProduct } from "../dist/index.js";
import { buildCampaignKit } from "./demo-artifacts.mjs";

const raw = JSON.parse(await readFile("tests/fixtures/valid-product.json", "utf8"));
const brain = JSON.parse(await readFile("tests/fixtures/product-brain.json", "utf8"));
const checked = validateProduct(raw);
if (!checked.ok) throw new Error("marketing quality fixture product is invalid");
const product = normalizeProduct(checked.product);
const { quality } = buildCampaignKit(product, brain, {
  mode: "verification",
  aiProvider: "fixture",
  model: null,
  validation: "PASS",
  grounding: "PASS",
});
if (!quality.passed) {
  console.error(JSON.stringify(quality, null, 2));
  process.exit(1);
}
console.log(`marketing quality check passed (${quality.warnings} warning(s))`);
