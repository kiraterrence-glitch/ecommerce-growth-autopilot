import {
  ProductContentIntelligenceService,
} from "./content-intelligence-product-service.mjs";

function json(
  response,
  status,
  body,
) {
  response.writeHead(
    status,
    {
      "content-type":
        "application/json; charset=utf-8",

      "cache-control":
        "no-store",
    },
  );

  response.end(
    JSON.stringify(
      body,
    ),
  );
}

async function readJson(
  request,
) {
  const contentType =
    String(
      request.headers["content-type"] ??
        "",
    ).toLowerCase();

  if (
    !contentType.startsWith(
      "application/json",
    )
  ) {
    throw Object.assign(
      new Error(
        "Content-Type must be application/json.",
      ),
      {
        statusCode:
          415,
      },
    );
  }

  let raw =
    "";

  for await (
    const chunk
    of request
  ) {
    raw +=
      chunk.toString(
        "utf8",
      );

    if (
      raw.length >
      1_000_000
    ) {
      throw Object.assign(
        new Error(
          "Request body is too large.",
        ),
        {
          statusCode:
            413,
        },
      );
    }
  }

  if (!raw.trim()) {
    throw Object.assign(
      new Error(
        "JSON body is required.",
      ),
      {
        statusCode:
          400,
      },
    );
  }

  try {
    return JSON.parse(
      raw,
    );
  } catch {
    throw Object.assign(
      new Error(
        "Malformed JSON body.",
      ),
      {
        statusCode:
          400,
      },
    );
  }
}

function productExists(
  repository,
  productId,
) {
  return Boolean(
    repository.getSnapshot(
      productId,
    ),
  );
}

export function createContentIntelligenceProductLibraryApi({
  repository,
  databasePath,
}) {
  const service =
    new ProductContentIntelligenceService(
      databasePath,
    );

  return {
    close() {
      service.close();
    },

    latest(
      productId,
    ) {
      return service
        .getLatestProductIntelligence(
          productId,
        );
    },

    async handle(
      request,
      response,
      url,
    ) {
      const latestMatch =
        /^\/api\/products\/([^/]+)\/content-intelligence$/.exec(
          url.pathname,
        );

      const runMatch =
        /^\/api\/products\/([^/]+)\/content-intelligence\/runs\/([^/]+)$/.exec(
          url.pathname,
        );

      if (
        request.method ===
          "GET" &&
        latestMatch
      ) {
        const productId =
          decodeURIComponent(
            latestMatch[1],
          );

        if (
          !productExists(
            repository,
            productId,
          )
        ) {
          json(
            response,
            404,
            {
              error:
                "PRODUCT_NOT_FOUND",

              productId,
            },
          );

          return true;
        }

        const runs =
          service.listProductRuns(
            productId,
          );

        const latest =
          service
            .getLatestProductIntelligence(
              productId,
            );

        json(
          response,
          200,
          {
            productId,

            status:
              latest === null
                ? "NO_CONTENT_INTELLIGENCE"
                : "READY",

            safety: {
              sourceContentPolicy:
                "messaging_signals_only",

              productFactPolicy:
                "verified_product_evidence_only",

              externalWrites:
                false,

              livePublishing:
                false,
            },

            runs,

            latest,
          },
        );

        return true;
      }

      if (
        request.method ===
          "GET" &&
        runMatch
      ) {
        const productId =
          decodeURIComponent(
            runMatch[1],
          );

        const runId =
          decodeURIComponent(
            runMatch[2],
          );

        if (
          !productExists(
            repository,
            productId,
          )
        ) {
          json(
            response,
            404,
            {
              error:
                "PRODUCT_NOT_FOUND",

              productId,
            },
          );

          return true;
        }

        const run =
          service.getRun(
            runId,
          );

        if (
          run === null ||
          run.productId !==
            productId
        ) {
          json(
            response,
            404,
            {
              error:
                "CONTENT_INTELLIGENCE_RUN_NOT_FOUND",

              productId,
              runId,
            },
          );

          return true;
        }

        json(
          response,
          200,
          {
            productId,
            run,
          },
        );

        return true;
      }

      if (
        request.method ===
          "POST" &&
        latestMatch
      ) {
        const productId =
          decodeURIComponent(
            latestMatch[1],
          );

        if (
          !productExists(
            repository,
            productId,
          )
        ) {
          json(
            response,
            404,
            {
              error:
                "PRODUCT_NOT_FOUND",

              productId,
            },
          );

          return true;
        }

        try {
          const body =
            await readJson(
              request,
            );

          if (
            typeof body !==
              "object" ||
            body === null ||
            !Array.isArray(
              body.input,
            )
          ) {
            json(
              response,
              400,
              {
                error:
                  "INVALID_CONTENT_INTELLIGENCE_INPUT",

                message:
                  "JSON body must contain an input array.",
              },
            );

            return true;
          }

          const result =
            service.analyzeAndPersist({
              productId,

              input:
                body.input,

              ...(typeof body.runId ===
                "string" &&
              body.runId.trim()
                ? {
                    runId:
                      body.runId,
                  }
                : {}),

              ...(typeof body.createdAt ===
                "string" &&
              body.createdAt.trim()
                ? {
                    createdAt:
                      body.createdAt,
                  }
                : {}),
            });

          json(
            response,
            201,
            {
              status:
                "CREATED",

              productId,

              externalWrites:
                false,

              livePublishing:
                false,

              result,
            },
          );

          return true;
        } catch (error) {
          const status =
            Number.isInteger(
              error?.statusCode,
            )
              ? error.statusCode
              : 400;

          json(
            response,
            status,
            {
              error:
                "CONTENT_INTELLIGENCE_REQUEST_FAILED",

              message:
                error instanceof Error
                  ? error.message
                  : String(
                      error,
                    ),
            },
          );

          return true;
        }
      }

      return false;
    },
  };
}
