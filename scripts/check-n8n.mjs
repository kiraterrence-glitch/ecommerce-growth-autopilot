import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const directory = "n8n/workflows";
const files = (await readdir(directory)).filter((name) => name.endsWith(".json"));
const webhookPaths = new Set();
const workflowIds = new Set();

for (const file of files) {
  const path = join(directory, file);
  const workflow = JSON.parse(await readFile(path, "utf8"));
  if (typeof workflow.id !== "string" || !/^[A-Za-z0-9_-]{8,64}$/.test(workflow.id)) throw new Error(`${path}: import-compatible workflow id is required`);
  if (workflowIds.has(workflow.id)) throw new Error(`${path}: duplicate workflow id ${workflow.id}`);
  workflowIds.add(workflow.id);
  if (!Array.isArray(workflow.nodes)) throw new Error(`${path}: nodes must be an array`);
  if (!workflow.connections || typeof workflow.connections !== "object") throw new Error(`${path}: connections must be an object`);
  if (workflow.active === true) throw new Error(`${path}: portfolio exports must be inactive by default`);
  if (workflow.pinData && Object.keys(workflow.pinData).length > 0) throw new Error(`${path}: pinned execution data is not allowed`);

  const serialized = JSON.stringify(workflow);
  if (/"credentials"\s*:/.test(serialized)) throw new Error(`${path}: credential references are not allowed in committed exports`);

  for (const node of workflow.nodes) {
    if (["n8n-nodes-base.code", "n8n-nodes-base.function", "n8n-nodes-base.functionItem"].includes(node.type)) {
      throw new Error(`${path}: business logic must stay out of n8n Code/Function nodes`);
    }
    if (node.type === "n8n-nodes-base.httpRequest") {
      const url = node.parameters?.url;
      if (typeof url !== "string" || !/^=?http:\/\/(?:host\.docker\.internal|127\.0\.0\.1|localhost):(?:3001|3011)\//.test(url)) {
        throw new Error(`${path}: committed HTTP Request nodes must target the local API only; got ${String(url)}`);
      }
    }
    if (node.type === "n8n-nodes-base.webhook") {
      const webhookPath = node.parameters?.path;
      if (typeof webhookPath !== "string" || !webhookPath.trim()) throw new Error(`${path}: webhook path is required`);
      if (webhookPaths.has(webhookPath)) throw new Error(`${path}: duplicate webhook path ${webhookPath}`);
      webhookPaths.add(webhookPath);
    }
  }
}
console.log(`n8n validation passed (${files.length} workflow exports; local-only HTTP, no Code nodes, no credentials)`);
