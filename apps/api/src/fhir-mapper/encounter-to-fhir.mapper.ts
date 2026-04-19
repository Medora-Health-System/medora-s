import type { Encounter, EncounterStatus, EncounterType } from "@prisma/client";
import type { FhirEncounter, FhirEncounterStatus } from "./fhir-resource.types";

function mapEncounterStatus(status: EncounterStatus): FhirEncounterStatus {
  switch (status) {
    case "OPEN":
      return "in-progress";
    case "CLOSED":
      return "finished";
    case "CANCELLED":
      return "cancelled";
    default:
      return "unknown";
  }
}

function mapEncounterClass(type: EncounterType): { code: string; display: string } {
  switch (type) {
    case "OUTPATIENT":
    case "URGENT_CARE":
      return { code: "AMB", display: "ambulatory" };
    case "INPATIENT":
      return { code: "IMP", display: "inpatient encounter" };
    case "EMERGENCY":
      return { code: "EMER", display: "emergency" };
    default:
      return { code: "AMB", display: "ambulatory" };
  }
}

/**
 * Maps a Prisma `Encounter` row to a FHIR R4 Encounter resource (JSON).
 */
export function mapEncounterToFhir(encounter: Encounter): FhirEncounter {
  const ec = mapEncounterClass(encounter.type);
  const reason = encounter.chiefComplaint?.trim()
    ? [{ text: encounter.chiefComplaint }]
    : undefined;

  return {
    resourceType: "Encounter",
    id: encounter.id,
    status: mapEncounterStatus(encounter.status),
    class: {
      system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
      code: ec.code,
      display: ec.display,
    },
    subject: { reference: `Patient/${encounter.patientId}` },
    period: {
      start: encounter.createdAt.toISOString(),
      end: encounter.dischargedAt ? encounter.dischargedAt.toISOString() : undefined,
    },
    reasonCode: reason,
  };
}
