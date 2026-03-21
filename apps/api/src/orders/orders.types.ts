import type { CatalogMedication, MedicationFulfillmentIntent, Order, OrderItem, Result } from "@prisma/client";
import type { OrderItemCreateDto, OrderCreateDto } from "@medora/shared";

/** Catalog fields attached to MEDICATION order items after enrichment. */
export type CatalogMedicationEnrichment = Pick<
  CatalogMedication,
  "id" | "code" | "name" | "displayNameFr" | "strength" | "dosageForm" | "route"
>;

export type CatalogLabTestEnrichment = {
  id: string;
  code: string;
  name: string;
  displayNameFr: string | null;
};

export type CatalogImagingStudyEnrichment = {
  id: string;
  code: string;
  name: string;
  displayNameFr: string | null;
  modality: string | null;
  bodyRegion: string | null;
};

export type OrderItemChartResult = Pick<
  Result,
  "resultText" | "verifiedAt" | "criticalValue" | "resultData" | "verifiedByUserId"
> & {
  /** Nom affichage du professionnel ayant saisi / validé (enrichi côté API). */
  enteredByDisplayFr?: string | null;
};

export type OrderItemWithCatalogMedication = OrderItem & {
  /** Libellé catalogue en français (ou repli sûr) — ne jamais afficher l’UUID brut. */
  displayLabelFr: string;
  catalogMedication?: CatalogMedicationEnrichment | null;
  catalogLabTest?: CatalogLabTestEnrichment | null;
  catalogImagingStudy?: CatalogImagingStudyEnrichment | null;
  completedByNurse?: { firstName: string; lastName: string } | null;
  result?: OrderItemChartResult | null;
};

export type OrderWithItems = Order & {
  items: (OrderItem & {
    completedByNurse?: { firstName: string; lastName: string } | null;
    result?: OrderItemChartResult | null;
  })[];
};

export type OrderWithEnrichedItems = Omit<OrderWithItems, "items"> & {
  items: OrderItemWithCatalogMedication[];
};

/** Prisma nested create payload for order items — Rx fields only for MEDICATION orders. */
export type OrderItemNestedCreate = {
  catalogItemId: string | null;
  catalogItemType: string;
  manualLabel?: string | null;
  manualSecondaryText?: string | null;
  notes?: string;
  quantity?: number;
  strength?: string;
  refillCount?: number;
  medicationFulfillmentIntent?: MedicationFulfillmentIntent;
};

export function buildOrderItemCreateInput(item: OrderItemCreateDto, orderType: OrderCreateDto["type"]): OrderItemNestedCreate {
  const manualLabel = item.manualLabel?.trim() || null;
  const manualSecondaryText = item.manualSecondaryText?.trim() || null;
  const base: OrderItemNestedCreate = {
    catalogItemId: item.catalogItemId ?? null,
    catalogItemType: item.catalogItemType,
    manualLabel,
    manualSecondaryText,
    notes: item.notes,
    quantity: item.quantity,
  };
  if (orderType !== "MEDICATION") {
    return base;
  }
  const intent: MedicationFulfillmentIntent =
    item.medicationFulfillmentIntent === "ADMINISTER_CHART" ? "ADMINISTER_CHART" : "PHARMACY_DISPENSE";
  return {
    ...base,
    strength: item.strength,
    refillCount: item.refillCount,
    medicationFulfillmentIntent: intent,
  };
}
