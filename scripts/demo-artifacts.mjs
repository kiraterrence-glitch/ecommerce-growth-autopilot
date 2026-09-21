import { mkdir, writeFile } from "node:fs/promises";
import {
  assessMarketingQuality,
  buildAmazonListingDraft,
  buildEmailCampaignDraft,
  buildGoogleAdsDraft,
  buildMetaCampaignDraft,
  buildShopifyLandingPageDraft,
  buildStaticCreativeDrafts,
  buildVideoStoryboardDraft,
} from "../dist/index.js";

export function buildCampaignKit(product, brain, metadata, research = null) {
  const creatives = buildStaticCreativeDrafts(product, brain);
  const videoStoryboard = buildVideoStoryboardDraft(product, brain);
  const kit = {
    metadata,
    product,
    brain,
    research,
    meta: buildMetaCampaignDraft(product, brain),
    email: buildEmailCampaignDraft(product, brain),
    shopify: buildShopifyLandingPageDraft(product, brain),
    googleAds: buildGoogleAdsDraft(product, brain),
    amazon: product.channels.amazon ? buildAmazonListingDraft(product, brain) : null,
    creatives,
    videoStoryboard,
  };
  const quality = assessMarketingQuality(kit);
  return { kit, quality };
}

export async function writeCampaignArtifacts(output, kit, quality) {
  await mkdir(output, { recursive: true });
  await writeFile(`${output}/campaign-kit.json`, JSON.stringify(kit, null, 2), "utf8");
  await writeFile(`${output}/marketing-quality-report.json`, JSON.stringify(quality, null, 2), "utf8");
  await writeFile(`${output}/landing-page.html`, kit.shopify.html, "utf8");
  await writeFile(`${output}/video-storyboard.json`, JSON.stringify(kit.videoStoryboard, null, 2), "utf8");
  for (const creative of kit.creatives) await writeFile(`${output}/${creative.id}.svg`, creative.svg, "utf8");
}

export async function writeResearchArtifacts(output, analysis, quality) {
  if (!analysis || !quality) return;
  await mkdir(output, { recursive: true });
  await writeFile(`${output}/research-analysis.json`, JSON.stringify(analysis, null, 2), "utf8");
  await writeFile(`${output}/research-quality-report.json`, JSON.stringify(quality, null, 2), "utf8");
}
