/**
 * MEDUI.D5A.5B — Single enterprise Dental encounter authoring projection.
 * MEDUI.D5A.5C — Facility ADMIN (facility-scoped RoleCode.ADMIN) defaults to clinical write.
 * API and UI must derive editable flags from this policy (no panel-local role drift).
 *
 * Invariant:
 * AUTHORIZED clinical capability (PROVIDER or facility ADMIN dental write caps)
 * + dentalCareEnabled
 * + OPEN encounter
 * = writable clinical board
 *
 * FRONT_DESK / BILLING / platform-operator-alone = read-only clinical authoring.
 * CLOSED = read-only. Signed provider documentation does not by itself lock
 * perio/plan/procedures/odontogram (evaluation signing has its own rules).
 * Signing: facility ADMIN may sign (aligns ambulatory PROVIDER|ADMIN pattern).
 */

import {
  canAuthorDentalClinicalBoard,
  resolveDentalWorkspaceAccess,
  type DentalWorkspaceAccess,
} from "./enterpriseDentalServiceLineNavigationD5a2.js";

export const D5A5B_CERTIFICATION_ID = "MEDUI.D5A.5B" as const;

export type DentalAuthoringReadOnlyReason =
  | "DENTAL_DISABLED"
  | "NO_VIEW"
  | "NO_CLINICAL_CAPABILITY"
  | "ENCOUNTER_NOT_OPEN"
  | "NOT_DENTAL_SERVICE_LINE"
  | null;

export type EnterpriseDentalEncounterAuthoring = {
  certificationId: typeof D5A5B_CERTIFICATION_ID;
  canView: boolean;
  canEditClinicalEvaluation: boolean;
  canEditOdontogram: boolean;
  canEditPeriodontal: boolean;
  canEditTreatmentPlan: boolean;
  canDocumentProcedure: boolean;
  canReviewHistory: boolean;
  /** Edit enterprise longitudinal patient history (same Patient profile authority). */
  canEditEnterpriseHistory: boolean;
  canManageDocumentsOrConsents: boolean;
  canPrescribe: boolean;
  canSign: boolean;
  canEditFollowUp: boolean;
  isReadOnly: boolean;
  readOnlyReason: DentalAuthoringReadOnlyReason;
  /** Encounter still OPEN — board domains may write if capability allows. */
  encounterOpen: boolean;
  access: DentalWorkspaceAccess;
};

export function resolveEnterpriseDentalEncounterAuthoring(input: {
  roleCodes: readonly string[] | null | undefined;
  dentalCareEnabled: boolean;
  encounterStatus?: string | null;
  serviceLine?: string | null;
  specialties?: readonly string[] | null;
}): EnterpriseDentalEncounterAuthoring {
  const roleCodes = (input.roleCodes ?? []).map((r) => String(r ?? "").trim().toUpperCase());
  const access = resolveDentalWorkspaceAccess({
    roleCodes: input.roleCodes,
    dentalCareEnabled: input.dentalCareEnabled,
    specialties: input.specialties as never,
  });

  const encounterOpen = String(input.encounterStatus ?? "").toUpperCase() === "OPEN";
  const serviceLine = String(input.serviceLine ?? "").trim().toUpperCase();
  const isDentalLine = !serviceLine || serviceLine === "DENTAL";

  let readOnlyReason: DentalAuthoringReadOnlyReason = null;
  if (!input.dentalCareEnabled) readOnlyReason = "DENTAL_DISABLED";
  else if (!access.canAccessDentalShell) readOnlyReason = "NO_VIEW";
  else if (!isDentalLine) readOnlyReason = "NOT_DENTAL_SERVICE_LINE";
  else if (!canAuthorDentalClinicalBoard(access)) readOnlyReason = "NO_CLINICAL_CAPABILITY";
  else if (!encounterOpen) readOnlyReason = "ENCOUNTER_NOT_OPEN";

  const clinicalWritable =
    readOnlyReason === null && canAuthorDentalClinicalBoard(access) && encounterOpen;

  // Evaluation / sign / prescribe follow clinical dental documentation capability
  // (PROVIDER or facility ADMIN — D5A.5C).
  const canDocument = clinicalWritable;
  const frontDeskAssist =
    encounterOpen &&
    access.canAccessDentalShell &&
    roleCodes.includes("FRONT_DESK") &&
    !roleCodes.includes("BILLING");

  return {
    certificationId: D5A5B_CERTIFICATION_ID,
    canView: access.canAccessDentalShell,
    canEditClinicalEvaluation: canDocument,
    canEditOdontogram: clinicalWritable && access.canEditOdontogram,
    canEditPeriodontal: clinicalWritable && access.canEditPeriodontal,
    canEditTreatmentPlan: clinicalWritable && access.canEditTreatmentPlan,
    canDocumentProcedure: clinicalWritable && access.canPerformProcedures,
    canReviewHistory: canDocument,
    canEditEnterpriseHistory: canDocument,
    canManageDocumentsOrConsents: canDocument || frontDeskAssist,
    canPrescribe: canDocument,
    canSign: canDocument,
    canEditFollowUp: canDocument,
    isReadOnly: !clinicalWritable,
    readOnlyReason,
    encounterOpen,
    access,
  };
}

/** Workspace shell: clinical board panels must NOT use SIGNED eval lock. */
export function dentalClinicalBoardPanelLocked(authoring: EnterpriseDentalEncounterAuthoring): boolean {
  return authoring.isReadOnly;
}

export function dentalAuthoringReadOnlyReasonMessageFr(
  reason: DentalAuthoringReadOnlyReason
): string {
  switch (reason) {
    case "DENTAL_DISABLED":
      return "Soins dentaires non activés pour cet établissement.";
    case "NO_VIEW":
      return "Vous n’avez pas accès aux soins dentaires.";
    case "NO_CLINICAL_CAPABILITY":
      return "Lecture seule — votre compte n’a pas l’autorité clinique pour ce module dans cet établissement.";
    case "ENCOUNTER_NOT_OPEN":
      return "Lecture seule — la rencontre est fermée ou non modifiable.";
    case "NOT_DENTAL_SERVICE_LINE":
      return "Cette rencontre n’est pas une rencontre dentaire.";
    default:
      return "Lecture seule.";
  }
}
