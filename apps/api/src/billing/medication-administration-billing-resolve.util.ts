import type { MedicationAdministrationBillingSourceKind } from "@medora/shared";
import type { InfusionBillingGovernanceSnapshot } from "@medora/shared";
import { isMedicationAdministrationBillableMarAction } from "@medora/shared";
import type { PrismaService } from "../prisma/prisma.service";
import { resolveInfusionBillingGovernanceForAdministration } from "./infusion-billing-governance-resolve.util";
import {
  mapMedicationToBillingCode,
  type CatalogBillingMapping,
} from "./billing-map-from-event.util";
import { collectMedicationMarLookupOrder } from "./medication-code-derive.util";

const HCPCS_J_PATTERN = /^J\d{4}$/;

export type MedicationAdministrationBillingResolution = {
  hcpcsCode: string | null;
  catalogMapping: CatalogBillingMapping | null;
  ndc11: string | null;
  ndcDisplay: string | null;
  quantityUnit: string | null;
  revenueCode: string | null;
  sourceKind: MedicationAdministrationBillingSourceKind;
  manualReviewReason: string | null;
  catalogMedicationCode: string | null;
  requiresManualReview: boolean;
  labelFallback: string;
  infusionGovernance: InfusionBillingGovernanceSnapshot | null;
};

function normalizeHcpcs(code: string | null | undefined): string | null {
  const c = code?.trim();
  if (!c) return null;
  return HCPCS_J_PATTERN.test(c) ? c : null;
}

async function loadPackageBillingProfile(
  prisma: PrismaService,
  packageId: string | null | undefined
): Promise<{
  hcpcsCodeSuggested: string | null;
  hcpcsUnitType: string | null;
  revenueCodeSuggested: string | null;
  requiresManualReview: boolean;
  ndc11: string | null;
  ndcDisplay: string | null;
} | null> {
  const pid = packageId?.trim();
  if (!pid) return null;

  const pkg = await prisma.medicationPackage.findFirst({
    where: { id: pid, isActive: true },
    select: {
      ndc11: true,
      ndcDisplay: true,
      billingProfiles: {
        where: { effectiveTo: null },
        orderBy: { effectiveFrom: "desc" },
        take: 1,
        select: {
          hcpcsCodeSuggested: true,
          hcpcsUnitType: true,
          revenueCodeSuggested: true,
          requiresManualReview: true,
        },
      },
    },
  });
  if (!pkg) return null;

  const profile = pkg.billingProfiles[0];
  return {
    hcpcsCodeSuggested: profile?.hcpcsCodeSuggested?.trim() ?? null,
    hcpcsUnitType: profile?.hcpcsUnitType?.trim() ?? null,
    revenueCodeSuggested: profile?.revenueCodeSuggested?.trim() ?? null,
    requiresManualReview: profile?.requiresManualReview ?? true,
    ndc11: pkg.ndc11?.trim() ?? null,
    ndcDisplay: pkg.ndcDisplay?.trim() ?? null,
  };
}

async function loadProductDefaultPackageProfile(
  prisma: PrismaService,
  legacyCatalogMedicationId: string | null | undefined
): Promise<{
  hcpcsCodeSuggested: string | null;
  hcpcsUnitType: string | null;
  revenueCodeSuggested: string | null;
  requiresManualReview: boolean;
  ndc11: string | null;
  ndcDisplay: string | null;
} | null> {
  const catalogId = legacyCatalogMedicationId?.trim();
  if (!catalogId) return null;

  const product = await prisma.medicationProduct.findFirst({
    where: { legacyCatalogMedicationId: catalogId, isActive: true },
    select: { id: true },
  });
  if (!product) return null;

  const defaultPackage = await prisma.medicationPackage.findFirst({
    where: { productId: product.id, isActive: true },
    orderBy: [{ isDefaultForProduct: "desc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  if (!defaultPackage) return null;

  return loadPackageBillingProfile(prisma, defaultPackage.id);
}

/**
 * M1.4C — Deterministic MAR administration billing resolution.
 * Priority: catalog billingCodeDefault → BillingCatalog → package profile → product profile → manual review.
 */
export async function resolveMedicationAdministrationBilling(
  prisma: PrismaService,
  input: {
    facilityId: string;
    encounterId: string;
    medicationAdministrationId: string;
  }
): Promise<MedicationAdministrationBillingResolution | null> {
  const adm = await prisma.medicationAdministration.findFirst({
    where: {
      id: input.medicationAdministrationId,
      facilityId: input.facilityId,
      encounterId: input.encounterId,
    },
    include: {
      orderItem: { include: { order: true } },
    },
  });
  if (!adm?.orderItem || adm.orderItem.catalogItemType !== "MEDICATION") return null;

  if (
    !isMedicationAdministrationBillableMarAction(adm.marAction ?? null, adm.notes ?? null)
  ) {
    return null;
  }

  const oi = adm.orderItem;
  let labelFallback =
    adm.medicationLabelSnapshot?.trim() || oi.manualLabel?.trim() || "Medication";

  let cat: {
    id: string;
    code: string | null;
    name: string;
    displayNameFr: string | null;
    genericName: string | null;
    strength: string | null;
    dosageForm: string | null;
    route: string | null;
    billingCodeDefault: string | null;
    ndc11: string | null;
    ndcDisplay: string | null;
    billingUnitType: string | null;
    administrationType: string | null;
    billingClass: string | null;
  } | null = null;

  if (oi.catalogItemId) {
    cat = await prisma.catalogMedication.findUnique({
      where: { id: oi.catalogItemId },
      select: {
        id: true,
        code: true,
        name: true,
        displayNameFr: true,
        genericName: true,
        strength: true,
        dosageForm: true,
        route: true,
        billingCodeDefault: true,
        ndc11: true,
        ndcDisplay: true,
        billingUnitType: true,
        administrationType: true,
        billingClass: true,
      },
    });
    if (cat?.code?.trim()) {
      labelFallback = cat.name?.trim() || cat.displayNameFr?.trim() || labelFallback;
    }
  }

  const packageId = adm.medicationPackageId?.trim() || oi.medicationPackageId?.trim() || null;
  const packageProfile = await loadPackageBillingProfile(prisma, packageId);
  const productProfile = cat
    ? await loadProductDefaultPackageProfile(prisma, cat.id)
    : null;

  const ndc11 =
    adm.ndc11Snapshot?.trim() ||
    packageProfile?.ndc11 ||
    productProfile?.ndc11 ||
    cat?.ndc11?.trim() ||
    null;
  const ndcDisplay =
    adm.ndcDisplaySnapshot?.trim() ||
    packageProfile?.ndcDisplay ||
    productProfile?.ndcDisplay ||
    cat?.ndcDisplay?.trim() ||
    null;

  const catalogDefault = normalizeHcpcs(cat?.billingCodeDefault);

  let base: Omit<MedicationAdministrationBillingResolution, "infusionGovernance"> | undefined;

  if (catalogDefault) {
    base = {
      hcpcsCode: catalogDefault,
      catalogMapping: {
        code: catalogDefault,
        system: "HCPCS",
        billClass: "both",
        description: labelFallback,
      },
      ndc11,
      ndcDisplay,
      quantityUnit: cat?.billingUnitType?.trim() ?? packageProfile?.hcpcsUnitType ?? null,
      revenueCode: packageProfile?.revenueCodeSuggested ?? productProfile?.revenueCodeSuggested ?? null,
      sourceKind: "CATALOG_BILLING_CODE_DEFAULT",
      manualReviewReason: null,
      catalogMedicationCode: cat?.code?.trim() ?? null,
      requiresManualReview: packageProfile?.requiresManualReview ?? productProfile?.requiresManualReview ?? false,
      labelFallback,
    };
  } else {
    const deriveInput =
      cat?.genericName?.trim()
        ? {
            genericName: cat.genericName,
            strength: cat.strength ?? "",
            dosageForm: cat.dosageForm ?? "comprimé",
            route: cat.route ?? "orale",
          }
        : null;

    let catalogMapping: CatalogBillingMapping | null = null;
    for (const key of collectMedicationMarLookupOrder({
      catalogMedicationCode: cat?.code?.trim() ? cat.code.trim() : null,
      orderManualLabel: oi.manualLabel?.trim() ?? null,
      medicationLabelSnapshot: adm.medicationLabelSnapshot?.trim() ?? null,
      deriveInput,
    })) {
      if (!key) continue;
      catalogMapping = await mapMedicationToBillingCode(prisma, key);
      if (catalogMapping) break;
    }

    if (catalogMapping?.system === "HCPCS") {
      const hcpcs = normalizeHcpcs(catalogMapping.code);
      if (hcpcs) {
        base = {
          hcpcsCode: hcpcs,
          catalogMapping,
          ndc11,
          ndcDisplay,
          quantityUnit: cat?.billingUnitType?.trim() ?? packageProfile?.hcpcsUnitType ?? null,
          revenueCode: packageProfile?.revenueCodeSuggested ?? productProfile?.revenueCodeSuggested ?? null,
          sourceKind: "BILLING_CATALOG_MEDICATION",
          manualReviewReason: null,
          catalogMedicationCode: cat?.code?.trim() ?? null,
          requiresManualReview: packageProfile?.requiresManualReview ?? productProfile?.requiresManualReview ?? false,
          labelFallback,
        };
      }
    }

    if (!base) {
      const packageHcpcs = normalizeHcpcs(packageProfile?.hcpcsCodeSuggested);
      if (packageHcpcs) {
        base = {
          hcpcsCode: packageHcpcs,
          catalogMapping: {
            code: packageHcpcs,
            system: "HCPCS",
            billClass: "both",
            description: labelFallback,
          },
          ndc11,
          ndcDisplay,
          quantityUnit: packageProfile?.hcpcsUnitType ?? cat?.billingUnitType?.trim() ?? null,
          revenueCode: packageProfile?.revenueCodeSuggested ?? null,
          sourceKind: "MEDICATION_PACKAGE_PROFILE",
          manualReviewReason: packageProfile?.requiresManualReview
            ? "Package billing profile flagged for manual review"
            : null,
          catalogMedicationCode: cat?.code?.trim() ?? null,
          requiresManualReview: packageProfile?.requiresManualReview ?? true,
          labelFallback,
        };
      }
    }

    if (!base) {
      const productHcpcs = normalizeHcpcs(productProfile?.hcpcsCodeSuggested);
      if (productHcpcs) {
        base = {
          hcpcsCode: productHcpcs,
          catalogMapping: {
            code: productHcpcs,
            system: "HCPCS",
            billClass: "both",
            description: labelFallback,
          },
          ndc11,
          ndcDisplay,
          quantityUnit: productProfile?.hcpcsUnitType ?? cat?.billingUnitType?.trim() ?? null,
          revenueCode: productProfile?.revenueCodeSuggested ?? null,
          sourceKind: "MEDICATION_PRODUCT_PROFILE",
          manualReviewReason: productProfile?.requiresManualReview
            ? "Product default package profile flagged for manual review"
            : null,
          catalogMedicationCode: cat?.code?.trim() ?? null,
          requiresManualReview: productProfile?.requiresManualReview ?? true,
          labelFallback,
        };
      }
    }
  }

  if (!base) {
    base = {
      hcpcsCode: null,
      catalogMapping: null,
      ndc11,
      ndcDisplay,
      quantityUnit: cat?.billingUnitType?.trim() ?? null,
      revenueCode: null,
      sourceKind: "MANUAL_REVIEW",
      manualReviewReason: "No HCPCS/J-code mapping found for administered medication",
      catalogMedicationCode: cat?.code?.trim() ?? null,
      requiresManualReview: true,
      labelFallback,
    };
  }

  const infusionGovernance = await resolveInfusionBillingGovernanceForAdministration(prisma, {
    facilityId: input.facilityId,
    encounterId: input.encounterId,
    medicationAdministrationId: input.medicationAdministrationId,
    marAction: adm.marAction,
    notes: adm.notes,
    infusionPhase: adm.infusionPhase,
    infusionSessionKey: adm.infusionSessionKey,
    route: adm.route ?? cat?.route ?? null,
    orderItemId: adm.orderItemId,
    catalogMedicationId: cat?.id ?? null,
    catalogAdministrationType: cat?.administrationType ?? null,
    catalogMedicationBillingClass: cat?.billingClass ?? null,
    medicationLabel: labelFallback,
    catalogCode: cat?.code ?? null,
    genericName: cat?.genericName ?? null,
    administeredAtIso: adm.administeredAt.toISOString(),
    effectiveAdministeredAtIso: adm.effectiveAdministeredAt?.toISOString() ?? null,
  });

  return { ...base, infusionGovernance };
}

/** Apply resolver output onto a billing capture item (metadata enrichment only). */
export function applyMedicationAdministrationBillingResolutionToCaptureItem<
  T extends {
    hcpcsCode?: string | null;
    procedureCode?: string | null;
    ndc11?: string | null;
    ndcDisplay?: string | null;
    quantityUnit?: string | null;
    revenueCode?: string | null;
    catalogEnriched?: boolean;
    rationale?: string | null;
    status?: string;
    medicationBillingSource?: MedicationAdministrationBillingSourceKind | null;
    medicationBillingManualReviewReason?: string | null;
    infusionBillingCategory?: string | null;
    infusionBillingReady?: boolean;
    infusionManualReviewReasons?: string[];
    suggestedAdministrationCodes?: Array<{ suggestedAdministrationCode: string }>;
    infusionStartedAt?: string | null;
    infusionStoppedAt?: string | null;
    infusionDurationMinutes?: number | null;
    infusionDurationBillingManualReview?: boolean;
  },
>(item: T, resolution: MedicationAdministrationBillingResolution): T {
  const next = { ...item };
  if (resolution.hcpcsCode) {
    next.hcpcsCode = resolution.hcpcsCode;
    next.catalogEnriched = true;
  }
  if (resolution.ndc11 && !next.ndc11) next.ndc11 = resolution.ndc11;
  if (resolution.ndcDisplay && !next.ndcDisplay) next.ndcDisplay = resolution.ndcDisplay;
  if (resolution.quantityUnit && !next.quantityUnit) next.quantityUnit = resolution.quantityUnit;
  if (resolution.revenueCode && !next.revenueCode) next.revenueCode = resolution.revenueCode;
  next.medicationBillingSource = resolution.sourceKind;
  if (resolution.manualReviewReason) {
    next.medicationBillingManualReviewReason = resolution.manualReviewReason;
    next.rationale = resolution.manualReviewReason;
  } else if (resolution.requiresManualReview) {
    next.medicationBillingManualReviewReason = "Billing profile requires manual payer review";
  }
  if (!resolution.hcpcsCode) {
    next.status = "needs_review";
  }

  const infusion = resolution.infusionGovernance;
  if (infusion) {
    next.infusionBillingCategory = infusion.infusionBillingCategory;
    next.infusionBillingReady = infusion.infusionBillingReady;
    next.infusionManualReviewReasons = infusion.infusionManualReviewReasons;
    next.suggestedAdministrationCodes = infusion.suggestedAdministrationCodes;
    if (infusion.infusionStartTime) next.infusionStartedAt = infusion.infusionStartTime;
    if (infusion.infusionStopTime) next.infusionStoppedAt = infusion.infusionStopTime;
    if (infusion.infusionDurationMinutes != null) {
      next.infusionDurationMinutes = infusion.infusionDurationMinutes;
    }
    if (!infusion.infusionBillingReady) {
      next.infusionDurationBillingManualReview = true;
    }
    const companion = infusion.suggestedAdministrationCodes[0]?.suggestedAdministrationCode;
    if (companion && !next.procedureCode) {
      next.procedureCode = companion;
    }
  }

  return next;
}
