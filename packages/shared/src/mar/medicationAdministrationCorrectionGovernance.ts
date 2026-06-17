/** MEDUI.ED.MAR.H7 — structured medication administration correction governance. */

export const MEDICATION_ADMINISTRATION_CORRECTION_REASON_CODES = [
  "DOCUMENTED_WRONG_TIME",
  "DOCUMENTED_WRONG_DOSE",
  "DOCUMENTED_WRONG_ROUTE",
  "DOCUMENTED_WRONG_PATIENT",
  "DOCUMENTED_NOT_GIVEN",
  "LATE_DOCUMENTATION",
  "DUPLICATE_ENTRY",
  "USER_ERROR",
  "OTHER",
] as const;

export type MedicationAdministrationCorrectionReasonCode =
  (typeof MEDICATION_ADMINISTRATION_CORRECTION_REASON_CODES)[number];

const CORRECTION_REASON_CODE_SET = new Set<string>(
  MEDICATION_ADMINISTRATION_CORRECTION_REASON_CODES
);

export type MedicationAdministrationCorrectionValues = {
  effectiveAdministeredAt?: string | null;
  doseValue?: string | null;
  doseUnit?: string | null;
  route?: string | null;
  marAction?: string | null;
  duplicateDocumentationFlag?: boolean | null;
  relatedDuplicateAdministrationId?: string | null;
};

/** Enterprise correction governance (MEDUI.ED.MAR.H7A). */
export const MEDICATION_ADMINISTRATION_CORRECTION_GOVERNANCE = {
  allowedReasonCodes: [
    "DOCUMENTED_WRONG_TIME",
    "DOCUMENTED_WRONG_DOSE",
    "DOCUMENTED_WRONG_ROUTE",
    "DOCUMENTED_NOT_GIVEN",
    "DUPLICATE_ENTRY",
    "USER_ERROR",
    "LATE_DOCUMENTATION",
    "OTHER",
  ] as const satisfies readonly MedicationAdministrationCorrectionReasonCode[],
  restrictedReasonCodes: ["DOCUMENTED_WRONG_PATIENT"] as const,
  forbiddenMutations: [
    "administeredByUserId",
    "patientId",
    "medicationAdministration.delete",
    "audit.delete",
  ] as const,
} as const;

export type MedicationAdministrationCorrectionFieldGovernance =
  | "supported"
  | "unsafe"
  | "requires_governance"
  | "must_never_edit";

export const MEDICATION_ADMINISTRATION_CLINICAL_FIELD_GOVERNANCE: Record<
  string,
  MedicationAdministrationCorrectionFieldGovernance
> = {
  doseValue: "supported",
  doseUnit: "supported",
  route: "supported",
  notes: "supported",
  marAction: "requires_governance",
  effectiveAdministeredAt: "supported",
  administeredAt: "must_never_edit",
  administeredByUserId: "must_never_edit",
  patientId: "must_never_edit",
  medicationLabelSnapshot: "must_never_edit",
  encounterId: "must_never_edit",
  orderItemId: "unsafe",
};

export type MedicationAdministrationCorrectionSourceRow = {
  id: string;
  facilityId: string;
  medicationAdministrationId: string;
  correctedByUserId: string;
  correctionReason: string | null;
  previousValues: unknown;
  correctedValues: unknown;
  createdAt: Date | string;
  correctedByFirstName?: string | null;
  correctedByLastName?: string | null;
  correctedByRole?: string | null;
  medicationLabel?: string | null;
  doseDisplay?: string | null;
  route?: string | null;
  encounterId: string;
  orderItemId: string | null;
};

export function isMedicationAdministrationCorrectionReasonCode(
  raw: unknown
): raw is MedicationAdministrationCorrectionReasonCode {
  return typeof raw === "string" && CORRECTION_REASON_CODE_SET.has(raw.trim().toUpperCase());
}

export function parseMedicationAdministrationCorrectionReasonCode(
  raw: unknown
): MedicationAdministrationCorrectionReasonCode | null {
  if (!isMedicationAdministrationCorrectionReasonCode(raw)) return null;
  return raw.trim().toUpperCase() as MedicationAdministrationCorrectionReasonCode;
}

export function resolveMedicationAdministrationCorrectionReasonI18nKey(
  code: MedicationAdministrationCorrectionReasonCode | string | null | undefined
): string | null {
  const parsed = parseMedicationAdministrationCorrectionReasonCode(code);
  return parsed ? `marAdministrationCorrection.reason.${parsed}` : null;
}

function parseCorrectionValuesJson(raw: unknown): MedicationAdministrationCorrectionValues {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;
  return {
    effectiveAdministeredAt:
      typeof o.effectiveAdministeredAt === "string" ? o.effectiveAdministeredAt : null,
    doseValue: typeof o.doseValue === "string" ? o.doseValue : null,
    doseUnit: typeof o.doseUnit === "string" ? o.doseUnit : null,
    route: typeof o.route === "string" ? o.route : null,
    marAction: typeof o.marAction === "string" ? o.marAction : null,
    duplicateDocumentationFlag:
      typeof o.duplicateDocumentationFlag === "boolean" ? o.duplicateDocumentationFlag : null,
    relatedDuplicateAdministrationId:
      typeof o.relatedDuplicateAdministrationId === "string"
        ? o.relatedDuplicateAdministrationId
        : null,
  };
}

export function parseMedicationAdministrationCorrectionReasonFields(
  correctionReason: string | null | undefined
): { reasonCode: string | null; reasonDetail: string | null } {
  const text = correctionReason?.trim() ?? "";
  if (!text) return { reasonCode: null, reasonDetail: null };
  const codeMatch = text.match(/^([A-Z0-9_]+)(?:\s*[—-]\s*(.+))?$/);
  if (codeMatch && isMedicationAdministrationCorrectionReasonCode(codeMatch[1])) {
    return {
      reasonCode: codeMatch[1]!.trim().toUpperCase(),
      reasonDetail: codeMatch[2]?.trim() || null,
    };
  }
  return { reasonCode: "OTHER", reasonDetail: text };
}

export function buildMedicationAdministrationCorrectionReasonStorage(input: {
  reasonCode: MedicationAdministrationCorrectionReasonCode | string;
  reasonDetail?: string | null;
}): string {
  const code = parseMedicationAdministrationCorrectionReasonCode(input.reasonCode);
  if (!code) {
    throw new Error("Invalid medication administration correction reason code");
  }
  const detail = input.reasonDetail?.trim();
  return detail ? `${code} — ${detail}` : code;
}

export function buildMedicationAdministrationCorrectionEffectiveTimeSummary(input: {
  previousValues: MedicationAdministrationCorrectionValues;
  correctedValues: MedicationAdministrationCorrectionValues;
}): string | null {
  const prev = input.previousValues.effectiveAdministeredAt?.trim();
  const next = input.correctedValues.effectiveAdministeredAt?.trim();
  if (prev && next && prev !== next) {
    return `${prev} → ${next}`;
  }
  return null;
}

export function buildMedicationAdministrationCorrectionDoseSummary(input: {
  previousValues: MedicationAdministrationCorrectionValues;
  correctedValues: MedicationAdministrationCorrectionValues;
}): string | null {
  const prevDose = [input.previousValues.doseValue, input.previousValues.doseUnit]
    .filter(Boolean)
    .join(" ")
    .trim();
  const nextDose = [input.correctedValues.doseValue, input.correctedValues.doseUnit]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (prevDose && nextDose && prevDose !== nextDose) {
    return `${prevDose} → ${nextDose}`;
  }
  return null;
}

export function buildMedicationAdministrationCorrectionMarActionSummary(input: {
  previousValues: MedicationAdministrationCorrectionValues;
  correctedValues: MedicationAdministrationCorrectionValues;
}): string | null {
  const prev = input.previousValues.marAction?.trim();
  const next = input.correctedValues.marAction?.trim();
  if (prev && next && prev !== next) {
    return `${prev} → ${next}`;
  }
  return null;
}

export function buildMedicationAdministrationCorrectionDuplicateSummary(input: {
  correctedValues: MedicationAdministrationCorrectionValues;
}): string | null {
  if (input.correctedValues.duplicateDocumentationFlag) {
    return "duplicate_documentation_flagged";
  }
  return null;
}

export function resolveMedicationAdministrationCorrectionEffectiveChangeSummary(input: {
  previousValues: unknown;
  correctedValues: unknown;
}): string | null {
  const previous = parseCorrectionValuesJson(input.previousValues);
  const corrected = parseCorrectionValuesJson(input.correctedValues);
  return (
    buildMedicationAdministrationCorrectionDoseSummary({ previousValues: previous, correctedValues: corrected }) ??
    buildMedicationAdministrationCorrectionRouteSummary({ previousValues: previous, correctedValues: corrected }) ??
    buildMedicationAdministrationCorrectionMarActionSummary({
      previousValues: previous,
      correctedValues: corrected,
    }) ??
    buildMedicationAdministrationCorrectionEffectiveTimeSummary({
      previousValues: previous,
      correctedValues: corrected,
    }) ??
    buildMedicationAdministrationCorrectionDuplicateSummary({ correctedValues: corrected })
  );
}

export function resolveMedicationAdministrationEffectiveDoseDisplay(input: {
  doseValue?: string | number | null;
  doseUnit?: string | null;
}): string | null {
  const value =
    input.doseValue == null
      ? null
      : typeof input.doseValue === "number"
        ? String(input.doseValue)
        : input.doseValue.trim();
  const unit = input.doseUnit?.trim() || null;
  if (value && unit) return `${value} ${unit}`;
  return value || unit || null;
}

export function buildMedicationAdministrationCorrectionRouteSummary(input: {
  previousValues: MedicationAdministrationCorrectionValues;
  correctedValues: MedicationAdministrationCorrectionValues;
}): string | null {
  const prev = input.previousValues.route?.trim();
  const next = input.correctedValues.route?.trim();
  if (prev && next && prev !== next) {
    return `${prev} → ${next}`;
  }
  return null;
}

export function inferMedicationAdministrationCorrectionReasonCodeForEffectiveTime(input: {
  previousEffectiveAdministeredAt: Date | null;
  newEffectiveAdministeredAt: Date;
  originalAdministeredAt: Date;
  systemDocumentedAt: Date;
  explicitCode?: string | null;
}): MedicationAdministrationCorrectionReasonCode {
  const explicit = parseMedicationAdministrationCorrectionReasonCode(input.explicitCode);
  if (explicit) return explicit;

  const MS_24H = 24 * 60 * 60 * 1000;
  if (
    input.systemDocumentedAt.getTime() - input.newEffectiveAdministeredAt.getTime() >
    MS_24H
  ) {
    return "LATE_DOCUMENTATION";
  }

  const priorEffective = input.previousEffectiveAdministeredAt ?? input.originalAdministeredAt;
  if (priorEffective.getTime() !== input.newEffectiveAdministeredAt.getTime()) {
    return "DOCUMENTED_WRONG_TIME";
  }

  return "USER_ERROR";
}

export function buildMedicationAdministrationHistoryCorrectionId(correctionId: string): string {
  return `mar-correction:${correctionId.trim()}`;
}
