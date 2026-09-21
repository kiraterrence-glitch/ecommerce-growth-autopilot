import { existsSync } from "node:fs";
import { join } from "node:path";

const requiredPackages = ["typescript"];
const missingPackages = requiredPackages.filter(
  (packageName) => !existsSync(join("node_modules", packageName, "package.json")),
);

const tscBinary = process.platform === "win32" ? "node_modules/.bin/tsc.cmd" : "node_modules/.bin/tsc";

if (missingPackages.length > 0 || !existsSync(tscBinary)) {
  console.error("DEPENDENCY CHECK FAILED");
  if (missingPackages.length > 0) {
    console.error(`Missing local package(s): ${missingPackages.join(", ")}`);
  }
  if (!existsSync(tscBinary)) {
    console.error(`Missing local TypeScript binary: ${tscBinary}`);
  }
  console.error("Run: npm run setup");
  process.exit(1);
}

console.log("dependency check passed");
