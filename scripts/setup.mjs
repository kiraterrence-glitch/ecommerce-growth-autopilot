import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const major = Number(process.versions.node.split(".")[0]);
if (!Number.isInteger(major) || major < 22) {
  console.error(`SETUP FAILED: Node.js 22+ is required. Found ${process.version}.`);
  process.exit(1);
}

const lockPath = "package-lock.json";
const tscBinary = process.platform === "win32" ? "node_modules/.bin/tsc.cmd" : "node_modules/.bin/tsc";
const tsPackage = join("node_modules", "typescript", "package.json");

function lockHasMachineSpecificTypescriptLink() {
  if (!existsSync(lockPath)) return false;
  try {
    const lock = JSON.parse(readFileSync(lockPath, "utf8"));
    const entry = lock?.packages?.["node_modules/typescript"];
    if (!entry) return false;
    const resolved = typeof entry.resolved === "string" ? entry.resolved : "";
    return entry.link === true || resolved.startsWith("../") || resolved.startsWith("..\\");
  } catch {
    return false;
  }
}

function runNpm(args) {
  const command = process.platform === "win32" ? (process.env.ComSpec || "cmd.exe") : "npm";
  const commandArgs = process.platform === "win32"
    ? ["/d", "/s", "/c", `npm ${args.join(" ")}`]
    : args;
  return spawnSync(command, commandArgs, { stdio: "inherit" });
}

function dependenciesPresent() {
  if (!existsSync(tsPackage) || !existsSync(tscBinary)) return false;
  try {
    return JSON.parse(readFileSync(tsPackage, "utf8")).version === "5.8.3";
  } catch {
    return false;
  }
}

console.log(`Node ${process.version} detected.`);

if (lockHasMachineSpecificTypescriptLink()) {
  console.warn("Detected a machine-specific TypeScript link in package-lock.json; regenerating the lockfile for this machine.");
  rmSync(lockPath, { force: true });
  rmSync(join("node_modules", "typescript"), { recursive: true, force: true });
  rmSync(tscBinary, { force: true });
}

if (dependenciesPresent()) {
  console.log("Project-local TypeScript 5.8.3 is already installed; skipping npm download.");
  console.log("\nSETUP COMPLETE");
  console.log(`Local TypeScript: ${tscBinary}`);
  console.log("Next run: npm run verify");
  process.exit(0);
}

console.log("Installing project-local development dependencies...");
let result = runNpm(["install", "--include=dev", "--no-audit", "--no-fund"]);

if (result.status !== 0 || !dependenciesPresent()) {
  console.warn("Standard install did not produce a local TypeScript binary; retrying with an explicit exact TypeScript install...");
  result = runNpm([
    "install",
    "--save-dev",
    "--save-exact",
    "typescript@5.8.3",
    "--include=dev",
    "--no-audit",
    "--no-fund",
  ]);
}

if (result.status !== 0 || !dependenciesPresent()) {
  console.error("SETUP FAILED: project-local TypeScript was not installed.");
  console.error(`Expected package: ${tsPackage}`);
  console.error(`Expected binary: ${tscBinary}`);
  console.error("Do not install TypeScript globally; the project requires a local dependency.");
  process.exit(result.status || 1);
}

if (lockHasMachineSpecificTypescriptLink()) {
  console.error("SETUP FAILED: npm generated a machine-specific TypeScript link in package-lock.json.");
  console.error("Delete package-lock.json and node_modules, then rerun setup.");
  process.exit(1);
}

console.log("\nSETUP COMPLETE");
console.log(`Local TypeScript: ${tscBinary}`);
console.log("Next run: npm run verify");
