import type { PharmacyVerificationStatus, PrismaClient } from "@prisma/client";
import {
  HIGH_ALERT_DOUBLE_CHECK_SAFETY_CODES,
  parseMedicationHighAlertCategoriesJson,
  parseMedicationSafetyRequirementsFromCategoriesJson,
  type MedicationSafetyGovernanceSnapshot,
} from "@medora/shared";

export type MedicationSafetyGovernanceRead = MedicationSafetyGovernanceSnapshot;

type CatalogGovernanceRow = {
  id: string;
  isControlled: boolean;
  controlledSchedule: string | null;
  requiresWitness: boolean;
  requiresDoubleSign: boolean;
};

type ProfileGovernanceRow = {
  legacyCatalogMedicationId: string | null;
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

export function mergeMedicationSafetyGovernanceRead(
  catalog: CatalogGovernanceRow | null | undefined,
  profileRow: ProfileGovernanceRow | null | undefined,
  pharmacyStatus: PharmacyVerificationStatus | null | undefined
): MedicationSafetyGovernanceRead | null {
  if (!catalog && !profileRow) return null;

  const safety = profileRow?.concept.safetyProfile ?? null;
  const parsed = parseMedicationHighAlertCategoriesJson(safety?.highAlertCategories);

  const isControlled = safety?.isControlled ?? catalog?.isControlled ?? false;
  const controlledSchedule = safety?.controlledSchedule ?? catalog?.controlledSchedule ?? null;
  const requiresWitness = Boolean(safety?.requiresWitness || catalog?.requiresWitness);
  const safetyRequirementCodes = parseMedicationSafetyRequirementsFromCategoriesJson(
    safety?.highAlertCategories
  );
  const requiresDoubleSignFromCodes = safetyRequirementCodes.some((c) =>
    (HIGH_ALERT_DOUBLE_CHECK_SAFETY_CODES as readonly string[]).includes(c)
  );
  const requiresDoubleSign = Boolean(
    safety?.requiresDoubleSign || catalog?.requiresDoubleSign || requiresDoubleSignFromCodes
  );
  const isHighAlert = safety?.isHighAlert ?? false;
  const wasteDocumentationRecommended =
    Boolean(profileRow?.administrationProfile?.allowsWasteDocumentation) && isControlled;

  const hasSignal =
    isControlled ||
    isHighAlert ||
    Boolean(parsed.highAlertClass && parsed.highAlertClass !== "HIGH_ALERT_NONE") ||
    Boolean(safety?.lasaGroupId?.trim() || parsed.lasaSeverity) ||
    requiresWitness ||
    requiresDoubleSign ||
    wasteDocumentationRecommended ||
    (pharmacyStatus != null && pharmacyStatus !== "NOT_REQUIRED" && pharmacyStatus !== "VERIFIED");

  if (!hasSignal) return null;

  return {
    isControlled,
    controlledSchedule,
    isHighAlert,
    highAlertClass: parsed.highAlertClass,
    lasaGroupId: safety?.lasaGroupId ?? parsed.lasaGroupCode,
    lasaGroupLabel: parsed.lasaGroupLabel,
    lasaSeverity: parsed.lasaSeverity,
    requiresWitness,
    requiresDoubleSign,
    wasteDocumentationRecommended,
    pharmacyVerificationStatus: pharmacyStatus ?? null,
  };
}

export async function loadMedicationSafetyGovernanceByCatalogId(
  prisma: Pick<PrismaClient, "catalogMedication" | "medicationProduct">,
  catalogMedicationIds: string[]
): Promise<Map<string, MedicationSafetyGovernanceRead>> {
  const uniqueIds = [...new Set(catalogMedicationIds.filter(Boolean))];
  const out = new Map<string, MedicationSafetyGovernanceRead>();
  if (uniqueIds.length === 0) return out;

  const [catalogRows, productRows] = await Promise.all([
    prisma.catalogMedication.findMany({
      where: { id: { in: uniqueIds } },
      select: {
        id: true,
        isControlled: true,
        controlledSchedule: true,
        requiresWitness: true,
        requiresDoubleSign: true,
      },
    }),
    prisma.medicationProduct.findMany({
      where: { legacyCatalogMedicationId: { in: uniqueIds }, isActive: true },
      select: {
        legacyCatalogMedicationId: true,
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
      },
    }),
  ]);

  const catalogById = new Map(catalogRows.map((c) => [c.id, c]));
  const productByCatalogId = new Map<string, ProfileGovernanceRow>();
  for (const p of productRows) {
    const catalogId = p.legacyCatalogMedicationId;
    if (!catalogId || productByCatalogId.has(catalogId)) continue;
    productByCatalogId.set(catalogId, p);
  }

  for (const id of uniqueIds) {
    const merged = mergeMedicationSafetyGovernanceRead(
      catalogById.get(id),
      productByCatalogId.get(id),
      null
    );
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
  T extends { id: string; catalogItemType: string; catalogItemId: string | null },
>(
  item: T,
  governanceByCatalogId: Map<string, MedicationSafetyGovernanceRead>,
  pharmacyByOrderItemId: Map<string, PharmacyVerificationStatus>
): T & { medicationSafetyGovernance?: MedicationSafetyGovernanceRead | null } {
  if (item.catalogItemType !== "MEDICATION") {
    return { ...item, medicationSafetyGovernance: null };
  }

  const base = item.catalogItemId ? governanceByCatalogId.get(item.catalogItemId) : undefined;
  const pharmacyStatus = pharmacyByOrderItemId.get(item.id);

  if (!base && !pharmacyStatus) {
    return { ...item, medicationSafetyGovernance: null };
  }

  if (!base) {
    return {
      ...item,
      medicationSafetyGovernance: {
        pharmacyVerificationStatus: pharmacyStatus ?? null,
      },
    };
  }

  return {
    ...item,
    medicationSafetyGovernance: {
      ...base,
      pharmacyVerificationStatus: pharmacyStatus ?? base.pharmacyVerificationStatus ?? null,
    },
  };
}
