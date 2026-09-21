import { appendFile, mkdir, readFile } from "node:fs/promises";
import { dirname } from "node:path";

const VALID_TYPES = new Set(["research.analyzed", "campaign.generated", "approval.transition", "delivery.created", "n8n.engine_proof"]);

function normalizeEvent(event) {
  if (!event || typeof event !== "object" || Array.isArray(event)) throw new Error("history event must be an object");
  if (typeof event.eventId !== "string" || !event.eventId.trim()) throw new Error("history eventId is required");
  if (!VALID_TYPES.has(event.eventType)) throw new Error(`unsupported history eventType: ${event.eventType}`);
  if (typeof event.timestamp !== "string" || !Number.isFinite(Date.parse(event.timestamp))) throw new Error("history timestamp must be ISO-like");
  if (!event.payload || typeof event.payload !== "object" || Array.isArray(event.payload)) throw new Error("history payload must be an object");
  return {
    eventId: event.eventId.trim(),
    eventType: event.eventType,
    timestamp: event.timestamp,
    campaignId: typeof event.campaignId === "string" && event.campaignId.trim() ? event.campaignId.trim() : null,
    productId: typeof event.productId === "string" && event.productId.trim() ? event.productId.trim() : null,
    researchProjectId:
      typeof event.researchProjectId === "string" && event.researchProjectId.trim() ? event.researchProjectId.trim() : null,
    assetId: typeof event.assetId === "string" && event.assetId.trim() ? event.assetId.trim() : null,
    payload: event.payload,
  };
}

export class JsonlProjectHistoryStore {
  constructor(path = ".runtime/project-history.jsonl") {
    this.path = path;
  }

  async append(event) {
    const normalized = normalizeEvent(event);
    await mkdir(dirname(this.path), { recursive: true });
    await appendFile(this.path, `${JSON.stringify(normalized)}\n`, "utf8");
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
            return normalizeEvent(JSON.parse(line));
          } catch (error) {
            throw new Error(`invalid project-history line ${index + 1}: ${error instanceof Error ? error.message : String(error)}`);
          }
        });
    } catch (error) {
      if (error && typeof error === "object" && error.code === "ENOENT") return [];
      throw error;
    }
  }

  async list({ eventType = null, campaignId = null, limit = 50 } = {}) {
    const events = await this.all();
    const filtered = events.filter((event) => {
      if (eventType && event.eventType !== eventType) return false;
      if (campaignId && event.campaignId !== campaignId) return false;
      return true;
    });
    return filtered.slice(-Math.max(1, Math.min(Number(limit) || 50, 200))).reverse();
  }

  async getCampaign(campaignId) {
    const events = await this.list({ eventType: "campaign.generated", campaignId, limit: 200 });
    return events[0] ?? null;
  }

  async getLatestApproval(campaignId, assetId) {
    const events = await this.list({ eventType: "approval.transition", campaignId, limit: 200 });
    const match = events.find((event) => event.assetId === assetId);
    return match?.payload?.record ?? null;
  }

  async getLatestApprovals(campaignId) {
    const events = await this.list({ eventType: "approval.transition", campaignId, limit: 200 });
    const latest = new Map();
    for (const event of events) {
      if (!event.assetId || latest.has(event.assetId)) continue;
      if (event.payload?.record) latest.set(event.assetId, event.payload.record);
    }
    return Object.fromEntries(latest.entries());
  }
}
