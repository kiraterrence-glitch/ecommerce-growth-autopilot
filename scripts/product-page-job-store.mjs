import {
  appendFile,
  mkdir,
  readFile,
} from "node:fs/promises";

import { dirname } from "node:path";

function normalizeJob(job) {
  if (
    !job ||
    typeof job !== "object" ||
    Array.isArray(job)
  ) {
    throw new Error("product page job must be an object");
  }

  if (
    typeof job.jobId !== "string" ||
    !job.jobId.trim()
  ) {
    throw new Error("product page jobId is required");
  }

  if (
    typeof job.updatedAt !== "string" ||
    !Number.isFinite(Date.parse(job.updatedAt))
  ) {
    throw new Error(
      "product page updatedAt must be ISO-like",
    );
  }

  if (
    !job.safety ||
    job.safety.externalWrites !== false ||
    job.safety.livePublishing !== false
  ) {
    throw new Error(
      "unsafe product page job rejected",
    );
  }

  return job;
}

export class JsonlProductPageJobStore {
  constructor(
    path = ".runtime/product-page-jobs.jsonl",
  ) {
    this.path = path;
  }

  async append(job) {
    const normalized = normalizeJob(job);

    await mkdir(
      dirname(this.path),
      { recursive: true },
    );

    await appendFile(
      this.path,
      `${JSON.stringify(normalized)}\n`,
      "utf8",
    );

    return normalized;
  }

  async all() {
    try {
      const raw = await readFile(this.path, "utf8");

      return raw
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line, index) => {
          try {
            return normalizeJob(JSON.parse(line));
          } catch (error) {
            throw new Error(
              `invalid product-page job line ${index + 1}: ${
                error instanceof Error
                  ? error.message
                  : String(error)
              }`,
            );
          }
        });
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        error.code === "ENOENT"
      ) {
        return [];
      }

      throw error;
    }
  }

  async get(jobId) {
    const jobs = await this.all();

    return (
      [...jobs]
        .reverse()
        .find((job) => job.jobId === jobId) ??
      null
    );
  }

  async list(limit = 20) {
    const jobs = await this.all();
    const latest = new Map();

    for (const job of [...jobs].reverse()) {
      if (!latest.has(job.jobId)) {
        latest.set(job.jobId, job);
      }
    }

    return [...latest.values()].slice(
      0,
      Math.max(
        1,
        Math.min(Number(limit) || 20, 100),
      ),
    );
  }
}
