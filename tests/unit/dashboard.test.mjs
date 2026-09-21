import assert from "node:assert/strict";
import test from "node:test";
import { renderDashboardHtml } from "../../dist/index.js";

test("dashboard is standalone and exposes campaign review channels", () => {
  const html = renderDashboardHtml();
  assert.match(html, /Ecom Growth Autopilot/);
  assert.match(html, /Run full portfolio demo/);
  assert.match(html, /\/campaign-kit/);
  assert.match(html, /\/approval\/transition/);
  assert.match(html, /run.*history.*learn.*research.*brain.*meta.*email.*shopify.*google.*amazon.*creatives.*video.*delivery/i);
  assert.match(html, /Optional research evidence/);
  assert.match(html, /researchInput/);
  assert.match(html, /\/demo\/status/);
  assert.match(html, /Test approval gate/);
  assert.match(html, /Test live-mode block/);
  assert.match(html, /Product Brain.*Campaign factory.*Quality gates.*Approval \+ delivery.*n8n/is);
  assert.doesNotMatch(html, /https:\/\/cdn\./i);
});


test("inline dashboard script parses as JavaScript", () => {
  const html = renderDashboardHtml();
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(match, "dashboard script tag exists");
  assert.doesNotThrow(() => new Function(match[1]));
});

test("dashboard bulk channel approvals are single-click, visibly busy, and campaign-specific", () => {
  const html = renderDashboardHtml();
  assert.match(html, /\/approval\/channel/);
  assert.match(html, /Approving…/);
  assert.match(html, /Approvals are campaign-specific/);
  assert.match(html, /Timeline refreshed/);
  assert.match(html, /button:disabled/);
});
