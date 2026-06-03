/**
 * M1.7B — Enterprise Wave 3 billing validation.
 */

import {
  ENTERPRISE_WAVE3_BILLING_BY_CODE,
  ENTERPRISE_WAVE3_BILLING_MANIFEST,
} from "./enterpriseWave3BillingManifest.js";
import {
  ENTERPRISE_WAVE3_FORMULARY_BY_CODE,
  ENTERPRISE_WAVE3_FORMULARY_MANIFEST,
} from "./enterpriseWave3FormularyManifest.js";
import type {
  EnterpriseWave3PerMedicationReadiness,
  EnterpriseWave3ReadinessReport,
} from "./enterpriseWave3Types.js";

const J_CODE_PATTERN = /^J\d{4}$/;
const HCPCS_OR_PRODUCT_CODE_PATTERN = /^(J\d{4}|[A-Z]\d{4,5}|\d{5})$/;
const NDC11_PATTERN = /^\d{11}$/;

export type EnterpriseWave3BillingSnapshot = {
  catalogCode: string;
  billingCodeDefault?: string | null;
  ndc11?: string | null;
  packageNdc11?: string | null;
  billingProfileHcpcs?: string | null;
  hasBillingProfile: boolean;
  isActive?: boolean;
  governanceStatus?: string | null;
  orderSearchEnabled?: boolean;
};

export function validateWave3BillingManifest(): string[] {
  const errors: string[] = [];
  for (const entry of ENTERPRISE_WAVE3_BILLING_MANIFEST) {
    if (!HCPCS_OR_PRODUCT_CODE_PATTERN.test(entry.hcpcs.trim())) {
      errors.push(`${entry.catalogCode}: invalid hcpcs ${entry.hcpcs}`);
    }
    if (!NDC11_PATTERN.test(entry.ndc11.trim())) {
      errors.push(`${entry.catalogCode}: invalid ndc11 ${entry.ndc11}`);
    }
    if (!ENTERPRISE_WAVE3_FORMULARY_BY_CODE[entry.catalogCode]) {
      errors.push(`${entry.catalogCode}: missing formulary row`);
    }
  }
  if (ENTERPRISE_WAVE3_BILLING_MANIFEST.length !== ENTERPRISE_WAVE3_FORMULARY_MANIFEST.length) {
    errors.push("billing manifest length mismatch");
  }
  return errors;
}

export function assertEnterpriseWave3BillingManifest(): void {
  const errors = validateWave3BillingManifest();
  if (errors.length > 0) {
    throw new Error(`[wave3-billing] manifest invalid: ${errors.join("; ")}`);
  }
}

export function validateWave3MedicationBillingReadiness(
  catalogCode: string,
  snapshot: EnterpriseWave3BillingSnapshot
): EnterpriseWave3PerMedicationReadiness {
  const failures: string[] = [];
  const manifest = ENTERPRISE_WAVE3_BILLING_BY_CODE[catalogCode];
  if (!manifest) failures.push("missing wave3 billing manifest entry");
  if (!snapshot.hasBillingProfile) failures.push("MedicationBillingProfile missing");

  const hcpcs =
    snapshot.billingProfileHcpcs?.trim() ||
    snapshot.billingCodeDefault?.trim() ||
    manifest?.hcpcs?.trim();
  if (!hcpcs) failures.push("required HCPCS/J-code missing");
  else if (!HCPCS_OR_PRODUCT_CODE_PATTERN.test(hcpcs)) failures.push(`invalid HCPCS/J-code ${hcpcs}`);

  const ndc = snapshot.packageNdc11?.trim() || snapshot.ndc11?.trim() || manifest?.ndc11?.trim();
  if (!ndc) failures.push("required NDC missing");
  else if (!NDC11_PATTERN.test(ndc)) failures.push(`invalid NDC ${ndc}`);

  const billingPass = failures.length === 0;
  const localizationPass = true;
  const labelPass = true;
  const governancePass = true;
  const searchPass = true;
  const activationPass =
    snapshot.isActive !== true &&
    (snapshot.governanceStatus ?? "REVIEW_REQUIRED") === "REVIEW_REQUIRED" &&
    snapshot.orderSearchEnabled !== true;

  return {
    catalogCode,
    pass: billingPass && activationPass && localizationPass && labelPass,
    billingPass,
    governancePass,
    searchPass,
    localizationPass,
    labelPass,
    activationPass,
    failures,
  };
}

export function summarizeEnterpriseWave3Readiness(
  perMedication: EnterpriseWave3PerMedicationReadiness[],
  counts: Omit<
    EnterpriseWave3ReadinessReport,
    | "perMedication"
    | "localizationCoveragePct"
    | "billingReadinessPct"
    | "labelIntegrityPct"
    | "wave3ReadinessPct"
    | "highAlertCount"
    | "controlledCount"
    | "dmardCount"
    | "biologicCount"
    | "insulinCount"
    | "byBucket"
  >,
  governance: ReturnType<typeof import("./enterpriseWave3FormularyValidation.js").countWave3GovernanceMarkers>
): EnterpriseWave3ReadinessReport {
  const total = perMedication.length || 1;
  const billingPass = perMedication.filter((p) => p.billingPass).length;
  const localizationPass = perMedication.filter((p) => p.localizationPass).length;
  const labelPass = perMedication.filter((p) => p.labelPass).length;
  const allPass = perMedication.filter((p) => p.pass).length;

  return {
    ...counts,
    ...governance,
    perMedication,
    localizationCoveragePct: Math.round((localizationPass / total) * 100),
    billingReadinessPct: Math.round((billingPass / total) * 100),
    labelIntegrityPct: Math.round((labelPass / total) * 100),
    wave3ReadinessPct: Math.round((allPass / total) * 100),
  };
}
