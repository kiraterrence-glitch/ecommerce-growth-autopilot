import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";

const roots = ["src", "tests", "scripts", "docs", ".github", "n8n", "postman"];
const extensions = new Set([".ts", ".mjs", ".md", ".json", ".yml", ".yaml"]);
const failures = [];

async function walk(path) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) await walk(child);
    else if (extensions.has(extname(entry.name))) {
      const content = await readFile(child, "utf8");
      const lines = content.split("\n");
      lines.forEach((line, index) => {
        if (/[ \t]+$/.test(line)) failures.push(`${child}:${index + 1}: trailing whitespace`);
        if (line.includes("\t")) failures.push(`${child}:${index + 1}: tab character`);
      });
      if (content.length > 0 && !content.endsWith("\n")) failures.push(`${child}: missing final newline`);
    }
  }
}

for (const root of roots) await walk(root);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("format check passed");
