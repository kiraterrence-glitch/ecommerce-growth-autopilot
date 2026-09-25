function isPrivateIpv4(hostname: string): boolean {
  if (/^127\./.test(hostname)) return true;
  if (/^10\./.test(hostname)) return true;
  if (/^192\.168\./.test(hostname)) return true;
  if (/^169\.254\./.test(hostname)) return true;
  if (/^0\./.test(hostname)) return true;

  const match = /^172\.(\d{1,3})\./.exec(hostname);

  if (match) {
    const second = Number(match[1]);

    if (second >= 16 && second <= 31) {
      return true;
    }
  }

  return false;
}

export function validateResearchUrl(input: unknown): URL {
  if (typeof input !== "string" || !input.trim()) {
    throw new Error("research URL must be a non-empty string");
  }

  if (input.length > 4096) {
    throw new Error("research URL is too long");
  }

  let url: URL;

  try {
    url = new URL(input.trim());
  } catch {
    throw new Error("research URL must be an absolute URL");
  }

  if (url.protocol !== "https:") {
    throw new Error("research URL must use HTTPS");
  }

  if (url.username || url.password) {
    throw new Error("research URL must not contain embedded credentials");
  }

  const host = url.hostname.toLowerCase();

  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "::1" ||
    host === "[::1]" ||
    isPrivateIpv4(host)
  ) {
    throw new Error(
      "research URL must not target localhost or a private network",
    );
  }

  return url;
}

export function validateAssetMetadata(input: Readonly<{
  mimeType: string;
  byteLength: number;
  width?: number | null;
  height?: number | null;
}>): void {
  const allowed = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "video/mp4",
    "video/webm",
  ]);

  if (!allowed.has(input.mimeType.toLowerCase())) {
    throw new Error(`unsupported asset MIME type: ${input.mimeType}`);
  }

  if (
    !Number.isFinite(input.byteLength) ||
    input.byteLength <= 0
  ) {
    throw new Error("asset byte length must be positive");
  }

  const maxBytes = 50 * 1024 * 1024;

  if (input.byteLength > maxBytes) {
    throw new Error("asset exceeds the 50 MB safety limit");
  }

  for (const dimension of [input.width, input.height]) {
    if (
      dimension !== undefined &&
      dimension !== null &&
      (
        !Number.isFinite(dimension) ||
        dimension <= 0 ||
        dimension > 20000
      )
    ) {
      throw new Error("asset dimensions are outside allowed limits");
    }
  }
}
