import { BadRequestException } from "@nestjs/common";

export const FHIR_LOGICAL_ID_RE = /^[A-Za-z0-9\-.]{1,64}$/;
export const FHIR_RESOURCE_TYPES = ["Patient", "Encounter", "Observation", "Condition", "ServiceRequest", "DiagnosticReport", "CarePlan", "Organization", "Location", "Practitioner", "PractitionerRole"] as const;

export function parseLogicalId(value: unknown): string {
  if (typeof value !== "string" || !FHIR_LOGICAL_ID_RE.test(value)) throw new BadRequestException("Malformed FHIR logical ID");
  return value;
}

export function parseRelativeReference(value: unknown, allowed: readonly string[]) {
  if (typeof value !== "string" || value.length > 128 || value.includes("://")) throw new BadRequestException("Malformed relative reference");
  const match = /^([A-Z][A-Za-z]+)\/([A-Za-z0-9\-.]{1,64})$/.exec(value);
  if (!match || !allowed.includes(match[1]!)) throw new BadRequestException("Malformed relative reference");
  return { resourceType: match[1]!, id: match[2]! };
}

/** Strict P0.3B search-reference grammar: ResourceType/logical-id, relative only. */
export function parseFhirReference<T extends (typeof FHIR_RESOURCE_TYPES)[number]>(
  value: unknown,
  expectedResourceType: T,
): { resourceType: T; id: string } {
  if (typeof value !== "string" || value.length > 128 || value.includes("%")) {
    throw new BadRequestException("Malformed FHIR reference");
  }
  const match = /^([A-Z][A-Za-z]+)\/([^/]+)$/.exec(value);
  if (!match || match[1] !== expectedResourceType) {
    throw new BadRequestException("Malformed FHIR reference");
  }
  return { resourceType: expectedResourceType, id: parseLogicalId(match[2]) };
}

export function parseStrictSearch(query: Record<string, unknown>, allowed: readonly string[], policy = FHIR_REQUEST_POLICY) {
  const entries = Object.entries(query);
  if (entries.length > policy.maxParameters) throw new BadRequestException("Too many search parameters");
  for (const [key, raw] of entries) {
    if (!allowed.includes(key)) throw new BadRequestException("Unsupported search parameter");
    const values = Array.isArray(raw) ? raw : [raw];
    if (values.length > policy.maxRepeatedValues) throw new BadRequestException("Too many repeated search values");
    if (values.some((v) => typeof v !== "string" || v.length > policy.maxValueLength)) throw new BadRequestException("Invalid search parameter value");
  }
  return query;
}

export const FHIR_REQUEST_POLICY = Object.freeze({
  maxQueryBytes: Number(process.env.FHIR_MAX_QUERY_BYTES ?? 2048),
  maxParameters: Number(process.env.FHIR_MAX_SEARCH_PARAMETERS ?? 8),
  maxRepeatedValues: Number(process.env.FHIR_MAX_REPEATED_VALUES ?? 2),
  maxValueLength: 256,
  defaultCount: 20,
  maxCount: 50,
  futureWritePayloadBytes: Number(process.env.FHIR_MAX_PAYLOAD_BYTES ?? 1048576),
  maxResponseBytes: Number(process.env.FHIR_MAX_RESPONSE_BYTES ?? 2097152),
  timeoutMs: Number(process.env.FHIR_REQUEST_TIMEOUT_MS ?? 10000),
});
