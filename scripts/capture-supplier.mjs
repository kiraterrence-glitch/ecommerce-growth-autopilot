import {
  mkdir,
  writeFile,
} from "node:fs/promises";

import {
  resolve,
} from "node:path";

import {
  randomUUID,
} from "node:crypto";

import {
  discoverProductAssets,
  extractSupplierSnapshotFromHtml,
  validateResearchUrl,
} from "../dist/index.js";

import {
  safeFetchBuffer,
} from "./product-research-safe-network.mjs";

import {
  storeProductAsset,
} from "./product-research-asset-store.mjs";

function supportedHost(
  hostname,
) {
  const host =
    hostname.toLowerCase();

  return (
    /(^|\.)aliexpress\./.test(
      host,
    ) ||
    /(^|\.)alibaba\.com$/.test(
      host,
    )
  );
}

const args =
  process.argv.slice(2);

const sourceUrl =
  args.find(
    (value) =>
      !value.startsWith("--"),
  );

const downloadAssets =
  args.includes(
    "--download-assets",
  );

if (!sourceUrl) {
  console.error(
    "Usage: node scripts/capture-supplier.mjs <https-url> [--download-assets]",
  );

  process.exitCode = 1;
} else {
  try {
    const url =
      validateResearchUrl(
        sourceUrl,
      );

    if (
      !supportedHost(
        url.hostname,
      )
    ) {
      throw new Error(
        "Phase 2 live capture currently supports AliExpress and Alibaba supplier URLs only.",
      );
    }

    const jobId =
      `supplier-${randomUUID()}`;

    const sourceId =
      "supplier-primary";

    console.log(
      `Fetching supplier page: ${url.hostname}`,
    );

    const fetched =
      await safeFetchBuffer(
        url.toString(),
        {
          maximumBytes:
            5 * 1024 * 1024,
          allowedMimeTypes: [
            "text/html",
            "application/xhtml+xml",
          ],
          accept:
            "text/html,application/xhtml+xml",
        },
      );

    const html =
      fetched.buffer.toString(
        "utf8",
      );

    const snapshot =
      extractSupplierSnapshotFromHtml(
        html,
        new URL(
          fetched.finalUrl,
        ),
        {
          jobId,
          sourceId,
          sourceKind:
            "supplier",
        },
      );

    const assets =
      discoverProductAssets(
        snapshot,
      );

    const directory =
      resolve(
        ".runtime",
        "product-research",
        jobId,
      );

    await mkdir(
      directory,
      {
        recursive: true,
      },
    );

    await writeFile(
      resolve(
        directory,
        "source.html",
      ),
      html,
      "utf8",
    );

    await writeFile(
      resolve(
        directory,
        "snapshot.json",
      ),
      `${JSON.stringify(snapshot, null, 2)}\n`,
      "utf8",
    );

    await writeFile(
      resolve(
        directory,
        "assets.json",
      ),
      `${JSON.stringify(assets, null, 2)}\n`,
      "utf8",
    );

    const storedAssets = [];

    if (downloadAssets) {
      for (
        const asset of
        assets.slice(0, 12)
      ) {
        try {
          const fetchedAsset =
            await safeFetchBuffer(
              asset.sourceUrl,
              {
                maximumBytes:
                  50 * 1024 * 1024,
                allowedMimeTypes:
                  asset.kind ===
                  "image"
                    ? [
                        "image/jpeg",
                        "image/png",
                        "image/webp",
                        "image/gif",
                      ]
                    : [
                        "video/mp4",
                        "video/webm",
                      ],
                accept:
                  asset.kind ===
                  "image"
                    ? "image/*"
                    : "video/*",
              },
            );

          const stored =
            await storeProductAsset({
              jobId,
              assetId:
                asset.assetId,
              sourceEvidenceId:
                asset.sourceEvidenceId,
              sourceUrl:
                fetchedAsset.finalUrl,
              kind:
                asset.kind,
              mimeType:
                fetchedAsset.mimeType,
              buffer:
                fetchedAsset.buffer,
              rightsStatus:
                asset.rightsStatus,
            });

          storedAssets.push(
            stored,
          );
        } catch (error) {
          console.warn(
            `Asset skipped safely: ${
              error instanceof Error
                ? error.message
                : String(error)
            }`,
          );
        }
      }

      await writeFile(
        resolve(
          directory,
          "stored-assets.json",
        ),
        `${JSON.stringify(storedAssets, null, 2)}\n`,
        "utf8",
      );
    }

    console.log("");
    console.log(
      `Status: ${snapshot.status}`,
    );

    console.log(
      `Evidence records: ${snapshot.evidence.length}`,
    );

    console.log(
      `Media candidates: ${assets.length}`,
    );

    console.log(
      `Assets stored: ${storedAssets.length}`,
    );

    console.log(
      `Output: ${directory}`,
    );

    if (
      snapshot.status ===
      "MANUAL_CAPTURE_REQUIRED"
    ) {
      console.log("");
      console.log(
        "Automatic extraction did not provide sufficient evidence.",
      );

      console.log(
        "Use the manual/snapshot import path rather than bypassing access controls.",
      );
    }
  } catch (error) {
    console.error(
      error instanceof Error
        ? error.message
        : String(error),
    );

    process.exitCode = 1;
  }
}
