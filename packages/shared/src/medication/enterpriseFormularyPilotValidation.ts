/**
 * M1.6F — Enterprise formulary pilot activation validation (manifest + chain audit).
 */

import { ENTERPRISE_WAVE1_BILLING_BY_CODE } from "./enterpriseWave1BillingManifest.js";
import { validateWave1MedicationBillingReadiness } from "./enterpriseWave1BillingValidation.js";
import {
  ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_ELIGIBLE,
  ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_MANIFEST,
  ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_STATS,
} from "./enterpriseFormularyPilotTrancheAManifest.js";
import type {
  EnterpriseFormularyPilotDashboard,
  EnterpriseFormularyPilotTrancheEntry,
  EnterprisePilotChainSnapshot,
  EnterprisePilotReadinessScores,
  EnterprisePilotValidationIssue,
} from "./enterpriseFormularyPilotTypes.js";
import { ENTERPRISE_PILOT_TRANCHE_A } from "./enterpriseFormularyPilotTypes.js";

export const ENTERPRISE_M16F_PILOT_ACTIVATED_MARKER = "ENTERPRISE_M16F_TRANCHE_A_PILOT";

export function validateTrancheAManifestStructure(): EnterprisePilotValidationIssue[] {
  const issues: EnterprisePilotValidationIssue[] = [];
  const codes = new Set<string>();
  for (const entry of ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_MANIFEST) {
    if (codes.has(entry.catalogCode)) {
      issues.push({
        kind: "DUPLICATE_CATALOG",
        catalogCode: entry.catalogCode,
        message: "duplicate catalogCode in Tranche A manifest",
        severity: "blocking",
      });
    }
    codes.add(entry.catalogCode);
  }
  if (ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_STATS.trancheTotal < 10) {
    issues.push({
      kind: "TRANCHE_SIZE",
      message: `Tranche A has ${ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_STATS.trancheTotal} rows (< 10 minimum)`,
      severity: "blocking",
    });
  }
  if (ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_STATS.trancheTotal > 15) {
    issues.push({
      kind: "TRANCHE_SIZE",
      message: `Tranche A has ${ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_STATS.trancheTotal} rows (> 15 maximum)`,
      severity: "blocking",
    });
  }
  if (ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_STATS.pilotEligible !== ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_STATS.trancheTotal) {
    issues.push({
      kind: "INELIGIBLE_IN_TRANCHE",
      message: `${ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_STATS.excluded} Tranche A row(s) failed eligibility classification`,
      severity: "blocking",
    });
  }
  return issues;
}

export function validateEnterprisePilotEntryEligible(
  entry: EnterpriseFormularyPilotTrancheEntry
): EnterprisePilotValidationIssue[] {
  if (!entry.pilotEligible) {
    return [
      {
        kind: "NOT_PILOT_ELIGIBLE",
        catalogCode: entry.catalogCode,
        message: entry.pilotRationale,
        severity: "blocking",
      },
    ];
  }
  return [];
}

export function validateEnterprisePilotChain(
  entry: EnterpriseFormularyPilotTrancheEntry,
  chain: EnterprisePilotChainSnapshot
): EnterprisePilotValidationIssue[] {
  const issues: EnterprisePilotValidationIssue[] = [];
  const code = entry.catalogCode;

  if (!chain.product) {
    issues.push({ kind: "MISSING_PRODUCT", catalogCode: code, message: "MedicationProduct missing", severity: "blocking" });
  } else {
    if (chain.product.productCode !== code) {
      issues.push({ kind: "PRODUCT_CODE_MISMATCH", catalogCode: code, message: "product code != catalog code", severity: "blocking" });
    }
    if (!chain.product.legacyCatalogMedicationId) {
      issues.push({ kind: "MISSING_LEGACY_LINK", catalogCode: code, message: "legacyCatalogMedicationId not set", severity: "blocking" });
    }
    const notes = chain.product.governanceNotes ?? "";
    if (!notes.includes("ENTERPRISE_M16B_WAVE1_FORMULARY") && !notes.includes("ENTERPRISE_M16D_WAVE2_FORMULARY")) {
      issues.push({ kind: "MISSING_ENTERPRISE_MARKER", catalogCode: code, message: "enterprise wave marker missing", severity: "blocking" });
    }
    if (chain.product.baselineAvailable) {
      issues.push({ kind: "BASELINE_CONTAMINATION", catalogCode: code, message: "baselineAvailable must be false", severity: "blocking" });
    }
  }

  if (!chain.concept) {
    issues.push({ kind: "MISSING_CONCEPT", catalogCode: code, message: "MedicationConcept missing", severity: "blocking" });
  }
  if (!chain.package) {
    issues.push({ kind: "MISSING_PACKAGE", catalogCode: code, message: "MedicationPackage missing", severity: "blocking" });
  } else if (!chain.package.ndc11?.trim()) {
    issues.push({ kind: "MISSING_NDC", catalogCode: code, message: "package ndc11 missing", severity: "blocking" });
  }

  if (!chain.catalog) {
    issues.push({ kind: "MISSING_CATALOG", catalogCode: code, message: "CatalogMedication missing", severity: "blocking" });
  } else if (chain.product?.legacyCatalogMedicationId !== chain.catalog.catalogId) {
    issues.push({ kind: "LEGACY_LINK_MISMATCH", catalogCode: code, message: "legacy FK != catalog row", severity: "blocking" });
  }

  if (!chain.safetyProfile) {
    issues.push({ kind: "MISSING_SAFETY_PROFILE", catalogCode: code, message: "MedicationSafetyProfile missing", severity: "blocking" });
  } else {
    if (chain.safetyProfile.isControlled) {
      issues.push({ kind: "CONTROLLED_SAFETY", catalogCode: code, message: "controlled safety profile", severity: "blocking" });
    }
    if (chain.safetyProfile.isHighAlert) {
      issues.push({ kind: "HIGH_ALERT_SAFETY", catalogCode: code, message: "high-alert safety profile", severity: "blocking" });
    }
    if (chain.safetyProfile.lasaGroupId?.trim()) {
      issues.push({ kind: "LASA_SAFETY", catalogCode: code, message: "LASA safety profile", severity: "blocking" });
    }
  }

  return issues;
}

export function validateEnterprisePilotBilling(
  entry: EnterpriseFormularyPilotTrancheEntry,
  chain: EnterprisePilotChainSnapshot
): { issues: EnterprisePilotValidationIssue[]; billingPass: boolean } {
  const issues: EnterprisePilotValidationIssue[] = [];
  const billing = ENTERPRISE_WAVE1_BILLING_BY_CODE[entry.catalogCode];
  if (!billing) {
    issues.push({ kind: "MISSING_BILLING_MANIFEST", catalogCode: entry.catalogCode, message: "Wave 1 billing manifest entry missing", severity: "blocking" });
    return { issues, billingPass: false };
  }

  if (!chain.billingProfileHcpcs?.trim()) {
    issues.push({ kind: "MISSING_BILLING_PROFILE", catalogCode: entry.catalogCode, message: "MedicationBillingProfile HCPCS missing", severity: "blocking" });
  }

  const readiness = validateWave1MedicationBillingReadiness(entry.catalogCode, {
    catalogCode: entry.catalogCode,
    billingCodeDefault: chain.catalog?.billingCodeDefault ?? billing.hcpcs,
    ndc11: billing.ndc11,
    packageNdc11: chain.package?.ndc11 ?? billing.ndc11,
    billingProfileHcpcs: chain.billingProfileHcpcs ?? billing.hcpcs,
    hasBillingProfile: Boolean(chain.billingProfileHcpcs?.trim()),
  });

  if (!readiness.billingPass) {
    issues.push({
      kind: "BILLING_GATE_FAIL",
      catalogCode: entry.catalogCode,
      message: readiness.failures.join("; "),
      severity: "blocking",
    });
  }

  if (chain.billingRequiresManualReview === false) {
    issues.push({
      kind: "MANUAL_REVIEW_CLEARED_UNEXPECTEDLY",
      catalogCode: entry.catalogCode,
      message: "billing profile manual review already cleared pre-pilot",
      severity: "warning",
    });
  }

  return { issues, billingPass: readiness.billingPass && issues.filter((i) => i.severity === "blocking").length === 0 };
}

export function validateEnterprisePilotSearch(
  entry: EnterpriseFormularyPilotTrancheEntry,
  chain: EnterprisePilotChainSnapshot
): EnterprisePilotValidationIssue[] {
  const issues: EnterprisePilotValidationIssue[] = [];
  if ((chain.aliasCount ?? 0) < 1) {
    issues.push({
      kind: "MISSING_ALIAS",
      catalogCode: entry.catalogCode,
      message: "no MedicationAlias on linked catalog",
      severity: "blocking",
    });
  }
  return issues;
}

export function validateEnterprisePilotActivationCandidate(
  entry: EnterpriseFormularyPilotTrancheEntry,
  chain: EnterprisePilotChainSnapshot
): EnterprisePilotValidationIssue[] {
  return [
    ...validateEnterprisePilotEntryEligible(entry),
    ...validateEnterprisePilotChain(entry, chain),
    ...validateEnterprisePilotBilling(entry, chain).issues,
    ...validateEnterprisePilotSearch(entry, chain),
  ];
}

export function productHasEnterprisePilotActivatedMarker(governanceNotes: string | null): boolean {
  return (governanceNotes ?? "").includes(ENTERPRISE_M16F_PILOT_ACTIVATED_MARKER);
}

export function computeEnterpriseFormularyPilotDashboard(input: {
  trancheEntries: EnterpriseFormularyPilotTrancheEntry[];
  chainByCatalogCode: Record<string, EnterprisePilotChainSnapshot>;
}): EnterpriseFormularyPilotDashboard {
  let activatedCount = 0;
  let pendingReviewCount = 0;
  let blockedCount = 0;
  let alreadyActivatedCount = 0;
  let eligiblePassingValidation = 0;

  for (const entry of input.trancheEntries) {
    if (!entry.pilotEligible) {
      blockedCount += 1;
      continue;
    }
    const chain = input.chainByCatalogCode[entry.catalogCode];
    const issues = chain
      ? validateEnterprisePilotActivationCandidate(entry, chain).filter((i) => i.severity === "blocking")
      : [{ kind: "NO_CHAIN", message: "no chain snapshot", severity: "blocking" as const }];

    if (issues.length > 0) {
      blockedCount += 1;
      continue;
    }

    eligiblePassingValidation += 1;
    const product = chain!.product!;
    if (productHasEnterprisePilotActivatedMarker(product.governanceNotes) && product.isActive) {
      activatedCount += 1;
      alreadyActivatedCount += 1;
    } else if (product.governanceStatus === "REVIEW_REQUIRED" && !product.isActive) {
      pendingReviewCount += 1;
    }
  }

  const pilotEligible = input.trancheEntries.filter((e) => e.pilotEligible).length;
  const activationReadinessPct =
    pilotEligible === 0 ? 0 : Math.round((eligiblePassingValidation / pilotEligible) * 100);
  const rollbackReadinessPct =
    activatedCount === 0 ? 100 : Math.min(100, Math.round((activatedCount / pilotEligible) * 100));

  return {
    tranche: ENTERPRISE_PILOT_TRANCHE_A,
    trancheTotal: input.trancheEntries.length,
    pilotEligible,
    activatedCount,
    pendingReviewCount,
    blockedCount,
    alreadyActivatedCount,
    activationReadinessPct,
    rollbackReadinessPct,
  };
}

export function computeEnterprisePilotReadinessScores(
  dashboard: EnterpriseFormularyPilotDashboard,
  chainResults: { billingPass: number; searchPass: number; total: number }
): EnterprisePilotReadinessScores {
  const total = chainResults.total || 1;
  const billingReadiness = Math.round((chainResults.billingPass / total) * 100);
  const searchReadiness = Math.round((chainResults.searchPass / total) * 100);
  const canonicalIntegrity = dashboard.activationReadinessPct;
  const governanceReadiness =
    dashboard.blockedCount === 0 ? 100 : Math.max(0, 100 - dashboard.blockedCount * 5);
  const activationReadiness = dashboard.activationReadinessPct;
  const rollbackReadiness = dashboard.rollbackReadinessPct;

  return {
    canonicalIntegrity,
    billingReadiness,
    governanceReadiness,
    searchReadiness,
    activationReadiness,
    rollbackReadiness,
  };
}

export function assertEnterpriseFormularyPilotTrancheAReady(): void {
  const issues = validateTrancheAManifestStructure();
  const blocking = issues.filter((i) => i.severity === "blocking");
  if (blocking.length > 0) {
    throw new Error(`[enterprise-pilot] Tranche A invalid: ${blocking.map((i) => i.message).join("; ")}`);
  }
}

export function getEnterpriseFormularyPilotTrancheAEligibleCodes(): string[] {
  return ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_ELIGIBLE.map((e) => e.catalogCode);
}
