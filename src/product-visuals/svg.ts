export function escapeXml(
  value: string,
): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function wrapVisualText(
  input: string,
  maximumCharacters = 34,
): readonly string[] {
  const words =
    input
      .trim()
      .replace(/\s+/g, " ")
      .split(" ")
      .filter(Boolean);

  if (words.length === 0) {
    return [];
  }

  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next =
      current
        ? `${current} ${word}`
        : word;

    if (
      next.length >
        maximumCharacters &&
      current
    ) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

export function svgTextLines(
  lines: readonly string[],
  x: number,
  y: number,
  lineHeight: number,
  fontSize: number,
  weight = 600,
): string {
  return lines
    .map(
      (line, index) =>
        `<text x="${x}" y="${y + index * lineHeight}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="${weight}" fill="#f8fafc">${escapeXml(line)}</text>`,
    )
    .join("");
}

export function svgMutedTextLines(
  lines: readonly string[],
  x: number,
  y: number,
  lineHeight: number,
  fontSize: number,
): string {
  return lines
    .map(
      (line, index) =>
        `<text x="${x}" y="${y + index * lineHeight}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="400" fill="#cbd5e1">${escapeXml(line)}</text>`,
    )
    .join("");
}
