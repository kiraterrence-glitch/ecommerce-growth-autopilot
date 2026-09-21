import type { EmailCampaignDraft } from "../campaign/email.js";
import type { GoogleAdsDraft } from "../campaign/google.js";
import type { MetaCampaignDraft } from "../campaign/meta.js";
import type { ShopifyLandingPageDraft } from "../campaign/shopify.js";
import type { DeliveryArtifact, DeliveryChannel } from "./types.js";

export type DeliverableCampaignKit = Readonly<{
  meta: MetaCampaignDraft;
  email: EmailCampaignDraft;
  shopify: ShopifyLandingPageDraft;
  googleAds: GoogleAdsDraft;
}>;

export type ChannelDeliveryPlan = Readonly<{
  channel: DeliveryChannel;
  artifacts: readonly DeliveryArtifact[];
  payload: unknown;
}>;

export function buildChannelDeliveryPlan(channel: DeliveryChannel, kit: DeliverableCampaignKit): ChannelDeliveryPlan {
  switch (channel) {
    case "meta":
      return {
        channel,
        artifacts: kit.meta.ads.map((ad, index) => ({ assetId: `meta-${index}`, label: `${ad.angleName} ${ad.variant}` })),
        payload: kit.meta,
      };
    case "email":
      return {
        channel,
        artifacts: kit.email.emails.map((email, index) => ({ assetId: `email-${index}`, label: `${email.sequence} ${email.step}` })),
        payload: kit.email,
      };
    case "shopify":
      return {
        channel,
        artifacts: kit.shopify.sections.map((section, index) => ({ assetId: `shopify-${index}`, label: section.heading })),
        payload: kit.shopify,
      };
    case "google_ads":
      return {
        channel,
        artifacts: kit.googleAds.adGroups.map((group, index) => ({ assetId: `google-${index}`, label: group.angleName })),
        payload: kit.googleAds,
      };
  }
}
