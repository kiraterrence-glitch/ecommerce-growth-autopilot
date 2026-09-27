import {
  lookup,
} from "node:dns/promises";

import {
  isIP,
} from "node:net";

import {
  validateResearchUrl,
} from "../dist/index.js";

function privateIpv4(
  address,
) {
  const parts =
    address
      .split(".")
      .map(Number);

  if (
    parts.length !== 4 ||
    parts.some(
      (part) =>
        !Number.isInteger(part) ||
        part < 0 ||
        part > 255,
    )
  ) {
    return true;
  }

  const [a, b] = parts;

  if (a === 0) return true;
  if (a === 10) return true;
  if (a === 127) return true;

  if (
    a === 169 &&
    b === 254
  ) {
    return true;
  }

  if (
    a === 172 &&
    b >= 16 &&
    b <= 31
  ) {
    return true;
  }

  if (
    a === 192 &&
    b === 168
  ) {
    return true;
  }

  if (
    a === 100 &&
    b >= 64 &&
    b <= 127
  ) {
    return true;
  }

  if (a >= 224) {
    return true;
  }

  return false;
}

function privateIpv6(
  address,
) {
  const value =
    address.toLowerCase();

  if (
    value === "::1" ||
    value === "::"
  ) {
    return true;
  }

  if (
    value.startsWith("fc") ||
    value.startsWith("fd")
  ) {
    return true;
  }

  if (
    value.startsWith("fe8") ||
    value.startsWith("fe9") ||
    value.startsWith("fea") ||
    value.startsWith("feb")
  ) {
    return true;
  }

  if (
    value.startsWith("::ffff:")
  ) {
    const ipv4 =
      value.slice(
        "::ffff:".length,
      );

    if (
      isIP(ipv4) === 4
    ) {
      return privateIpv4(
        ipv4,
      );
    }
  }

  return false;
}

export function isDisallowedAddress(
  address,
) {
  const version =
    isIP(address);

  if (version === 4) {
    return privateIpv4(
      address,
    );
  }

  if (version === 6) {
    return privateIpv6(
      address,
    );
  }

  return true;
}

export async function assertPublicDestination(
  url,
) {
  validateResearchUrl(
    url.toString(),
  );

  const host =
    url.hostname;

  if (isIP(host)) {
    if (
      isDisallowedAddress(
        host,
      )
    ) {
      throw new Error(
        "network destination resolves to a disallowed address",
      );
    }

    return;
  }

  const addresses =
    await lookup(
      host,
      {
        all: true,
        verbatim: true,
      },
    );

  if (
    addresses.length === 0
  ) {
    throw new Error(
      "network destination did not resolve",
    );
  }

  for (const entry of addresses) {
    if (
      isDisallowedAddress(
        entry.address,
      )
    ) {
      throw new Error(
        "network destination resolved to a disallowed address",
      );
    }
  }
}

function contentType(
  response,
) {
  return (
    response.headers
      .get("content-type")
      ?.split(";")[0]
      ?.trim()
      .toLowerCase() ??
    ""
  );
}

async function readLimited(
  response,
  maximumBytes,
) {
  const declared =
    Number(
      response.headers.get(
        "content-length",
      ),
    );

  if (
    Number.isFinite(declared) &&
    declared > maximumBytes
  ) {
    throw new Error(
      `response exceeds ${maximumBytes} byte limit`,
    );
  }

  if (!response.body) {
    return Buffer.alloc(0);
  }

  const reader =
    response.body.getReader();

  const chunks = [];
  let total = 0;

  while (true) {
    const {
      done,
      value,
    } = await reader.read();

    if (done) break;

    total +=
      value.byteLength;

    if (
      total > maximumBytes
    ) {
      await reader.cancel();

      throw new Error(
        `response exceeds ${maximumBytes} byte limit`,
      );
    }

    chunks.push(
      Buffer.from(value),
    );
  }

  return Buffer.concat(
    chunks,
    total,
  );
}

export async function safeFetchBuffer(
  input,
  options = {},
) {
  const maximumBytes =
    options.maximumBytes ??
    5 * 1024 * 1024;

  const allowedMimeTypes =
    new Set(
      options.allowedMimeTypes ??
      [
        "text/html",
        "application/xhtml+xml",
      ],
    );

  const maximumRedirects =
    options.maximumRedirects ??
    4;

  let current =
    validateResearchUrl(
      String(input),
    );

  for (
    let redirectCount = 0;
    redirectCount <= maximumRedirects;
    redirectCount += 1
  ) {
    await assertPublicDestination(
      current,
    );

    const controller =
      new AbortController();

    const timer =
      setTimeout(
        () =>
          controller.abort(),
        options.timeoutMs ??
          15_000,
      );

    let response;

    try {
      response =
        await fetch(
          current,
          {
            method: "GET",
            redirect: "manual",
            credentials: "omit",
            signal:
              controller.signal,
            headers: {
              accept:
                options.accept ??
                "*/*",
              "user-agent":
                "EcomGrowthAutopilotResearch/1.0",
            },
          },
        );
    } finally {
      clearTimeout(timer);
    }

    if (
      response.status >= 300 &&
      response.status < 400
    ) {
      const location =
        response.headers.get(
          "location",
        );

      if (!location) {
        throw new Error(
          "redirect response is missing Location",
        );
      }

      current =
        validateResearchUrl(
          new URL(
            location,
            current,
          ).toString(),
        );

      continue;
    }

    if (!response.ok) {
      throw new Error(
        `remote response returned HTTP ${response.status}`,
      );
    }

    const mimeType =
      contentType(response);

    if (
      !allowedMimeTypes.has(
        mimeType,
      )
    ) {
      throw new Error(
        `unexpected response MIME type: ${mimeType || "unknown"}`,
      );
    }

    const buffer =
      await readLimited(
        response,
        maximumBytes,
      );

    return {
      finalUrl:
        current.toString(),
      status:
        response.status,
      mimeType,
      buffer,
    };
  }

  throw new Error(
    "maximum redirect count exceeded",
  );
}
