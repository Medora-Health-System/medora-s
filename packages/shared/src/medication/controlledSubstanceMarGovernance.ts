import type { MarClinicalAction } from "../mar/marClinicalAction.js";

export type ControlledSubstanceMarGovernanceContext = {
  isControlled: boolean;
  requiresWitness: boolean;
  wasteDocumentationRecommended?: boolean;
  catalogMedicationId?: string | null;
  /** Routine waste/witness handled in Pyxis — Medora does not hard-block. */
  pyxisWasteWitnessExternalized?: boolean;
  /** Medora second witness required (insulin, PCA/pump opioid, heparin IVPB, dual-sign). */
  medoraWitnessRequired?: boolean;
};

export type ControlledSubstanceMarCreateInput = {
  marAction: MarClinicalAction;
  governance: ControlledSubstanceMarGovernanceContext | null;
  witnessUserId?: string | null;
  witnessDisplayName?: string | null;
  administeredByUserId?: string | null;
  wasteAmount?: number | null;
  wasteUnit?: string | null;
  wasteReason?: string | null;
  wasteWitnessUserId?: string | null;
  overrideReason?: string | null;
  controlledOverrideAcknowledged?: boolean;
  orderedQuantity?: number | null;
  administeredQuantity?: number | null;
};

export type ControlledSubstanceMarValidationResult =
  | { ok: true; witnessProvided: boolean; overrideUsed: boolean; wasteDocumented: boolean }
  | { ok: false; code: string; message: string };

function trimOrNull(v: string | null | undefined): string | null {
  const t = v?.trim();
  return t ? t : null;
}

export function isPartialControlledDose(input: {
  administeredQuantity?: number | null;
  orderedQuantity?: number | null;
}): boolean {
  const admin = input.administeredQuantity;
  const ordered = input.orderedQuantity;
  if (admin == null || ordered == null || !Number.isFinite(admin) || !Number.isFinite(ordered)) {
    return false;
  }
  return admin + 1e-9 < ordered;
}

export function controlledSubstanceMarGovernanceApplies(
  governance: ControlledSubstanceMarGovernanceContext | null,
  marAction: MarClinicalAction
): boolean {
  return marAction === "administered" && governance?.isControlled === true;
}

export function validateControlledSubstanceMarCreate(
  input: ControlledSubstanceMarCreateInput
): ControlledSubstanceMarValidationResult {
  if (!controlledSubstanceMarGovernanceApplies(input.governance, input.marAction)) {
    return { ok: true, witnessProvided: false, overrideUsed: false, wasteDocumented: false };
  }

  const gov = input.governance!;

  if (gov.pyxisWasteWitnessExternalized && !gov.medoraWitnessRequired) {
    return { ok: true, witnessProvided: false, overrideUsed: false, wasteDocumented: false };
  }
  const witnessUserId = trimOrNull(input.witnessUserId ?? undefined);
  const witnessDisplayName = trimOrNull(input.witnessDisplayName ?? undefined);
  const overrideReason = trimOrNull(input.overrideReason ?? undefined);
  const overrideAck = input.controlledOverrideAcknowledged === true;
  const actorId = input.administeredByUserId?.trim() || null;

  const witnessProvided = Boolean(
    (witnessUserId && witnessUserId !== actorId) || (witnessDisplayName && witnessDisplayName.length >= 2)
  );

  if (witnessUserId && actorId && witnessUserId === actorId) {
    return {
      ok: false,
      code: "CONTROLLED_WITNESS_CANNOT_BE_SELF",
      message: "Le témoin ne peut pas être la même personne que l'administrateur.",
    };
  }

  const overrideUsed = overrideAck && Boolean(overrideReason && overrideReason.length >= 8);

  if (gov.requiresWitness && !witnessProvided && !overrideUsed) {
    return {
      ok: false,
      code: "CONTROLLED_WITNESS_REQUIRED",
      message:
        "Témoin requis pour ce médicament contrôlé. Sélectionnez un témoin ou documentez une dérogation motivée.",
    };
  }

  if (overrideAck && !overrideReason) {
    return {
      ok: false,
      code: "CONTROLLED_OVERRIDE_REASON_REQUIRED",
      message: "Motif de dérogation requis pour l'administration sans témoin.",
    };
  }

  if (overrideReason && !overrideAck) {
    return {
      ok: false,
      code: "CONTROLLED_OVERRIDE_ACK_REQUIRED",
      message: "Confirmez la dérogation pour l'administration sans témoin.",
    };
  }

  const wasteAmount = input.wasteAmount;
  const hasWasteAmount =
    wasteAmount != null && Number.isFinite(Number(wasteAmount)) && Number(wasteAmount) > 0;
  const partialDose = isPartialControlledDose({
    administeredQuantity: input.administeredQuantity,
    orderedQuantity: input.orderedQuantity,
  });
  const wasteDocumented = hasWasteAmount;

  if (partialDose && !wasteDocumented && !overrideUsed) {
    return {
      ok: false,
      code: "CONTROLLED_WASTE_REQUIRED",
      message:
        "Dose partielle sur médicament contrôlé : documentez la perte ou indiquez une dérogation motivée.",
    };
  }

  if (hasWasteAmount) {
    const unit = trimOrNull(input.wasteUnit ?? undefined);
    if (!unit) {
      return {
        ok: false,
        code: "CONTROLLED_WASTE_UNIT_REQUIRED",
        message: "Unité requise pour la documentation de perte.",
      };
    }
    if (gov.requiresWitness && !witnessProvided && !input.wasteWitnessUserId?.trim()) {
      return {
        ok: false,
        code: "CONTROLLED_WASTE_WITNESS_REQUIRED",
        message: "Témoin requis pour la documentation de perte sur médicament contrôlé.",
      };
    }
  }

  return {
    ok: true,
    witnessProvided,
    overrideUsed,
    wasteDocumented,
  };
}
