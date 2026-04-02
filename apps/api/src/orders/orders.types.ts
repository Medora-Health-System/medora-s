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
  /** Utilisateur ayant créé l’ordre côté système (`Order.orderedBy`) — enrichi pour l’UI. */
  orderedByDisplayFr?: string | null;
  /** Utilisateur ayant annulé la commande (`Order.cancelledByUserId`) — enrichi pour l’UI. */
  cancelledByDisplayFr?: string | null;
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
  intendedAdministrationAt?: Date;
};

/**
 * Prisma 6 : les écritures imbriquées (`order.create` → `items.create`) valident la présence
 * explicite de `undefined` sur les champs optionnels — PrismaClientValidationError → HTTP 500.
 * Il faut omettre les clés plutôt que `undefined` — `null`, `false`, `0` sont conservés.
 */
export function stripUndefinedKeys<T extends Record<string, unknown>>(obj: T): T {
  const out = {} as T;
  for (const key of Object.keys(obj) as (keyof T)[]) {
    const v = obj[key];
    if (v !== undefined) {
      (out as Record<string, unknown>)[key as string] = v;
    }
  }
  return out;
}

/**
 * Supprime récursivement les clés `undefined` (objets simples et tableaux).
 * Préserve `null`, `false`, `0`, enums — nécessaire pour `order.create` + `items.create`.
 */
export function stripUndefinedDeep(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (value === null || typeof value !== "object") return value;
  if (value instanceof Date) return value;
  if (Array.isArray(value)) {
    return value.map((el) => stripUndefinedDeep(el));
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (v === undefined) continue;
    const deep = stripUndefinedDeep(v);
    if (deep === undefined) continue;
    out[k] = deep;
  }
  return out;
}

/** Chaîne optionnelle : `""` ou blanc seul → omis (`undefined`), sinon trim. */
function optionalTrimmedString(s: string | undefined | null): string | undefined {
  if (s == null) return undefined;
  const t = s.trim();
  return t.length > 0 ? t : undefined;
}

export function buildOrderItemCreateInput(item: OrderItemCreateDto, orderType: OrderCreateDto["type"]): OrderItemNestedCreate {
  const manualLabel = item.manualLabel?.trim() || null;
  const manualSecondaryText = item.manualSecondaryText?.trim() || null;
  const base: Record<string, unknown> = {
    catalogItemId: item.catalogItemId ?? null,
    catalogItemType: item.catalogItemType,
    manualLabel,
    manualSecondaryText,
    notes: optionalTrimmedString(item.notes ?? undefined),
    quantity: item.quantity,
  };
  if (orderType !== "MEDICATION") {
    return stripUndefinedKeys(base) as OrderItemNestedCreate;
  }
  const intent: MedicationFulfillmentIntent =
    item.medicationFulfillmentIntent === "ADMINISTER_CHART" ? "ADMINISTER_CHART" : "PHARMACY_DISPENSE";
  const refill =
    item.refillCount !== undefined && item.refillCount !== null ? item.refillCount : undefined;
  const med: Record<string, unknown> = {
    ...base,
    strength: optionalTrimmedString(item.strength ?? undefined),
    refillCount: refill,
    medicationFulfillmentIntent: intent,
    intendedAdministrationAt:
      item.intendedAdministrationAt != null ? new Date(item.intendedAdministrationAt) : undefined,
  };
  return stripUndefinedKeys(med) as OrderItemNestedCreate;
}
