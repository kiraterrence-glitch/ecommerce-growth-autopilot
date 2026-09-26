export function buildMarketplaceLibraryPanel({
  product,
  marketplaceStore,
}) {
  if (!product?.id) {
    throw new Error(
      "Product is required.",
    );
  }

  const summary =
    marketplaceStore
      .getProductSummary(
        product.id,
      );

  const sources =
    marketplaceStore
      .listSources(
        product.id,
      );

  const evidence =
    marketplaceStore
      .listEvidence(
        product.id,
      );

  return {
    productId:
      product.id,

    title:
      product.title,

    status:
      summary.hasBlockingConflict
        ? "NEEDS_REVIEW"
        : summary.evidenceCount === 0
          ? "NO_MARKETPLACE_EVIDENCE"
          : "READY",

    summary,

    sources,

    evidence,

    warnings: [
      ...(summary.hasBlockingConflict
        ? [
            "Verified marketplace evidence contains unresolved conflicts.",
          ]
        : []),

      ...(summary.unverifiedEvidenceCount > 0
        ? [
            "Some marketplace evidence remains unverified.",
          ]
        : []),

      ...(summary.unknownRightsCount > 0
        ? [
            "Some source material has UNKNOWN_RIGHTS and cannot be automatically reused as media.",
          ]
        : []),
    ],
  };
}
