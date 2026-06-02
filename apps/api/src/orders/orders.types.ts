import type { CatalogMedication, MedicationFulfillmentIntent, Order, OrderItem, Result } from "@prisma/client";
import type { MedicationSafetyGovernanceSnapshot, OrderItemCreateDto, OrderCreateDto } from "@medora/shared";

/** M1.3F.3 — read-only MAR governance fields on medication order lines. */
export type MedicationSafetyGovernanceRead = MedicationSafetyGovernanceSnapshot;

/** Catalog fields attached to MEDICATION order items after enrichment. */
export type CatalogMedicationEnrichment = Pick<
  CatalogMedication,
  | "id"
  | "code"
  | "name"
  | "displayNameEn"
  | "displayNameFr"
  | "genericName"
  | "therapeuticClass"
  | "administrationType"
  | "billingClass"
  | "strength"
  | "dosageForm"
  | "route"
  | "ndc11"
  | "ndcDisplay"
  | "billingUnitType"
  | "isControlled"
  | "controlledSchedule"
  | "requiresWitness"
  | "requiresDoubleSign"
>;

export type CatalogLabTestEnrichment = {
  id: string;
  code: string;
  name: string;
  displayNameEn: string | null;
  displayNameFr: string | null;
  billingCodeDefault?: string | null;
};

export type CatalogImagingStudyEnrichment = {
  id: string;
  code: string;
  name: string;
  displayNameEn: string | null;
  displayNameFr: string | null;
  modality: string | null;
  bodyRegion: string | null;
};

export type OrderItemChartResult = Pick<
  Result,
  | "id"
  | "resultText"
  | "verifiedAt"
  | "criticalValue"
  | "resultData"
  | "verifiedByUserId"
  | "acknowledgedByProviderAt"
  | "acknowledgedByUserId"
> & {
  /** Nom affichage du professionnel ayant saisi / validé (enrichi côté API). */
  enteredByDisplayFr?: string | null;
  /** Clinicien ayant accusé réception du résultat (enrichi côté API). */
  acknowledgedByDisplayFr?: string | null;
};

export type OrderItemWithCatalogMedication = OrderItem & {
  /** Libellé catalogue en français (ou repli sûr) — ne jamais afficher l’UUID brut. */
  displayLabelFr: string;
  /** English-first display line (catalog `name` before `displayNameFr`) for US / English UI. */
  displayLabelEn: string;
  catalogMedication?: CatalogMedicationEnrichment | null;
  /** M1.3F.3 — MAR safety governance snapshot (read-only; no enforcement). */
  medicationSafetyGovernance?: MedicationSafetyGovernanceRead | null;
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
  /** MEDPROC.2: canonical enterprise procedure id (CARE only). Future billing key — not CPT/HCPCS. */
  enterpriseProcedureId?: string | null;
  notes?: string;
  quantity?: number;
  strength?: string;
  route?: "PO" | "IM" | "IVP" | "IVPB";
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
  if (orderType === "CARE") {
    const enterpriseProcedureId = item.enterpriseProcedureId?.trim();
    if (enterpriseProcedureId) {
      base.enterpriseProcedureId = enterpriseProcedureId;
    }
  }
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
    route: item.route,
    refillCount: refill,
    medicationFulfillmentIntent: intent,
    intendedAdministrationAt:
      item.intendedAdministrationAt != null ? new Date(item.intendedAdministrationAt) : undefined,
  };
  return stripUndefinedKeys(med) as OrderItemNestedCreate;
}
