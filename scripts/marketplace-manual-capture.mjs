import { createHash } from "node:crypto";

import {
  classifyMarketplaceSource,
} from "./marketplace-source-policy.mjs";

function sha256(value) {
  return createHash("sha256")
    .update(value, "utf8")
    .digest("hex");
}

function requiredText(value, field) {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(
      `${field} is required.`,
    );
  }

  return value.trim();
}

export function detectHumanVerificationPage(html) {
  const text =
    String(html ?? "").toLowerCase();

  const indicators = [
    "verify you are human",
    "human verification",
    "security verification",
    "unusual traffic",
    "robot check",
    "captcha",
    "cf-chl-",
    "challenge-platform",
  ];

  return indicators.some(
    (indicator) => text.includes(indicator),
  );
}

function validateCapturedAt(value) {
  if (
    typeof value !== "string" ||
    !Number.isFinite(Date.parse(value))
  ) {
    throw new Error(
      "capturedAt must be a valid date/time.",
    );
  }

  return value;
}

export function captureUserProvidedHtml({
  sourceUrl,
  html,
  capturedAt =
    new Date().toISOString(),
}) {
  const source =
    classifyMarketplaceSource(sourceUrl);

  const body =
    requiredText(html, "html");

  validateCapturedAt(capturedAt);

  if (detectHumanVerificationPage(body)) {
    const error =
      new Error(
        "Human-verification page detected. No evidence was captured.",
      );

    error.code =
      "HUMAN_VERIFICATION_REQUIRED";

    throw error;
  }

  const contentHash =
    sha256(body);

  return {
    sourceId:
      `html-${contentHash.slice(0, 24)}`,

    sourceUrl:
      source.url,

    policyId:
      source.policy.id,

    captureMethod:
      "USER_PROVIDED_HTML",

    contentHash,

    capturedAt,

    automatedFetch:
      false,

    rightsStatus:
      source.policy.mediaRightsDefault,
  };
}

export function captureUserProvidedText({
  sourceUrl,
  text,
  capturedAt =
    new Date().toISOString(),
}) {
  const source =
    classifyMarketplaceSource(sourceUrl);

  const body =
    requiredText(text, "text");

  validateCapturedAt(capturedAt);

  const contentHash =
    sha256(body);

  return {
    sourceId:
      `text-${contentHash.slice(0, 24)}`,

    sourceUrl:
      source.url,

    policyId:
      source.policy.id,

    captureMethod:
      "USER_PROVIDED_TEXT",

    contentHash,

    capturedAt,

    automatedFetch:
      false,

    rightsStatus:
      source.policy.mediaRightsDefault,
  };
}
