import type {
  DeliveryAdapter,
  DeliveryChannel,
  DeliveryMode,
  DeliveryRequest,
  DeliveryResult,
} from "./types.js";

const channels = new Set<DeliveryChannel>(["meta", "shopify", "google_ads", "email"]);
const modes = new Set<DeliveryMode>(["mock", "draft"]);

export class DeliveryBlockedError extends Error {
  readonly code: "unsupported_channel" | "unsupported_mode" | "approval_required" | "campaign_mismatch";

  constructor(
    code: "unsupported_channel" | "unsupported_mode" | "approval_required" | "campaign_mismatch",
    message: string,
  ) {
    super(message);
    this.name = "DeliveryBlockedError";
    this.code = code;
  }
}

export function assertDeliveryChannel(value: string): asserts value is DeliveryChannel {
  if (!channels.has(value as DeliveryChannel)) {
    throw new DeliveryBlockedError("unsupported_channel", `Unsupported delivery channel: ${value}`);
  }
}

export function assertDeliveryMode(value: string): asserts value is DeliveryMode {
  if (!modes.has(value as DeliveryMode)) {
    throw new DeliveryBlockedError(
      "unsupported_mode",
      `Unsupported delivery mode: ${value}. Only mock and draft are allowed; live writes are disabled.`,
    );
  }
}

function validateApprovalGate(request: DeliveryRequest): void {
  if (!request.campaignId.trim()) {
    throw new DeliveryBlockedError("campaign_mismatch", "A campaignId is required for delivery");
  }
  const approved = new Set(request.approvedAssetIds);
  const missing = request.artifacts.map((artifact) => artifact.assetId).filter((assetId) => !approved.has(assetId));
  if (missing.length > 0) {
    throw new DeliveryBlockedError(
      "approval_required",
      `Delivery blocked until all channel assets are approved: ${missing.join(", ")}`,
    );
  }
}

export function createLocalDeliveryAdapter(channelValue: string, modeValue: string): DeliveryAdapter {
  assertDeliveryChannel(channelValue);
  assertDeliveryMode(modeValue);
  const channel = channelValue;
  const mode = modeValue;

  return {
    channel,
    mode,
    externalWrite: false,
    deliver(request: DeliveryRequest): DeliveryResult {
      if (request.channel !== channel || request.mode !== mode) {
        throw new DeliveryBlockedError("campaign_mismatch", "Delivery request does not match adapter channel/mode");
      }
      validateApprovalGate(request);
      return {
        campaignId: request.campaignId,
        channel,
        mode,
        status: mode === "mock" ? "MOCKED" : "DRAFT_CREATED_LOCAL",
        adapterId: `local-${channel}-${mode}`,
        externalWrite: false,
        artifactCount: request.artifacts.length,
        payload: request.payload,
      };
    },
  };
}

export function getDeliveryCapabilities(): Readonly<{
  channels: readonly DeliveryChannel[];
  modes: readonly DeliveryMode[];
  liveSupported: false;
  externalWritesEnabled: false;
}> {
  return {
    channels: ["meta", "shopify", "google_ads", "email"],
    modes: ["mock", "draft"],
    liveSupported: false,
    externalWritesEnabled: false,
  };
}
