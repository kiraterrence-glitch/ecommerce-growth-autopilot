import {
  mkdir,
  writeFile,
} from "node:fs/promises";

import {
  join,
  resolve,
} from "node:path";

function safePart(
  value,
) {
  const result =
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

  if (!result) {
    throw new Error(
      "preview path component is empty after sanitization",
    );
  }

  return result;
}

export async function storeProductPagePreview(
  preview,
  visualPack,
  outputRoot =
    ".runtime/product-previews",
) {
  const directory =
    resolve(
      outputRoot,
      safePart(
        preview.previewId,
      ),
    );

  const assetsDirectory =
    join(
      directory,
      "assets",
    );

  await mkdir(
    assetsDirectory,
    {
      recursive: true,
    },
  );

  await writeFile(
    join(
      directory,
      "index.html",
    ),
    preview.html,
    "utf8",
  );

  for (
    const asset of
    visualPack.assets
  ) {
    await writeFile(
      join(
        assetsDirectory,
        safePart(
          asset.filename,
        ),
      ),
      asset.svg,
      "utf8",
    );
  }

  await writeFile(
    join(
      directory,
      "preview-qa.json",
    ),
    `${JSON.stringify(
      preview.qa,
      null,
      2,
    )}\n`,
    "utf8",
  );

  return {
    directory,
    htmlPath:
      join(
        directory,
        "index.html",
      ),
    qaPath:
      join(
        directory,
        "preview-qa.json",
      ),
  };
}
