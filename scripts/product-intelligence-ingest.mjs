function array(value) {
  return Array.isArray(value) ? value : [];
}

function requiredText(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} is required`);
  }

  return value;
}

export function persistProductIntelligenceBundle(repository, bundle) {
  if (!bundle || typeof bundle !== "object") {
    throw new Error("product intelligence bundle is required");
  }

  const product = bundle.product;

  if (!product || typeof product !== "object") {
    throw new Error("bundle.product is required");
  }

  requiredText(product.id, "product.id");
  requiredText(product.fingerprint, "product.fingerprint");

  const existing = repository.getProductByFingerprint(product.fingerprint);

  if (existing) {
    return {
      created: false,
      product: existing,
      snapshot: repository.getSnapshot(existing.id),
    };
  }

  repository.transaction(() => {
    repository.createProduct(product);

    for (const revision of array(bundle.revisions)) {
      repository.addRevision(revision);
    }

    for (const variant of array(bundle.variants)) {
      repository.addVariant(variant);
    }

    for (const source of array(bundle.sources)) {
      repository.addSource(source);
    }

    for (const evidence of array(bundle.evidence)) {
      repository.addEvidence(evidence);
    }

    for (const visual of array(bundle.visuals)) {
      repository.addVisualAsset(visual);
    }

    for (const draft of array(bundle.drafts)) {
      repository.addProductPageDraft(draft);
    }

    for (const qa of array(bundle.qaRuns)) {
      repository.addQaRun(qa);
    }

    for (const approval of array(bundle.approvals)) {
      repository.addApproval(approval);
    }
  });

  return {
    created: true,
    product: repository.getProduct(product.id),
    snapshot: repository.getSnapshot(product.id),
  };
}
