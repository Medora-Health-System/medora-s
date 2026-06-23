import type { MarClinicalAction } from "../mar/marClinicalAction.js";
import { parseMedicationSafetyRequirementsFromCategoriesJson } from "./highAlertMarGovernance.js";
import {
  marPharmacyBlockingWorkflowVisible,
  marPharmacyVerificationBlocksAdministration,
} from "./marAdministrationGovernancePolicy.js";

/** High-alert classes where pharmacy review should be visible to clinical/pharmacy users. */
export const PHARMACY_REQUIRED_HIGH_ALERT_CLASSES = [
  "HIGH_ALERT_INSULIN",
  "HIGH_ALERT_ANTICOAGULANT",
  "HIGH_ALERT_THROMBOLYTIC",
  "HIGH_ALERT_VASOPRESSOR",
  "HIGH_ALERT_CHEMOTHERAPY",
] as const;

export type PharmacyVerificationStatusRead =
  | "NOT_REQUIRED"
  | "PENDING"
  | "VERIFIED"
  | "REJECTED"
  | "OVERRIDDEN";

/** UI / doc alias for PENDING */
export const PHARMACY_STATUS_REVIEW_PENDING = "PENDING" as const;
/** UI / doc alias for VERIFIED */
export const PHARMACY_STATUS_VERIFIED = "VERIFIED" as const;
/** UI / doc alias for REJECTED */
export const PHARMACY_STATUS_REJECTED = "REJECTED" as const;

export type PharmacyMarGovernanceContext = {
  requiresPharmacyVerification: boolean;
  verificationStatus: PharmacyVerificationStatusRead;
  catalogMedicationId?: string | null;
  controlledSchedule?: string | null;
  highAlertClass?: string | null;
};

export type PharmacyMarCreateInput = {
  marAction: MarClinicalAction;
  governance: PharmacyMarGovernanceContext | null;
  pharmacyVerificationOverrideReason?: string | null;
  pharmacyVerificationOverrideAcknowledged?: boolean;
};

export type PharmacyMarValidationResult =
  | { ok: true; overrideUsed: boolean }
  | { ok: false; code: string; message: string };

function trimOrNull(v: string | null | undefined): string | null {
  const t = v?.trim();
  return t ? t : null;
}

export function normalizeControlledScheduleForPharmacy(
  schedule: string | null | undefined
): string | null {
  const s = trimOrNull(schedule ?? undefined);
  if (!s) return null;
  const upper = s.toUpperCase();
  if (upper === "II" || upper === "2" || upper.includes("SCHEDULE II") || upper.includes("SCHEDULE 2")) {
    return "II";
  }
  if (upper === "III" || upper === "3" || upper.includes("SCHEDULE III") || upper.includes("SCHEDULE 3")) {
    return "III";
  }
  return s;
}

export function controlledScheduleRequiresPharmacyVerification(
  schedule: string | null | undefined
): boolean {
  const norm = normalizeControlledScheduleForPharmacy(schedule);
  return norm === "II" || norm === "III";
}

export function highAlertClassRequiresPharmacyVerification(highAlertClass: string | null | undefined): boolean {
  const c = trimOrNull(highAlertClass ?? undefined);
  if (!c || c === "HIGH_ALERT_NONE") return false;
  return (PHARMACY_REQUIRED_HIGH_ALERT_CLASSES as readonly string[]).includes(c);
}

export function resolveRequiresPharmacyVerification(input: {
  controlledSchedule?: string | null;
  highAlertClass?: string | null;
  safetyRequirementCodes?: string[] | null;
  requiresPharmacyVerificationFlag?: boolean | null;
}): boolean {
  if (input.requiresPharmacyVerificationFlag === true) return true;
  const codes = new Set((input.safetyRequirementCodes ?? []).map((c) => c.trim()));
  if (codes.has("REQUIRES_PHARMACY_VERIFICATION")) return true;
  if (controlledScheduleRequiresPharmacyVerification(input.controlledSchedule)) return true;
  if (highAlertClassRequiresPharmacyVerification(input.highAlertClass)) return true;
  return false;
}

export function pharmacyMarGovernanceApplies(
  governance: PharmacyMarGovernanceContext | null,
  marAction: MarClinicalAction
): boolean {
  if (!marPharmacyVerificationBlocksAdministration()) return false;
  return marAction === "administered" && governance?.requiresPharmacyVerification === true;
}

/** MAR UI visibility when pharmacy verification blocks administration (M1.7A.9: informational only). */
export function marPharmacyWorkflowVisible(
  governance: { requiresPharmacyVerification?: boolean | null },
  marAction: MarClinicalAction | string
): boolean {
  return marPharmacyBlockingWorkflowVisible(governance, marAction);
}

export function pharmacyStatusAllowsAdministration(
  status: PharmacyVerificationStatusRead
): boolean {
  void status;
  return true;
}

export function validatePharmacyMarCreate(input: PharmacyMarCreateInput): PharmacyMarValidationResult {
  if (!pharmacyMarGovernanceApplies(input.governance, input.marAction)) {
    return { ok: true, overrideUsed: false };
  }

  if (!marPharmacyVerificationBlocksAdministration()) {
    return { ok: true, overrideUsed: false };
  }

  const gov = input.governance!;
  const status = gov.verificationStatus;

  if (pharmacyStatusAllowsAdministration(status)) {
    return { ok: true, overrideUsed: false };
  }

  const overrideReason = trimOrNull(input.pharmacyVerificationOverrideReason ?? undefined);
  const overrideAck = input.pharmacyVerificationOverrideAcknowledged === true;
  const overrideUsed = overrideAck && Boolean(overrideReason && overrideReason.length >= 8);

  if (overrideUsed) {
    return { ok: true, overrideUsed: true };
  }

  void status;
  return { ok: true, overrideUsed };
}

export function effectivePharmacyVerificationStatus(input: {
  requiresPharmacyVerification: boolean;
  rowStatus?: PharmacyVerificationStatusRead | null;
}): PharmacyVerificationStatusRead {
  if (!input.requiresPharmacyVerification) return "NOT_REQUIRED";
  return input.rowStatus ?? "PENDING";
}

export function parsePharmacyGovernanceFromProfile(input: {
  controlledSchedule?: string | null;
  highAlertCategories?: unknown;
  requiresPharmacyVerification?: boolean | null;
}): { requiresPharmacyVerification: boolean; highAlertClass: string | null } {
  const parsed =
    input.highAlertCategories && typeof input.highAlertCategories === "object"
      ? (input.highAlertCategories as Record<string, unknown>)
      : {};
  const highAlertClass =
    typeof parsed.highAlertClass === "string" ? parsed.highAlertClass.trim() : null;
  const safetyRequirementCodes = parseMedicationSafetyRequirementsFromCategoriesJson(
    input.highAlertCategories
  );
  const requiresPharmacyVerification = resolveRequiresPharmacyVerification({
    controlledSchedule: input.controlledSchedule,
    highAlertClass,
    safetyRequirementCodes,
    requiresPharmacyVerificationFlag: input.requiresPharmacyVerification,
  });
  return { requiresPharmacyVerification, highAlertClass };
}
