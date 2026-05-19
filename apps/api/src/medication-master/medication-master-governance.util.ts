/** Phase 19C.4 — pure governance aggregates from loaded canonical concepts (read-only). */

import {
  buildMedicationMasterValidationWarnings,
  type MedicationMasterValidationWarning,
} from "./medication-master-validation.util";

export type GovernanceConceptRow = {
  id: string;
  code: string;
  genericName: string;
  displayName: string;
  safetyProfile: {
    isHighAlert: boolean;
    isControlled: boolean;
  } | null;
  conceptAliases: Array<{ alias: string }>;
  products: Array<{
    id: string;
    code: string;
    governanceStatus?: string;
    administrationType: string;
    administrationProfile: { requiresInfusionSession?: boolean } | null;
    infusionProfile: unknown | null;
    productAliases: Array<{ alias: string }>;
    packages: Array<{
      id: string;
      code: string;
      ndc11: string | null;
      billingProfiles: Array<{ requiresManualReview: boolean }>;
      facilityFormulary: {
        isOnFormulary: boolean;
        isEDFormulary: boolean;
      } | null;
    }>;
  }>;
};

export type GovernanceWarningItem = MedicationMasterValidationWarning & {
  conceptId: string;
  conceptCode: string;
  displayName: string;
  genericName: string;
};

export type GovernanceAggregate = {
  activeConcepts: number;
  activeProducts: number;
  activePackages: number;
  conceptsWithCriticalWarnings: number;
  warningCountsByCode: Record<string, number>;
  warningCountsBySeverity: Record<string, number>;
  missingNdc: number;
  missingBillingProfile: number;
  missingSafetyProfile: number;
  missingInfusionProfile: number;
  highAlertConcepts: number;
  controlledConcepts: number;
  edFormularyPackages: number;
  packagesOnFormulary: number;
  packagesMissingFormulary: number;
  infusionCapableProducts: number;
  warningItems: GovernanceWarningItem[];
};

export function aggregateGovernanceFromConcepts(
  concepts: GovernanceConceptRow[],
  facilityId?: string
): GovernanceAggregate {
  const warningCountsByCode: Record<string, number> = {};
  const warningCountsBySeverity: Record<string, number> = {};
  const warningItems: GovernanceWarningItem[] = [];

  let activeProducts = 0;
  let activePackages = 0;
  let conceptsWithCriticalWarnings = 0;
  let missingNdc = 0;
  let missingBillingProfile = 0;
  let missingSafetyProfile = 0;
  let missingInfusionProfile = 0;
  let highAlertConcepts = 0;
  let controlledConcepts = 0;
  let edFormularyPackages = 0;
  let packagesOnFormulary = 0;
  let packagesMissingFormulary = 0;
  let infusionCapableProducts = 0;

  for (const concept of concepts) {
    if (concept.safetyProfile?.isHighAlert) highAlertConcepts += 1;
    if (concept.safetyProfile?.isControlled) controlledConcepts += 1;
    if (!concept.safetyProfile) missingSafetyProfile += 1;

    const eligibleProducts = concept.products.filter((p) => p.governanceStatus !== "RETIRED");
    activeProducts += eligibleProducts.length;

    const productInputs = eligibleProducts.map((product) => {
      const adminType = product.administrationType.trim().toUpperCase();
      const needsInfusion =
        adminType === "INFUSION" ||
        product.administrationProfile?.requiresInfusionSession === true;
      if (needsInfusion) infusionCapableProducts += 1;
      if (needsInfusion && !product.infusionProfile) missingInfusionProfile += 1;

      activePackages += product.packages.length;

      for (const pkg of product.packages) {
        if (!pkg.ndc11?.trim()) missingNdc += 1;
        if (pkg.billingProfiles.length === 0) missingBillingProfile += 1;
        if (pkg.facilityFormulary?.isEDFormulary) edFormularyPackages += 1;
        if (pkg.facilityFormulary?.isOnFormulary) packagesOnFormulary += 1;
        else if (facilityId) packagesMissingFormulary += 1;
      }

      return {
        code: product.code,
        administrationType: product.administrationType,
        administrationProfile: product.administrationProfile,
        infusionProfile: product.infusionProfile,
        productAliases: product.productAliases,
        packages: product.packages.map((pkg) => ({
          code: pkg.code,
          ndc11: pkg.ndc11,
          billingProfiles: pkg.billingProfiles,
          facilityFormulary: pkg.facilityFormulary,
        })),
      };
    });

    const warnings = buildMedicationMasterValidationWarnings({
      facilityId,
      concept: {
        code: concept.code,
        safetyProfile: concept.safetyProfile,
        conceptAliases: concept.conceptAliases,
      },
      products: productInputs,
    });

    if (warnings.some((w) => w.severity === "critical")) conceptsWithCriticalWarnings += 1;

    for (const w of warnings) {
      warningCountsByCode[w.code] = (warningCountsByCode[w.code] ?? 0) + 1;
      warningCountsBySeverity[w.severity] = (warningCountsBySeverity[w.severity] ?? 0) + 1;
      warningItems.push({
        ...w,
        conceptId: concept.id,
        conceptCode: concept.code,
        displayName: concept.displayName,
        genericName: concept.genericName,
      });
    }
  }

  return {
    activeConcepts: concepts.length,
    activeProducts,
    activePackages,
    conceptsWithCriticalWarnings,
    warningCountsByCode,
    warningCountsBySeverity,
    missingNdc,
    missingBillingProfile,
    missingSafetyProfile,
    missingInfusionProfile,
    highAlertConcepts,
    controlledConcepts,
    edFormularyPackages,
    packagesOnFormulary,
    packagesMissingFormulary,
    infusionCapableProducts,
    warningItems,
  };
}

export function readinessPercent(ready: number, total: number): number {
  if (total <= 0) return 100;
  return Math.round((ready / total) * 1000) / 10;
}
