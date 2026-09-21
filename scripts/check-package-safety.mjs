import { existsSync, readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const expected = packageJson?.devDependencies?.typescript;
if (expected !== "5.8.3") {
  console.error(`PACKAGE SAFETY FAILED: expected devDependencies.typescript to be exactly 5.8.3, found ${String(expected)}`);
  process.exit(1);
}

if (existsSync("package-lock.json")) {
  const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
  const entry = lock?.packages?.["node_modules/typescript"];
  if (entry) {
    const resolved = typeof entry.resolved === "string" ? entry.resolved : "";
    if (entry.link === true || resolved.startsWith("../") || resolved.startsWith("..\\")) {
      console.error("PACKAGE SAFETY FAILED: package-lock.json contains a machine-specific TypeScript link.");
      process.exit(1);
    }
  }
}

console.log("package safety check passed");
