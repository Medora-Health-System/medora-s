/** Phase 19C.3 — read-only validation warnings for pharmacy review (no mutations). */

export type MedicationMasterValidationSeverity = "critical" | "warning" | "info";

export type MedicationMasterValidationWarning = {
  code: string;
  severity: MedicationMasterValidationSeverity;
  scope: "concept" | "product" | "package";
  scopeLabel: string;
};

type ValidationInput = {
  facilityId?: string;
  concept: {
    code: string;
    safetyProfile: unknown | null;
    conceptAliases: Array<{ alias: string }>;
  };
  products: Array<{
    code: string;
    administrationType: string;
    administrationProfile: unknown | null;
    infusionProfile: unknown | null;
    productAliases: Array<{ alias: string }>;
    packages: Array<{
      code: string;
      ndc11: string | null;
      billingProfiles: Array<{ requiresManualReview: boolean }>;
      facilityFormulary: unknown | null;
    }>;
  }>;
};

export function buildMedicationMasterValidationWarnings(input: ValidationInput): MedicationMasterValidationWarning[] {
  const warnings: MedicationMasterValidationWarning[] = [];
  const { concept, products, facilityId } = input;

  if (!concept.safetyProfile) {
    warnings.push({
      code: "MISSING_SAFETY_PROFILE",
      severity: "critical",
      scope: "concept",
      scopeLabel: concept.code,
    });
  }

  if (products.length === 0) {
    warnings.push({
      code: "NO_PRODUCTS",
      severity: "critical",
      scope: "concept",
      scopeLabel: concept.code,
    });
    return warnings;
  }

  for (const product of products) {
    const adminType = product.administrationType.trim().toUpperCase();
    const needsInfusion =
      adminType === "INFUSION" ||
      (product.administrationProfile as { requiresInfusionSession?: boolean } | null)?.requiresInfusionSession ===
        true;

    if (!product.administrationProfile) {
      warnings.push({
        code: "MISSING_ADMINISTRATION_PROFILE",
        severity: "warning",
        scope: "product",
        scopeLabel: product.code,
      });
    }

    if (needsInfusion && !product.infusionProfile) {
      warnings.push({
        code: "MISSING_INFUSION_PROFILE",
        severity: "warning",
        scope: "product",
        scopeLabel: product.code,
      });
    }

    if (product.packages.length === 0) {
      warnings.push({
        code: "NO_ACTIVE_PACKAGES",
        severity: "warning",
        scope: "product",
        scopeLabel: product.code,
      });
      continue;
    }

    for (const pkg of product.packages) {
      if (!pkg.ndc11?.trim()) {
        warnings.push({
          code: "MISSING_NDC",
          severity: "warning",
          scope: "package",
          scopeLabel: pkg.code,
        });
      }

      if (pkg.billingProfiles.length === 0) {
        warnings.push({
          code: "MISSING_BILLING_PROFILE",
          severity: "warning",
          scope: "package",
          scopeLabel: pkg.code,
        });
      } else if (pkg.billingProfiles.every((b) => b.requiresManualReview)) {
        warnings.push({
          code: "BILLING_REVIEW_REQUIRED",
          severity: "info",
          scope: "package",
          scopeLabel: pkg.code,
        });
      }

      if (facilityId && !pkg.facilityFormulary) {
        warnings.push({
          code: "MISSING_FACILITY_FORMULARY",
          severity: "warning",
          scope: "package",
          scopeLabel: pkg.code,
        });
      }
    }
  }

  if (concept.conceptAliases.length === 0 && products.every((p) => p.productAliases.length === 0)) {
    warnings.push({
      code: "NO_SEARCH_ALIASES",
      severity: "info",
      scope: "concept",
      scopeLabel: concept.code,
    });
  }

  return warnings;
}
