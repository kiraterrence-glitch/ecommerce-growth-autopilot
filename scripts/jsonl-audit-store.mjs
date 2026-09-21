import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

export class JsonlAuditStore {
  constructor(path) { this.path = path; }
  async append(event) {
    await mkdir(dirname(this.path), { recursive: true });
    await appendFile(this.path, `${JSON.stringify(event)}\n`, "utf8");
  }
}
