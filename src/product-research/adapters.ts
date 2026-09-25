import type {
  ProductSourceAdapter,
  ProductSourceAdapterContext,
  SourceSnapshot,
} from "./types.js";

export async function extractWithAdapters(
  url: URL,
  context: ProductSourceAdapterContext,
  adapters: readonly ProductSourceAdapter[],
): Promise<SourceSnapshot> {
  const adapter =
    adapters.find((candidate) =>
      candidate.canHandle(url),
    );

  if (!adapter) {
    const capturedAt =
      context.capturedAt ??
      new Date().toISOString();

    return {
      sourceId: context.sourceId,
      sourceKind: context.sourceKind,
      sourceUrl: url.toString(),
      capturedAt,
      adapterId: "manual-fallback-v1",
      status:
        "MANUAL_CAPTURE_REQUIRED",
      rawFormat: "manual",
      evidence: [],
      warnings: [
        "No compatible automatic source adapter is installed for this URL.",
      ],
    };
  }

  try {
    return await adapter.extract(
      url,
      context,
    );
  } catch (error) {
    const capturedAt =
      context.capturedAt ??
      new Date().toISOString();

    return {
      sourceId: context.sourceId,
      sourceKind: context.sourceKind,
      sourceUrl: url.toString(),
      capturedAt,
      adapterId: adapter.id,
      status:
        "MANUAL_CAPTURE_REQUIRED",
      rawFormat: "manual",
      evidence: [],
      warnings: [
        `Automatic extraction failed safely: ${
          error instanceof Error
            ? error.message
            : String(error)
        }`,
      ],
    };
  }
}
