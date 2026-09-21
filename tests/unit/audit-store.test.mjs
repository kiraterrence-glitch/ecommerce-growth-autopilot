import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { JsonlAuditStore } from "../../scripts/jsonl-audit-store.mjs";

test("JSONL audit store appends one structured event per line", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ecom-audit-"));
  try {
    const path = join(dir, "audit.jsonl");
    const store = new JsonlAuditStore(path);
    await store.append({
      eventId: "evt-1", timestamp: "2026-09-20T00:00:00.000Z", eventType: "product_brain.generated",
      productId: "prod-1", provider: "mock", status: "success", durationMs: 12, details: { validated: true },
    });
    const lines = (await readFile(path, "utf8")).trim().split("\n");
    assert.equal(lines.length, 1);
    assert.equal(JSON.parse(lines[0]).eventType, "product_brain.generated");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
