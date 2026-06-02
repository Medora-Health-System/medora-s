import type { MarClinicalAction } from "../mar/marClinicalAction.js";

export type LasaMarGovernanceContext = {
  lasaGroupId: string | null;
  lasaGroupLabel: string | null;
  lasaSeverity: string | null;
  requiresAcknowledgement: boolean;
  catalogMedicationId?: string | null;
};

export type LasaMarCreateInput = {
  marAction: MarClinicalAction;
  governance: LasaMarGovernanceContext | null;
  lasaAcknowledged?: boolean;
  lasaMedicationSelectionConfirmed?: boolean;
  lasaSecondReadUserId?: string | null;
  lasaSecondReadDisplayName?: string | null;
  lasaOverrideReason?: string | null;
  lasaOverrideAcknowledged?: boolean;
  administeredByUserId?: string | null;
};

export type LasaMarValidationResult =
  | { ok: true; acknowledged: boolean; overrideUsed: boolean; secondReadProvided: boolean }
  | { ok: false; code: string; message: string };

function trimOrNull(v: string | null | undefined): string | null {
  const t = v?.trim();
  return t ? t : null;
}

export function lasaMarHasGovernanceSignal(input: {
  lasaGroupId?: string | null;
  lasaSeverity?: string | null;
}): boolean {
  const groupId = trimOrNull(input.lasaGroupId ?? undefined);
  const severity = trimOrNull(input.lasaSeverity ?? undefined);
  if (groupId) return true;
  return Boolean(severity && severity !== "LASA_NONE");
}

export function lasaMarSeverityRequiresAcknowledgement(lasaSeverity: string | null | undefined): boolean {
  const s = trimOrNull(lasaSeverity ?? undefined);
  if (s === "LASA_HIGH" || s === "LASA_MEDIUM") return true;
  if (s === "LASA_LOW" || s === "LASA_NONE") return false;
  return false;
}

/** Whether MAR must enforce LASA acknowledgement (HIGH/MEDIUM, or group without LOW/NONE severity). */
export function lasaMarRequiresAcknowledgement(input: {
  lasaGroupId?: string | null;
  lasaSeverity?: string | null;
}): boolean {
  const groupId = trimOrNull(input.lasaGroupId ?? undefined);
  const severity = trimOrNull(input.lasaSeverity ?? undefined);
  if (lasaMarSeverityRequiresAcknowledgement(severity)) return true;
  if (groupId && !severity) return true;
  if (groupId && severity && severity !== "LASA_LOW" && severity !== "LASA_NONE") {
    return lasaMarSeverityRequiresAcknowledgement(severity);
  }
  return false;
}

export function lasaMarGovernanceApplies(
  governance: LasaMarGovernanceContext | null,
  marAction: MarClinicalAction
): boolean {
  return marAction === "administered" && governance?.requiresAcknowledgement === true;
}

export function validateLasaMarCreate(input: LasaMarCreateInput): LasaMarValidationResult {
  if (!lasaMarGovernanceApplies(input.governance, input.marAction)) {
    return { ok: true, acknowledged: false, overrideUsed: false, secondReadProvided: false };
  }

  const overrideReason = trimOrNull(input.lasaOverrideReason ?? undefined);
  const overrideAck = input.lasaOverrideAcknowledged === true;
  const overrideUsed = overrideAck && Boolean(overrideReason && overrideReason.length >= 8);

  const acknowledged =
    input.lasaAcknowledged === true && input.lasaMedicationSelectionConfirmed === true;

  const secondReadUserId = trimOrNull(input.lasaSecondReadUserId ?? undefined);
  const secondReadDisplayName = trimOrNull(input.lasaSecondReadDisplayName ?? undefined);
  const secondReadProvided = Boolean(
    (secondReadUserId && secondReadUserId.length > 0) ||
      (secondReadDisplayName && secondReadDisplayName.length >= 2)
  );

  const actorId = input.administeredByUserId?.trim() || null;
  if (secondReadUserId && actorId && secondReadUserId === actorId) {
    return {
      ok: false,
      code: "LASA_SECOND_READ_CANNOT_BE_SELF",
      message:
        "La seconde lecture LASA ne peut pas être effectuée par la même personne que l'administrateur.",
    };
  }

  if (!acknowledged && !overrideUsed) {
    return {
      ok: false,
      code: "LASA_ACKNOWLEDGEMENT_REQUIRED",
      message:
        "Accusé de réception LASA requis : confirmez l'avertissement et la sélection du médicament, ou documentez une dérogation motivée.",
    };
  }

  if (overrideAck && !overrideReason) {
    return {
      ok: false,
      code: "LASA_OVERRIDE_REASON_REQUIRED",
      message: "Motif de dérogation requis pour l'administration sans accusé LASA.",
    };
  }

  if (overrideReason && !overrideAck) {
    return {
      ok: false,
      code: "LASA_OVERRIDE_ACK_REQUIRED",
      message: "Confirmez la dérogation pour l'administration sans accusé LASA.",
    };
  }

  if (input.lasaAcknowledged === true && input.lasaMedicationSelectionConfirmed !== true && !overrideUsed) {
    return {
      ok: false,
      code: "LASA_MEDICATION_SELECTION_REQUIRED",
      message: "Confirmez que le bon médicament a été sélectionné (LASA).",
    };
  }

  return {
    ok: true,
    acknowledged,
    overrideUsed,
    secondReadProvided,
  };
}
