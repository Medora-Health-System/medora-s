export type OrderModalTab = "LAB" | "IMAGING" | "MEDICATION" | "CARE";
export type CreateOrderModalTab = "ORDER_SET" | OrderModalTab;

export type OrderLineCatalogType = "LAB_TEST" | "IMAGING_STUDY" | "MEDICATION" | "CARE";
import type { MedicationOrderRoute } from "@medora/shared";

export type MedicationRoute = MedicationOrderRoute;

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
  /** MEDICATION: structured route snapshot. */
  route?: MedicationRoute;
  refillCount?: number;
  /** MEDICATION: intent for routing (nursing vs pharmacy). */
  medicationFulfillmentIntent?: "ADMINISTER_CHART" | "PHARMACY_DISPENSE";
  /** MEDICATION: valeur datetime-local (optionnel) → API `intendedAdministrationAt`. */
  intendedAdministrationAt?: string;
  /** MEDICATION: user edited planned administration — do not auto-overwrite with "now". */
  _plannedAdminAtTouched?: boolean;
  _label: string;
  _dosageForm?: string;
  _route?: string;
  _isControlled?: boolean;
  _controlledSchedule?: string;
  _requiresWitness?: boolean;
  _requiresDoubleSign?: boolean;
  _modality?: string;
  _bodyRegion?: string;
  /** CARE UI only: quick-pick semantics for in-modal helpers (not sent to API). */
  _careQuickKey?: "ekg_workflow" | "laceration_kit";
  /**
   * CARE UI (MEDPROC.2): mirrored to API/order item as enterpriseProcedureId.
   * MEDPROC.2 must persist enterpriseProcedureId as the canonical procedure identity on OrderItem;
   * manualLabel is localized display snapshot only and must not become billing/reporting identity.
   */
  _enterpriseProcedureId?: string;
  /** Snapshot from catalog search at pick time (soft safety rules). */
  _safetyCatalog?: {
    code?: string;
    name?: string | null;
    displayName?: string | null;
    genericName?: string | null;
    therapeuticClass?: string | null;
    commonAliases?: string[];
  };
};
