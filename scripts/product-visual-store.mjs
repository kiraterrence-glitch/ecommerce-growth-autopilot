import {
  mkdir,
  writeFile,
} from "node:fs/promises";

import {
  join,
  resolve,
} from "node:path";

function safePart(value) {
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
      .slice(0, 120);

  if (!cleaned) {
    throw new Error(
      "visual path component is empty after sanitization",
    );
  }

  return cleaned;
}

export async function storeProductVisualPack(
  pack,
  outputRoot =
    ".runtime/product-visuals",
) {
  const directory =
    resolve(
      outputRoot,
      safePart(pack.jobId),
    );

  await mkdir(
    directory,
    {
      recursive: true,
    },
  );

  const stored = [];

  for (const asset of pack.assets) {
    const path =
      join(
        directory,
        safePart(
          asset.filename,
        ),
      );

    await writeFile(
      path,
      asset.svg,
      "utf8",
    );

    stored.push({
      assetId:
        asset.assetId,
      kind:
        asset.kind,
      filename:
        asset.filename,
      path,
      status:
        asset.status,
      evidenceIds:
        asset.evidenceIds,
      sourceImageUrl:
        asset.sourceImageUrl,
      rightsStatus:
        asset.rightsStatus,
    });
  }

  await writeFile(
    join(
      directory,
      "visual-pack.json",
    ),
    `${JSON.stringify(
      {
        ...pack,
        assets:
          pack.assets.map(
            ({
              svg,
              ...asset
            }) => asset,
          ),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  return {
    directory,
    assets: stored,
    qa: pack.qa,
  };
}
