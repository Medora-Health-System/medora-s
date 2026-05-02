import { ORDER_CANCELLATION_REASON_VALUES } from "@medora/shared";

type ApiCancellationReason = (typeof ORDER_CANCELLATION_REASON_VALUES)[number];

/**
 * UI reason codes mapped to API enum strings (French — `ORDER_CANCELLATION_REASON_VALUES`).
 */
export const CANCEL_ORDER_MODAL_REASON_OPTIONS = [
  { code: "PROVIDER_REQUEST", apiValue: "Changement clinique" },
  { code: "PATIENT_REFUSED", apiValue: "Demande annulée" },
  { code: "DUPLICATE_ORDER", apiValue: "Doublon" },
  { code: "ORDER_ERROR", apiValue: "Erreur de saisie" },
  { code: "OTHER", apiValue: "Autre" },
] as const satisfies ReadonlyArray<{ code: string; apiValue: ApiCancellationReason }>;

export type CancelOrderModalReasonCode = (typeof CANCEL_ORDER_MODAL_REASON_OPTIONS)[number]["code"];
