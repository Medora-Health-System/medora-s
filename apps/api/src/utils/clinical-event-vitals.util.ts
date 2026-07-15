import type { Prisma } from "@prisma/client";

export type VitalsClinicalEventSource = "ENCOUNTER_CHART" | "TRIAGE" | "NURSING_DISCHARGE";

/**
 * JSON-clone vitals (drops non-JSON values) and wrap with `source` for EncounterClinicalEvent.payloadJson.
 */
export function buildVitalsRecordedPayloadJson(
  vitals: Record<string, unknown>,
  source: VitalsClinicalEventSource
): Prisma.InputJsonValue {
  const vitalsClone = JSON.parse(JSON.stringify(vitals)) as Record<string, unknown>;
  return JSON.parse(JSON.stringify({ source, vitals: vitalsClone })) as Prisma.InputJsonValue;
}
