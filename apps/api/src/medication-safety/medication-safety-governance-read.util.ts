import type { PharmacyVerificationStatus, PrismaClient } from "@prisma/client";
export type { MedicationGovernanceResolveInput } from "@medora/shared";
import {
  mergeMedicationSafetyGovernanceRead as mergeGovernanceSnapshot,
  resolveMedicationAdministrationRequirements,
  type MedicationGovernanceProductInput,
  type MedicationGovernanceResolveInput,
  type MedicationSafetyGovernanceSnapshot,
} from "@medora/shared";

export type PharmacyVerificationDetailRead = {
  verificationStatus: PharmacyVerificationStatus;
  pharmacistUserId: string | null;
  verifiedAt: string | null;
  pharmacistDisplay: string | null;
  verificationNote: string | null;
};

export type MedicationSafetyGovernanceRead = MedicationSafetyGovernanceSnapshot;

type CatalogGovernanceRow = {
  id: string;
  code?: string | null;
  genericName?: string | null;
  therapeuticClass?: string | null;
  isControlled: boolean;
  controlledSchedule: string | null;
  requiresWitness: boolean;
  requiresDoubleSign: boolean;
};

type ProfileGovernanceRow = {
  id?: string;
  legacyCatalogMedicationId: string | null;
  legacyCatalogMedication?: CatalogGovernanceRow | null;
  concept: {
    safetyProfile: {
      isHighAlert: boolean;
      highAlertCategories: unknown;
      lasaGroupId: string | null;
      isControlled: boolean;
      controlledSchedule: string | null;
      requiresWitness: boolean;
      requiresDoubleSign: boolean;
    } | null;
  };
  administrationProfile: {
    allowsWasteDocumentation: boolean;
  } | null;
};

const CATALOG_GOVERNANCE_SELECT = {
  id: true,
  code: true,
  genericName: true,
  therapeuticClass: true,
  isControlled: true,
  controlledSchedule: true,
  requiresWitness: true,
  requiresDoubleSign: true,
} as const;

/** Resolve map key for governance enrichment — prefer resolved catalogMedication.id (M1.7B.2). */
export function resolveGovernanceCatalogKeyForOrderItem(
  item: {
    catalogItemId?: string | null;
    catalogMedication?: { id?: string | null } | null;
  },
  resolveInputByCatalogId: Map<string, MedicationGovernanceResolveInput>
): string | null {
  const candidates = [
    item.catalogMedication?.id?.trim(),
    item.catalogItemId?.trim(),
  ].filter(Boolean) as string[];

  for (const id of candidates) {
    if (resolveInputByCatalogId.has(id)) return id;
  }
  return null;
}

export function profileRowToProductInput(
  profileRow: ProfileGovernanceRow | null | undefined
): MedicationGovernanceProductInput {
  const safety = profileRow?.concept.safetyProfile ?? null;
  if (!safety && !profileRow?.administrationProfile) return null;
  if (!safety) {
    return {
      isHighAlert: false,
      highAlertCategories: null,
      lasaGroupId: null,
      isControlled: false,
      controlledSchedule: null,
      requiresWitness: false,
      requiresDoubleSign: false,
      allowsWasteDocumentation: profileRow?.administrationProfile?.allowsWasteDocumentation ?? false,
    };
  }
  return {
    isHighAlert: safety.isHighAlert,
    highAlertCategories: safety.highAlertCategories,
    lasaGroupId: safety.lasaGroupId,
    isControlled: safety.isControlled,
    controlledSchedule: safety.controlledSchedule,
    requiresWitness: safety.requiresWitness,
    requiresDoubleSign: safety.requiresDoubleSign,
    allowsWasteDocumentation: profileRow?.administrationProfile?.allowsWasteDocumentation ?? false,
  };
}

export function catalogRowToResolveInput(
  catalog: CatalogGovernanceRow | null | undefined,
  profileRow: ProfileGovernanceRow | null | undefined
): MedicationGovernanceResolveInput | null {
  const product = profileRowToProductInput(profileRow);
  if (!catalog && !product) return null;
  return {
    catalog: catalog
      ? {
          id: catalog.id,
          code: catalog.code ?? null,
          genericName: catalog.genericName ?? null,
          therapeuticClass: catalog.therapeuticClass ?? null,
          isControlled: catalog.isControlled,
          controlledSchedule: catalog.controlledSchedule,
          requiresWitness: catalog.requiresWitness,
          requiresDoubleSign: catalog.requiresDoubleSign,
        }
      : null,
    product,
  };
}

/** @deprecated Prefer resolveMedicationAdministrationRequirements — kept for legacy call sites during migration. */
export function mergeMedicationSafetyGovernanceRead(
  catalog: CatalogGovernanceRow | null | undefined,
  profileRow: ProfileGovernanceRow | null | undefined,
  pharmacyStatus: PharmacyVerificationStatus | null | undefined
): MedicationSafetyGovernanceRead | null {
  const resolveInput = catalogRowToResolveInput(catalog, profileRow);
  if (!resolveInput) return null;
  return mergeGovernanceSnapshot({
    catalog: resolveInput.catalog,
    product: resolveInput.product,
    pharmacyStatus: pharmacyStatus ?? null,
  });
}

export async function loadPharmacyVerificationDetailsByOrderItemId(
  prisma: Pick<PrismaClient, "pharmacyVerification">,
  orderItemIds: string[]
): Promise<Map<string, PharmacyVerificationDetailRead>> {
  const uniqueIds = [...new Set(orderItemIds.filter(Boolean))];
  const out = new Map<string, PharmacyVerificationDetailRead>();
  if (uniqueIds.length === 0) return out;

  const rows = await prisma.pharmacyVerification.findMany({
    where: { orderItemId: { in: uniqueIds } },
    select: {
      orderItemId: true,
      verificationStatus: true,
      pharmacistUserId: true,
      verificationNote: true,
      updatedAt: true,
      createdAt: true,
      pharmacist: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  for (const row of rows) {
    if (out.has(row.orderItemId)) continue;
    const display = row.pharmacist
      ? `${row.pharmacist.firstName} ${row.pharmacist.lastName}`.trim()
      : null;
    const verifiedAt =
      row.verificationStatus === "VERIFIED"
        ? row.updatedAt.toISOString()
        : null;
    out.set(row.orderItemId, {
      verificationStatus: row.verificationStatus,
      pharmacistUserId: row.pharmacistUserId,
      verifiedAt,
      pharmacistDisplay: display,
      verificationNote: row.verificationNote,
    });
  }

  return out;
}

export async function loadMedicationGovernanceResolveInputByCatalogId(
  prisma: Pick<PrismaClient, "catalogMedication" | "medicationProduct">,
  catalogMedicationIds: string[]
): Promise<Map<string, MedicationGovernanceResolveInput>> {
  const uniqueIds = [...new Set(catalogMedicationIds.filter(Boolean))];
  const out = new Map<string, MedicationGovernanceResolveInput>();
  if (uniqueIds.length === 0) return out;

  const productSelect = {
    id: true,
    legacyCatalogMedicationId: true,
    legacyCatalogMedication: { select: CATALOG_GOVERNANCE_SELECT },
    concept: {
      select: {
        safetyProfile: {
          select: {
            isHighAlert: true,
            highAlertCategories: true,
            lasaGroupId: true,
            isControlled: true,
            controlledSchedule: true,
            requiresWitness: true,
            requiresDoubleSign: true,
          },
        },
      },
    },
    administrationProfile: {
      select: { allowsWasteDocumentation: true },
    },
  } as const;

  const [catalogRows, productRows] = await Promise.all([
    prisma.catalogMedication.findMany({
      where: { id: { in: uniqueIds } },
      select: CATALOG_GOVERNANCE_SELECT,
    }),
    prisma.medicationProduct.findMany({
      where: {
        isActive: true,
        OR: [
          { legacyCatalogMedicationId: { in: uniqueIds } },
          { id: { in: uniqueIds } },
        ],
      },
      select: productSelect,
    }),
  ]);

  const catalogById = new Map<string, CatalogGovernanceRow>(
    catalogRows.map((c) => [c.id, c as CatalogGovernanceRow])
  );
  const productByLegacyCatalogId = new Map<string, ProfileGovernanceRow>();
  const productByProductId = new Map<string, ProfileGovernanceRow>();

  for (const p of productRows) {
    const row = p as ProfileGovernanceRow;
    const legacyCatalogId = row.legacyCatalogMedicationId?.trim();
    if (legacyCatalogId && !productByLegacyCatalogId.has(legacyCatalogId)) {
      productByLegacyCatalogId.set(legacyCatalogId, row);
    }
    if (row.id && !productByProductId.has(row.id)) {
      productByProductId.set(row.id, row);
    }
    const embeddedCatalog = row.legacyCatalogMedication;
    if (embeddedCatalog?.id && !catalogById.has(embeddedCatalog.id)) {
      catalogById.set(embeddedCatalog.id, {
        id: embeddedCatalog.id,
        code: embeddedCatalog.code ?? null,
        genericName: embeddedCatalog.genericName ?? null,
        therapeuticClass: embeddedCatalog.therapeuticClass ?? null,
        isControlled: embeddedCatalog.isControlled,
        controlledSchedule: embeddedCatalog.controlledSchedule,
        requiresWitness: embeddedCatalog.requiresWitness,
        requiresDoubleSign: embeddedCatalog.requiresDoubleSign,
      });
    }
  }

  const storeResolveInput = (
    key: string,
    catalogRow: CatalogGovernanceRow | undefined,
    profileRow: ProfileGovernanceRow | undefined
  ) => {
    const resolveInput = catalogRowToResolveInput(catalogRow, profileRow);
    if (!resolveInput) return;
    out.set(key, resolveInput);
    const canonicalCatalogId = catalogRow?.id?.trim();
    if (canonicalCatalogId && canonicalCatalogId !== key) {
      out.set(canonicalCatalogId, resolveInput);
    }
  };

  for (const id of uniqueIds) {
    const catalogDirect = catalogById.get(id);
    const profileDirect = productByLegacyCatalogId.get(id) ?? productByProductId.get(id);
    const catalogRow =
      catalogDirect ??
      profileDirect?.legacyCatalogMedication ??
      (profileDirect?.legacyCatalogMedicationId
        ? catalogById.get(profileDirect.legacyCatalogMedicationId)
        : undefined);
    const profileRow =
      (catalogRow?.id ? productByLegacyCatalogId.get(catalogRow.id) : undefined) ??
      productByLegacyCatalogId.get(id) ??
      productByProductId.get(id);

    storeResolveInput(id, catalogRow, profileRow);
  }

  return out;
}

/** @deprecated Use loadMedicationGovernanceResolveInputByCatalogId + resolver */
export async function loadMedicationSafetyGovernanceByCatalogId(
  prisma: Pick<PrismaClient, "catalogMedication" | "medicationProduct">,
  catalogMedicationIds: string[]
): Promise<Map<string, MedicationSafetyGovernanceRead>> {
  const resolveInputs = await loadMedicationGovernanceResolveInputByCatalogId(
    prisma,
    catalogMedicationIds
  );
  const out = new Map<string, MedicationSafetyGovernanceRead>();
  for (const [id, resolveInput] of resolveInputs) {
    const merged = mergeGovernanceSnapshot({
      catalog: resolveInput.catalog,
      product: resolveInput.product,
      pharmacyStatus: null,
    });
    if (merged) out.set(id, merged);
  }
  return out;
}

export async function loadLatestPharmacyVerificationByOrderItemId(
  prisma: Pick<PrismaClient, "pharmacyVerification">,
  orderItemIds: string[]
): Promise<Map<string, PharmacyVerificationStatus>> {
  const uniqueIds = [...new Set(orderItemIds.filter(Boolean))];
  const out = new Map<string, PharmacyVerificationStatus>();
  if (uniqueIds.length === 0) return out;

  const rows = await prisma.pharmacyVerification.findMany({
    where: { orderItemId: { in: uniqueIds } },
    select: { orderItemId: true, verificationStatus: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  for (const row of rows) {
    if (!out.has(row.orderItemId)) {
      out.set(row.orderItemId, row.verificationStatus);
    }
  }

  return out;
}

export function attachMedicationSafetyGovernanceToOrderItem<
  T extends {
    id: string;
    catalogItemType: string;
    catalogItemId: string | null;
    route?: string | null;
    catalogMedication?: { id?: string | null } | null;
  },
>(
  item: T,
  resolveInputByCatalogId: Map<string, MedicationGovernanceResolveInput>,
  pharmacyByOrderItemId: Map<string, PharmacyVerificationStatus>,
  pharmacyDetailsByOrderItemId?: Map<string, PharmacyVerificationDetailRead>
): T & {
  medicationSafetyGovernance?: MedicationSafetyGovernanceSnapshot | null;
  medicationGovernanceResolveInput?: MedicationGovernanceResolveInput | null;
} {
  if (item.catalogItemType !== "MEDICATION") {
    return {
      ...item,
      medicationSafetyGovernance: null,
      medicationGovernanceResolveInput: null,
    };
  }

  const catalogKey = resolveGovernanceCatalogKeyForOrderItem(item, resolveInputByCatalogId);
  const resolveInput = catalogKey ? resolveInputByCatalogId.get(catalogKey) : undefined;
  if (!resolveInput) {
    return {
      ...item,
      medicationSafetyGovernance: null,
      medicationGovernanceResolveInput: null,
    };
  }

  const detail = pharmacyDetailsByOrderItemId?.get(item.id);
  const pharmacyStatus = pharmacyByOrderItemId.get(item.id) ?? detail?.verificationStatus ?? null;

  const requirements = resolveMedicationAdministrationRequirements({
    ...resolveInput,
    pharmacy: {
      verificationStatus: pharmacyStatus,
      verifiedAt: detail?.verifiedAt ?? null,
      verifiedByDisplay: detail?.pharmacistDisplay ?? null,
    },
    marContext: {
      marAction: "administered",
      route: item.route ?? null,
      isContinuousInfusion: false,
    },
  });

  if (!requirements) {
    return {
      ...item,
      medicationSafetyGovernance: null,
      medicationGovernanceResolveInput: resolveInput,
    };
  }

  return {
    ...item,
    medicationSafetyGovernance: requirements.snapshot,
    medicationGovernanceResolveInput: requirements.resolveInput,
  };
}
