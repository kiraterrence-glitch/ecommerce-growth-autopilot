import {
  createContentIntelligenceProductLibraryApi,
} from "./product-library-content-intelligence-api.mjs";
import {
  createServer,
} from "node:http";

import {
  pathToFileURL,
} from "node:url";

import {
  SqliteProductIntelligenceRepository,
} from "./product-intelligence-sqlite.mjs";

import {
  DEMO_PRODUCT_ID,
  ensureDemoProductIntelligence,
} from "./product-intelligence-demo-seed.mjs";

import {
  renderProductDetail,
  renderProductLibrary,
} from "./product-library-renderer.mjs";

import {
  createMarketplaceProductLibraryApi,
} from "./product-library-marketplace-api.mjs";

function json(response, status, value) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });

  response.end(`${JSON.stringify(value, null, 2)}\n`);
}

function html(response, status, value) {
  response.writeHead(status, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "content-security-policy":
      "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; base-uri 'none'; form-action 'none'",
  });

  response.end(value);
}

export function createProductLibraryServer({
  databasePath = ".runtime/product-intelligence.sqlite",
  seedDemo = true,
} = {}) {
  const repository =
    new SqliteProductIntelligenceRepository(databasePath);

  if (seedDemo) {
    ensureDemoProductIntelligence(repository);
  }

  const marketplaceApi =
    createMarketplaceProductLibraryApi({
      repository,
      databasePath,
    });

  const contentIntelligenceApi =
    createContentIntelligenceProductLibraryApi({
      repository,
      databasePath,
    });

  const server = createServer(async (request, response) => {
    const url = new URL(
      request.url ?? "/",
      "http://127.0.0.1",
    );

    if (
      await marketplaceApi.handle(
        request,
        response,
        url,
      )
    ) {
      return;
    }

    if (
      await contentIntelligenceApi.handle(
        request,
        response,
        url,
      )
    ) {
      return;
    }

    if (request.method === "GET" && url.pathname === "/health") {
      json(response, 200, {
        ok: true,
        service: "product-library",
        externalWrites: false,
        livePublishing: false,
      });

      return;
    }

    if (request.method === "GET" && url.pathname === "/api/products") {
      json(response, 200, {
        products: repository.listProducts(),
      });

      return;
    }

    const apiMatch =
      /^\/api\/products\/([^/]+)$/.exec(url.pathname);

    if (request.method === "GET" && apiMatch) {
      const productId = decodeURIComponent(apiMatch[1]);
      const snapshot = repository.getSnapshot(productId);

      if (!snapshot) {
        json(response, 404, {
          error: "product_not_found",
        });

        return;
      }

      json(response, 200, snapshot);
      return;
    }

    if (
      request.method === "GET" &&
      (url.pathname === "/" || url.pathname === "/products")
    ) {
      html(
        response,
        200,
        renderProductLibrary(repository, marketplaceApi),
      );

      return;
    }

    const pageMatch =
      /^\/products\/([^/]+)$/.exec(url.pathname);

    if (request.method === "GET" && pageMatch) {
      const productId = decodeURIComponent(pageMatch[1]);
      const snapshot = repository.getSnapshot(productId);

      if (!snapshot) {
        html(
          response,
          404,
          "<!doctype html><html><body><h1>Product not found</h1></body></html>",
        );

        return;
      }

      html(
        response,
        200,
        renderProductDetail(
          snapshot,
          marketplaceApi.panel(productId),
        ),
      );

      return;
    }

    json(response, 404, {
      error: "not_found",
    });
  });

  let repositoryClosed = false;
  let marketplaceClosed = false;

  server.on("close", () => {
    if (!marketplaceClosed) {
      marketplaceClosed = true;
      marketplaceApi.close();
    }

    if (!repositoryClosed) {
      repositoryClosed = true;
      repository.close();
    }
  });

  server.once("close", () => {
    contentIntelligenceApi.close();
  });

  return {
    server,
    repository,
    marketplaceApi,
    contentIntelligenceApi,
    demoProductId: DEMO_PRODUCT_ID,
  };
}

const entry = process.argv[1]
  ? pathToFileURL(process.argv[1]).href
  : null;

if (entry === import.meta.url) {
  const port = Number(
    process.env.PRODUCT_LIBRARY_PORT ?? "3002",
  );

  const databasePath =
    process.env.PRODUCT_INTELLIGENCE_DB_PATH ??
    ".runtime/product-intelligence.sqlite";

  const {
    server,
  } = createProductLibraryServer({
    databasePath,
  });

  server.listen(port, "127.0.0.1", () => {
    console.log(
      `Product Library: http://127.0.0.1:${port}/products`,
    );
    console.log(
      `Demo product: http://127.0.0.1:${port}/products/${DEMO_PRODUCT_ID}`,
    );
    console.log("externalWrites=false");
    console.log("livePublishing=false");
  });
}
