/**
 * Order cancellation reasons are stored as canonical French strings (API / `ORDER_CANCELLATION_REASON_VALUES`).
 * Map them to i18n for English (and FR) UI display.
 */
const API_REASON_TO_I18N_KEY: Record<string, string> = {
  "Erreur de saisie": "orderCancelReason.entryError",
  Doublon: "orderCancelReason.duplicate",
  "Changement clinique": "orderCancelReason.clinicalChange",
  "Demande annulée": "orderCancelReason.patientRequest",
  Autre: "orderCancelReason.other",
};

/** API default when ER cancels from quick action — must remain a valid enum value until the API accepts neutral codes. */
export const ORDER_CANCEL_API_REASON_PATIENT_REQUEST = "Demande annulée" as const;

export function formatCancellationReasonForDisplay(
  reason: string | null | undefined,
  t: (key: string) => string
): string {
  const r = reason?.trim();
  if (!r) return t("common.dash");
  const key = API_REASON_TO_I18N_KEY[r];
  return key ? t(key) : r;
}
