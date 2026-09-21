import { readFile } from "node:fs/promises";

function unquote(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export async function loadLocalEnv(path = ".env") {
  let content;
  try {
    content = await readFile(path, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return { loaded: false, path };
    throw error;
  }

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    const value = unquote(line.slice(separator + 1));
    if (!(key in process.env)) process.env[key] = value;
  }

  return { loaded: true, path };
}
