/**
 * MEDUI.D4A.4.1 — Enterprise Encounter Ownership Resolver (shared, read-only).
 *
 * Extends D4A.3.0 assignment engine contracts — does NOT introduce a second bag,
 * table, MAR-specific ownership store, or chart-access grant.
 *
 * Authority:
 * - EMERGENCY → Encounter physicianAssignedUserId / nurseAssignedUserId
 * - OBSERVATION | INPATIENT → enterpriseHospitalAssignmentV1 workflow/clinical slots
 *
 * STRICT (default): empty/missing hospital bag → unresolved hospital ownership;
 * never silently promote ED columns to hospital authority.
 *
 * LEGACY_COMPATIBILITY (explicit typed mode only): may surface ED columns as
 * labeled fallback for hospital encounters with empty/missing bag — never writes.
 *
 * Security: assignment ≠ chart access. Resolver output is operational ownership only.
 * Audit: never — reads must not call audit infrastructure (Nest adapter enforces).
 * Historical authorship (order author, MAR administrator, cosigner, etc.) is out of scope.
 *
 * Batch: pure function over already-loaded rows; Nest provides findMany + map.
 */

import { resolveClinicalEncounterContext } from "./clinicalEncounterIdentity.js";
import {
  type EnterpriseAssignmentCareSetting,
  type EnterpriseHospitalAssignmentBagV1,
  type EnterpriseAssignmentSlotV1,
  readHospitalAssignmentBag,
  resolveHospitalCareSettingFromEncounter,
} from "./enterpriseAssignmentEngineD4a30.js";

export const ENTERPRISE_ENCOUNTER_OWNERSHIP_RESOLVER_CERTIFICATION_ID =
  "MEDUI.ENTERPRISE_ENCOUNTER_OWNERSHIP_RESOLVER.D4A4_1" as const;

/** Explicit compatibility strategy — never an invisible generic selector. */
export type OwnershipCompatibilityMode = "STRICT" | "LEGACY_COMPATIBILITY";

export type EncounterOwnershipConcept =
  | "PRIMARY_PROVIDER"
  | "PRIMARY_RN"
  | "CLINICAL_ATTENDING"
  | "PATIENT_CARE_TECH"
  | "COVERING_PROVIDER"
  | "BREAK_RN"
  | "CHARGE_RN";

export type EncounterOwnershipSource =
  | "ED_ENCOUNTER_COLUMNS"
  | "HOSPITAL_ASSIGNMENT_BAG"
  | "UNRESOLVED"
  | "LEGACY_ED_COLUMNS_COMPATIBILITY";

export type EncounterOwnershipAssignmentStatus =
  | "ASSIGNED"
  | "UNASSIGNED"
  | "UNRESOLVED"
  | "UNSUPPORTED_CARE_SETTING";

export type OwnershipDiagnosticCode =
  | "OK"
  | "HOSPITAL_BAG_ABSENT"
  | "HOSPITAL_PRIMARY_UNASSIGNED"
  | "ED_COLUMNS_POPULATED_ON_HOSPITAL_ENCOUNTER"
  | "SOURCE_CONFLICT_ED_VS_HOSPITAL"
  | "CARE_SETTING_CLASSIFIER_CONFLICT"
  | "UNKNOWN_CARE_SETTING"
  | "INVALID_BAG_INPUT"
  | "LEGACY_FALLBACK_APPLIED"
  | "ED_SLOT_UNSUPPORTED";

export type OwnershipAuthoritySource =
  | "ED_ENCOUNTER_COLUMNS"
  | "HOSPITAL_ASSIGNMENT_BAG"
  | "NONE";

export type ResolvedEncounterOwnershipSlot = {
  concept: EncounterOwnershipConcept;
  /** Operational assignee only — not chart ACL. */
  userId: string | null;
  displayName: string | null;
  source: EncounterOwnershipSource;
  assignmentStatus: EncounterOwnershipAssignmentStatus;
  isLegacyFallback: boolean;
  hasSourceConflict: boolean;
  diagnosticReason: OwnershipDiagnosticCode;
};

/**
 * Typed projection for future consumers (MAR, pass queue, cancel, headers, tasks).
 * Do not render raw bag JSON in UI.
 */
export type ActiveEncounterOwnershipProjection = {
  certification: typeof ENTERPRISE_ENCOUNTER_OWNERSHIP_RESOLVER_CERTIFICATION_ID;
  careSetting: EnterpriseAssignmentCareSetting | "UNKNOWN";
  /** Which store is authoritative for active ownership under policy. */
  authoritySource: OwnershipAuthoritySource;
  compatibilityMode: OwnershipCompatibilityMode;
  primaryProvider: ResolvedEncounterOwnershipSlot;
  primaryNurse: ResolvedEncounterOwnershipSlot;
  clinicalAttending: ResolvedEncounterOwnershipSlot;
  patientCareTech: ResolvedEncounterOwnershipSlot;
  coveringProvider: ResolvedEncounterOwnershipSlot;
  breakNurse: ResolvedEncounterOwnershipSlot;
  chargeNurse: ResolvedEncounterOwnershipSlot;
  diagnostics: OwnershipDiagnosticCode[];
  hasSourceConflict: boolean;
  /**
   * Classifier conflict metadata (no PHI). Present when bag careSetting and
   * resolveClinicalEncounterContext disagree on OBS vs IP.
   */
  careSettingClassifierConflict: {
    bagCareSetting: "OBSERVATION" | "INPATIENT" | null;
    clinicalEncounterContext: string;
    hospitalHelperCareSetting: "OBSERVATION" | "INPATIENT" | null;
  } | null;
};

export type ResolveActiveEncounterOwnershipInput = {
  type?: string | null;
  billingClassification?: string | null;
  admissionSummaryJson?: unknown;
  physicianAssignedUserId?: string | null;
  nurseAssignedUserId?: string | null;
  /** Optional pre-parsed bag to avoid repeated JSON parse in batch paths. */
  hospitalAssignmentBag?: EnterpriseHospitalAssignmentBagV1 | null;
  compatibilityMode?: OwnershipCompatibilityMode;
};

function trimId(value: unknown): string | null {
  const s = String(value ?? "").trim();
  return s || null;
}

function slotFromBag(slot: EnterpriseAssignmentSlotV1 | null | undefined): {
  userId: string | null;
  displayName: string | null;
} {
  return {
    userId: trimId(slot?.userId),
    displayName: slot?.displayName?.trim() ? slot.displayName : null,
  };
}

function makeSlot(
  concept: EncounterOwnershipConcept,
  partial: Omit<ResolvedEncounterOwnershipSlot, "concept">
): ResolvedEncounterOwnershipSlot {
  return { concept, ...partial };
}

function unassignedHospital(
  concept: EncounterOwnershipConcept,
  diagnosticReason: OwnershipDiagnosticCode
): ResolvedEncounterOwnershipSlot {
  return makeSlot(concept, {
    userId: null,
    displayName: null,
    source: "UNRESOLVED",
    assignmentStatus: "UNASSIGNED",
    isLegacyFallback: false,
    hasSourceConflict: false,
    diagnosticReason,
  });
}

function unsupportedEd(
  concept: EncounterOwnershipConcept
): ResolvedEncounterOwnershipSlot {
  return makeSlot(concept, {
    userId: null,
    displayName: null,
    source: "UNRESOLVED",
    assignmentStatus: "UNSUPPORTED_CARE_SETTING",
    isLegacyFallback: false,
    hasSourceConflict: false,
    diagnosticReason: "ED_SLOT_UNSUPPORTED",
  });
}

/**
 * Care-setting for ownership authority.
 * See pre-implementation note: bag preferred over clinical identity for OBS/IP
 * when bag exists; EMERGENCY always wins on ED type/context.
 */
export function resolveOwnershipCareSetting(input: {
  type?: string | null;
  billingClassification?: string | null;
  admissionSummaryJson?: unknown;
  hospitalAssignmentBag?: EnterpriseHospitalAssignmentBagV1 | null;
}): {
  careSetting: EnterpriseAssignmentCareSetting | "UNKNOWN";
  bagCareSetting: "OBSERVATION" | "INPATIENT" | null;
  clinicalEncounterContext: string;
  hospitalHelperCareSetting: "OBSERVATION" | "INPATIENT" | null;
  classifierConflict: boolean;
} {
  const bag =
    input.hospitalAssignmentBag !== undefined
      ? input.hospitalAssignmentBag
      : readHospitalAssignmentBag(input.admissionSummaryJson);
  const bagCareSetting = bag?.careSetting ?? null;
  const clinicalEncounterContext = resolveClinicalEncounterContext({
    type: input.type,
    billingClassification: input.billingClassification,
    admissionSummaryJson: input.admissionSummaryJson,
  });
  const hospitalHelperCareSetting = resolveHospitalCareSettingFromEncounter({
    type: input.type,
    admissionSummaryJson: input.admissionSummaryJson,
  });

  if (clinicalEncounterContext === "EMERGENCY") {
    return {
      careSetting: "EMERGENCY",
      bagCareSetting,
      clinicalEncounterContext,
      hospitalHelperCareSetting,
      classifierConflict: Boolean(bagCareSetting),
    };
  }

  let careSetting: EnterpriseAssignmentCareSetting | "UNKNOWN" = "UNKNOWN";
  if (bagCareSetting) {
    careSetting = bagCareSetting;
  } else if (
    clinicalEncounterContext === "OBSERVATION" ||
    clinicalEncounterContext === "INPATIENT"
  ) {
    careSetting = clinicalEncounterContext;
  } else if (hospitalHelperCareSetting) {
    careSetting = hospitalHelperCareSetting;
  }

  const classifierConflict =
    Boolean(bagCareSetting) &&
    (clinicalEncounterContext === "OBSERVATION" ||
      clinicalEncounterContext === "INPATIENT") &&
    bagCareSetting !== clinicalEncounterContext;

  return {
    careSetting,
    bagCareSetting,
    clinicalEncounterContext,
    hospitalHelperCareSetting,
    classifierConflict,
  };
}

function pushUnique(list: OwnershipDiagnosticCode[], code: OwnershipDiagnosticCode) {
  if (!list.includes(code)) list.push(code);
}

/**
 * Resolve active operational ownership for one encounter.
 * Pure — never mutates input, never audits, never grants chart access.
 */
export function resolveActiveEncounterOwnership(
  input: ResolveActiveEncounterOwnershipInput
): ActiveEncounterOwnershipProjection {
  const compatibilityMode: OwnershipCompatibilityMode =
    input.compatibilityMode ?? "STRICT";
  const diagnostics: OwnershipDiagnosticCode[] = [];

  const edPhysician = trimId(input.physicianAssignedUserId);
  const edNurse = trimId(input.nurseAssignedUserId);

  let bag: EnterpriseHospitalAssignmentBagV1 | null =
    input.hospitalAssignmentBag !== undefined
      ? input.hospitalAssignmentBag
      : null;
  if (input.hospitalAssignmentBag === undefined) {
    // Detect invalid bag shape vs absent: readHospitalAssignmentBag returns null for both
    // missing and invalid; surface INVALID_BAG_INPUT only when key present but unreadable.
    const summary = input.admissionSummaryJson;
    if (summary && typeof summary === "object" && !Array.isArray(summary)) {
      const raw = (summary as Record<string, unknown>).enterpriseHospitalAssignmentV1;
      if (raw != null) {
        bag = readHospitalAssignmentBag(summary);
        if (!bag) pushUnique(diagnostics, "INVALID_BAG_INPUT");
      } else {
        bag = null;
      }
    } else {
      bag = null;
    }
  }

  const resolvedCs = resolveOwnershipCareSetting({
    type: input.type,
    billingClassification: input.billingClassification,
    admissionSummaryJson: input.admissionSummaryJson,
    hospitalAssignmentBag: bag,
  });

  const careSettingClassifierConflict = resolvedCs.classifierConflict
    ? {
        bagCareSetting: resolvedCs.bagCareSetting,
        clinicalEncounterContext: resolvedCs.clinicalEncounterContext,
        hospitalHelperCareSetting: resolvedCs.hospitalHelperCareSetting,
      }
    : null;
  if (resolvedCs.classifierConflict) {
    pushUnique(diagnostics, "CARE_SETTING_CLASSIFIER_CONFLICT");
  }

  const careSetting = resolvedCs.careSetting;

  if (careSetting === "UNKNOWN") {
    pushUnique(diagnostics, "UNKNOWN_CARE_SETTING");
    const unresolved = (concept: EncounterOwnershipConcept) =>
      makeSlot(concept, {
        userId: null,
        displayName: null,
        source: "UNRESOLVED",
        assignmentStatus: "UNRESOLVED",
        isLegacyFallback: false,
        hasSourceConflict: false,
        diagnosticReason: "UNKNOWN_CARE_SETTING",
      });
    return {
      certification: ENTERPRISE_ENCOUNTER_OWNERSHIP_RESOLVER_CERTIFICATION_ID,
      careSetting: "UNKNOWN",
      authoritySource: "NONE",
      compatibilityMode,
      primaryProvider: unresolved("PRIMARY_PROVIDER"),
      primaryNurse: unresolved("PRIMARY_RN"),
      clinicalAttending: unresolved("CLINICAL_ATTENDING"),
      patientCareTech: unresolved("PATIENT_CARE_TECH"),
      coveringProvider: unresolved("COVERING_PROVIDER"),
      breakNurse: unresolved("BREAK_RN"),
      chargeNurse: unresolved("CHARGE_RN"),
      diagnostics,
      hasSourceConflict: false,
      careSettingClassifierConflict,
    };
  }

  // ─── EMERGENCY ───────────────────────────────────────────────────────────
  if (careSetting === "EMERGENCY") {
    const primaryProvider = makeSlot("PRIMARY_PROVIDER", {
      userId: edPhysician,
      displayName: null,
      source: "ED_ENCOUNTER_COLUMNS",
      assignmentStatus: edPhysician ? "ASSIGNED" : "UNASSIGNED",
      isLegacyFallback: false,
      hasSourceConflict: false,
      diagnosticReason: "OK",
    });
    const primaryNurse = makeSlot("PRIMARY_RN", {
      userId: edNurse,
      displayName: null,
      source: "ED_ENCOUNTER_COLUMNS",
      assignmentStatus: edNurse ? "ASSIGNED" : "UNASSIGNED",
      isLegacyFallback: false,
      hasSourceConflict: false,
      diagnosticReason: "OK",
    });
    if (diagnostics.length === 0) pushUnique(diagnostics, "OK");
    return {
      certification: ENTERPRISE_ENCOUNTER_OWNERSHIP_RESOLVER_CERTIFICATION_ID,
      careSetting: "EMERGENCY",
      authoritySource: "ED_ENCOUNTER_COLUMNS",
      compatibilityMode,
      primaryProvider,
      primaryNurse,
      clinicalAttending: unsupportedEd("CLINICAL_ATTENDING"),
      patientCareTech: unsupportedEd("PATIENT_CARE_TECH"),
      coveringProvider: unsupportedEd("COVERING_PROVIDER"),
      breakNurse: unsupportedEd("BREAK_RN"),
      chargeNurse: unsupportedEd("CHARGE_RN"),
      diagnostics,
      hasSourceConflict: false,
      careSettingClassifierConflict,
    };
  }

  // ─── OBSERVATION / INPATIENT ─────────────────────────────────────────────
  const edPopulated = Boolean(edPhysician || edNurse);
  if (!bag) {
    pushUnique(diagnostics, "HOSPITAL_BAG_ABSENT");
  }
  if (edPopulated) {
    pushUnique(diagnostics, "ED_COLUMNS_POPULATED_ON_HOSPITAL_ENCOUNTER");
  }

  const bagProvider = slotFromBag(bag?.workflow?.PRIMARY_PROVIDER);
  const bagNurse = slotFromBag(bag?.workflow?.PRIMARY_RN);
  const bagAttending = {
    userId: trimId(bag?.clinical?.attendingProviderUserId),
    displayName: bag?.clinical?.attendingProviderDisplayName?.trim()
      ? bag.clinical.attendingProviderDisplayName
      : null,
  };
  const bagTech = slotFromBag(bag?.workflow?.PATIENT_CARE_TECH);
  const bagCovering = slotFromBag(bag?.workflow?.COVERING_PROVIDER);
  const bagBreak = slotFromBag(bag?.workflow?.BREAK_RN);
  const bagCharge = slotFromBag(bag?.workflow?.CHARGE_RN);

  function hospitalPrimary(
    concept: "PRIMARY_PROVIDER" | "PRIMARY_RN",
    bagSlot: { userId: string | null; displayName: string | null },
    edId: string | null
  ): ResolvedEncounterOwnershipSlot {
    const conflict = Boolean(bagSlot.userId && edId && bagSlot.userId !== edId);
    if (conflict) pushUnique(diagnostics, "SOURCE_CONFLICT_ED_VS_HOSPITAL");

    if (bagSlot.userId) {
      return makeSlot(concept, {
        userId: bagSlot.userId,
        displayName: bagSlot.displayName,
        source: "HOSPITAL_ASSIGNMENT_BAG",
        assignmentStatus: "ASSIGNED",
        isLegacyFallback: false,
        hasSourceConflict: conflict,
        diagnosticReason: conflict ? "SOURCE_CONFLICT_ED_VS_HOSPITAL" : "OK",
      });
    }

    // Per-slot explicit legacy only — never silent STRICT fallback.
    if (compatibilityMode === "LEGACY_COMPATIBILITY" && edId) {
      pushUnique(diagnostics, "LEGACY_FALLBACK_APPLIED");
      return makeSlot(concept, {
        userId: edId,
        displayName: null,
        source: "LEGACY_ED_COLUMNS_COMPATIBILITY",
        assignmentStatus: "ASSIGNED",
        isLegacyFallback: true,
        hasSourceConflict: true,
        diagnosticReason: "LEGACY_FALLBACK_APPLIED",
      });
    }

    pushUnique(diagnostics, "HOSPITAL_PRIMARY_UNASSIGNED");
    return makeSlot(concept, {
      userId: null,
      displayName: null,
      source: "UNRESOLVED",
      assignmentStatus: bag ? "UNASSIGNED" : "UNRESOLVED",
      isLegacyFallback: false,
      // ED columns present but not authoritative under STRICT
      hasSourceConflict: Boolean(edId),
      diagnosticReason: bag ? "HOSPITAL_PRIMARY_UNASSIGNED" : "HOSPITAL_BAG_ABSENT",
    });
  }

  function hospitalAux(
    concept: EncounterOwnershipConcept,
    bagSlot: { userId: string | null; displayName: string | null }
  ): ResolvedEncounterOwnershipSlot {
    if (!bag) {
      return unassignedHospital(concept, "HOSPITAL_BAG_ABSENT");
    }
    return makeSlot(concept, {
      userId: bagSlot.userId,
      displayName: bagSlot.displayName,
      source: "HOSPITAL_ASSIGNMENT_BAG",
      assignmentStatus: bagSlot.userId ? "ASSIGNED" : "UNASSIGNED",
      isLegacyFallback: false,
      hasSourceConflict: false,
      diagnosticReason: "OK",
    });
  }

  const primaryProvider = hospitalPrimary("PRIMARY_PROVIDER", bagProvider, edPhysician);
  const primaryNurse = hospitalPrimary("PRIMARY_RN", bagNurse, edNurse);

  // When bag has assignees and ED also populated with same ids, still flag ED columns present
  // (already pushed). Mark hasSourceConflict only when ids differ (handled above) OR
  // when STRICT leaves hospital unassigned while ED is populated (handled above).

  const clinicalAttending = hospitalAux("CLINICAL_ATTENDING", bagAttending);
  // Attending is never the same concept as PRIMARY_PROVIDER — even if IDs match.
  const patientCareTech = hospitalAux("PATIENT_CARE_TECH", bagTech);
  const coveringProvider = hospitalAux("COVERING_PROVIDER", bagCovering);
  const breakNurse = hospitalAux("BREAK_RN", bagBreak);
  const chargeNurse = hospitalAux("CHARGE_RN", bagCharge);

  const hasSourceConflict =
    primaryProvider.hasSourceConflict ||
    primaryNurse.hasSourceConflict ||
    diagnostics.includes("SOURCE_CONFLICT_ED_VS_HOSPITAL");

  if (
    diagnostics.length === 0 ||
    (diagnostics.length === 1 && diagnostics[0] === "INVALID_BAG_INPUT" && bag)
  ) {
    // keep diagnostics as-is
  }
  if (
    !diagnostics.includes("HOSPITAL_BAG_ABSENT") &&
    !diagnostics.includes("HOSPITAL_PRIMARY_UNASSIGNED") &&
    !diagnostics.includes("SOURCE_CONFLICT_ED_VS_HOSPITAL") &&
    !diagnostics.includes("ED_COLUMNS_POPULATED_ON_HOSPITAL_ENCOUNTER") &&
    !diagnostics.includes("CARE_SETTING_CLASSIFIER_CONFLICT") &&
    !diagnostics.includes("LEGACY_FALLBACK_APPLIED") &&
    !diagnostics.includes("INVALID_BAG_INPUT") &&
    !diagnostics.includes("UNKNOWN_CARE_SETTING")
  ) {
    pushUnique(diagnostics, "OK");
  }

  return {
    certification: ENTERPRISE_ENCOUNTER_OWNERSHIP_RESOLVER_CERTIFICATION_ID,
    careSetting,
    authoritySource: "HOSPITAL_ASSIGNMENT_BAG",
    compatibilityMode,
    primaryProvider,
    primaryNurse,
    clinicalAttending,
    patientCareTech,
    coveringProvider,
    breakNurse,
    chargeNurse,
    diagnostics,
    hasSourceConflict,
    careSettingClassifierConflict,
  };
}

/**
 * Batch-friendly pure map — callers load rows once, then resolve without per-row DB.
 * Intended pattern for future MAR / task-center list consumers (D4A.4.2+).
 */
export function resolveActiveEncounterOwnershipBatch(
  rows: readonly ResolveActiveEncounterOwnershipInput[]
): ActiveEncounterOwnershipProjection[] {
  return rows.map((row) => resolveActiveEncounterOwnership(row));
}
