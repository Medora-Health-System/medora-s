/**
 * M1.6B — Enterprise Wave 1 billing + activation readiness validation.
 */

import {
  ENTERPRISE_WAVE1_BILLING_BY_CODE,
  ENTERPRISE_WAVE1_BILLING_MANIFEST,
} from "./enterpriseWave1BillingManifest.js";
import {
  ENTERPRISE_WAVE1_FORMULARY_BY_CODE,
  ENTERPRISE_WAVE1_FORMULARY_MANIFEST,
} from "./enterpriseWave1FormularyManifest.js";
import type {
  EnterpriseWave1PerMedicationReadiness,
  EnterpriseWave1ReadinessReport,
} from "./enterpriseWave1Types.js";

const J_CODE_PATTERN = /^J\d{4}$/;
/** J-codes, letter-prefixed HCPCS, and 5-digit vaccine product codes (e.g. 90686). */
const HCPCS_OR_PRODUCT_CODE_PATTERN = /^(J\d{4}|[A-Z]\d{4,5}|\d{5})$/;
const NDC11_PATTERN = /^\d{11}$/;
const CPT_PATTERN = /^\d{5}$/;

export type EnterpriseWave1BillingSnapshot = {
  catalogCode: string;
  billingCodeDefault?: string | null;
  ndc11?: string | null;
  packageNdc11?: string | null;
  billingProfileHcpcs?: string | null;
  hasBillingProfile: boolean;
};

export function validateWave1BillingManifest(): string[] {
  const errors: string[] = [];
  for (const entry of ENTERPRISE_WAVE1_BILLING_MANIFEST) {
    if (!HCPCS_OR_PRODUCT_CODE_PATTERN.test(entry.hcpcs.trim())) {
      errors.push(`${entry.catalogCode}: invalid hcpcs ${entry.hcpcs}`);
    }
    if (!NDC11_PATTERN.test(entry.ndc11.trim())) {
      errors.push(`${entry.catalogCode}: invalid ndc11 ${entry.ndc11}`);
    }
    const formulary = ENTERPRISE_WAVE1_FORMULARY_BY_CODE[entry.catalogCode];
    if (!formulary) {
      errors.push(`${entry.catalogCode}: missing formulary row`);
    }
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
  if (ENTERPRISE_WAVE1_BILLING_MANIFEST.length !== ENTERPRISE_WAVE1_FORMULARY_MANIFEST.length) {
    errors.push("billing manifest length mismatch");
  }
  return errors;
}

export function assertEnterpriseWave1BillingManifest(): void {
  const errors = validateWave1BillingManifest();
  if (errors.length > 0) {
    throw new Error(`[wave1-billing] manifest invalid: ${errors.join("; ")}`);
  }
}

export function validateWave1MedicationBillingReadiness(
  catalogCode: string,
  snapshot: EnterpriseWave1BillingSnapshot
): EnterpriseWave1PerMedicationReadiness {
  const failures: string[] = [];
  const manifest = ENTERPRISE_WAVE1_BILLING_BY_CODE[catalogCode];
  if (!manifest) {
    failures.push("missing wave1 billing manifest entry");
  }

  if (!snapshot.hasBillingProfile) {
    failures.push("MedicationBillingProfile missing");
  }

  const hcpcs =
    snapshot.billingProfileHcpcs?.trim() ||
    snapshot.billingCodeDefault?.trim() ||
    manifest?.hcpcs?.trim();
  if (!hcpcs) {
    failures.push("required HCPCS/J-code missing");
  } else if (!HCPCS_OR_PRODUCT_CODE_PATTERN.test(hcpcs)) {
    failures.push(`invalid HCPCS/J-code ${hcpcs}`);
  }

  const ndc = snapshot.packageNdc11?.trim() || snapshot.ndc11?.trim() || manifest?.ndc11?.trim();
  if (!ndc) {
    failures.push("required NDC missing");
  } else if (!NDC11_PATTERN.test(ndc)) {
    failures.push(`invalid NDC ${ndc}`);
  }

  if (manifest && ENTERPRISE_WAVE1_FORMULARY_BY_CODE[catalogCode]?.bucket === "VACCINE") {
    if (!manifest.administrationCpt?.trim()) {
      failures.push("vaccine administration CPT missing in manifest");
    }
  }

  const billingPass = failures.length === 0;
  return {
    catalogCode,
    pass: billingPass,
    billingPass,
    governancePass: true,
    searchPass: true,
    failures,
  };
}

/** Part 5 — activation gate: block if billing incomplete. */
export function evaluateEnterpriseWave1BillingActivationGate(
  snapshot: EnterpriseWave1BillingSnapshot
): { allowed: boolean; failures: string[] } {
  const result = validateWave1MedicationBillingReadiness(snapshot.catalogCode, snapshot);
  return { allowed: result.billingPass, failures: result.failures };
}

export function summarizeEnterpriseWave1Readiness(
  perMedication: EnterpriseWave1PerMedicationReadiness[],
  counts: Omit<
    EnterpriseWave1ReadinessReport,
    | "perMedication"
    | "ndcCoveragePct"
    | "hcpcsCoveragePct"
    | "jCodeCoveragePct"
    | "searchCoveragePct"
    | "governanceCoveragePct"
    | "billingReadinessPct"
    | "wave1ReadinessPct"
  >
): EnterpriseWave1ReadinessReport {
  const total = perMedication.length || 1;
  const billingPass = perMedication.filter((p) => p.billingPass).length;
  const searchPass = perMedication.filter((p) => p.searchPass).length;
  const govPass = perMedication.filter((p) => p.governancePass).length;
  const allPass = perMedication.filter((p) => p.pass).length;

  const jCodePass = perMedication.filter((p) => {
    const m = ENTERPRISE_WAVE1_BILLING_BY_CODE[p.catalogCode];
    return m?.hcpcs && J_CODE_PATTERN.test(m.hcpcs);
  }).length;

  const ndcPass = perMedication.filter((p) => !p.failures.some((f) => f.includes("NDC"))).length;
  const hcpcsPass = perMedication.filter((p) => !p.failures.some((f) => f.includes("HCPCS"))).length;

  return {
    ...counts,
    perMedication,
    ndcCoveragePct: Math.round((ndcPass / total) * 100),
    hcpcsCoveragePct: Math.round((hcpcsPass / total) * 100),
    jCodeCoveragePct: Math.round((jCodePass / total) * 100),
    searchCoveragePct: Math.round((searchPass / total) * 100),
    governanceCoveragePct: Math.round((govPass / total) * 100),
    billingReadinessPct: Math.round((billingPass / total) * 100),
    wave1ReadinessPct: Math.round((allPass / total) * 100),
  };
}
