/** Derive explorer badge flags from canonical master + optional facility formulary row. */

export type MedicationMasterExplorerBadges = {
  edFormulary: boolean;
  rsi: boolean;
  crashCart: boolean;
  infusion: boolean;
  controlled: boolean;
  highAlert: boolean;
  billingReview: boolean;
  ndcPresent: boolean;
};

type BadgeInput = {
  administrationType?: string | null;
  hasInfusionProfile?: boolean;
  requiresInfusionSession?: boolean;
  isControlled?: boolean;
  isHighAlert?: boolean;
  requiresManualReview?: boolean;
  ndc11?: string | null;
  isEDFormulary?: boolean;
  favoriteTier?: string | null;
  isOnFormulary?: boolean;
};

export function deriveMedicationMasterBadges(input: BadgeInput): MedicationMasterExplorerBadges {
  const tier = (input.favoriteTier ?? "").trim().toUpperCase();
  const adminType = (input.administrationType ?? "").trim().toUpperCase();

  return {
    edFormulary: input.isEDFormulary === true,
    rsi: tier === "RSI" || tier.includes("RSI"),
    crashCart: tier === "CRASH_CART" || tier.includes("CRASH"),
    infusion:
      adminType === "INFUSION" ||
      input.hasInfusionProfile === true ||
      input.requiresInfusionSession === true,
    controlled: input.isControlled === true,
    highAlert: input.isHighAlert === true,
    billingReview: input.requiresManualReview === true,
    ndcPresent: Boolean(input.ndc11?.trim()),
  };
}
