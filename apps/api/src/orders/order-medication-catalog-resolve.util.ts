import type { PrismaService } from "../prisma/prisma.service";
import { medicationInnFromCatalogCode } from "@medora/shared";

/** Catalog medication fields used for order line label enrichment (M1.7A.4). */
export const ORDER_MEDICATION_CATALOG_SELECT = {
  id: true,
  code: true,
  name: true,
  displayNameEn: true,
  displayNameFr: true,
  genericName: true,
  therapeuticClass: true,
  administrationType: true,
  billingClass: true,
  strength: true,
  dosageForm: true,
  route: true,
  ndc11: true,
  ndcDisplay: true,
  billingUnitType: true,
  isControlled: true,
  controlledSchedule: true,
  requiresWitness: true,
  requiresDoubleSign: true,
} as const;

export type OrderMedicationCatalogRow = {
  id: string;
  code: string;
  name: string;
  displayNameEn: string | null;
  displayNameFr: string | null;
  genericName: string | null;
  therapeuticClass: string | null;
  administrationType: string | null;
  billingClass: string | null;
  strength: string | null;
  dosageForm: string | null;
  route: string | null;
  ndc11: string | null;
  ndcDisplay: string | null;
  billingUnitType: string | null;
  isControlled: boolean;
  controlledSchedule: string | null;
  requiresWitness: boolean;
  requiresDoubleSign: boolean;
};

type MedicationProductResolveRow = {
  id: string;
  code: string;
  strengthDisplay: string;
  legacyCatalogMedication: OrderMedicationCatalogRow | null;
  concept: { genericName: string; displayName: string } | null;
};

function catalogRowFromMedicationProduct(product: MedicationProductResolveRow): OrderMedicationCatalogRow {
  const legacy = product.legacyCatalogMedication;
  if (legacy) {
    return {
      ...legacy,
      displayNameEn:
        legacy.displayNameEn?.trim() ||
        legacy.genericName?.trim() ||
        medicationInnFromCatalogCode(legacy.code) ||
        product.concept?.genericName?.trim() ||
        null,
      genericName: legacy.genericName?.trim() || product.concept?.genericName?.trim() || null,
      strength: legacy.strength?.trim() || product.strengthDisplay?.trim() || null,
    };
  }
  const generic = product.concept?.genericName?.trim() || medicationInnFromCatalogCode(product.code);
  const display = product.concept?.displayName?.trim() || generic || product.code;
  return {
    id: product.id,
    code: product.code,
    name: display,
    displayNameEn: generic ?? medicationInnFromCatalogCode(product.code),
    displayNameFr: display,
    genericName: generic,
    therapeuticClass: null,
    administrationType: null,
    billingClass: null,
    strength: product.strengthDisplay?.trim() || null,
    dosageForm: null,
    route: null,
    ndc11: null,
    ndcDisplay: null,
    billingUnitType: null,
    isControlled: false,
    controlledSchedule: null,
    requiresWitness: false,
    requiresDoubleSign: false,
  };
}

export async function loadOrderMedicationCatalogMaps(
  prisma: PrismaService,
  items: Array<{ catalogItemId?: string | null; medicationProductId?: string | null; catalogItemType?: string }>
): Promise<{
  byCatalogId: Map<string, OrderMedicationCatalogRow>;
  byProductId: Map<string, OrderMedicationCatalogRow>;
}> {
  const catalogIds = new Set<string>();
  const productIds = new Set<string>();
  for (const it of items) {
    if (it.catalogItemType !== "MEDICATION") continue;
    const catalogItemId = it.catalogItemId?.trim();
    const medicationProductId = it.medicationProductId?.trim();
    if (catalogItemId) catalogIds.add(catalogItemId);
    if (medicationProductId) productIds.add(medicationProductId);
  }

  const catalogMedClient = prisma.catalogMedication as unknown as {
    findMany?: (args: unknown) => Promise<OrderMedicationCatalogRow[]>;
    findUnique?: (args: unknown) => Promise<OrderMedicationCatalogRow | null>;
  };
  const productClient = prisma.medicationProduct as unknown as {
    findMany?: (args: unknown) => Promise<MedicationProductResolveRow[]>;
  };

  let catalogRows: OrderMedicationCatalogRow[] = [];
  if (catalogIds.size > 0) {
    if (typeof catalogMedClient.findMany === "function") {
      catalogRows = await catalogMedClient.findMany({
        where: { id: { in: [...catalogIds] } },
        select: ORDER_MEDICATION_CATALOG_SELECT,
      });
    } else if (catalogIds.size === 1 && typeof catalogMedClient.findUnique === "function") {
      const single = await catalogMedClient.findUnique({
        where: { id: [...catalogIds][0] },
        select: ORDER_MEDICATION_CATALOG_SELECT,
      });
      if (single) catalogRows = [single];
    }
  }

  let productRows: MedicationProductResolveRow[] = [];
  if (productIds.size > 0 && typeof productClient.findMany === "function") {
    productRows = await productClient.findMany({
      where: { id: { in: [...productIds] } },
      select: {
        id: true,
        code: true,
        strengthDisplay: true,
        legacyCatalogMedication: { select: ORDER_MEDICATION_CATALOG_SELECT },
        concept: { select: { genericName: true, displayName: true } },
      },
    });
  }

  const byCatalogId = new Map(catalogRows.map((c) => [c.id, c]));
  const byProductId = new Map(
    productRows.map((p) => [p.id, catalogRowFromMedicationProduct(p as MedicationProductResolveRow)])
  );

  /** M1.7A.5 — Some rows store MedicationProduct.id in catalogItemId without medicationProductId. */
  const unresolvedCatalogItemIds = [...catalogIds].filter((id) => !byCatalogId.has(id));
  const extraProductLookupIds = [
    ...new Set(
      unresolvedCatalogItemIds.filter((id) => !byProductId.has(id) && !productIds.has(id))
    ),
  ];
  if (extraProductLookupIds.length > 0 && typeof productClient.findMany === "function") {
    const extraProducts = await productClient.findMany({
      where: { id: { in: extraProductLookupIds } },
      select: {
        id: true,
        code: true,
        strengthDisplay: true,
        legacyCatalogMedication: { select: ORDER_MEDICATION_CATALOG_SELECT },
        concept: { select: { genericName: true, displayName: true } },
      },
    });
    for (const p of extraProducts) {
      byProductId.set(p.id, catalogRowFromMedicationProduct(p as MedicationProductResolveRow));
      const legacyId = p.legacyCatalogMedication?.id?.trim();
      if (legacyId && !byCatalogId.has(legacyId)) {
        byCatalogId.set(legacyId, catalogRowFromMedicationProduct(p as MedicationProductResolveRow));
      }
    }
  }

  return { byCatalogId, byProductId };
}

export function resolveOrderMedicationCatalogRow(
  it: { catalogItemId?: string | null; medicationProductId?: string | null; catalogItemType?: string },
  maps: {
    byCatalogId: Map<string, OrderMedicationCatalogRow>;
    byProductId: Map<string, OrderMedicationCatalogRow>;
  }
): OrderMedicationCatalogRow | null {
  if (it.catalogItemType !== "MEDICATION") return null;
  const catalogId = it.catalogItemId?.trim();
  if (catalogId) {
    const row = maps.byCatalogId.get(catalogId);
    if (row) return row;
    const asProduct = maps.byProductId.get(catalogId);
    if (asProduct) return asProduct;
  }
  const productId = it.medicationProductId?.trim();
  if (productId) {
    return maps.byProductId.get(productId) ?? null;
  }
  return null;
}
