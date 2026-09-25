import type {
  SpecificationObservation,
  SpecificationVerification,
  VerifiedSpecification,
} from "./types.js";

function normalizeField(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeValue(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(
      /(\d(?:\.\d+)?)\s+(ml|l|g|kg|mg|mm|cm|m|v|w|mah|oz|lb)\b/gi,
      "$1$2",
    );
}

function parseObservations(input: unknown): SpecificationObservation[] {
  if (!Array.isArray(input)) {
    throw new Error("specifications must be an array");
  }

  return input.map((raw, index) => {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      throw new Error(`specifications[${index}] must be an object`);
    }

    const record = raw as Record<string, unknown>;
    const field = record.field;
    const value = record.value;
    const sourceId = record.sourceId;
    const critical = record.critical;

    if (typeof field !== "string" || !field.trim()) {
      throw new Error(`specifications[${index}].field must be a non-empty string`);
    }

    if (typeof value !== "string" || !value.trim()) {
      throw new Error(`specifications[${index}].value must be a non-empty string`);
    }

    if (typeof sourceId !== "string" || !sourceId.trim()) {
      throw new Error(`specifications[${index}].sourceId must be a non-empty string`);
    }

    if (critical !== undefined && typeof critical !== "boolean") {
      throw new Error(`specifications[${index}].critical must be boolean when provided`);
    }

    return {
      field: field.trim(),
      value: value.trim(),
      sourceId: sourceId.trim(),
      critical: critical === undefined ? true : critical,
    };
  });
}

export function verifySpecifications(input: unknown): SpecificationVerification {
  const observations = parseObservations(input);
  const groups = new Map<string, SpecificationObservation[]>();

  for (const observation of observations) {
    const key = normalizeField(observation.field);
    const group = groups.get(key) ?? [];
    group.push(observation);
    groups.set(key, group);
  }

  const specifications: VerifiedSpecification[] = [];

  for (const group of groups.values()) {
    const first = group[0];
    if (!first) continue;

    const values = new Map<string, SpecificationObservation>();

    for (const observation of group) {
      const key = normalizeValue(observation.value);
      if (!values.has(key)) {
        values.set(key, observation);
      }
    }

    const critical = group.some((observation) => observation.critical);
    const normalizedValues = [...values.keys()];
    const status =
      normalizedValues.length === 1 ? "VERIFIED" : "NEEDS_VERIFICATION";

    specifications.push({
      field: first.field,
      status,
      value: status === "VERIFIED" ? first.value : null,
      critical,
      observations: group,
    });
  }

  specifications.sort((left, right) =>
    left.field.localeCompare(right.field),
  );

  const unresolvedCriticalFields = specifications
    .filter(
      (specification) =>
        specification.critical &&
        specification.status === "NEEDS_VERIFICATION",
    )
    .map((specification) => specification.field);

  return {
    specifications,
    unresolvedCriticalFields,
  };
}
