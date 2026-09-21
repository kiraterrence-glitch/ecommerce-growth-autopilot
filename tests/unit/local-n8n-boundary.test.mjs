import assert from "node:assert/strict";
import test from "node:test";
import { assertLocalN8nBaseUrl, buildLocalN8nWebhookUrl } from "../../dist/index.js";

test("local n8n proof accepts loopback only and builds the production webhook URL", () => {
  assert.equal(assertLocalN8nBaseUrl("http://127.0.0.1:5678"), "http://127.0.0.1:5678");
  assert.equal(
    buildLocalN8nWebhookUrl("http://localhost:5678/", "ecom-full-demo"),
    "http://localhost:5678/webhook/ecom-full-demo",
  );
  assert.equal(
    buildLocalN8nWebhookUrl("http://127.0.0.1:5678", "ecom-full-demo", true),
    "http://127.0.0.1:5678/webhook-test/ecom-full-demo",
  );
});

test("local n8n proof rejects cloud, https, credentials, and malformed webhook paths", () => {
  assert.throws(() => assertLocalN8nBaseUrl("https://example.app.n8n.cloud"), /only allows http/i);
  assert.throws(() => assertLocalN8nBaseUrl("http://example.com:5678"), /Refusing non-local n8n URL/);
  assert.throws(() => assertLocalN8nBaseUrl("http://user:pass@127.0.0.1:5678"), /credentials/i);
  assert.throws(() => buildLocalN8nWebhookUrl("http://127.0.0.1:5678", "bad path!"), /Invalid local n8n webhook path/);
});
