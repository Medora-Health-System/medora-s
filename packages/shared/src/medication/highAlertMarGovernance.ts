import type { MarClinicalAction } from "../mar/marClinicalAction.js";
import { marAdministrationRequiresDoubleCheck } from "./marAdministrationGovernancePolicy.js";

export const HIGH_ALERT_DOUBLE_CHECK_SAFETY_CODES = [
  "REQUIRES_INDEPENDENT_DOUBLE_CHECK",
  "REQUIRES_DUAL_VERIFICATION",
  "REQUIRES_COSIGN",
] as const;

export type HighAlertDoubleCheckSafetyCode = (typeof HIGH_ALERT_DOUBLE_CHECK_SAFETY_CODES)[number];

export type HighAlertMarVerificationTypeHint =
  | "INDEPENDENT_DOUBLE_CHECK"
  | "DUAL_VERIFICATION"
  | "COSIGN";

export type HighAlertMarGovernanceContext = {
  isHighAlert: boolean;
  requiresDoubleCheck: boolean;
  safetyRequirementCodes: string[];
  catalogMedicationId?: string | null;
};

export type HighAlertMarCreateInput = {
  marAction: MarClinicalAction;
  governance: HighAlertMarGovernanceContext | null;
  highAlertVerifierUserId?: string | null;
  highAlertVerifierDisplayName?: string | null;
  administeredByUserId?: string | null;
  /** Controlled-substance witness (M1.3F.4) — must differ from high-alert verifier when both apply. */
  controlledWitnessUserId?: string | null;
  highAlertOverrideReason?: string | null;
  highAlertOverrideAcknowledged?: boolean;
  /** Fallback when controlled + high-alert share one override reason field in UI. */
  sharedOverrideReason?: string | null;
  sharedControlledOverrideAcknowledged?: boolean;
  highAlertVerificationType?: HighAlertMarVerificationTypeHint | null;
};

export type HighAlertMarValidationResult =
  | {
      ok: true;
      verifierProvided: boolean;
      overrideUsed: boolean;
      verificationType: HighAlertMarVerificationTypeHint;
    }
  | { ok: false; code: string; message: string };

function trimOrNull(v: string | null | undefined): string | null {
  const t = v?.trim();
  return t ? t : null;
}

export function parseMedicationSafetyRequirementsFromCategoriesJson(value: unknown): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const root = value as Record<string, unknown>;
  const req = root.safetyRequirements;
  if (!Array.isArray(req)) return [];
  return req.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

export function highAlertMarRequiresDoubleCheck(input: {
  isHighAlert?: boolean | null;
  requiresDoubleSign?: boolean | null;
  safetyRequirementCodes?: string[] | null;
  highAlertClass?: string | null;
  catalogCode?: string | null;
  genericName?: string | null;
  therapeuticClass?: string | null;
  route?: string | null;
  isContinuousInfusion?: boolean;
}): boolean {
  return marAdministrationRequiresDoubleCheck({
    isHighAlert: input.isHighAlert,
    requiresDoubleSign: input.requiresDoubleSign,
    safetyRequirementCodes: input.safetyRequirementCodes,
    highAlertClass: input.highAlertClass,
    catalogCode: input.catalogCode,
    genericName: input.genericName,
    therapeuticClass: input.therapeuticClass,
    route: input.route,
    isContinuousInfusion: input.isContinuousInfusion,
  });
}

export function resolveHighAlertMarVerificationType(input: {
  safetyRequirementCodes?: string[] | null;
  hint?: HighAlertMarVerificationTypeHint | null;
}): HighAlertMarVerificationTypeHint {
  const hint = input.hint;
  if (
    hint === "INDEPENDENT_DOUBLE_CHECK" ||
    hint === "DUAL_VERIFICATION" ||
    hint === "COSIGN"
  ) {
    return hint;
  }
  const codes = new Set((input.safetyRequirementCodes ?? []).map((c) => c.trim()));
  if (codes.has("REQUIRES_DUAL_VERIFICATION")) return "DUAL_VERIFICATION";
  if (codes.has("REQUIRES_COSIGN")) return "COSIGN";
  return "INDEPENDENT_DOUBLE_CHECK";
}

export function highAlertMarGovernanceApplies(
  governance: HighAlertMarGovernanceContext | null,
  marAction: MarClinicalAction
): boolean {
  return marAction === "administered" && governance?.requiresDoubleCheck === true;
}

export function validateHighAlertMarCreate(
  input: HighAlertMarCreateInput
): HighAlertMarValidationResult {
  if (!highAlertMarGovernanceApplies(input.governance, input.marAction)) {
    return {
      ok: true,
      verifierProvided: false,
      overrideUsed: false,
      verificationType: "INDEPENDENT_DOUBLE_CHECK",
    };
  }

  const gov = input.governance!;
  const verifierUserId = trimOrNull(input.highAlertVerifierUserId ?? undefined);
  const verifierDisplayName = trimOrNull(input.highAlertVerifierDisplayName ?? undefined);
  const actorId = input.administeredByUserId?.trim() || null;
  const witnessUserId = trimOrNull(input.controlledWitnessUserId ?? undefined);

  const overrideReason =
    trimOrNull(input.highAlertOverrideReason ?? undefined) ??
    trimOrNull(input.sharedOverrideReason ?? undefined);
  const overrideAck =
    input.highAlertOverrideAcknowledged === true ||
    (input.sharedControlledOverrideAcknowledged === true &&
      Boolean(trimOrNull(input.sharedOverrideReason ?? undefined)));

  const verificationType = resolveHighAlertMarVerificationType({
    safetyRequirementCodes: gov.safetyRequirementCodes,
    hint: input.highAlertVerificationType ?? null,
  });

  const verifierProvided = Boolean(
    (verifierUserId && verifierUserId !== actorId) ||
      (verifierDisplayName && verifierDisplayName.length >= 2)
  );

  if (verifierUserId && actorId && verifierUserId === actorId) {
    return {
      ok: false,
      code: "HIGH_ALERT_VERIFIER_CANNOT_BE_SELF",
      message:
        "Le second vérificateur ne peut pas être la même personne que l'administrateur.",
    };
  }

  if (verifierUserId && witnessUserId && verifierUserId === witnessUserId) {
    return {
      ok: false,
      code: "HIGH_ALERT_VERIFIER_CANNOT_BE_WITNESS",
      message:
        "Le second vérificateur doit être une personne distincte du témoin (médicament contrôlé).",
    };
  }

  const overrideUsed = overrideAck && Boolean(overrideReason && overrideReason.length >= 8);

  if (!verifierProvided && !overrideUsed) {
    return {
      ok: false,
      code: "HIGH_ALERT_DOUBLE_CHECK_REQUIRED",
      message:
        "Double vérification requise pour ce médicament à haut risque. Sélectionnez un second vérificateur ou documentez une dérogation motivée.",
    };
  }

  if (input.highAlertOverrideAcknowledged === true && !overrideReason) {
    return {
      ok: false,
      code: "HIGH_ALERT_OVERRIDE_REASON_REQUIRED",
      message: "Motif de dérogation requis pour l'administration sans double vérification.",
    };
  }

  if (overrideReason && !overrideAck) {
    return {
      ok: false,
      code: "HIGH_ALERT_OVERRIDE_ACK_REQUIRED",
      message: "Confirmez la dérogation pour l'administration sans double vérification.",
    };
  }

  return {
    ok: true,
    verifierProvided,
    overrideUsed,
    verificationType,
  };
}
