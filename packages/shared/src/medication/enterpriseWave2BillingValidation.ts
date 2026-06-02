/**
 * M1.6D — Enterprise Wave 2 billing + activation readiness validation.
 */

import {
  ENTERPRISE_WAVE2_BILLING_BY_CODE,
  ENTERPRISE_WAVE2_BILLING_MANIFEST,
} from "./enterpriseWave2BillingManifest.js";
import {
  ENTERPRISE_WAVE2_FORMULARY_BY_CODE,
  ENTERPRISE_WAVE2_FORMULARY_MANIFEST,
} from "./enterpriseWave2FormularyManifest.js";
import type {
  EnterpriseWave2PerMedicationReadiness,
  EnterpriseWave2ReadinessReport,
} from "./enterpriseWave2Types.js";

const J_CODE_PATTERN = /^J\d{4}$/;
const HCPCS_OR_PRODUCT_CODE_PATTERN = /^(J\d{4}|[A-Z]\d{4,5}|\d{5})$/;
const NDC11_PATTERN = /^\d{11}$/;
const CPT_PATTERN = /^\d{5}$/;

export type EnterpriseWave2BillingSnapshot = {
  catalogCode: string;
  billingCodeDefault?: string | null;
  ndc11?: string | null;
  packageNdc11?: string | null;
  billingProfileHcpcs?: string | null;
  hasBillingProfile: boolean;
  isActive?: boolean;
  governanceStatus?: string | null;
};

export function validateWave2BillingManifest(): string[] {
  const errors: string[] = [];
  for (const entry of ENTERPRISE_WAVE2_BILLING_MANIFEST) {
    if (!HCPCS_OR_PRODUCT_CODE_PATTERN.test(entry.hcpcs.trim())) {
      errors.push(`${entry.catalogCode}: invalid hcpcs ${entry.hcpcs}`);
    }
    if (!NDC11_PATTERN.test(entry.ndc11.trim())) {
      errors.push(`${entry.catalogCode}: invalid ndc11 ${entry.ndc11}`);
    }
    if (!ENTERPRISE_WAVE2_FORMULARY_BY_CODE[entry.catalogCode]) {
      errors.push(`${entry.catalogCode}: missing formulary row`);
    }
    const formulary = ENTERPRISE_WAVE2_FORMULARY_BY_CODE[entry.catalogCode];
    if (formulary?.bucket === "VACCINE") {
      if (!entry.administrationCpt?.trim()) {
        errors.push(`${entry.catalogCode}: vaccine missing administrationCpt`);
      } else if (!CPT_PATTERN.test(entry.administrationCpt.trim())) {
        errors.push(`${entry.catalogCode}: invalid administrationCpt`);
      }
      if (!entry.cvxCode?.trim()) {
        errors.push(`${entry.catalogCode}: vaccine missing cvxCode`);
      }
    }
  }
  if (ENTERPRISE_WAVE2_BILLING_MANIFEST.length !== ENTERPRISE_WAVE2_FORMULARY_MANIFEST.length) {
    errors.push("billing manifest length mismatch");
  }
  return errors;
}

export function assertEnterpriseWave2BillingManifest(): void {
  const errors = validateWave2BillingManifest();
  if (errors.length > 0) {
    throw new Error(`[wave2-billing] manifest invalid: ${errors.join("; ")}`);
  }
}

export function validateWave2MedicationBillingReadiness(
  catalogCode: string,
  snapshot: EnterpriseWave2BillingSnapshot
): EnterpriseWave2PerMedicationReadiness {
  const failures: string[] = [];
  const manifest = ENTERPRISE_WAVE2_BILLING_BY_CODE[catalogCode];
  const formulary = ENTERPRISE_WAVE2_FORMULARY_BY_CODE[catalogCode];
  if (!manifest) failures.push("missing wave2 billing manifest entry");
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

  if (formulary?.bucket === "VACCINE" && !manifest?.administrationCpt?.trim()) {
    failures.push("vaccine administration CPT missing in manifest");
  }

  const billingPass = failures.length === 0;
  const activationPass =
    snapshot.isActive === undefined
      ? true
      : snapshot.isActive === false &&
        (snapshot.governanceStatus ?? "REVIEW_REQUIRED") === "REVIEW_REQUIRED";

  return {
    catalogCode,
    pass: billingPass && activationPass,
    billingPass,
    governancePass: true,
    searchPass: true,
    activationPass,
    failures,
  };
}

export function evaluateEnterpriseWave2BillingActivationGate(
  snapshot: EnterpriseWave2BillingSnapshot
): { allowed: boolean; failures: string[] } {
  const result = validateWave2MedicationBillingReadiness(snapshot.catalogCode, snapshot);
  return { allowed: result.billingPass, failures: result.failures };
}

export function summarizeEnterpriseWave2Readiness(
  perMedication: EnterpriseWave2PerMedicationReadiness[],
  counts: Omit<
    EnterpriseWave2ReadinessReport,
    | "perMedication"
    | "canonicalCoveragePct"
    | "ndcCoveragePct"
    | "hcpcsCoveragePct"
    | "jCodeCoveragePct"
    | "searchCoveragePct"
    | "governanceCoveragePct"
    | "billingReadinessPct"
    | "activationReadinessPct"
    | "wave2ReadinessPct"
  >
): EnterpriseWave2ReadinessReport {
  const total = perMedication.length || 1;
  const billingPass = perMedication.filter((p) => p.billingPass).length;
  const searchPass = perMedication.filter((p) => p.searchPass).length;
  const govPass = perMedication.filter((p) => p.governancePass).length;
  const activationPass = perMedication.filter((p) => p.activationPass).length;
  const allPass = perMedication.filter((p) => p.pass).length;

  const jCodePass = perMedication.filter((p) => {
    const m = ENTERPRISE_WAVE2_BILLING_BY_CODE[p.catalogCode];
    return m?.hcpcs && J_CODE_PATTERN.test(m.hcpcs);
  }).length;

  const ndcPass = perMedication.filter((p) => !p.failures.some((f) => f.includes("NDC"))).length;
  const hcpcsPass = perMedication.filter((p) => !p.failures.some((f) => f.includes("HCPCS"))).length;

  return {
    ...counts,
    perMedication,
    canonicalCoveragePct: Math.round((allPass / total) * 100),
    ndcCoveragePct: Math.round((ndcPass / total) * 100),
    hcpcsCoveragePct: Math.round((hcpcsPass / total) * 100),
    jCodeCoveragePct: Math.round((jCodePass / total) * 100),
    searchCoveragePct: Math.round((searchPass / total) * 100),
    governanceCoveragePct: Math.round((govPass / total) * 100),
    billingReadinessPct: Math.round((billingPass / total) * 100),
    activationReadinessPct: Math.round((activationPass / total) * 100),
    wave2ReadinessPct: Math.round((allPass / total) * 100),
  };
}
