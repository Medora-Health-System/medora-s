/**
 * D4A.2.8-HF2 — Authoritative hospital encounter resolution + census eligibility.
 * Pure classifiers (no I/O). Server services compose these with Prisma loads.
 *
 * Never silently substitute an unrelated encounter. Lineage redirect only when
 * same-patient + same-facility + unambiguous destination.
 */

import {
  resolveClinicalEncounterContext,
  type ClinicalEncounterContext,
} from "./clinicalEncounterIdentity.js";
import {
  resolveEncounterCanonicalBedKey,
  parseCanonicalBedKey,
  formatCanonicalBedDisplay,
} from "./facilityBedGovernance.js";

export const AUTHORITATIVE_HOSPITAL_CENSUS_LINEAGE_RECOVERY_CERTIFICATION_ID =
  "MEDUI.AUTHORITATIVE_HOSPITAL_CENSUS_LINEAGE_RECOVERY.D4A2_8_HF2" as const;

/** Machine-readable census / authority exclusion reasons. */
export const HOSPITAL_CENSUS_EXCLUSION_REASONS = [
  "FACILITY_MISMATCH",
  "TYPE_NOT_HOSPITAL",
  "SOURCE_ED_ENCOUNTER",
  "STATUS_NOT_OPEN",
  "ENCOUNTER_NOT_FOUND",
  "CLINICAL_CONTEXT_UNKNOWN",
  "CANCELLED_OR_VOIDED",
  "CLOSED_ENCOUNTER",
  "MISSING_ID",
  "LINEAGE_AMBIGUOUS",
  "BED_OCCUPANT_TYPE_MISMATCH",
  "BED_WITHOUT_ACTIVE_HOSPITAL_ENCOUNTER",
  "ACTIVE_HOSPITAL_ENCOUNTER_WITHOUT_BED",
  "CROSS_FACILITY_LINEAGE",
  "CROSS_PATIENT_LINEAGE",
] as const;

export type HospitalCensusExclusionReason =
  (typeof HOSPITAL_CENSUS_EXCLUSION_REASONS)[number];

export type HospitalEncounterAuthorityInput = {
  id: string;
  facilityId: string;
  patientId: string;
  type?: string | null;
  status?: string | null;
  billingClassification?: string | null;
  admissionSummaryJson?: unknown;
  roomLabel?: string | null;
  admittedAt?: string | Date | null;
  createdAt?: string | Date | null;
  hospitalEpisodeId?: string | null;
  dischargedAt?: string | Date | null;
};

export type HospitalCensusEligibilityV1 = {
  eligible: boolean;
  clinicalContext: ClinicalEncounterContext | null;
  reasons: HospitalCensusExclusionReason[];
  /** True when type=INPATIENT and OPEN and same facility — feeds Obs/IP census. */
  countsTowardHospitalCensus: boolean;
};

export type HospitalLineagePointersV1 = {
  originatingEdEncounterId: string | null;
  observationEncounterId: string | null;
  receivingEncounterId: string | null;
  sourceEncounterId: string | null;
  placementReceivingEncounterId: string | null;
  hospitalEpisodeId: string | null;
  assignedBedKey: string | null;
  requestedEncounterType: string | null;
  admissionSource: string | null;
};

export type HospitalEncounterResolutionV1 =
  | {
      ok: true;
      requestedEncounterId: string;
      resolvedEncounterId: string;
      redirected: boolean;
      redirectReason: "LINEAGE_DESTINATION" | null;
      facilityId: string;
      patientId: string;
      encounterType: string;
      clinicalContext: ClinicalEncounterContext;
      status: string;
      hospitalEpisodeId: string | null;
      census: HospitalCensusEligibilityV1;
      lineage: HospitalLineagePointersV1;
      canonicalBedKey: string | null;
    }
  | {
      ok: false;
      requestedEncounterId: string | null;
      category:
        | "MISSING_ID"
        | "NOT_FOUND"
        | "FACILITY_MISMATCH"
        | "WRONG_ENCOUNTER_TYPE"
        | "ED_ENCOUNTER_REJECTED"
        | "OBSERVATION_ENCOUNTER_REJECTED"
        | "LINEAGE_AMBIGUOUS"
        | "CROSS_PATIENT_LINEAGE"
        | "CROSS_FACILITY_LINEAGE";
      actualFacilityId?: string | null;
      actualEncounterType?: string | null;
      patientId?: string | null;
      census: HospitalCensusEligibilityV1;
      lineage: HospitalLineagePointersV1 | null;
      messageCode: string;
    };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function strId(value: unknown): string | null {
  const s = String(value ?? "").trim();
  return s || null;
}

function upper(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

export function readHospitalLineagePointers(
  enc: Pick<
    HospitalEncounterAuthorityInput,
    "admissionSummaryJson" | "hospitalEpisodeId"
  >
): HospitalLineagePointersV1 {
  const root = asRecord(enc.admissionSummaryJson) ?? {};
  const correlation = asRecord(root.hospitalAdmissionCorrelation) ?? {};
  return {
    originatingEdEncounterId:
      strId(root.originatingEdEncounterId) ??
      strId(root.sourceEdEncounterId) ??
      null,
    observationEncounterId: strId(root.observationEncounterId),
    receivingEncounterId:
      strId(root.receivingEncounterId) ??
      strId(correlation.receivingEncounterId) ??
      null,
    sourceEncounterId:
      strId(correlation.sourceEncounterId) ??
      strId(root.sourceEncounterId) ??
      null,
    placementReceivingEncounterId: strId(root.placementReceivingEncounterId),
    hospitalEpisodeId: strId(enc.hospitalEpisodeId) ?? strId(root.hospitalEpisodeId),
    assignedBedKey: strId(root.assignedBedKey),
    requestedEncounterType: strId(root.requestedEncounterType),
    admissionSource: strId(root.admissionSource),
  };
}

function isCancelledOrVoided(admissionSummaryJson: unknown): boolean {
  const root = asRecord(admissionSummaryJson) ?? {};
  const lifecycle = asRecord(root.inpatientLifecycle) ?? asRecord(root.lifecycle) ?? {};
  return Boolean(lifecycle.voidedAt || lifecycle.cancelledAt || root.voidedAt || root.cancelledAt);
}

/**
 * Census eligibility for a single encounter relative to an expected facility.
 * Eligible hospital census rows require: same facility, OPEN, type=INPATIENT,
 * clinical context OBSERVATION|INPATIENT, not cancelled/voided.
 */
export function evaluateHospitalCensusEligibility(input: {
  encounter: HospitalEncounterAuthorityInput | null | undefined;
  expectedFacilityId: string;
}): HospitalCensusEligibilityV1 {
  const expected = String(input.expectedFacilityId ?? "").trim();
  const enc = input.encounter;
  if (!enc?.id?.trim()) {
    return {
      eligible: false,
      clinicalContext: null,
      reasons: ["ENCOUNTER_NOT_FOUND"],
      countsTowardHospitalCensus: false,
    };
  }

  const reasons: HospitalCensusExclusionReason[] = [];
  const status = upper(enc.status);
  const type = upper(enc.type);

  if (expected && String(enc.facilityId) !== expected) {
    reasons.push("FACILITY_MISMATCH");
  }
  if (status === "CLOSED") {
    reasons.push("CLOSED_ENCOUNTER");
    reasons.push("STATUS_NOT_OPEN");
  } else if (status !== "OPEN") {
    reasons.push("STATUS_NOT_OPEN");
  }
  if (type === "EMERGENCY") {
    reasons.push("SOURCE_ED_ENCOUNTER");
    reasons.push("TYPE_NOT_HOSPITAL");
  } else if (type !== "INPATIENT") {
    reasons.push("TYPE_NOT_HOSPITAL");
  }
  if (isCancelledOrVoided(enc.admissionSummaryJson)) {
    reasons.push("CANCELLED_OR_VOIDED");
  }

  const clinicalContext =
    type === "INPATIENT"
      ? resolveClinicalEncounterContext({
          type: enc.type,
          status: enc.status,
          billingClassification: enc.billingClassification,
          admissionSummaryJson: enc.admissionSummaryJson,
        })
      : type === "EMERGENCY"
        ? ("EMERGENCY" as ClinicalEncounterContext)
        : ("UNKNOWN" as ClinicalEncounterContext);

  if (
    type === "INPATIENT" &&
    clinicalContext !== "OBSERVATION" &&
    clinicalContext !== "INPATIENT"
  ) {
    reasons.push("CLINICAL_CONTEXT_UNKNOWN");
  }

  const countsTowardHospitalCensus =
    reasons.length === 0 &&
    (clinicalContext === "OBSERVATION" || clinicalContext === "INPATIENT");

  return {
    eligible: countsTowardHospitalCensus,
    clinicalContext,
    reasons,
    countsTowardHospitalCensus,
  };
}

export type BedCensusReconciliationV1 = {
  bedKey: string | null;
  bedDisplay: string | null;
  occupantEncounterId: string | null;
  occupantType: string | null;
  occupantCountsTowardCensus: boolean;
  censusEncounterIdsOnBed: string[];
  warnings: HospitalCensusExclusionReason[];
};

export function reconcileBedAgainstCensus(input: {
  bedKeyRaw: string | null | undefined;
  occupant: HospitalEncounterAuthorityInput | null | undefined;
  expectedFacilityId: string;
  censusEligibleEncounterIdsOnSameBed?: string[];
}): BedCensusReconciliationV1 {
  const raw = String(input.bedKeyRaw ?? "").trim();
  const parsed = raw
    ? parseCanonicalBedKey(raw) ??
      (() => {
        // Accept display form MS-1 / MS-1-A via roomLabel resolver path
        const key = resolveEncounterCanonicalBedKey({
          roomLabel: raw,
          type: "INPATIENT",
        });
        return key ? parseCanonicalBedKey(key) : null;
      })()
    : null;
  const bedKey = parsed ? `${parsed.unit}:${parsed.room}` : raw || null;
  const bedDisplay = bedKey ? formatCanonicalBedDisplay(bedKey) : null;
  const warnings: HospitalCensusExclusionReason[] = [];
  const occupant = input.occupant ?? null;
  const census = evaluateHospitalCensusEligibility({
    encounter: occupant,
    expectedFacilityId: input.expectedFacilityId,
  });

  if (occupant && !census.countsTowardHospitalCensus) {
    if (census.reasons.includes("SOURCE_ED_ENCOUNTER")) {
      warnings.push("BED_OCCUPANT_TYPE_MISMATCH");
      warnings.push("SOURCE_ED_ENCOUNTER");
    } else if (census.reasons.includes("TYPE_NOT_HOSPITAL")) {
      warnings.push("BED_OCCUPANT_TYPE_MISMATCH");
    }
    warnings.push("BED_WITHOUT_ACTIVE_HOSPITAL_ENCOUNTER");
  }
  if (!occupant && bedKey) {
    warnings.push("BED_WITHOUT_ACTIVE_HOSPITAL_ENCOUNTER");
  }

  const censusOnBed = (input.censusEligibleEncounterIdsOnSameBed ?? []).filter(Boolean);
  if (occupant && census.countsTowardHospitalCensus === false && censusOnBed.length === 0) {
    // already warned
  }

  return {
    bedKey,
    bedDisplay,
    occupantEncounterId: occupant?.id ?? null,
    occupantType: occupant ? String(occupant.type ?? "") : null,
    occupantCountsTowardCensus: census.countsTowardHospitalCensus,
    censusEncounterIdsOnBed: censusOnBed,
    warnings: [...new Set(warnings)],
  };
}

/**
 * Resolve requested encounter for a workspace/census consumer.
 * `foundById` must be loaded WITHOUT facility filter when present.
 * `lineageDestination` is an optional same-patient destination already verified by the server.
 */
export function resolveHospitalEncounterAuthority(input: {
  requestedEncounterId: string | null | undefined;
  expectedFacilityId: string;
  /** Encounter loaded by primary key only (no facility filter). */
  foundById: HospitalEncounterAuthorityInput | null | undefined;
  /**
   * Optional unambiguous lineage destination (same patient + facility).
   * Must already be validated by the caller — never invent.
   */
  lineageDestination?: HospitalEncounterAuthorityInput | null;
  /** Workspace expectation: inpatient chart vs observation chart vs any. */
  workspace?: "INPATIENT" | "OBSERVATION" | "ANY";
}): HospitalEncounterResolutionV1 {
  const requested = String(input.requestedEncounterId ?? "").trim() || null;
  const expectedFacilityId = String(input.expectedFacilityId ?? "").trim();
  const workspace = input.workspace ?? "ANY";
  const emptyCensus: HospitalCensusEligibilityV1 = {
    eligible: false,
    clinicalContext: null,
    reasons: ["MISSING_ID"],
    countsTowardHospitalCensus: false,
  };

  if (!requested) {
    return {
      ok: false,
      requestedEncounterId: null,
      category: "MISSING_ID",
      census: emptyCensus,
      lineage: null,
      messageCode: "inpatientWorkspaceRecovery.errors.MISSING_ID",
    };
  }

  const found = input.foundById ?? null;
  if (!found) {
    return {
      ok: false,
      requestedEncounterId: requested,
      category: "NOT_FOUND",
      census: {
        eligible: false,
        clinicalContext: null,
        reasons: ["ENCOUNTER_NOT_FOUND"],
        countsTowardHospitalCensus: false,
      },
      lineage: null,
      messageCode: "inpatientWorkspaceRecovery.errors.NOT_FOUND",
    };
  }

  const lineage = readHospitalLineagePointers(found);
  const census = evaluateHospitalCensusEligibility({
    encounter: found,
    expectedFacilityId,
  });

  if (expectedFacilityId && String(found.facilityId) !== expectedFacilityId) {
    return {
      ok: false,
      requestedEncounterId: requested,
      category: "FACILITY_MISMATCH",
      actualFacilityId: found.facilityId,
      actualEncounterType: String(found.type ?? ""),
      patientId: found.patientId,
      census,
      lineage,
      messageCode: "inpatientWorkspaceRecovery.errors.FACILITY_MISMATCH",
    };
  }

  // Unambiguous lineage redirect: source ED/Obs → destination hospital encounter
  const dest = input.lineageDestination ?? null;
  if (dest && dest.id !== found.id) {
    if (String(dest.patientId) !== String(found.patientId)) {
      return {
        ok: false,
        requestedEncounterId: requested,
        category: "CROSS_PATIENT_LINEAGE",
        patientId: found.patientId,
        census,
        lineage,
        messageCode: "hospitalEncounterAuthority.errors.CROSS_PATIENT_LINEAGE",
      };
    }
    if (String(dest.facilityId) !== String(found.facilityId)) {
      return {
        ok: false,
        requestedEncounterId: requested,
        category: "CROSS_FACILITY_LINEAGE",
        actualFacilityId: dest.facilityId,
        patientId: found.patientId,
        census,
        lineage,
        messageCode: "hospitalEncounterAuthority.errors.CROSS_FACILITY_LINEAGE",
      };
    }
    const destCensus = evaluateHospitalCensusEligibility({
      encounter: dest,
      expectedFacilityId,
    });
    const destCtx = resolveClinicalEncounterContext({
      type: dest.type,
      status: dest.status,
      billingClassification: dest.billingClassification,
      admissionSummaryJson: dest.admissionSummaryJson,
    });
    const bedKey = resolveEncounterCanonicalBedKey({
      roomLabel: dest.roomLabel,
      type: dest.type,
      admissionSummaryJson: dest.admissionSummaryJson,
    });
    return {
      ok: true,
      requestedEncounterId: requested,
      resolvedEncounterId: dest.id,
      redirected: true,
      redirectReason: "LINEAGE_DESTINATION",
      facilityId: dest.facilityId,
      patientId: dest.patientId,
      encounterType: String(dest.type ?? ""),
      clinicalContext: destCtx,
      status: String(dest.status ?? ""),
      hospitalEpisodeId: dest.hospitalEpisodeId ?? null,
      census: destCensus,
      lineage: readHospitalLineagePointers(dest),
      canonicalBedKey: bedKey,
    };
  }

  const type = upper(found.type);
  if (workspace === "INPATIENT") {
    if (type === "EMERGENCY") {
      return {
        ok: false,
        requestedEncounterId: requested,
        category: "ED_ENCOUNTER_REJECTED",
        actualEncounterType: String(found.type),
        patientId: found.patientId,
        census,
        lineage,
        messageCode: "inpatientWorkspaceRecovery.errors.ED_ENCOUNTER_REJECTED",
      };
    }
    if (type !== "INPATIENT") {
      return {
        ok: false,
        requestedEncounterId: requested,
        category: "WRONG_ENCOUNTER_TYPE",
        actualEncounterType: String(found.type),
        patientId: found.patientId,
        census,
        lineage,
        messageCode: "inpatientWorkspaceRecovery.errors.WRONG_ENCOUNTER_TYPE",
      };
    }
    const ctx = resolveClinicalEncounterContext({
      type: found.type,
      status: found.status,
      billingClassification: found.billingClassification,
      admissionSummaryJson: found.admissionSummaryJson,
    });
    // Observation charts must not open as inpatient writers
    if (ctx === "OBSERVATION") {
      return {
        ok: false,
        requestedEncounterId: requested,
        category: "OBSERVATION_ENCOUNTER_REJECTED",
        actualEncounterType: String(found.type),
        patientId: found.patientId,
        census,
        lineage,
        messageCode: "inpatientWorkspaceRecovery.errors.OBSERVATION_ENCOUNTER_REJECTED",
      };
    }
  }

  if (workspace === "OBSERVATION") {
    if (type === "EMERGENCY") {
      return {
        ok: false,
        requestedEncounterId: requested,
        category: "ED_ENCOUNTER_REJECTED",
        actualEncounterType: String(found.type),
        patientId: found.patientId,
        census,
        lineage,
        messageCode: "inpatientWorkspaceRecovery.errors.ED_ENCOUNTER_REJECTED",
      };
    }
    const ctx = resolveClinicalEncounterContext({
      type: found.type,
      status: found.status,
      billingClassification: found.billingClassification,
      admissionSummaryJson: found.admissionSummaryJson,
    });
    if (ctx !== "OBSERVATION") {
      return {
        ok: false,
        requestedEncounterId: requested,
        category: "WRONG_ENCOUNTER_TYPE",
        actualEncounterType: String(found.type),
        patientId: found.patientId,
        census,
        lineage,
        messageCode: "inpatientRapidConvergenceD4a27c.observation.wrongType",
      };
    }
  }

  const clinicalContext = resolveClinicalEncounterContext({
    type: found.type,
    status: found.status,
    billingClassification: found.billingClassification,
    admissionSummaryJson: found.admissionSummaryJson,
  });
  const bedKey = resolveEncounterCanonicalBedKey({
    roomLabel: found.roomLabel,
    type: found.type,
    admissionSummaryJson: found.admissionSummaryJson,
  });

  return {
    ok: true,
    requestedEncounterId: requested,
    resolvedEncounterId: found.id,
    redirected: false,
    redirectReason: null,
    facilityId: found.facilityId,
    patientId: found.patientId,
    encounterType: String(found.type ?? ""),
    clinicalContext,
    status: String(found.status ?? ""),
    hospitalEpisodeId: found.hospitalEpisodeId ?? null,
    census,
    lineage,
    canonicalBedKey: bedKey,
  };
}

/** Facility-scoped invariant report for admin reconciliation (counts only). */
export type HospitalCensusFacilityInvariantReportV1 = {
  facilityId: string;
  openHospitalCensusEligible: number;
  openObservation: number;
  openInpatient: number;
  occupiedBedsFromBoard: number;
  occupiedBedsWithoutCensusEncounter: number;
  censusEncountersWithoutBed: number;
  edOccupantsOnHospitalBeds: number;
  facilityMismatchCandidates: number;
  warnings: Array<{ code: HospitalCensusExclusionReason; count: number }>;
};

export function buildFacilityInvariantReport(input: {
  facilityId: string;
  encounters: HospitalEncounterAuthorityInput[];
  occupiedBedOccupantIds: Array<string | null | undefined>;
}): HospitalCensusFacilityInvariantReportV1 {
  const fid = String(input.facilityId ?? "").trim();
  let openObservation = 0;
  let openInpatient = 0;
  let censusEncountersWithoutBed = 0;
  let edOccupantsOnHospitalBeds = 0;
  let facilityMismatchCandidates = 0;
  const censusIds = new Set<string>();

  for (const enc of input.encounters) {
    const elig = evaluateHospitalCensusEligibility({
      encounter: enc,
      expectedFacilityId: fid,
    });
    if (elig.reasons.includes("FACILITY_MISMATCH")) facilityMismatchCandidates += 1;
    if (!elig.countsTowardHospitalCensus) continue;
    censusIds.add(enc.id);
    if (elig.clinicalContext === "OBSERVATION") openObservation += 1;
    if (elig.clinicalContext === "INPATIENT") openInpatient += 1;
    const bed = resolveEncounterCanonicalBedKey({
      roomLabel: enc.roomLabel,
      type: enc.type,
      admissionSummaryJson: enc.admissionSummaryJson,
    });
    if (!bed) censusEncountersWithoutBed += 1;
  }

  let occupiedBedsWithoutCensusEncounter = 0;
  const occupied = input.occupiedBedOccupantIds.filter((id) => String(id ?? "").trim());
  for (const id of occupied) {
    const eid = String(id).trim();
    if (!censusIds.has(eid)) occupiedBedsWithoutCensusEncounter += 1;
    const enc = input.encounters.find((e) => e.id === eid);
    if (enc && upper(enc.type) === "EMERGENCY") edOccupantsOnHospitalBeds += 1;
  }

  const warnings: HospitalCensusFacilityInvariantReportV1["warnings"] = [];
  if (occupiedBedsWithoutCensusEncounter > 0) {
    warnings.push({
      code: "BED_WITHOUT_ACTIVE_HOSPITAL_ENCOUNTER",
      count: occupiedBedsWithoutCensusEncounter,
    });
  }
  if (edOccupantsOnHospitalBeds > 0) {
    warnings.push({ code: "SOURCE_ED_ENCOUNTER", count: edOccupantsOnHospitalBeds });
  }
  if (facilityMismatchCandidates > 0) {
    warnings.push({ code: "FACILITY_MISMATCH", count: facilityMismatchCandidates });
  }

  return {
    facilityId: fid,
    openHospitalCensusEligible: openObservation + openInpatient,
    openObservation,
    openInpatient,
    occupiedBedsFromBoard: occupied.length,
    occupiedBedsWithoutCensusEncounter,
    censusEncountersWithoutBed,
    edOccupantsOnHospitalBeds,
    facilityMismatchCandidates,
    warnings,
  };
}
