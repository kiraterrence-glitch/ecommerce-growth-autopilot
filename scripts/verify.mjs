import { spawnSync } from "node:child_process";

const steps = [
  ["PACKAGE SAFETY", "npm", ["run", "package:check"]],
  ["HANDOFF STATE", "npm", ["run", "handoff:check"]],
  ["DEPENDENCIES", "npm", ["run", "deps:check"]],
  ["FORMAT", "npm", ["run", "format:check"]],
  ["LINT", "npm", ["run", "lint"]],
  ["TYPES", "npm", ["run", "typecheck"]],
  ["SECRETS", "npm", ["run", "secrets:check"]],
  ["N8N", "npm", ["run", "validate:n8n"]],
  ["POSTMAN", "npm", ["run", "validate:postman"]],
  ["BUILD", "npm", ["run", "build"]],
  ["N8N WORKFLOW CONTRACT", "node", ["scripts/n8n-workflow-contract.mjs"]],
  ["RESEARCH QUALITY", "node", ["scripts/check-research-quality.mjs"]],
  ["MARKETING QUALITY", "node", ["scripts/check-marketing-quality.mjs"]],
  ["TESTS", "npm", ["test"]],
];

for (const [label, command, args] of steps) {
  console.log(`\n=== ${label} ===`);
  const result = process.platform === "win32"
    ? spawnSync(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", `${command} ${args.join(" ")}`], { stdio: "inherit" })
    : spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) {
    console.error(`\nVERIFICATION FAILED at ${label}`);
    process.exit(result.status ?? 1);
  }
}
console.log("\nVERIFICATION PASSED");
