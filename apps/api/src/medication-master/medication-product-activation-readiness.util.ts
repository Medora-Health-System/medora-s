/** Phase 19D.1 — activation approval readiness (governance only). */

import type { MedicationMasterValidationWarning } from "./medication-master-validation.util";
import type { MedicationProductGovernanceStatus } from "./medication-product-governance.constants";

export type ActivationReadinessInput = {
  facilityId: string;
  productCode: string;
  governanceStatus: MedicationProductGovernanceStatus | string;
  concept: {
    safetyProfile: unknown | null;
  };
  product: {
    administrationType: string;
    administrationProfile: { requiresInfusionSession?: boolean } | null;
    infusionProfile: unknown | null;
    packages: Array<{
      code: string;
      ndc11: string | null;
      billingProfiles: Array<unknown>;
      facilityFormulary: unknown | null;
    }>;
  };
  validationWarnings: MedicationMasterValidationWarning[];
  duplicateNdcOnOtherProducts: boolean;
};

export type ActivationReadinessResult = {
  ready: boolean;
  blockingReasons: string[];
};

function warningsForProduct(
  warnings: MedicationMasterValidationWarning[],
  productCode: string,
  packageCodes: Set<string>
): MedicationMasterValidationWarning[] {
  return warnings.filter((w) => {
    if (w.scope === "concept") return true;
    if (w.scope === "product" && w.scopeLabel === productCode) return true;
    if (w.scope === "package" && packageCodes.has(w.scopeLabel)) return true;
    return false;
  });
}

export function evaluateActivationReadiness(input: ActivationReadinessInput): ActivationReadinessResult {
  const reasons: string[] = [];
  const { product, concept, governanceStatus } = input;
  const packageCodes = new Set(product.packages.map((p) => p.code));

  if (governanceStatus === "RETIRED") reasons.push("GOVERNANCE_RETIRED");
  if (governanceStatus === "BLOCKED") reasons.push("GOVERNANCE_BLOCKED");
  if (governanceStatus === "ACTIVATION_APPROVED") reasons.push("ALREADY_ACTIVATION_APPROVED");

  if (!concept.safetyProfile) reasons.push("MISSING_SAFETY_PROFILE");
  if (!product.administrationProfile) reasons.push("MISSING_ADMINISTRATION_PROFILE");

  const adminType = product.administrationType.trim().toUpperCase();
  const needsInfusion =
    adminType === "INFUSION" || product.administrationProfile?.requiresInfusionSession === true;
  if (needsInfusion && !product.infusionProfile) reasons.push("MISSING_INFUSION_PROFILE");

  if (product.packages.length === 0) reasons.push("NO_ACTIVE_PACKAGES");

  const hasNdc = product.packages.some((p) => Boolean(p.ndc11?.trim()));
  if (!hasNdc) reasons.push("MISSING_NDC");

  const hasBilling = product.packages.some((p) => p.billingProfiles.length > 0);
  if (!hasBilling) reasons.push("MISSING_BILLING_PROFILE");

  const hasFormulary = product.packages.some((p) => p.facilityFormulary != null);
  if (!hasFormulary) reasons.push("MISSING_FACILITY_FORMULARY");

  if (input.duplicateNdcOnOtherProducts) reasons.push("DUPLICATE_NDC_CONFLICT");

  const scopedWarnings = warningsForProduct(input.validationWarnings, input.productCode, packageCodes);
  for (const w of scopedWarnings) {
    if (w.severity === "critical") reasons.push(w.code);
  }

  const unique = [...new Set(reasons)];
  return { ready: unique.length === 0, blockingReasons: unique };
}
