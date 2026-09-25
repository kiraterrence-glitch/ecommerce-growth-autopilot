import type {
  ProductAssetCandidate,
  SourceSnapshot,
} from "./types.js";

function assetId(
  sourceId: string,
  sequence: number,
): string {
  return `${sourceId}-asset-${String(sequence).padStart(3, "0")}`;
}

export function discoverProductAssets(
  snapshot: SourceSnapshot,
): readonly ProductAssetCandidate[] {
  const seen =
    new Set<string>();

  const assets:
    ProductAssetCandidate[] = [];

  for (
    const evidence of
    snapshot.evidence
  ) {
    let kind:
      | "image"
      | "video"
      | null = null;

    if (
      evidence.field ===
      "Image URL"
    ) {
      kind = "image";
    }

    if (
      evidence.field ===
      "Video URL"
    ) {
      kind = "video";
    }

    if (!kind) continue;

    const sourceUrl =
      evidence.rawValue.trim();

    if (
      !/^https:\/\//i.test(
        sourceUrl,
      )
    ) {
      continue;
    }

    const key =
      `${kind}:${sourceUrl}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

    assets.push({
      assetId:
        assetId(
          snapshot.sourceId,
          assets.length + 1,
        ),
      sourceEvidenceId:
        evidence.evidenceId,
      sourceId:
        snapshot.sourceId,
      kind,
      sourceUrl,
      rightsStatus:
        "UNKNOWN_RIGHTS",
    });
  }

  return assets;
}
