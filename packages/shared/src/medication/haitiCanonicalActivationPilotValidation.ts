/**
 * M1.5G — Haiti canonical activation pilot validation (no DB).
 */

import { MEDICATION_BILLING_MAPPING_BY_CODE } from "./medicationBillingMappingManifest.js";
import { MEDICATION_BILLING_NDC_BY_CATALOG_CODE } from "./medicationBillingNdcByCatalogCode.js";
import { resolveMedicationHcpcsForCatalogRow } from "./medicationBillingMappingValidation.js";
import {
  detectPilotActivationDuplicates,
  detectPilotManifestDuplicates,
  detectProviderSearchIdentityDuplicates,
  type PilotDbCatalogSnapshot,
  type PilotDbProductSnapshot,
} from "./haitiCanonicalActivationPilotDuplicate.js";
import {
  HAITI_CANONICAL_ACTIVATION_PILOT_ELIGIBLE,
  HAITI_CANONICAL_ACTIVATION_PILOT_MANIFEST,
  HAITI_CANONICAL_ACTIVATION_PILOT_T1_CAP,
} from "./haitiCanonicalActivationPilotManifest.js";
import type {
  HaitiCanonicalActivationPilotEntry,
  HaitiPilotActivationValidationIssue,
  HaitiPilotReadinessScores,
} from "./haitiCanonicalActivationPilotTypes.js";
import { isQuarantinedCanonicalProduct } from "./haitiCanonicalMedicationQuarantine.js";
import { productCodeLooksQuarantined } from "./haitiCanonicalMedicationMatching.js";

export type PilotChainSnapshot = {
  concept?: { code: string; isActive: boolean } | null;
  product?: PilotDbProductSnapshot | null;
  package?: { code: string; isActive: boolean; ndc11: string | null } | null;
  catalog?: PilotDbCatalogSnapshot | null;
  safetyProfile?: {
    isControlled: boolean;
    isHighAlert: boolean;
    requiresWitness: boolean;
    requiresDoubleSign: boolean;
    lasaGroupId: string | null;
  } | null;
  billingProfileHcpcs?: string | null;
};

export function validatePilotManifestStructure(): HaitiPilotActivationValidationIssue[] {
  const issues = detectPilotManifestDuplicates(HAITI_CANONICAL_ACTIVATION_PILOT_MANIFEST);
  if (HAITI_CANONICAL_ACTIVATION_PILOT_MANIFEST.length > HAITI_CANONICAL_ACTIVATION_PILOT_T1_CAP) {
    issues.push({
      kind: "PILOT_CAP_EXCEEDED",
      message: `T1 pilot manifest ${HAITI_CANONICAL_ACTIVATION_PILOT_MANIFEST.length} exceeds cap ${HAITI_CANONICAL_ACTIVATION_PILOT_T1_CAP}`,
      severity: "blocking",
    });
  }
  return issues;
}

export function validatePilotEntryEligible(
  entry: HaitiCanonicalActivationPilotEntry
): HaitiPilotActivationValidationIssue[] {
  if (!entry.pilotEligible) {
    return [
      {
        kind: "NOT_PILOT_ELIGIBLE",
        catalogMedicationCode: entry.catalogMedicationCode,
        message: entry.pilotRationale,
        severity: "blocking",
      },
    ];
  }
  return [];
}

export function validateCanonicalChainComplete(
  entry: HaitiCanonicalActivationPilotEntry,
  chain: PilotChainSnapshot
): HaitiPilotActivationValidationIssue[] {
  const issues: HaitiPilotActivationValidationIssue[] = [];
  const code = entry.catalogMedicationCode;

  if (!chain.concept) {
    issues.push({ kind: "MISSING_CONCEPT", catalogMedicationCode: code, message: "MedicationConcept missing", severity: "blocking" });
  } else if (chain.concept.code !== entry.proposedConceptCode) {
    issues.push({ kind: "CONCEPT_CODE_MISMATCH", catalogMedicationCode: code, message: "concept code mismatch", severity: "blocking" });
  }

  if (!chain.product) {
    issues.push({ kind: "MISSING_PRODUCT", catalogMedicationCode: code, message: "MedicationProduct missing", severity: "blocking" });
  } else if (!chain.product.legacyCatalogMedicationId) {
    issues.push({ kind: "MISSING_LEGACY_LINK", catalogMedicationCode: code, message: "legacyCatalogMedicationId not set (run M1.5E)", severity: "blocking" });
  }

  if (!chain.package) {
    issues.push({ kind: "MISSING_PACKAGE", catalogMedicationCode: code, message: "MedicationPackage missing", severity: "blocking" });
  } else if (chain.package.code !== entry.proposedPackageCode) {
    issues.push({ kind: "PACKAGE_CODE_MISMATCH", catalogMedicationCode: code, message: "package code mismatch", severity: "blocking" });
  }

  if (!chain.catalog) {
    issues.push({ kind: "MISSING_CATALOG", catalogMedicationCode: code, message: "CatalogMedication missing", severity: "blocking" });
  } else if (chain.catalog.catalogCode !== entry.catalogMedicationCode) {
    issues.push({ kind: "CATALOG_CODE_MISMATCH", catalogMedicationCode: code, message: "catalog code mismatch", severity: "blocking" });
  } else if (chain.product?.legacyCatalogMedicationId !== chain.catalog.catalogId) {
    issues.push({ kind: "LEGACY_LINK_MISMATCH", catalogMedicationCode: code, message: "legacy FK does not match catalog row", severity: "blocking" });
  }

  if (productCodeLooksQuarantined(entry.proposedProductCode)) {
    issues.push({ kind: "QUARANTINE_PRODUCT_CODE", catalogMedicationCode: code, message: "import artifact product code", severity: "blocking" });
  }

  if (
    chain.product &&
    isQuarantinedCanonicalProduct({
      productCode: chain.product.productCode,
      conceptGenericName: chain.product.conceptGenericName,
      baselineAvailable: chain.product.baselineAvailable,
    }) === "QUARANTINE"
  ) {
    issues.push({ kind: "QUARANTINE_TARGET", catalogMedicationCode: code, message: "quarantine deny-list", severity: "blocking" });
  }

  return issues;
}

export function validatePilotBillingPreservation(
  entry: HaitiCanonicalActivationPilotEntry,
  chain: PilotChainSnapshot
): { issues: HaitiPilotActivationValidationIssue[]; score: number } {
  const issues: HaitiPilotActivationValidationIssue[] = [];
  const catalog = chain.catalog;
  if (!catalog) return { issues, score: 0 };

  const manifestHcpcs = MEDICATION_BILLING_MAPPING_BY_CODE[entry.catalogMedicationCode]?.hcpcs;
  const resolvedHcpcs = resolveMedicationHcpcsForCatalogRow(
    {
      code: entry.catalogMedicationCode,
      billingCodeDefault: catalog.billingCodeDefault,
      dosageForm: null,
      route: null,
      administrationType: null,
    },
    MEDICATION_BILLING_MAPPING_BY_CODE
  );
  const expectedHcpcs = catalog.billingCodeDefault?.trim() || manifestHcpcs || resolvedHcpcs;

  if (catalog.billingCodeDefault?.trim() && manifestHcpcs && catalog.billingCodeDefault.trim() !== manifestHcpcs) {
    issues.push({
      kind: "BILLING_HCPCS_CONFLICT",
      catalogMedicationCode: entry.catalogMedicationCode,
      message: `catalog billingCodeDefault ${catalog.billingCodeDefault} != manifest ${manifestHcpcs}`,
      severity: "blocking",
    });
  }

  const packageHcpcs = chain.billingProfileHcpcs?.trim();
  if (packageHcpcs && expectedHcpcs && packageHcpcs !== expectedHcpcs) {
    issues.push({
      kind: "PACKAGE_HCPCS_CONFLICT",
      catalogMedicationCode: entry.catalogMedicationCode,
      message: `package HCPCS ${packageHcpcs} != expected ${expectedHcpcs}`,
      severity: "blocking",
    });
  }

  const ndcManifest = MEDICATION_BILLING_NDC_BY_CATALOG_CODE[entry.catalogMedicationCode];
  if (catalog.ndc11?.trim() && ndcManifest?.ndc11 && catalog.ndc11 !== ndcManifest.ndc11) {
    issues.push({
      kind: "NDC_CONFLICT",
      catalogMedicationCode: entry.catalogMedicationCode,
      message: "catalog ndc11 conflicts with M1.4B manifest",
      severity: "blocking",
    });
  }

  if (!expectedHcpcs && !catalog.ndc11?.trim() && !ndcManifest) {
    issues.push({
      kind: "BILLING_MANIFEST_GAP",
      catalogMedicationCode: entry.catalogMedicationCode,
      message: "no HCPCS/NDC manifest entry (M1.4B may not be applied locally)",
      severity: "warning",
    });
  }

  const blocking = issues.filter((i) => i.severity === "blocking").length;
  const score =
    blocking === 0 ? (expectedHcpcs && (packageHcpcs || catalog.billingCodeDefault) ? 100 : 75) : 0;
  return { issues, score };
}

export function validatePilotGovernancePreservation(
  entry: HaitiCanonicalActivationPilotEntry,
  chain: PilotChainSnapshot
): { issues: HaitiPilotActivationValidationIssue[]; score: number } {
  const issues: HaitiPilotActivationValidationIssue[] = [];
  const catalog = chain.catalog;
  const safety = chain.safetyProfile;

  if (!catalog) return { issues, score: 0 };

  if (catalog.genericName && entry.genericName && catalog.genericName.toLowerCase() !== entry.genericName.toLowerCase()) {
    issues.push({
      kind: "GENERIC_NAME_DRIFT",
      catalogMedicationCode: entry.catalogMedicationCode,
      message: "catalog genericName drift vs manifest",
      severity: "warning",
    });
  }

  if (safety) {
    if (entry.safetyFlags.controlled && !safety.isControlled && catalog.billingCodeDefault) {
      issues.push({
        kind: "CONTROLLED_FLAG_DRIFT",
        catalogMedicationCode: entry.catalogMedicationCode,
        message: "manifest controlled but safety profile not controlled",
        severity: "warning",
      });
    }
    if (entry.safetyFlags.highAlert && !safety.isHighAlert) {
      issues.push({
        kind: "HIGH_ALERT_FLAG_DRIFT",
        catalogMedicationCode: entry.catalogMedicationCode,
        message: "manifest high-alert but safety profile not set",
        severity: "warning",
      });
    }
  } else {
    issues.push({
      kind: "MISSING_SAFETY_PROFILE",
      catalogMedicationCode: entry.catalogMedicationCode,
      message: "MedicationSafetyProfile missing on concept",
      severity: "warning",
    });
  }

  const blocking = issues.filter((i) => i.severity === "blocking").length;
  const score = blocking === 0 ? (safety ? 85 : 65) : 0;
  return { issues, score };
}

export function validateProviderSearchNonRegression(input: {
  catalogIdsBefore: string[];
  catalogIdsAfter: string[];
}): { issues: HaitiPilotActivationValidationIssue[]; inflation: number } {
  const before = new Set(input.catalogIdsBefore);
  const after = new Set(input.catalogIdsAfter);
  const added = [...after].filter((id) => !before.has(id));
  const issues: HaitiPilotActivationValidationIssue[] = [];

  if (added.length > 0) {
    issues.push({
      kind: "SEARCH_INFLATION",
      message: `${added.length} new catalog id(s) visible in provider search after activation`,
      severity: "blocking",
    });
  }

  const removed = [...before].filter((id) => !after.has(id));
  if (removed.length > 0) {
    issues.push({
      kind: "SEARCH_REGRESSION",
      message: `${removed.length} catalog id(s) removed from provider search after activation`,
      severity: "blocking",
    });
  }

  return { issues, inflation: added.length };
}

export function validatePilotActivationCandidate(
  entry: HaitiCanonicalActivationPilotEntry,
  chain: PilotChainSnapshot,
  allPilotProducts: PilotDbProductSnapshot[]
): HaitiPilotActivationValidationIssue[] {
  return [
    ...validatePilotEntryEligible(entry),
    ...validateCanonicalChainComplete(entry, chain),
    ...(chain.product
      ? detectPilotActivationDuplicates(entry, chain.product, allPilotProducts)
      : []),
    ...validatePilotBillingPreservation(entry, chain).issues,
    ...validatePilotGovernancePreservation(entry, chain).issues,
  ];
}

export function computePilotReadinessScores(input?: {
  linkageIntegrityScore?: number;
  billingScore?: number;
  governanceScore?: number;
  searchInflation?: number;
}): HaitiPilotReadinessScores {
  const linkage = input?.linkageIntegrityScore ?? 78;
  const billing = input?.billingScore ?? 70;
  const governance = input?.governanceScore ?? 65;
  const inflation = input?.searchInflation ?? 0;

  const searchSafety = inflation === 0 ? 88 : Math.max(0, 40 - inflation * 10);
  const activationSafety = Math.min(100, Math.round((linkage + billing + governance) / 3));
  const orderingSafety = Math.round((activationSafety + searchSafety) / 2);

  return {
    activationSafety,
    searchSafety,
    billingSafety: billing,
    governanceSafety: governance,
    orderingSafety,
    enterpriseReadiness: Math.round(
      (activationSafety + searchSafety + billing + governance + orderingSafety) / 5
    ),
  };
}

export function assertPilotManifestReady(): void {
  const issues = validatePilotManifestStructure();
  const blocking = issues.filter((i) => i.severity === "blocking");
  if (blocking.length > 0) {
    throw new Error(`[haiti-pilot] manifest invalid: ${blocking.map((i) => i.message).join("; ")}`);
  }
}

export function getPilotEligibleCatalogCodes(): string[] {
  return HAITI_CANONICAL_ACTIVATION_PILOT_ELIGIBLE.map((e) => e.catalogMedicationCode);
}

export function validatePilotCatalogBatch(
  catalogs: PilotDbCatalogSnapshot[]
): HaitiPilotActivationValidationIssue[] {
  return detectProviderSearchIdentityDuplicates(catalogs);
}
