import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import {
  MockAiProvider,
  analyzeResearchProject,
  assessMarketingQuality,
  assessResearchQuality,
  OllamaProvider,
  OllamaProviderError,
  ProductBrainValidationError,
  renderDashboardHtml,
  buildAmazonListingDraft,
  buildEmailCampaignDraft,
  buildGoogleAdsDraft,
  buildMetaCampaignDraft,
  buildShopifyLandingPageDraft,
  buildStaticCreativeDrafts,
  buildVideoStoryboardDraft,
  buildChannelDeliveryPlan,
  buildDemoStatus,
  createLocalDeliveryAdapter,
  DeliveryBlockedError,
  getDeliveryCapabilities,
  createProductResearchContext,
  generateProductBrain,
  getProductId,
  normalizeProduct,
  normalizeResearchProject,
  transitionApproval,
  validateProduct,
  validateResearchProject,
} from "../dist/index.js";
import { loadLocalEnv } from "./env.mjs";
import { JsonlAuditStore } from "./jsonl-audit-store.mjs";
import { JsonlProjectHistoryStore } from "./project-history-store.mjs";

await loadLocalEnv();

const host = process.env.LOCAL_API_HOST || "127.0.0.1";
const port = Number(process.env.LOCAL_API_PORT || 3001);
const providerName = (process.env.AI_PROVIDER || "mock").toLowerCase();
const aiModelName = providerName === "ollama" ? (process.env.OLLAMA_MODEL?.trim() || null) : "deterministic-mock";
const logLevel = (process.env.LOG_LEVEL || "info").toLowerCase();
const auditStore = new JsonlAuditStore(process.env.AUDIT_PATH || ".runtime/audit.jsonl");
const projectHistory = new JsonlProjectHistoryStore(process.env.PROJECT_HISTORY_PATH || ".runtime/project-history.jsonl");
const approvalBatchLocks = new Set();

function getRequestId(request) {
  const supplied = request.headers["x-request-id"];
  if (typeof supplied === "string" && supplied.trim()) return supplied.trim().slice(0, 128);
  return randomUUID();
}

function sendJson(response, status, payload, requestId) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "x-request-id": requestId,
  });
  response.end(JSON.stringify({ ...payload, requestId }));
}

function sendHtml(response, status, html, requestId) {
  response.writeHead(status, {
    "content-type": "text/html; charset=utf-8",
    "x-request-id": requestId,
    "content-security-policy": "default-src 'self' blob:; img-src 'self' blob: data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'",
  });
  response.end(html);
}

function logEvent(level, event, fields = {}) {
  if (logLevel === "silent") return;
  if (level === "debug" && logLevel !== "debug") return;
  const line = JSON.stringify({ timestamp: new Date().toISOString(), level, event, ...fields });
  if (level === "error") console.error(line);
  else console.log(line);
}

async function readJson(request) {
  let body = "";
  for await (const chunk of request) body += chunk;
  if (!body.trim()) return null;
  return JSON.parse(body);
}


function splitProductResearchPayload(input) {
  if (input && typeof input === "object" && !Array.isArray(input) && input.product) {
    return { productInput: input.product, researchInput: input.research ?? null };
  }
  return { productInput: input, researchInput: null };
}

function analyzeOptionalResearch(researchInput) {
  if (researchInput === null || researchInput === undefined) return null;
  const validation = validateResearchProject(researchInput);
  if (!validation.ok) return { ok: false, error: "invalid_research", issues: validation.issues };
  const project = normalizeResearchProject(validation.project);
  const analysis = analyzeResearchProject(project);
  const quality = assessResearchQuality(project, analysis);
  if (!quality.passed) return { ok: false, error: "research_quality_failed", quality };
  return { ok: true, project, analysis, quality, context: createProductResearchContext(analysis) };
}

function mockBrainFor(product) {
  const audiences = product.audiences.length > 0 ? product.audiences : ["online shoppers"];
  const benefits = product.benefits.length > 0 ? product.benefits : product.features.length > 0 ? product.features : [product.description];
  const primaryBenefit = benefits[0];
  const secondBenefit = benefits[1] || product.features[1] || primaryBenefit;
  return {
    audiences: audiences.slice(0, 3),
    painPoints: [
      `Need a practical option for ${product.title}`,
      `Want a product that fits ${audiences[0]?.toLowerCase() || "daily"} routines`,
      "Need clear product value before purchasing",
    ],
    benefits: [...new Set([primaryBenefit, secondBenefit, product.features[0] || primaryBenefit])],
    objections: [
      "Whether the product fits the buyer's routine",
      "Whether the listed features match the buyer's needs",
      "Whether the current price and offer provide enough value",
    ],
    buyingTriggers: [
      "Upcoming use case",
      "Need for a more convenient routine",
      "Current product offer",
    ],
    angles: [
      { name: "Use Case", hook: `${primaryBenefit}`, reason: `Connects ${product.title} with a practical customer use case` },
      { name: "Routine", hook: `${secondBenefit}`, reason: `Links the product to the routine of ${audiences[1] || audiences[0]}` },
      { name: "Feature", hook: `${product.features[0] || product.title}`, reason: "Leads with a listed product feature" },
    ],
    offerPositioning:
      product.offer.type === "none"
        ? `Current price: ${product.currency} ${product.price}`
        : product.offer.type === "percentage"
          ? `Current offer: ${product.offer.value}% off`
          : `Current offer: ${product.currency} ${product.offer.value} off`,
  };
}

function makeProvider(product) {
  if (providerName === "mock") return new MockAiProvider(mockBrainFor(product));
  if (providerName === "ollama") {
    const model = process.env.OLLAMA_MODEL?.trim();
    if (!model) throw new Error("OLLAMA_MODEL is required when AI_PROVIDER=ollama");
    return new OllamaProvider({
      baseUrl: process.env.OLLAMA_URL || "http://127.0.0.1:11434",
      model,
      timeoutMs: 120_000,
      think: (process.env.OLLAMA_THINK || "false").toLowerCase() === "true",
    });
  }
  throw new Error(`Unsupported AI_PROVIDER=${providerName}`);
}

async function getReadiness() {
  if (providerName === "mock") return { ready: true, aiProvider: providerName, mode: "deterministic_test" };
  if (providerName !== "ollama") {
    return { ready: false, aiProvider: providerName, reason: "unsupported_ai_provider" };
  }

  const baseUrl = (process.env.OLLAMA_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
  const model = process.env.OLLAMA_MODEL?.trim() || "";
  if (!model) {
    return { ready: false, aiProvider: providerName, reason: "ollama_model_not_configured" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch(`${baseUrl}/api/tags`, { signal: controller.signal });
    if (!response.ok) {
      return { ready: false, aiProvider: providerName, reason: `ollama_http_${response.status}` };
    }
    const payload = await response.json();
    const models = Array.isArray(payload.models)
      ? payload.models.map((entry) => entry?.name).filter((name) => typeof name === "string" && name)
      : [];
    if (!models.includes(model)) {
      return { ready: false, aiProvider: providerName, reason: "ollama_model_not_installed", model, models };
    }
    return { ready: true, aiProvider: providerName, model, ollamaUrl: baseUrl };
  } catch (error) {
    return {
      ready: false,
      aiProvider: providerName,
      reason: "ollama_unreachable",
      detail: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function startServer() {
  const server = createServer(async (request, response) => {
    const requestId = getRequestId(request);
    const startedAt = Date.now();

    try {
      const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);

      if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/dashboard")) {
        sendHtml(response, 200, renderDashboardHtml(), requestId);
        return;
      }

      if (request.method === "GET" && url.pathname === "/health") {
        sendJson(
          response,
          200,
          { ok: true, service: "ecom-growth-autopilot", aiProvider: providerName },
          requestId,
        );
        return;
      }

      if (request.method === "GET" && url.pathname === "/ready") {
        const readiness = await getReadiness();
        sendJson(response, readiness.ready ? 200 : 503, { ok: readiness.ready, ...readiness }, requestId);
        return;
      }


      if (request.method === "GET" && url.pathname === "/proof/latest") {
        const events = await projectHistory.list({ eventType: "n8n.engine_proof", limit: 1 });
        const latest = events[0] || null;
        if (!latest) {
          sendJson(response, 404, { ok: false, error: "proof_not_found" }, requestId);
          return;
        }
        sendJson(response, 200, { ok: true, proof: latest }, requestId);
        return;
      }

      if (request.method === "POST" && url.pathname === "/proof/assert-local-safety") {
        let input;
        try {
          input = await readJson(request);
        } catch {
          sendJson(response, 400, { ok: false, error: "invalid_json" }, requestId);
          return;
        }
        const status = input?.status ?? input;
        const timeline = Array.isArray(status?.timeline) ? status.timeline : [];
        const approval = timeline.find((step) => step?.id === "approval")?.status ?? null;
        const delivery = timeline.find((step) => step?.id === "delivery")?.status ?? null;
        const requiredPassStages = ["product", "research", "brain", "campaign", "marketing-quality", "creative"];
        const coreStagesPassed = requiredPassStages.every(
          (id) => timeline.find((step) => step?.id === id)?.status === "PASS",
        );
        const checks = {
          sourceResponseOk: input?.ok === true,
          hasCampaignId: typeof status?.campaignId === "string" && status.campaignId.length > 0,
          deterministicProvider: status?.aiProvider === "mock" && status?.aiModel === "deterministic-mock",
          coreStagesPassed,
          externalWritesDisabled: status?.safety?.externalWrites === false,
          livePublishingDisabled: status?.safety?.livePublishing === false,
          approvalWaiting: approval === "WAITING",
          deliveryBlocked: delivery === "BLOCKED",
        };
        if (!Object.values(checks).every(Boolean)) {
          sendJson(response, 422, { ok: false, error: "unsafe_or_invalid_proof", checks }, requestId);
          return;
        }
        const proof = {
          proofType: "local_n8n_engine",
          campaignId: status.campaignId,
          aiProvider: status.aiProvider,
          aiModel: status.aiModel,
          coreStagesPassed: true,
          externalWrites: false,
          livePublishing: false,
          approvalStatus: approval,
          deliveryStatus: delivery,
          verifiedAt: new Date().toISOString(),
        };
        await projectHistory.append({
          eventId: randomUUID(),
          eventType: "n8n.engine_proof",
          timestamp: proof.verifiedAt,
          campaignId: proof.campaignId,
          productId: null,
          researchProjectId: null,
          assetId: null,
          payload: proof,
        });
        sendJson(response, 200, { ok: true, proof }, requestId);
        return;
      }

      if (request.method === "GET" && url.pathname === "/delivery/capabilities") {
        sendJson(response, 200, { ok: true, ...getDeliveryCapabilities() }, requestId);
        return;
      }

      if (request.method === "GET" && url.pathname === "/history/campaigns") {
        const limit = Number(url.searchParams.get("limit") || 20);
        const events = await projectHistory.list({ eventType: "campaign.generated", limit });
        const campaigns = events.map((event) => ({
          campaignId: event.campaignId,
          productId: event.productId,
          createdAt: event.timestamp,
          productTitle: event.payload?.product?.title || null,
          aiProvider: event.payload?.aiProvider || null,
          aiModel: event.payload?.aiModel || null,
          researchUsed: Boolean(event.payload?.research),
          qualityPassed: event.payload?.quality?.passed === true,
        }));
        sendJson(response, 200, { ok: true, campaigns }, requestId);
        return;
      }

      if (request.method === "GET" && url.pathname === "/history/research") {
        const limit = Number(url.searchParams.get("limit") || 20);
        const events = await projectHistory.list({ eventType: "research.analyzed", limit });
        const runs = events.map((event) => ({
          eventId: event.eventId,
          researchProjectId: event.researchProjectId,
          createdAt: event.timestamp,
          confidence: event.payload?.analysis?.dataConfidence || null,
          qualityPassed: event.payload?.quality?.passed === true,
        }));
        sendJson(response, 200, { ok: true, runs }, requestId);
        return;
      }

      if (request.method === "GET" && url.pathname === "/history/campaign") {
        const campaignId = url.searchParams.get("campaignId") || "";
        if (!campaignId) {
          sendJson(response, 400, { ok: false, error: "campaign_id_required" }, requestId);
          return;
        }
        const event = await projectHistory.getCampaign(campaignId);
        if (!event) {
          sendJson(response, 404, { ok: false, error: "campaign_not_found" }, requestId);
          return;
        }
        sendJson(response, 200, { ok: true, campaignId, snapshot: event.payload }, requestId);
        return;
      }

      if (request.method === "GET" && url.pathname === "/history/approvals") {
        const campaignId = url.searchParams.get("campaignId") || "";
        if (!campaignId) {
          sendJson(response, 400, { ok: false, error: "campaign_id_required" }, requestId);
          return;
        }
        const approvals = await projectHistory.getLatestApprovals(campaignId);
        sendJson(response, 200, { ok: true, campaignId, approvals }, requestId);
        return;
      }

      if (request.method === "POST" && url.pathname === "/approval/channel") {
        let input;
        try {
          input = await readJson(request);
        } catch {
          sendJson(response, 400, { ok: false, error: "invalid_json" }, requestId);
          return;
        }
        const campaignId = typeof input?.campaignId === "string" ? input.campaignId.trim() : "";
        const channel = typeof input?.channel === "string" ? input.channel.trim() : "";
        const allowedChannels = new Set(["meta", "shopify", "google_ads", "email"]);
        if (!campaignId || !allowedChannels.has(channel)) {
          sendJson(response, 400, { ok: false, error: "invalid_channel_approval_request" }, requestId);
          return;
        }
        const lockKey = `${campaignId}:${channel}`;
        if (approvalBatchLocks.has(lockKey)) {
          sendJson(response, 409, { ok: false, error: "approval_batch_in_progress" }, requestId);
          return;
        }
        const campaignEvent = await projectHistory.getCampaign(campaignId);
        if (!campaignEvent) {
          sendJson(response, 404, { ok: false, error: "campaign_not_found" }, requestId);
          return;
        }
        approvalBatchLocks.add(lockKey);
        try {
          const plan = buildChannelDeliveryPlan(channel, campaignEvent.payload.kit);
          for (const artifact of plan.artifacts) {
            let current = await projectHistory.getLatestApproval(campaignId, artifact.assetId);
            if (!current) current = { assetId: artifact.assetId, status: "DRAFT", note: null };
            if (current.status === "APPROVED") continue;
            if (current.status !== "IN_REVIEW") {
              current = transitionApproval(current, "IN_REVIEW", null);
              await projectHistory.append({
                eventId: randomUUID(),
                eventType: "approval.transition",
                timestamp: new Date().toISOString(),
                campaignId,
                productId: null,
                researchProjectId: null,
                assetId: artifact.assetId,
                payload: { record: current },
              });
            }
            current = transitionApproval(current, "APPROVED", null);
            await projectHistory.append({
              eventId: randomUUID(),
              eventType: "approval.transition",
              timestamp: new Date().toISOString(),
              campaignId,
              productId: null,
              researchProjectId: null,
              assetId: artifact.assetId,
              payload: { record: current },
            });
          }
          const approvals = await projectHistory.getLatestApprovals(campaignId);
          const approvedCount = plan.artifacts.filter((artifact) => approvals[artifact.assetId]?.status === "APPROVED").length;
          sendJson(response, 200, { ok: true, campaignId, channel, approvedCount, total: plan.artifacts.length, approvals }, requestId);
        } catch (error) {
          sendJson(response, 409, { ok: false, error: "channel_approval_failed", message: error instanceof Error ? error.message : String(error) }, requestId);
        } finally {
          approvalBatchLocks.delete(lockKey);
        }
        return;
      }

      if (request.method === "POST" && url.pathname === "/approval/transition") {
        let input;
        try {
          input = await readJson(request);
        } catch {
          sendJson(response, 400, { ok: false, error: "invalid_json" }, requestId);
          return;
        }
        const statuses = new Set(["DRAFT", "IN_REVIEW", "APPROVED", "REJECTED"]);
        const campaignId = typeof input?.campaignId === "string" ? input.campaignId.trim() : "";
        const suppliedRecord = input?.record;
        const assetId =
          typeof input?.assetId === "string" && input.assetId.trim()
            ? input.assetId.trim()
            : typeof suppliedRecord?.assetId === "string"
              ? suppliedRecord.assetId.trim()
              : "";
        const next = input?.next;
        const note = typeof input?.note === "string" ? input.note : null;
        if (!assetId || !statuses.has(next)) {
          sendJson(response, 400, { ok: false, error: "invalid_approval_request" }, requestId);
          return;
        }
        let current = null;
        if (campaignId) current = await projectHistory.getLatestApproval(campaignId, assetId);
        if (!current && suppliedRecord && statuses.has(suppliedRecord.status)) {
          current = {
            assetId,
            status: suppliedRecord.status,
            note: typeof suppliedRecord.note === "string" ? suppliedRecord.note : null,
          };
        }
        if (!current) current = { assetId, status: "DRAFT", note: null };
        try {
          const updated = transitionApproval(current, next, note);
          if (campaignId) {
            await projectHistory.append({
              eventId: randomUUID(),
              eventType: "approval.transition",
              timestamp: new Date().toISOString(),
              campaignId,
              productId: null,
              researchProjectId: null,
              assetId,
              payload: { record: updated },
            });
          }
          sendJson(response, 200, { ok: true, campaignId: campaignId || null, record: updated, persisted: Boolean(campaignId) }, requestId);
        } catch (error) {
          sendJson(response, 409, { ok: false, error: "approval_transition_blocked", message: error instanceof Error ? error.message : String(error) }, requestId);
        }
        return;
      }

      if (request.method === "POST" && url.pathname === "/research/analyze") {
        let input;
        try {
          input = await readJson(request);
        } catch {
          sendJson(response, 400, { ok: false, error: "invalid_json" }, requestId);
          return;
        }
        const research = analyzeOptionalResearch(input);
        if (research === null) {
          sendJson(response, 400, { ok: false, error: "research_required" }, requestId);
          return;
        }
        if (!research.ok) {
          const status = research.error === "invalid_research" ? 400 : 422;
          sendJson(response, status, { ok: false, ...research }, requestId);
          return;
        }
        const researchRunId = randomUUID();
        await projectHistory.append({
          eventId: researchRunId,
          eventType: "research.analyzed",
          timestamp: new Date().toISOString(),
          campaignId: null,
          productId: null,
          researchProjectId: research.project.projectId,
          assetId: null,
          payload: { project: research.project, analysis: research.analysis, quality: research.quality },
        });
        sendJson(
          response,
          200,
          { ok: true, researchRunId, project: research.project, analysis: research.analysis, quality: research.quality },
          requestId,
        );
        return;
      }

      if (request.method === "POST" && url.pathname === "/product-brain") {
        let input;
        try {
          input = await readJson(request);
        } catch {
          sendJson(response, 400, { ok: false, error: "invalid_json" }, requestId);
          return;
        }

        const payload = splitProductResearchPayload(input);
        const validation = validateProduct(payload.productInput);
        if (!validation.ok) {
          sendJson(
            response,
            400,
            { ok: false, error: "invalid_product", issues: validation.issues },
            requestId,
          );
          return;
        }
        const research = analyzeOptionalResearch(payload.researchInput);
        if (research && !research.ok) {
          const status = research.error === "invalid_research" ? 400 : 422;
          sendJson(response, status, { ok: false, ...research }, requestId);
          return;
        }

        const product = normalizeProduct(validation.product);
        const brain = await generateProductBrain(
          product,
          makeProvider(product),
          research?.ok ? research.context : undefined,
        );
        await auditStore.append({
          eventId: requestId,
          timestamp: new Date().toISOString(),
          eventType: "product_brain.generated",
          productId: getProductId(product),
          provider: providerName,
          status: "success",
          durationMs: Date.now() - startedAt,
          details: { validated: true, angleCount: brain.angles.length },
        });
        sendJson(response, 200, { ok: true, product, brain, research: research?.ok ? research.analysis : null }, requestId);
        return;
      }

      if (request.method === "POST" && url.pathname === "/campaign-kit") {
        let input;
        try {
          input = await readJson(request);
        } catch {
          sendJson(response, 400, { ok: false, error: "invalid_json" }, requestId);
          return;
        }
        const payload = splitProductResearchPayload(input);
        const validation = validateProduct(payload.productInput);
        if (!validation.ok) {
          sendJson(response, 400, { ok: false, error: "invalid_product", issues: validation.issues }, requestId);
          return;
        }
        const research = analyzeOptionalResearch(payload.researchInput);
        if (research && !research.ok) {
          const status = research.error === "invalid_research" ? 400 : 422;
          sendJson(response, status, { ok: false, ...research }, requestId);
          return;
        }
        const product = normalizeProduct(validation.product);
        const brain = await generateProductBrain(
          product,
          makeProvider(product),
          research?.ok ? research.context : undefined,
        );
        const kit = {
          meta: buildMetaCampaignDraft(product, brain),
          email: buildEmailCampaignDraft(product, brain),
          shopify: buildShopifyLandingPageDraft(product, brain),
          googleAds: buildGoogleAdsDraft(product, brain),
          amazon: product.channels.amazon ? buildAmazonListingDraft(product, brain) : null,
          creatives: buildStaticCreativeDrafts(product, brain),
          videoStoryboard: buildVideoStoryboardDraft(product, brain),
        };
        const quality = assessMarketingQuality({ product, brain, ...kit });
        if (!quality.passed) {
          sendJson(response, 422, { ok: false, error: "marketing_quality_failed", quality }, requestId);
          return;
        }
        const campaignId = randomUUID();
        await auditStore.append({
          eventId: requestId,
          timestamp: new Date().toISOString(),
          eventType: "campaign_kit.generated",
          productId: getProductId(product),
          provider: providerName,
          status: "success",
          durationMs: Date.now() - startedAt,
          details: { campaignId, metaAds: kit.meta.ads.length, emails: kit.email.emails.length, googleAdGroups: kit.googleAds.adGroups.length, researchUsed: Boolean(research?.ok), researchConfidence: research?.ok ? research.analysis.dataConfidence : null },
        });
        await projectHistory.append({
          eventId: randomUUID(),
          eventType: "campaign.generated",
          timestamp: new Date().toISOString(),
          campaignId,
          productId: getProductId(product),
          researchProjectId: research?.ok ? research.project.projectId : null,
          assetId: null,
          payload: {
            aiProvider: providerName,
            aiModel: aiModelName,
            product,
            brain,
            research: research?.ok ? research.analysis : null,
            researchQuality: research?.ok ? research.quality : null,
            kit,
            quality,
          },
        });
        sendJson(response, 200, { ok: true, campaignId, aiProvider: providerName, aiModel: aiModelName, product, brain, research: research?.ok ? research.analysis : null, researchQuality: research?.ok ? research.quality : null, kit, quality }, requestId);
        return;
      }

      if (request.method === "GET" && url.pathname === "/demo/status") {
        const campaignId = url.searchParams.get("campaignId") || "";
        if (!campaignId) {
          sendJson(response, 400, { ok: false, error: "campaign_id_required" }, requestId);
          return;
        }
        const campaignEvent = await projectHistory.getCampaign(campaignId);
        if (!campaignEvent) {
          sendJson(response, 404, { ok: false, error: "campaign_not_found" }, requestId);
          return;
        }
        const approvals = await projectHistory.getLatestApprovals(campaignId);
        const deliveryEvents = await projectHistory.list({ eventType: "delivery.created", campaignId, limit: 200 });
        const deliveredChannels = [
          ...new Set(
            deliveryEvents
              .map((event) => event.payload?.result?.channel)
              .filter((channel) => typeof channel === "string"),
          ),
        ];
        const snapshot = campaignEvent.payload;
        const status = buildDemoStatus({
          campaignId,
          aiProvider: snapshot.aiProvider || "unknown",
          aiModel: snapshot.aiModel || null,
          researchUsed: Boolean(snapshot.research),
          researchQualityPassed: snapshot.researchQuality?.passed ?? null,
          marketingQualityPassed: snapshot.quality?.passed === true,
          creativeCount: Array.isArray(snapshot.kit?.creatives) ? snapshot.kit.creatives.length : 0,
          videoSceneCount: Array.isArray(snapshot.kit?.videoStoryboard?.scenes) ? snapshot.kit.videoStoryboard.scenes.length : 0,
          kit: snapshot.kit,
          approvals,
          deliveredChannels,
        });
        sendJson(response, 200, { ok: true, status }, requestId);
        return;
      }

      if (request.method === "POST" && url.pathname === "/delivery/draft") {
        let input;
        try {
          input = await readJson(request);
        } catch {
          sendJson(response, 400, { ok: false, error: "invalid_json" }, requestId);
          return;
        }
        const campaignId = typeof input?.campaignId === "string" ? input.campaignId.trim() : "";
        const channel = typeof input?.channel === "string" ? input.channel.trim() : "";
        const mode = typeof input?.mode === "string" ? input.mode.trim() : "draft";
        if (!campaignId || !channel) {
          sendJson(response, 400, { ok: false, error: "invalid_delivery_request" }, requestId);
          return;
        }
        const campaignEvent = await projectHistory.getCampaign(campaignId);
        if (!campaignEvent) {
          sendJson(response, 404, { ok: false, error: "campaign_not_found" }, requestId);
          return;
        }
        try {
          const adapter = createLocalDeliveryAdapter(channel, mode);
          const plan = buildChannelDeliveryPlan(adapter.channel, campaignEvent.payload.kit);
          const approvals = await projectHistory.getLatestApprovals(campaignId);
          const approvedAssetIds = Object.values(approvals)
            .filter((record) => record?.status === "APPROVED")
            .map((record) => record.assetId);
          const result = adapter.deliver({
            campaignId,
            channel: adapter.channel,
            mode: adapter.mode,
            artifacts: plan.artifacts,
            approvedAssetIds,
            payload: plan.payload,
          });
          await projectHistory.append({
            eventId: randomUUID(),
            eventType: "delivery.created",
            timestamp: new Date().toISOString(),
            campaignId,
            productId: campaignEvent.productId,
            researchProjectId: campaignEvent.researchProjectId,
            assetId: null,
            payload: { result },
          });
          sendJson(response, 200, { ok: true, result }, requestId);
        } catch (error) {
          if (error instanceof DeliveryBlockedError) {
            sendJson(response, error.code === "approval_required" ? 409 : 400, { ok: false, error: error.code, message: error.message }, requestId);
          } else {
            throw error;
          }
        }
        return;
      }

      sendJson(response, 404, { ok: false, error: "not_found" }, requestId);
    } catch (error) {
      if (error instanceof ProductBrainValidationError) {
        sendJson(
          response,
          422,
          { ok: false, error: "ai_output_invalid", issues: error.issues },
          requestId,
        );
      } else if (error instanceof OllamaProviderError) {
        sendJson(
          response,
          502,
          { ok: false, error: "ai_provider_error", code: error.code, message: error.message },
          requestId,
        );
      } else {
        sendJson(
          response,
          500,
          {
            ok: false,
            error: "internal_error",
            message: error instanceof Error ? error.message : String(error),
          },
          requestId,
        );
      }
      logEvent("error", "request_failed", {
        requestId,
        method: request.method,
        path: request.url,
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
      });
      return;
    } finally {
      logEvent("debug", "request_complete", {
        requestId,
        method: request.method,
        path: request.url,
        durationMs: Date.now() - startedAt,
      });
    }
  });

  server.listen(port, host, () => {
    logEvent("info", "server_started", {
      url: `http://${host}:${port}`,
      aiProvider: providerName,
    });
  });
  return server;
}

const directEntryUrl = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (directEntryUrl && import.meta.url === directEntryUrl) {
  startServer();
}
