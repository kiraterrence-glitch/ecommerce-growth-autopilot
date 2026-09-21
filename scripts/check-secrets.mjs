import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";

const textExtensions = new Set([".ts", ".mjs", ".json", ".md", ".yml", ".yaml", ".txt"]);
const excludedDirectories = new Set([".git", "dist", "node_modules", "coverage"]);
const excludedFiles = new Set([".env.example"]);
const rules = [
  ["OpenAI-like key", /\bsk-[A-Za-z0-9_-]{20,}\b/g],
  ["Anthropic-like key", /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g],
  ["GitHub token", /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g],
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/g],
  ["Private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
];
const failures = [];

async function walk(path) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue;
    if (entry.isFile() && excludedFiles.has(entry.name)) continue;
    const child = join(path, entry.name);
    if (entry.isDirectory()) {
      await walk(child);
      continue;
    }
    if (!textExtensions.has(extname(entry.name)) && !entry.name.startsWith(".env")) continue;
    const content = await readFile(child, "utf8");
    for (const [name, pattern] of rules) {
      pattern.lastIndex = 0;
      if (pattern.test(content)) failures.push(`${child}: possible ${name}`);
    }
  }
}

await walk(".");
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("secret scan passed");
