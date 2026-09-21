import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const failures = [];
async function walk(path) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) await walk(child);
    else if (entry.name.endsWith(".ts")) {
      const content = await readFile(child, "utf8");
      const lines = content.split("\n");
      lines.forEach((line, index) => {
        if (/\bany\b/.test(line) && !line.trim().startsWith("//")) failures.push(`${child}:${index + 1}: avoid explicit any`);
        if (/console\.(log|debug)\(/.test(line)) failures.push(`${child}:${index + 1}: no debug console output in core code`);
      });
    }
  }
}
await walk("src");
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("lint check passed");
