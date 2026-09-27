import {
  createHash,
} from "node:crypto";

import {
  ContentIntelligenceStore,
} from "./content-intelligence-store.mjs";

import {
  analyzeContentIntelligence,
  generateContentActivationBriefs,
  validateContentIntelligenceDataset,
} from "../dist/content-intelligence/index.js";

function requiredText(
  value,
  field,
) {
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

export function deriveContentIntelligenceRunId(
  productId,
  records,
) {
  const canonicalProductId =
    requiredText(
      productId,
      "productId",
    );

  const encoded =
    JSON.stringify(
      records,
    );

  const digest =
    createHash(
      "sha256",
    )
      .update(
        canonicalProductId,
      )
      .update(
        "\u0000",
      )
      .update(
        encoded,
      )
      .digest(
        "hex",
      );

  return `content-${digest.slice(0, 24)}`;
}

function buildSafetySummary(
  briefs,
) {
  return {
    draftOnly:
      briefs.every(
        (brief) =>
          brief.safety.draftOnly === true,
      ),

    externalWrites:
      briefs.some(
        (brief) =>
          brief.safety.externalWrites === true,
      ),

    livePublishing:
      briefs.some(
        (brief) =>
          brief.safety.livePublishing === true,
      ),

    productFactPolicy:
      "verified_product_evidence_only",

    sourceContentPolicy:
      "messaging_signals_only",
  };
}

export class ProductContentIntelligenceService {
  constructor(
    databasePath =
      ".runtime/product-intelligence.sqlite",
  ) {
    this.store =
      new ContentIntelligenceStore(
        databasePath,
      );
  }

  close() {
    this.store.close();
  }

  analyzeAndPersist({
    productId,
    input,
    runId = null,
    createdAt =
      new Date().toISOString(),
  }) {
    const resolvedProductId =
      requiredText(
        productId,
        "productId",
      );

    const records =
      validateContentIntelligenceDataset(
        input,
      );

    const report =
      analyzeContentIntelligence(
        records,
      );

    const briefs =
      generateContentActivationBriefs(
        records,
      );

    const resolvedRunId =
      runId === null
        ? deriveContentIntelligenceRunId(
            resolvedProductId,
            records,
          )
        : requiredText(
            runId,
            "runId",
          );

    const persisted =
      this.store.persistSnapshot({
        runId:
          resolvedRunId,

        productId:
          resolvedProductId,

        records,

        report,

        briefs,

        createdAt,
      });

    const snapshot =
      this.store.getRun(
        resolvedRunId,
      );

    if (
      snapshot === null
    ) {
      throw new Error(
        `Persisted Content Intelligence run could not be reloaded: ${resolvedRunId}`,
      );
    }

    return {
      ...persisted,

      safety:
        buildSafetySummary(
          briefs,
        ),

      snapshot,
    };
  }

  listProductRuns(
    productId,
  ) {
    return this.store.listRuns(
      requiredText(
        productId,
        "productId",
      ),
    );
  }

  getRun(
    runId,
  ) {
    return this.store.getRun(
      requiredText(
        runId,
        "runId",
      ),
    );
  }

  getLatestProductIntelligence(
    productId,
  ) {
    const runs =
      this.listProductRuns(
        productId,
      );

    const latest =
      runs.at(
        -1,
      );

    if (
      latest === undefined
    ) {
      return null;
    }

    return this.getRun(
      latest.runId,
    );
  }
}
