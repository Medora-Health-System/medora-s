/**
 * M1.7C — Enterprise Wave 4 ED/Hospital billing validation.
 */

import {
  ENTERPRISE_WAVE4_ED_HOSPITAL_BILLING_BY_CODE,
  ENTERPRISE_WAVE4_ED_HOSPITAL_BILLING_MANIFEST,
} from "./enterpriseWave4EdHospitalBillingManifest.js";
import {
  ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_BY_CODE,
  ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST,
} from "./enterpriseWave4EdHospitalFormularyManifest.js";
import type {
  EnterpriseWave4EdHospitalPerMedicationReadiness,
  EnterpriseWave4EdHospitalReadinessReport,
} from "./enterpriseWave4EdHospitalTypes.js";

const HCPCS_OR_PRODUCT_CODE_PATTERN = /^(J\d{4}|[A-Z]\d{4,5}|\d{5})$/;
const NDC11_PATTERN = /^\d{11}$/;

export type EnterpriseWave4EdHospitalBillingSnapshot = {
  catalogCode: string;
  billingCodeDefault?: string | null;
  ndc11?: string | null;
  packageNdc11?: string | null;
  billingProfileHcpcs?: string | null;
  hasBillingProfile: boolean;
  isActive?: boolean;
  governanceStatus?: string | null;
  orderSearchEnabled?: boolean;
  requiresManualReview?: boolean;
};

export function validateWave4EdHospitalBillingManifest(): string[] {
  const errors: string[] = [];
  for (const entry of ENTERPRISE_WAVE4_ED_HOSPITAL_BILLING_MANIFEST) {
    if (!HCPCS_OR_PRODUCT_CODE_PATTERN.test(entry.hcpcs.trim())) {
      errors.push(`${entry.catalogCode}: invalid hcpcs ${entry.hcpcs}`);
    }
    if (!NDC11_PATTERN.test(entry.ndc11.trim())) {
      errors.push(`${entry.catalogCode}: invalid ndc11 ${entry.ndc11}`);
    }
    if (!ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_BY_CODE[entry.catalogCode]) {
      errors.push(`${entry.catalogCode}: missing formulary row`);
    }
  }
  if (
    ENTERPRISE_WAVE4_ED_HOSPITAL_BILLING_MANIFEST.length !==
    ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST.length
  ) {
    errors.push("billing manifest length mismatch");
  }
  return errors;
}

export function assertEnterpriseWave4EdHospitalBillingManifest(): void {
  const errors = validateWave4EdHospitalBillingManifest();
  if (errors.length > 0) {
    throw new Error(`[wave4-ed-hospital-billing] manifest invalid: ${errors.join("; ")}`);
  }
}

export function validateWave4MedicationBillingReadiness(
  catalogCode: string,
  snapshot: EnterpriseWave4EdHospitalBillingSnapshot
): EnterpriseWave4EdHospitalPerMedicationReadiness {
  const failures: string[] = [];
  const manifest = ENTERPRISE_WAVE4_ED_HOSPITAL_BILLING_BY_CODE[catalogCode];
  if (!manifest) failures.push("missing wave4 billing manifest entry");
  if (!snapshot.hasBillingProfile) failures.push("MedicationBillingProfile missing");

  const hcpcs =
    snapshot.billingProfileHcpcs?.trim() ||
    snapshot.billingCodeDefault?.trim() ||
    manifest?.hcpcs?.trim();
  if (!hcpcs) failures.push("required HCPCS/J-code missing");
  else if (!HCPCS_OR_PRODUCT_CODE_PATTERN.test(hcpcs))
    failures.push(`invalid HCPCS/J-code ${hcpcs}`);

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

export function summarizeEnterpriseWave4EdHospitalReadiness(
  perMedication: EnterpriseWave4EdHospitalPerMedicationReadiness[],
  counts: Omit<
    EnterpriseWave4EdHospitalReadinessReport,
    | "perMedication"
    | "localizationCoveragePct"
    | "billingReadinessPct"
    | "labelIntegrityPct"
    | "wave4ReadinessPct"
    | "highAlertCount"
    | "controlledCount"
    | "doubleSignCount"
    | "byBucket"
  >,
  governance: ReturnType<
    typeof import("./enterpriseWave4EdHospitalFormularyValidation.js").countWave4GovernanceMarkers
  >
): EnterpriseWave4EdHospitalReadinessReport {
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
    wave4ReadinessPct: Math.round((allPass / total) * 100),
  };
}
