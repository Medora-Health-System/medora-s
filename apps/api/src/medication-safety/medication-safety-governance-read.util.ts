import type { PharmacyVerificationStatus, PrismaClient } from "@prisma/client";
import {
  HIGH_ALERT_DOUBLE_CHECK_SAFETY_CODES,
  parseMedicationHighAlertCategoriesJson,
  parseMedicationSafetyRequirementsFromCategoriesJson,
  parsePharmacyGovernanceFromProfile,
  resolveMarHighAlertClassification,
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
  displayNameEn?: string | null;
  strength?: string | null;
  dosageForm?: string | null;
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

/** Resolve map key for governance enrichment — prefer resolved catalogMedication.id (M1.7B.2). */
export function resolveGovernanceCatalogKeyForOrderItem(
  item: {
    catalogItemId?: string | null;
    catalogMedication?: { id?: string | null } | null;
  },
  governanceByCatalogId: Map<string, MedicationSafetyGovernanceRead>
): string | null {
  const candidates = [
    item.catalogMedication?.id?.trim(),
    item.catalogItemId?.trim(),
  ].filter(Boolean) as string[];

  for (const id of candidates) {
    if (governanceByCatalogId.has(id)) return id;
  }
  return null;
}

export function mergeMedicationSafetyGovernanceRead(
  catalog: CatalogGovernanceRow | null | undefined,
  profileRow: ProfileGovernanceRow | null | undefined,
  pharmacyStatus: PharmacyVerificationStatus | null | undefined
): MedicationSafetyGovernanceRead | null {
  if (!catalog && !profileRow) return null;

  const safety = profileRow?.concept.safetyProfile ?? null;
  const parsed = parseMedicationHighAlertCategoriesJson(safety?.highAlertCategories);
  const profileSafetyRequirementCodes = parseMedicationSafetyRequirementsFromCategoriesJson(
    safety?.highAlertCategories
  );
  const resolvedClassification = resolveMarHighAlertClassification({
    profileHighAlertClass: parsed.highAlertClass,
    profileSafetyRequirementCodes,
    catalog: catalog
      ? {
          code: catalog.code ?? null,
          genericName: catalog.genericName ?? null,
          displayNameEn: catalog.displayNameEn ?? null,
          strength: catalog.strength ?? null,
          dosageForm: catalog.dosageForm ?? null,
        }
      : null,
  });
  const effectiveHighAlertClass =
    resolvedClassification?.highAlertClass ?? parsed.highAlertClass ?? null;

  const isControlled = safety?.isControlled ?? catalog?.isControlled ?? false;
  const controlledSchedule = safety?.controlledSchedule ?? catalog?.controlledSchedule ?? null;
  const requiresWitness = Boolean(safety?.requiresWitness || catalog?.requiresWitness);
  const safetyRequirementCodes =
    resolvedClassification?.safetyRequirementCodes.length
      ? resolvedClassification.safetyRequirementCodes
      : profileSafetyRequirementCodes;
  const requiresDoubleSignFromCodes = safetyRequirementCodes.some((c) =>
    (HIGH_ALERT_DOUBLE_CHECK_SAFETY_CODES as readonly string[]).includes(c)
  );
  const requiresDoubleSign = Boolean(
    safety?.requiresDoubleSign || catalog?.requiresDoubleSign || requiresDoubleSignFromCodes
  );
  const isHighAlert =
    safety?.isHighAlert === true ||
    Boolean(effectiveHighAlertClass && effectiveHighAlertClass !== "HIGH_ALERT_NONE");
  const wasteDocumentationRecommended =
    Boolean(profileRow?.administrationProfile?.allowsWasteDocumentation) && isControlled;

  const pharmacyParsed = parsePharmacyGovernanceFromProfile({
    controlledSchedule,
    highAlertCategories: safety?.highAlertCategories,
  });
  const requiresPharmacyVerification = pharmacyParsed.requiresPharmacyVerification;

  const hasSignal =
    isControlled ||
    isHighAlert ||
    Boolean(effectiveHighAlertClass && effectiveHighAlertClass !== "HIGH_ALERT_NONE") ||
    Boolean(safety?.lasaGroupId?.trim() || parsed.lasaSeverity) ||
    requiresWitness ||
    requiresDoubleSign ||
    wasteDocumentationRecommended ||
    requiresPharmacyVerification ||
    (pharmacyStatus != null && pharmacyStatus !== "NOT_REQUIRED" && pharmacyStatus !== "VERIFIED");

  if (!hasSignal) return null;

  return {
    isControlled,
    controlledSchedule,
    isHighAlert,
    highAlertClass: effectiveHighAlertClass,
    lasaGroupId: safety?.lasaGroupId ?? parsed.lasaGroupCode,
    lasaGroupLabel: parsed.lasaGroupLabel,
    lasaSeverity: parsed.lasaSeverity,
    requiresWitness,
    requiresDoubleSign,
    wasteDocumentationRecommended,
    pharmacyVerificationStatus: pharmacyStatus ?? null,
    requiresPharmacyVerification,
  };
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

export async function loadMedicationSafetyGovernanceByCatalogId(
  prisma: Pick<PrismaClient, "catalogMedication" | "medicationProduct">,
  catalogMedicationIds: string[]
): Promise<Map<string, MedicationSafetyGovernanceRead>> {
  const uniqueIds = [...new Set(catalogMedicationIds.filter(Boolean))];
  const out = new Map<string, MedicationSafetyGovernanceRead>();
  if (uniqueIds.length === 0) return out;

  const catalogSelect = {
    id: true,
    code: true,
    genericName: true,
    displayNameEn: true,
    strength: true,
    dosageForm: true,
    isControlled: true,
    controlledSchedule: true,
    requiresWitness: true,
    requiresDoubleSign: true,
  } as const;

  const productSelect = {
    id: true,
    legacyCatalogMedicationId: true,
    legacyCatalogMedication: { select: catalogSelect },
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
      select: catalogSelect,
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
      catalogById.set(embeddedCatalog.id, embeddedCatalog as CatalogGovernanceRow);
    }
  }

  const storeMerged = (
    key: string,
    catalogRow: CatalogGovernanceRow | undefined,
    profileRow: ProfileGovernanceRow | undefined
  ) => {
    const merged = mergeMedicationSafetyGovernanceRead(catalogRow, profileRow, null);
    if (!merged) return;
    out.set(key, merged);
    const canonicalCatalogId = catalogRow?.id?.trim();
    if (canonicalCatalogId && canonicalCatalogId !== key) {
      out.set(canonicalCatalogId, merged);
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

    storeMerged(id, catalogRow, profileRow);
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
    catalogMedication?: { id?: string | null } | null;
  },
>(
  item: T,
  governanceByCatalogId: Map<string, MedicationSafetyGovernanceRead>,
  pharmacyByOrderItemId: Map<string, PharmacyVerificationStatus>,
  pharmacyDetailsByOrderItemId?: Map<string, PharmacyVerificationDetailRead>
): T & { medicationSafetyGovernance?: MedicationSafetyGovernanceRead | null } {
  if (item.catalogItemType !== "MEDICATION") {
    return { ...item, medicationSafetyGovernance: null };
  }

  const catalogKey = resolveGovernanceCatalogKeyForOrderItem(item, governanceByCatalogId);
  const base = catalogKey ? governanceByCatalogId.get(catalogKey) : undefined;
  const pharmacyStatus = pharmacyByOrderItemId.get(item.id);

  if (!base && !pharmacyStatus) {
    return { ...item, medicationSafetyGovernance: null };
  }

  const detail = pharmacyDetailsByOrderItemId?.get(item.id);
  const requiresPharmacy = base?.requiresPharmacyVerification === true;
  const effectivePharmacyStatus =
    pharmacyStatus ??
    detail?.verificationStatus ??
    (requiresPharmacy ? ("PENDING" as const) : null);

  if (!base) {
    if (!effectivePharmacyStatus) {
      return { ...item, medicationSafetyGovernance: null };
    }
    return {
      ...item,
      medicationSafetyGovernance: {
        pharmacyVerificationStatus: effectivePharmacyStatus,
        pharmacyVerifiedAt: detail?.verifiedAt ?? null,
        pharmacyVerifiedByDisplay: detail?.pharmacistDisplay ?? null,
      },
    };
  }

  return {
    ...item,
    medicationSafetyGovernance: {
      ...base,
      pharmacyVerificationStatus:
        effectivePharmacyStatus ?? base.pharmacyVerificationStatus ?? null,
      pharmacyVerifiedAt: detail?.verifiedAt ?? null,
      pharmacyVerifiedByDisplay: detail?.pharmacistDisplay ?? null,
    },
  };
}
