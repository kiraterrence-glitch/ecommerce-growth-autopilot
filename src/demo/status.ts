import type { ApprovalRecord } from "../approval/workflow.js";
import { buildChannelDeliveryPlan, type DeliverableCampaignKit } from "../publishing/plan.js";
import type { DeliveryChannel } from "../publishing/types.js";

export type DemoStepStatus = "PASS" | "WARNING" | "WAITING" | "BLOCKED";

export type DemoTimelineStep = Readonly<{
  id: string;
  label: string;
  status: DemoStepStatus;
  detail: string;
}>;

export type DemoStatusInput = Readonly<{
  campaignId: string;
  aiProvider: string;
  aiModel: string | null;
  researchUsed: boolean;
  researchQualityPassed: boolean | null;
  marketingQualityPassed: boolean;
  creativeCount: number;
  videoSceneCount: number;
  kit: DeliverableCampaignKit;
  approvals: Readonly<Record<string, ApprovalRecord>>;
  deliveredChannels: readonly DeliveryChannel[];
}>;

const deliveryChannels: readonly DeliveryChannel[] = ["meta", "shopify", "google_ads", "email"];

export function buildDemoStatus(input: DemoStatusInput): Readonly<{
  campaignId: string;
  aiProvider: string;
  aiModel: string | null;
  timeline: readonly DemoTimelineStep[];
  approvals: Readonly<{ approved: number; required: number }>;
  delivery: Readonly<{ completedChannels: readonly DeliveryChannel[]; requiredChannels: readonly DeliveryChannel[] }>;
  safety: Readonly<{ externalWrites: false; livePublishing: false; humanApprovalRequired: true }>;
}> {
  const requiredArtifacts = deliveryChannels.flatMap((channel) => buildChannelDeliveryPlan(channel, input.kit).artifacts);
  const approvedCount = requiredArtifacts.filter((artifact) => input.approvals[artifact.assetId]?.status === "APPROVED").length;
  const allApproved = approvedCount === requiredArtifacts.length && requiredArtifacts.length > 0;
  const delivered = new Set(input.deliveredChannels);
  const completedChannels = deliveryChannels.filter((channel) => delivered.has(channel));
  const allDelivered = completedChannels.length === deliveryChannels.length;

  const researchStep: DemoTimelineStep = input.researchUsed
    ? {
        id: "research",
        label: "Research evidence analyzed",
        status: input.researchQualityPassed ? "PASS" : "WARNING",
        detail: input.researchQualityPassed
          ? "Evidence, pricing, review themes, and economics passed the research quality gate."
          : "Research was supplied but did not report a passing quality state.",
      }
    : {
        id: "research",
        label: "Research evidence analyzed",
        status: "WARNING",
        detail: "No research evidence was supplied for this run; campaign generation used product data only.",
      };

  const approvalStep: DemoTimelineStep = {
    id: "approval",
    label: "Human approval",
    status: allApproved ? "PASS" : "WAITING",
    detail: `${approvedCount}/${requiredArtifacts.length} deliverable assets approved. Approval remains a human action.`,
  };

  const deliveryStep: DemoTimelineStep = allDelivered
    ? {
        id: "delivery",
        label: "Local draft delivery",
        status: "PASS",
        detail: `Local draft payloads created for ${completedChannels.join(", ")}; external writes remained disabled.`,
      }
    : allApproved
      ? {
          id: "delivery",
          label: "Local draft delivery",
          status: "WAITING",
          detail: `${completedChannels.length}/${deliveryChannels.length} local channel drafts created. No external platform writes occur.`,
        }
      : {
          id: "delivery",
          label: "Local draft delivery",
          status: "BLOCKED",
          detail: "Delivery is intentionally blocked until every asset for a channel is approved.",
        };

  return {
    campaignId: input.campaignId,
    aiProvider: input.aiProvider,
    aiModel: input.aiModel,
    timeline: [
      { id: "product", label: "Product validated", status: "PASS", detail: "Canonical product schema and normalization completed." },
      researchStep,
      {
        id: "brain",
        label: "Product Brain generated",
        status: "PASS",
        detail: `Structured AI output accepted from ${input.aiProvider}${input.aiModel ? ` · ${input.aiModel}` : ""}; schema and grounding checks completed.`,
      },
      {
        id: "campaign",
        label: "Campaign kit generated",
        status: "PASS",
        detail: "Meta, email, Shopify, Google Ads, Amazon, creative, and video draft layers were produced.",
      },
      {
        id: "marketing-quality",
        label: "Marketing quality gate",
        status: input.marketingQualityPassed ? "PASS" : "BLOCKED",
        detail: input.marketingQualityPassed
          ? "Prompt leakage, placeholders, CTA fit, channel constraints, and completeness checks passed."
          : "Marketing quality failed; downstream delivery must remain blocked.",
      },
      {
        id: "creative",
        label: "Creative plan generated",
        status: input.creativeCount > 0 && input.videoSceneCount > 0 ? "PASS" : "WARNING",
        detail: `${input.creativeCount} static creative draft(s) and ${input.videoSceneCount} video scene(s) are present.`,
      },
      approvalStep,
      deliveryStep,
    ],
    approvals: { approved: approvedCount, required: requiredArtifacts.length },
    delivery: { completedChannels, requiredChannels: deliveryChannels },
    safety: { externalWrites: false, livePublishing: false, humanApprovalRequired: true },
  };
}
