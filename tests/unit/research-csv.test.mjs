import assert from "node:assert/strict";
import test from "node:test";
import { importCompetitorsFromCsv, importReviewsFromCsv } from "../../dist/index.js";

test("research CSV import accepts valid competitor and review rows with provenance", () => {
  const competitors = importCompetitorsFromCsv(
    "id,title,price,rating,reviewCount,features,offer\nc1,Alpha Press,79,4.2,120,Portable|Compact,10% coupon\n",
    { currency: "USD", sourceId: "source-csv", capturedAt: "2026-09-20T12:00:00Z" },
  );
  assert.equal(competitors.failed, 0);
  assert.equal(competitors.imported[0].sourceId, "source-csv");
  assert.deepEqual(competitors.imported[0].features, ["Portable", "Compact"]);

  const reviews = importReviewsFromCsv(
    "id,competitorId,rating,text\nr1,c1,2,Hard to clean after use\n",
    { sourceId: "source-reviews", capturedAt: "2026-09-20T12:05:00Z" },
  );
  assert.equal(reviews.failed, 0);
  assert.equal(reviews.imported[0].competitorId, "c1");
});
