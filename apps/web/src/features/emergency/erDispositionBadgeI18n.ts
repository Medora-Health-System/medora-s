import type { ErDispositionBadgeModel } from "@/features/emergency/erTrackboardDispositionBadge";

/**
 * User-visible disposition chip text from `erDispositionBadgeFromEncounterJson`.
 * Persisted JSON still uses French mode strings internally; display follows UI locale.
 */
export function erDispositionBadgeDisplayLabel(
  badge: ErDispositionBadgeModel,
  t: (key: string) => string
): string {
  switch (badge.variant) {
    case "discharge":
      return badge.shortLabel === "SORTIE"
        ? t("emergencyTrackboard.disposition.discharged")
        : t("emergencyTrackboard.disposition.dischargePending");
    case "admit":
      return t("emergencyTrackboard.disposition.admit");
    case "observe":
      return t("emergencyTrackboard.disposition.observe");
    case "transfer":
      return t("emergencyTrackboard.disposition.transfer");
    case "ama":
      return t("emergencyTrackboard.disposition.ama");
    case "deceased":
      return t("emergencyTrackboard.disposition.deceased");
    case "lwbs":
      return t("emergencyTrackboard.disposition.lwbs");
    case "elopement":
      return t("emergencyTrackboard.disposition.elopement");
    case "other":
    default:
      return t("emergencyTrackboard.disposition.other");
  }
}
