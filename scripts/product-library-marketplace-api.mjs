import { MarketplaceEvidenceStore } from "./marketplace-evidence-store.mjs";
import { parseMarketplaceEvidenceCsv } from "./marketplace-evidence-csv.mjs";
import { buildMarketplaceLibraryPanel } from "./marketplace-library-view.mjs";

const MAX_JSON_BODY_BYTES = 256 * 1024;

function sendJson(response, status, value) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });

  response.end(`${JSON.stringify(value, null, 2)}\n`);
}

function apiError(message, code) {
  const error = new Error(message);
  error.code = code;

  return error;
}

function errorStatus(error) {
  switch (error?.code) {
    case "UNSUPPORTED_MEDIA_TYPE":
      return 415;

    case "BODY_TOO_LARGE":
      return 413;

    case "UNKNOWN_PRODUCT":
      return 404;

    case "SOURCE_ID_COLLISION":
    case "EVIDENCE_ID_COLLISION":
    case "DUPLICATE_SOURCE_FACT":
      return 409;

    default:
      return 400;
  }
}

async function readJsonBody(request) {
  const contentType = String(
    request.headers["content-type"] ?? "",
  ).toLowerCase();

  if (!contentType.startsWith("application/json")) {
    throw apiError(
      "Content-Type must be application/json.",
      "UNSUPPORTED_MEDIA_TYPE",
    );
  }

  let body = "";
  let byteLength = 0;
  let tooLarge = false;

  for await (const chunk of request) {
    const text = Buffer.isBuffer(chunk)
      ? chunk.toString("utf8")
      : String(chunk);

    byteLength += Buffer.byteLength(text, "utf8");

    if (byteLength > MAX_JSON_BODY_BYTES) {
      tooLarge = true;
      continue;
    }

    body += text;
  }

  if (tooLarge) {
    throw apiError(
      "Request body exceeds the 256 KiB local API limit.",
      "BODY_TOO_LARGE",
    );
  }

  if (!body.trim()) {
    throw apiError(
      "JSON request body is required.",
      "INVALID_JSON",
    );
  }

  try {
    return JSON.parse(body);
  } catch {
    throw apiError(
      "Request body is not valid JSON.",
      "INVALID_JSON",
    );
  }
}

export function createMarketplaceProductLibraryApi({
  repository,
  databasePath,
}) {
  if (!repository) {
    throw new Error("repository is required.");
  }

  if (!databasePath) {
    throw new Error("databasePath is required.");
  }

  const marketplaceStore =
    new MarketplaceEvidenceStore(databasePath);

  let closed = false;

  function snapshot(productId) {
    return repository.getSnapshot(productId);
  }

  function panel(productId) {
    const productSnapshot =
      snapshot(productId);

    if (!productSnapshot) {
      return null;
    }

    return buildMarketplaceLibraryPanel({
      product: productSnapshot.product,
      marketplaceStore,
    });
  }

  async function handle(
    request,
    response,
    url,
  ) {
    const evidenceMatch =
      /^\/api\/products\/([^/]+)\/marketplace\/evidence$/.exec(
        url.pathname,
      );

    const importMatch =
      /^\/api\/products\/([^/]+)\/marketplace\/import$/.exec(
        url.pathname,
      );

    const marketplaceMatch =
      /^\/api\/products\/([^/]+)\/marketplace$/.exec(
        url.pathname,
      );

    if (
      !evidenceMatch &&
      !importMatch &&
      !marketplaceMatch
    ) {
      return false;
    }

    try {
      if (
        request.method === "GET" &&
        evidenceMatch
      ) {
        const productId =
          decodeURIComponent(
            evidenceMatch[1],
          );

        if (!snapshot(productId)) {
          sendJson(
            response,
            404,
            {
              error: "product_not_found",
            },
          );

          return true;
        }

        sendJson(
          response,
          200,
          {
            productId,

            sources:
              marketplaceStore.listSources(
                productId,
              ),

            evidence:
              marketplaceStore.listEvidence(
                productId,
              ),

            summary:
              marketplaceStore.getProductSummary(
                productId,
              ),
          },
        );

        return true;
      }

      if (
        request.method === "GET" &&
        marketplaceMatch
      ) {
        const productId =
          decodeURIComponent(
            marketplaceMatch[1],
          );

        const marketplacePanel =
          panel(productId);

        if (!marketplacePanel) {
          sendJson(
            response,
            404,
            {
              error: "product_not_found",
            },
          );

          return true;
        }

        sendJson(
          response,
          200,
          marketplacePanel,
        );

        return true;
      }

      if (
        request.method === "POST" &&
        importMatch
      ) {
        const productId =
          decodeURIComponent(
            importMatch[1],
          );

        if (!snapshot(productId)) {
          sendJson(
            response,
            404,
            {
              error: "product_not_found",
            },
          );

          return true;
        }

        const body =
          await readJsonBody(request);

        if (
          typeof body?.csv !== "string" ||
          !body.csv.trim()
        ) {
          throw apiError(
            "csv is required.",
            "INVALID_CSV_REQUEST",
          );
        }

        const records =
          parseMarketplaceEvidenceCsv(
            body.csv,
          );

        if (
          records.some(
            (record) =>
              record.productId !==
              productId,
          )
        ) {
          throw apiError(
            "Every CSV row must match the product ID in the route.",
            "PRODUCT_ID_MISMATCH",
          );
        }

        const result =
          marketplaceStore.ingestRecords(
            records,
          );

        sendJson(
          response,
          result.insertedEvidence > 0
            ? 201
            : 200,
          {
            ok: true,

            productId,

            import: result,

            marketplace:
              panel(productId),
          },
        );

        return true;
      }

      sendJson(
        response,
        405,
        {
          error: "method_not_allowed",
        },
      );

      return true;
    } catch (error) {
      sendJson(
        response,
        errorStatus(error),
        {
          error:
            error?.code ??
            "invalid_request",

          message:
            error instanceof Error
              ? error.message
              : String(error),
        },
      );

      return true;
    }
  }

  function close() {
    if (!closed) {
      closed = true;
      marketplaceStore.close();
    }
  }

  return {
    handle,
    close,
    panel,
    marketplaceStore,
  };
}
