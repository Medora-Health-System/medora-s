/**
 * MEDUI.D4A.4.2A — Inpatient census duplicate encounter prevention (pure).
 *
 * Safety:
 * - Projection-only: never deletes/merges durable encounters.
 * - Row identity remains encounterId (never patient name / MRN alone).
 * - When multiple OPEN INPATIENT charts exist for one patient, select one
 *   canonical census row using admission/bed evidence — then emit diagnostics
 *   for suppressed encounterIds so operators can remediate data.
 */

import { resolveEncounterCanonicalBedKey } from "./facilityBedGovernance.js";
import { parseGovernedRoomStorage } from "./governedRoomLabel.js";
import { readHospitalAdmissionCorrelation } from "./hospitalAdmissionCorrelationV1.js";
import { readHospitalLineagePointers } from "./hospitalEncounterAuthorityD4a28Hf2.js";
import type {
  HospitalCensusConsistencyDiagnostic,
  HospitalCensusEncounterInput,
  HospitalCensusPatientRow,
} from "./hospitalCensusV1.js";

export const INPATIENT_CENSUS_DUPLICATE_PREVENTION_CERTIFICATION_ID =
  "MEDUI.D4A.4.2A.INPATIENT_CENSUS_DUPLICATE_PREVENTION" as const;

export const CENSUS_DUPLICATE_DIAGNOSTIC_CODES = [
  "DUPLICATE_ENCOUNTER_ID_IN_CENSUS_SOURCE",
  "DUPLICATE_OPEN_INPATIENT_ON_CENSUS",
] as const;

export type CensusDuplicateDiagnosticCode =
  (typeof CENSUS_DUPLICATE_DIAGNOSTIC_CODES)[number];

/** Stable encounter-keyed collapse of source encounters (join / refresh fan-out). */
export function collapseCensusEncountersByEncounterId(
  encounters: HospitalCensusEncounterInput[]
): {
  unique: HospitalCensusEncounterInput[];
  duplicateEncounterIds: string[];
} {
  const byId = new Map<string, HospitalCensusEncounterInput>();
  const dupes = new Set<string>();
  for (const enc of encounters) {
    const id = String(enc.id ?? "").trim();
    if (!id) continue;
    if (byId.has(id)) {
      dupes.add(id);
      continue;
    }
    byId.set(id, enc);
  }
  return { unique: Array.from(byId.values()), duplicateEncounterIds: [...dupes] };
}

function patientKey(enc: HospitalCensusEncounterInput): string | null {
  const id = String(enc.patient?.id ?? "").trim();
  return id || null;
}

function timeMs(value: string | Date | null | undefined): number {
  if (value == null) return 0;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
}

/**
 * Rank which durable OPEN INPATIENT chart should appear on census when duplicates exist.
 * Higher score wins. Does not use name/MRN — only encounter evidence.
 */
export function scoreCanonicalInpatientCensusEncounter(
  enc: HospitalCensusEncounterInput
): number {
  let score = 0;
  const room = String(enc.roomLabel ?? "").trim();
  const parsed = parseGovernedRoomStorage(room);
  const bedKey = resolveEncounterCanonicalBedKey({
    roomLabel: room,
    type: enc.type ?? "INPATIENT",
    admissionSummaryJson: enc.admissionSummaryJson,
  });

  // Governed unit-prefixed storage (MS-1) beats bare ED residue ("3").
  if (parsed.embeddedUnit) score += 100;
  if (bedKey) score += 40;
  if (room) score += 10;

  const lineage = readHospitalLineagePointers({
    admissionSummaryJson: enc.admissionSummaryJson,
  });
  if (
    lineage.receivingEncounterId === enc.id ||
    lineage.placementReceivingEncounterId === enc.id
  ) {
    score += 80;
  }

  const corr = readHospitalAdmissionCorrelation(enc.admissionSummaryJson);
  if (corr?.status === "ARRIVED" || corr?.status === "ACTIVE") score += 50;
  if (corr?.admissionCorrelationId) score += 20;
  if (corr?.internalPlacementRequestId) score += 15;

  // Prefer newer clinical start as weak tie-break signal (scaled down).
  const start = timeMs(enc.admittedAt ?? enc.createdAt);
  score += Math.min(9, Math.floor(start / 1e12));

  return score;
}

export function pickCanonicalInpatientCensusEncounter(
  candidates: HospitalCensusEncounterInput[]
): HospitalCensusEncounterInput {
  if (candidates.length === 0) {
    throw new Error("pickCanonicalInpatientCensusEncounter requires candidates");
  }
  return [...candidates].sort((a, b) => {
    const scoreDiff = scoreCanonicalInpatientCensusEncounter(b) - scoreCanonicalInpatientCensusEncounter(a);
    if (scoreDiff !== 0) return scoreDiff;
    const timeDiff = timeMs(b.admittedAt ?? b.createdAt) - timeMs(a.admittedAt ?? a.createdAt);
    if (timeDiff !== 0) return timeDiff;
    return String(b.id).localeCompare(String(a.id));
  })[0]!;
}

export type CanonicalCensusProjectionResult = {
  /** Encounter IDs retained in the projected census (canonical set). */
  retainedEncounterIds: Set<string>;
  /** Encounter IDs suppressed from census projection (durable rows untouched). */
  suppressedEncounterIds: string[];
  diagnostics: HospitalCensusConsistencyDiagnostic[];
};

/**
 * Given census-eligible encounter inputs, return which encounterIds should appear
 * on the census projection.
 *
 * Steps:
 * 1) Encounter-keyed uniqueness (same encounterId never appears twice).
 * 2) Per (facility, patientId, clinical lane INPATIENT|OBSERVATION): keep one
 *    canonical encounter when multiple OPEN charts exist.
 */
export function projectCanonicalCensusEncounterIds(input: {
  encounters: HospitalCensusEncounterInput[];
  /** Map encounterId → clinicalContext already classified for census. */
  clinicalContextByEncounterId: Map<string, "OBSERVATION" | "INPATIENT">;
}): CanonicalCensusProjectionResult {
  const { unique, duplicateEncounterIds } = collapseCensusEncountersByEncounterId(
    input.encounters
  );
  const diagnostics: HospitalCensusConsistencyDiagnostic[] = [];

  for (const id of duplicateEncounterIds) {
    diagnostics.push({
      code: "DUPLICATE_ENCOUNTER_ID_IN_CENSUS_SOURCE",
      severity: "warning",
      detail:
        "Census source listed the same encounterId more than once; collapsed to one row.",
      encounterId: id,
    });
  }

  const byLanePatient = new Map<string, HospitalCensusEncounterInput[]>();
  for (const enc of unique) {
    const ctx = input.clinicalContextByEncounterId.get(enc.id);
    if (ctx !== "OBSERVATION" && ctx !== "INPATIENT") continue;
    const pid = patientKey(enc);
    // Without patientId we cannot safely group — keep the encounter (encounter-keyed only).
    if (!pid) {
      const loneKey = `lone:${enc.facilityId}:${ctx}:${enc.id}`;
      byLanePatient.set(loneKey, [enc]);
      continue;
    }
    const key = `${enc.facilityId}|${pid}|${ctx}`;
    const list = byLanePatient.get(key) ?? [];
    list.push(enc);
    byLanePatient.set(key, list);
  }

  const retained = new Set<string>();
  const suppressed: string[] = [];

  for (const group of byLanePatient.values()) {
    if (group.length === 1) {
      retained.add(group[0]!.id);
      continue;
    }
    const winner = pickCanonicalInpatientCensusEncounter(group);
    retained.add(winner.id);
    for (const enc of group) {
      if (enc.id === winner.id) continue;
      suppressed.push(enc.id);
      diagnostics.push({
        code: "DUPLICATE_OPEN_INPATIENT_ON_CENSUS",
        severity: "critical",
        detail: `Multiple open ${input.clinicalContextByEncounterId.get(enc.id) ?? "hospital"} encounters for the same patient; census keeps encounter ${winner.id} (room=${winner.roomLabel ?? "null"}) and suppresses ${enc.id} (room=${enc.roomLabel ?? "null"}). Durable charts are not deleted.`,
        encounterId: enc.id,
      });
    }
  }

  return {
    retainedEncounterIds: retained,
    suppressedEncounterIds: suppressed,
    diagnostics,
  };
}

/** Apply canonical retention to built census patient rows (encounter-keyed). */
export function filterCensusRowsToCanonicalEncounterSet(
  rows: HospitalCensusPatientRow[],
  retainedEncounterIds: Set<string>
): HospitalCensusPatientRow[] {
  const byId = new Map<string, HospitalCensusPatientRow>();
  for (const row of rows) {
    if (!retainedEncounterIds.has(row.encounterId)) continue;
    if (byId.has(row.encounterId)) continue;
    byId.set(row.encounterId, row);
  }
  return Array.from(byId.values());
}

/** Frontend/API defensive helper: collapse duplicate rows by encounterId only. */
export function dedupeCensusRowsByEncounterId(
  rows: HospitalCensusPatientRow[]
): HospitalCensusPatientRow[] {
  const byId = new Map<string, HospitalCensusPatientRow>();
  for (const row of rows) {
    const id = String(row.encounterId ?? "").trim();
    if (!id || byId.has(id)) continue;
    byId.set(id, row);
  }
  return Array.from(byId.values());
}
