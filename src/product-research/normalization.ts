export type NormalizedMeasurement = Readonly<{
  normalizedValue: number;
  unit: string;
}>;

export function normalizeEvidenceText(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeMeasurement(
  value: string,
): NormalizedMeasurement | null {
  const normalized = normalizeEvidenceText(value)
    .toLowerCase()
    .replace(/,/g, "");

  const match =
    /^(-?\d+(?:\.\d+)?)\s*(ml|l|g|kg|mg|mm|cm|m|oz|lb)$/i.exec(
      normalized,
    );

  if (!match) return null;

  const amount = Number(match[1]);
  const unit = match[2]?.toLowerCase();

  if (!Number.isFinite(amount) || !unit) {
    return null;
  }

  switch (unit) {
    case "l":
      return {
        normalizedValue: amount * 1000,
        unit: "ml",
      };

    case "kg":
      return {
        normalizedValue: amount * 1000,
        unit: "g",
      };

    case "mg":
      return {
        normalizedValue: amount / 1000,
        unit: "g",
      };

    case "m":
      return {
        normalizedValue: amount * 1000,
        unit: "mm",
      };

    case "cm":
      return {
        normalizedValue: amount * 10,
        unit: "mm",
      };

    case "oz":
      return {
        normalizedValue: amount * 29.5735295625,
        unit: "ml",
      };

    case "lb":
      return {
        normalizedValue: amount * 453.59237,
        unit: "g",
      };

    default:
      return {
        normalizedValue: amount,
        unit,
      };
  }
}

export function normalizedComparableKey(
  value: string | number | boolean | null,
  unit: string | null,
): string {
  if (value === null) return "null";

  if (typeof value === "number") {
    const rounded = Number(value.toFixed(6));

    return `${rounded}:${unit ?? ""}`;
  }

  if (typeof value === "boolean") {
    return `${value}:${unit ?? ""}`;
  }

  return `${normalizeEvidenceText(value).toLowerCase()}:${unit ?? ""}`;
}
