import { VITAL_LOINC_CODES } from "../fhir-mapper/fhir-systems";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ParsedObservationOpaqueId =
  | { kind: "encounter"; encounterId: string }
  | { kind: "patientLatest"; patientId: string };

/**
 * Parses Observation.id values produced by {@link mapVitalsJsonToObservations}:
 * `{encounterUuid}-{LOINC}` or `{patientUuid}-latest-{LOINC}`.
 */
export function parseFhirObservationOpaqueId(id: string): ParsedObservationOpaqueId | null {
  const trimmed = id.trim();
  if (!trimmed) return null;

  for (const code of VITAL_LOINC_CODES) {
    const suf = `-${code}`;
    if (!trimmed.endsWith(suf)) continue;
    const base = trimmed.slice(0, -suf.length);
    const latestMatch = /^([0-9a-f-]{36})-latest$/i.exec(base);
    if (latestMatch && UUID_RE.test(latestMatch[1])) {
      return { kind: "patientLatest", patientId: latestMatch[1] };
    }
    if (UUID_RE.test(base)) {
      return { kind: "encounter", encounterId: base };
    }
  }
  return null;
}
