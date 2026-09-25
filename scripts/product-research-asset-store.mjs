import {
  createHash,
} from "node:crypto";

import {
  mkdir,
  writeFile,
} from "node:fs/promises";

import {
  join,
} from "node:path";

import {
  validateAssetMetadata,
} from "../dist/index.js";

const extensions =
  new Map([
    ["image/jpeg", ".jpg"],
    ["image/png", ".png"],
    ["image/webp", ".webp"],
    ["image/gif", ".gif"],
    ["video/mp4", ".mp4"],
    ["video/webm", ".webm"],
  ]);

function safePart(
  value,
) {
  const cleaned =
    String(value)
      .replace(
        /[^a-zA-Z0-9._-]+/g,
        "-",
      )
      .replace(
        /^[-.]+|[-.]+$/g,
        "",
      )
      .slice(0, 100);

  if (!cleaned) {
    throw new Error(
      "asset path component is empty after sanitization",
    );
  }

  return cleaned;
}

export async function storeProductAsset({
  jobId,
  assetId,
  sourceEvidenceId,
  sourceUrl,
  kind,
  mimeType,
  buffer,
  rightsStatus = "UNKNOWN_RIGHTS",
  outputRoot = ".runtime/product-assets",
}) {
  if (
    !Buffer.isBuffer(buffer)
  ) {
    throw new Error(
      "asset buffer must be a Buffer",
    );
  }

  validateAssetMetadata({
    mimeType,
    byteLength:
      buffer.byteLength,
  });

  const extension =
    extensions.get(
      mimeType.toLowerCase(),
    );

  if (!extension) {
    throw new Error(
      `no safe extension exists for ${mimeType}`,
    );
  }

  const sha256 =
    createHash("sha256")
      .update(buffer)
      .digest("hex");

  const directory =
    join(
      outputRoot,
      safePart(jobId),
      "original",
    );

  await mkdir(
    directory,
    {
      recursive: true,
    },
  );

  const filename =
    `${safePart(assetId)}-${sha256.slice(0, 12)}${extension}`;

  const localPath =
    join(
      directory,
      filename,
    );

  await writeFile(
    localPath,
    buffer,
    {
      flag: "wx",
    },
  ).catch(
    async (error) => {
      if (
        error?.code !== "EEXIST"
      ) {
        throw error;
      }
    },
  );

  const metadata = {
    assetId,
    sourceEvidenceId,
    sourceUrl,
    kind,
    mimeType:
      mimeType.toLowerCase(),
    byteLength:
      buffer.byteLength,
    sha256,
    localPath,
    rightsStatus,
  };

  await writeFile(
    `${localPath}.json`,
    `${JSON.stringify(metadata, null, 2)}\n`,
    "utf8",
  );

  return metadata;
}
