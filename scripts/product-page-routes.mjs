import { randomUUID } from "node:crypto";

import {
  MockAiProvider,
  OllamaProvider,
  assessProductPageQuality,
  buildGemPagesManifest,
  buildProductPageBrief,
  buildProductPageMediaPlan,
  buildProductPageShopifyDraft,
  createProductPageJob,
  generateProductBrain,
  getProductId,
  normalizeProduct,
  parseSupplierUrl,
  renderProductPageDashboardHtml,
  transitionProductPageApproval,
  updateProductPageJobBuild,
  updateProductPageJobVerification,
  validateProduct,
  verifySpecifications,
} from "../dist/index.js";

import {
  buildDemoProductPagePreview,
} from "./product-preview-demo.mjs";
import {
  JsonlProductPageJobStore,
} from "./product-page-job-store.mjs";

let cachedStore = null;

function getStore() {
  if (!cachedStore) {
    cachedStore =
      new JsonlProductPageJobStore(
        process.env.PRODUCT_PAGE_JOB_PATH ||
        ".runtime/product-page-jobs.jsonl",
      );
  }

  return cachedStore;
}

function sendJson(
  response,
  status,
  payload,
  requestId,
) {
  response.writeHead(status, {
    "content-type":
      "application/json; charset=utf-8",
    "x-request-id": requestId,
  });

  response.end(
    JSON.stringify({
      ...payload,
      requestId,
    }),
  );
}

function sendHtml(
  response,
  status,
  html,
  requestId,
) {
  response.writeHead(status, {
    "content-type":
      "text/html; charset=utf-8",
    "x-request-id": requestId,
    "content-security-policy":
      "default-src 'self' blob:; " +
      "img-src 'self' blob: data: https:; " +
      "style-src 'unsafe-inline'; " +
      "script-src 'unsafe-inline'; " +
      "connect-src 'self'",
  });

  response.end(html);
}

async function readJson(request) {
  let body = "";

  for await (const chunk of request) {
    body += chunk;
  }

  if (!body.trim()) return null;

  return JSON.parse(body);
}

function mockBrainFor(product) {
  const audiences =
    product.audiences.length > 0
      ? product.audiences
      : ["online shoppers"];

  const benefits =
    product.benefits.length > 0
      ? product.benefits
      : product.features.length > 0
        ? product.features
        : [product.description];

  const primaryBenefit = benefits[0];

  const secondBenefit =
    benefits[1] ||
    product.features[1] ||
    primaryBenefit;

  return {
    audiences: audiences.slice(0, 3),

    painPoints: [
      `Need a practical option for ${product.title}`,
      `Want a product that fits ${
        audiences[0]?.toLowerCase() ||
        "daily"
      } routines`,
      "Need clear product value before purchasing",
    ],

    benefits: [
      ...new Set([
        primaryBenefit,
        secondBenefit,
        product.features[0] ||
        primaryBenefit,
      ]),
    ],

    objections: [
      "Whether the product fits the buyer's routine",
      "Whether the listed features match the buyer's needs",
      "Whether the current price and offer provide enough value",
    ],

    buyingTriggers: [
      "Upcoming use case",
      "Need for a more convenient routine",
      "Current product offer",
    ],

    angles: [
      {
        name: "Use Case",
        hook: `${primaryBenefit}`,
        reason:
          `Connects ${product.title} with a practical customer use case`,
      },
      {
        name: "Routine",
        hook: `${secondBenefit}`,
        reason:
          `Links the product to the routine of ${
            audiences[1] ||
            audiences[0]
          }`,
      },
      {
        name: "Feature",
        hook:
          `${product.features[0] ||
          product.title}`,
        reason:
          "Leads with a listed product feature",
      },
    ],

    offerPositioning:
      product.offer.type === "none"
        ? `Current price: ${product.currency} ${product.price}`
        : product.offer.type === "percentage"
          ? `Current offer: ${product.offer.value}% off`
          : `Current offer: ${product.currency} ${product.offer.value} off`,
  };
}

function makeProvider(product) {
  const providerName =
    (
      process.env.AI_PROVIDER ||
      "mock"
    ).toLowerCase();

  if (providerName === "mock") {
    return new MockAiProvider(
      mockBrainFor(product),
    );
  }

  if (providerName === "ollama") {
    const model =
      process.env.OLLAMA_MODEL?.trim();

    if (!model) {
      throw new Error(
        "OLLAMA_MODEL is required when AI_PROVIDER=ollama",
      );
    }

    return new OllamaProvider({
      baseUrl:
        process.env.OLLAMA_URL ||
        "http://127.0.0.1:11434",
      model,
      timeoutMs: 120_000,
      think:
        (
          process.env.OLLAMA_THINK ||
          "false"
        ).toLowerCase() === "true",
    });
  }

  throw new Error(
    `Unsupported AI_PROVIDER=${providerName}`,
  );
}

async function getRequiredJob(
  input,
  response,
  requestId,
) {
  const jobId =
    typeof input?.jobId === "string"
      ? input.jobId.trim()
      : "";

  if (!jobId) {
    sendJson(
      response,
      400,
      {
        ok: false,
        error: "job_id_required",
      },
      requestId,
    );

    return null;
  }

  const job =
    await getStore().get(jobId);

  if (!job) {
    sendJson(
      response,
      404,
      {
        ok: false,
        error:
          "product_page_job_not_found",
      },
      requestId,
    );

    return null;
  }

  return job;
}

export async function handleProductPageRoute({
  request,
  response,
  url,
  requestId,
}) {
  if (
    !url.pathname.startsWith(
      "/product-page",
    )
  ) {
    return false;
  }

  if (
    request.method === "GET" &&
    url.pathname === "/product-page"
  ) {
    sendHtml(
      response,
      200,
      renderProductPageDashboardHtml(),
      requestId,
    );

    return true;
  }

  if (
    request.method === "GET" &&
    url.pathname ===
      "/product-page/preview-demo"
  ) {
    const {
      preview,
    } =
      buildDemoProductPagePreview();

    sendHtml(
      response,
      200,
      preview.html,
      requestId,
    );

    return true;
  }
  if (
    request.method === "GET" &&
    url.pathname ===
      "/product-page/capabilities"
  ) {
    sendJson(
      response,
      200,
      {
        ok: true,
        supplierPlatforms: [
          "aliexpress",
          "alibaba",
          "other",
        ],
        researchMode:
          "manual_or_imported_evidence",
        shopifyMode: "draft_only",
        gemPagesMode: "manifest_only",
        externalWrites: false,
        livePublishing: false,
        humanApprovalRequired: true,
      },
      requestId,
    );

    return true;
  }

  if (
    request.method === "POST" &&
    url.pathname === "/product-page/jobs"
  ) {
    let input;

    try {
      input = await readJson(request);
    } catch {
      sendJson(
        response,
        400,
        {
          ok: false,
          error: "invalid_json",
        },
        requestId,
      );

      return true;
    }

    try {
      const supplier =
        parseSupplierUrl(
          input?.supplierUrl,
        );

      const job =
        createProductPageJob(
          randomUUID(),
          supplier,
        );

      await getStore().append(job);

      sendJson(
        response,
        201,
        {
          ok: true,
          job,
        },
        requestId,
      );
    } catch (error) {
      sendJson(
        response,
        400,
        {
          ok: false,
          error:
            "invalid_supplier_url",
          message:
            error instanceof Error
              ? error.message
              : String(error),
        },
        requestId,
      );
    }

    return true;
  }

  if (
    request.method === "GET" &&
    url.pathname === "/product-page/jobs"
  ) {
    const jobs =
      await getStore().list(
        url.searchParams.get("limit") ||
        20,
      );

    sendJson(
      response,
      200,
      {
        ok: true,
        jobs,
      },
      requestId,
    );

    return true;
  }

  if (
    request.method === "GET" &&
    url.pathname === "/product-page/job"
  ) {
    const jobId =
      url.searchParams.get("jobId") || "";

    if (!jobId) {
      sendJson(
        response,
        400,
        {
          ok: false,
          error: "job_id_required",
        },
        requestId,
      );

      return true;
    }

    const job =
      await getStore().get(jobId);

    if (!job) {
      sendJson(
        response,
        404,
        {
          ok: false,
          error:
            "product_page_job_not_found",
        },
        requestId,
      );

      return true;
    }

    sendJson(
      response,
      200,
      {
        ok: true,
        job,
      },
      requestId,
    );

    return true;
  }

  if (
    request.method === "POST" &&
    url.pathname ===
      "/product-page/evidence"
  ) {
    let input;

    try {
      input = await readJson(request);
    } catch {
      sendJson(
        response,
        400,
        {
          ok: false,
          error: "invalid_json",
        },
        requestId,
      );

      return true;
    }

    const job =
      await getRequiredJob(
        input,
        response,
        requestId,
      );

    if (!job) return true;

    try {
      const verification =
        verifySpecifications(
          input?.specifications || [],
        );

      const updated =
        updateProductPageJobVerification(
          job,
          verification,
        );

      await getStore().append(updated);

      sendJson(
        response,
        200,
        {
          ok: true,
          job: updated,
          verification,
        },
        requestId,
      );
    } catch (error) {
      sendJson(
        response,
        400,
        {
          ok: false,
          error:
            "invalid_specification_evidence",
          message:
            error instanceof Error
              ? error.message
              : String(error),
        },
        requestId,
      );
    }

    return true;
  }

  if (
    request.method === "POST" &&
    url.pathname ===
      "/product-page/brief"
  ) {
    let input;

    try {
      input = await readJson(request);
    } catch {
      sendJson(
        response,
        400,
        {
          ok: false,
          error: "invalid_json",
        },
        requestId,
      );

      return true;
    }

    const job =
      await getRequiredJob(
        input,
        response,
        requestId,
      );

    if (!job) return true;

    const validation =
      validateProduct(input?.product);

    if (!validation.ok) {
      sendJson(
        response,
        400,
        {
          ok: false,
          error: "invalid_product",
          issues: validation.issues,
        },
        requestId,
      );

      return true;
    }

    let verification;

    try {
      verification =
        input?.specifications !==
        undefined
          ? verifySpecifications(
              input.specifications,
            )
          : job.verification;
    } catch (error) {
      sendJson(
        response,
        400,
        {
          ok: false,
          error:
            "invalid_specification_evidence",
          message:
            error instanceof Error
              ? error.message
              : String(error),
        },
        requestId,
      );

      return true;
    }

    if (
      !verification ||
      verification.specifications.length ===
        0
    ) {
      sendJson(
        response,
        409,
        {
          ok: false,
          error: "research_required",
          message:
            "At least one verified product specification is required before building the page.",
        },
        requestId,
      );

      return true;
    }

    if (
      verification
        .unresolvedCriticalFields
        .length > 0
    ) {
      const updated =
        updateProductPageJobVerification(
          job,
          verification,
        );

      await getStore().append(updated);

      sendJson(
        response,
        422,
        {
          ok: false,
          error:
            "needs_verification",
          job: updated,
          verification,
        },
        requestId,
      );

      return true;
    }

    try {
      const product =
        normalizeProduct(
          validation.product,
        );

      const brain =
        await generateProductBrain(
          product,
          makeProvider(product),
        );

      const brief =
        buildProductPageBrief(
          product,
          brain,
          verification,
        );

      const mediaPlan =
        buildProductPageMediaPlan(
          product,
        );

      const shopifyDraft =
        buildProductPageShopifyDraft(
          product,
          brief,
          mediaPlan,
        );

      const gemPagesManifest =
        buildGemPagesManifest(brief);

      const quality =
        assessProductPageQuality({
          supplier: job.supplier,
          product,
          verification,
          brief,
          mediaPlan,
          shopifyDraft,
          gemPagesManifest,
        });

      const updated =
        updateProductPageJobBuild(
          job,
          {
            productId:
              getProductId(product),
            researchProjectId: null,
            verification,
            brief,
            mediaPlan,
            shopifyDraft,
            gemPagesManifest,
            quality,
          },
        );

      await getStore().append(updated);

      sendJson(
        response,
        quality.passed ? 200 : 422,
        {
          ok: quality.passed,
          job: updated,
          product,
          brain,
          brief,
          mediaPlan,
          shopifyDraft,
          gemPagesManifest,
          quality,
        },
        requestId,
      );
    } catch (error) {
      sendJson(
        response,
        422,
        {
          ok: false,
          error:
            "product_page_build_failed",
          message:
            error instanceof Error
              ? error.message
              : String(error),
        },
        requestId,
      );
    }

    return true;
  }

  if (
    request.method === "POST" &&
    url.pathname === "/product-page/qa"
  ) {
    let input;

    try {
      input = await readJson(request);
    } catch {
      sendJson(
        response,
        400,
        {
          ok: false,
          error: "invalid_json",
        },
        requestId,
      );

      return true;
    }

    const job =
      await getRequiredJob(
        input,
        response,
        requestId,
      );

    if (!job) return true;

    if (!job.quality) {
      sendJson(
        response,
        409,
        {
          ok: false,
          error:
            "product_page_not_built",
        },
        requestId,
      );

      return true;
    }

    sendJson(
      response,
      200,
      {
        ok: true,
        jobId: job.jobId,
        quality: job.quality,
      },
      requestId,
    );

    return true;
  }

  if (
    request.method === "POST" &&
    url.pathname ===
      "/product-page/approval"
  ) {
    let input;

    try {
      input = await readJson(request);
    } catch {
      sendJson(
        response,
        400,
        {
          ok: false,
          error: "invalid_json",
        },
        requestId,
      );

      return true;
    }

    const job =
      await getRequiredJob(
        input,
        response,
        requestId,
      );

    if (!job) return true;

    const next = input?.status;

    if (
      next !== "APPROVED" &&
      next !== "REJECTED"
    ) {
      sendJson(
        response,
        400,
        {
          ok: false,
          error:
            "invalid_product_page_approval",
        },
        requestId,
      );

      return true;
    }

    try {
      const note =
        typeof input?.note === "string"
          ? input.note.trim() || null
          : null;

      const updated =
        transitionProductPageApproval(
          job,
          next,
          note,
        );

      await getStore().append(updated);

      sendJson(
        response,
        200,
        {
          ok: true,
          job: updated,
          externalWrite: false,
        },
        requestId,
      );
    } catch (error) {
      sendJson(
        response,
        409,
        {
          ok: false,
          error:
            "product_page_approval_blocked",
          message:
            error instanceof Error
              ? error.message
              : String(error),
        },
        requestId,
      );
    }

    return true;
  }

  sendJson(
    response,
    404,
    {
      ok: false,
      error:
        "product_page_route_not_found",
    },
    requestId,
  );

  return true;
}
