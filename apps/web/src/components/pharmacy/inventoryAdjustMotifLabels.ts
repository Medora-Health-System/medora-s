/** Stable adjust-stock reason codes sent to the API (notes payload). */
export const PHARMACY_ADJUST_MOTIF_VALUES = ["CORRECTION", "DAMAGED", "LOSS", "ERROR", "OTHER"] as const;
export type PharmacyAdjustMotifValue = (typeof PHARMACY_ADJUST_MOTIF_VALUES)[number];

export function pharmacyAdjustMotifLabel(motif: string, t: (key: string) => string): string {
  switch (motif) {
    case "CORRECTION":
      return t("pharmacyAdjustStock.motif.CORRECTION");
    case "DAMAGED":
      return t("pharmacyAdjustStock.motif.DAMAGED");
    case "LOSS":
      return t("pharmacyAdjustStock.motif.LOSS");
    case "ERROR":
      return t("pharmacyAdjustStock.motif.ERROR");
    case "OTHER":
      return t("pharmacyAdjustStock.motif.OTHER");
    default:
      return motif;
  }
}
