export type OrderModalTab = "LAB" | "IMAGING" | "MEDICATION";

export type OrderLineCatalogType = "LAB_TEST" | "IMAGING_STUDY" | "MEDICATION";

export function newOrderLineId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `l-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Ligne de saisie locale ; mappée vers le DTO API à l’envoi. */
export type CreateOrderLineItem = {
  _lineId: string;
  /** Absent pour saisie manuelle. */
  catalogItemId?: string;
  catalogItemType: OrderLineCatalogType;
  /** Ligne hors catalogue (libellé saisi par le prescripteur). */
  isManual?: boolean;
  manualLabel?: string;
  /** Imagerie : région / précision (affiche avec le libellé). */
  manualSecondaryText?: string;
  /** Posologie (MEDICATION) → champ API `notes` */
  notes?: string;
  quantity?: number;
  /** Dosage / force → API `strength` */
  strength?: string;
  refillCount?: number;
  /** MEDICATION: intent for routing (nursing vs pharmacy). */
  medicationFulfillmentIntent?: "ADMINISTER_CHART" | "PHARMACY_DISPENSE";
  _label: string;
  _dosageForm?: string;
  _route?: string;
  _modality?: string;
  _bodyRegion?: string;
};
