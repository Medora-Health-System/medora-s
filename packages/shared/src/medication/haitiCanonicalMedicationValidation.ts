/**
 * M1.5D — Haiti canonical linkage manifest validation (no DB).
 */

import { isBillableCatalogMedicationRow } from "./medicationBillingMappingManifest.js";
import { HAITI_MEDICATION_FORMULARY_EXPECTED_COUNT } from "./haitiMedicationFormularyCatalog.js";
import {
  buildHaitiCanonicalLinkageManifest,
  hasGovernanceManifestCodeDrift,
  hasSharedAliasCollision,
} from "./haitiCanonicalMedicationLinkageBuild.js";
import {
  isBaselineCatalogCode,
  productCodeLooksQuarantined,
  rejectAutoLinkForHighRiskFlags,
} from "./haitiCanonicalMedicationMatching.js";
import {
  classifyQuarantine,
  getQuarantineReason,
  isQuarantinedCanonicalProduct,
} from "./haitiCanonicalMedicationQuarantine.js";
import {
  haitiCanonicalLinkageManifestSchema,
  parseHaitiCanonicalLinkageManifest,
  type HaitiCanonicalMedicationLinkageEntry,
  type HaitiMedicationFormularyRow,
} from "./haitiCanonicalMedicationLinkageTypes.js";

export type HaitiLinkageValidationIssue = {
  kind: string;
  catalogMedicationCode?: string;
  message: string;
};

export type HaitiLinkageValidationResult = {
  pass: boolean;
  issues: HaitiLinkageValidationIssue[];
  stats: {
    total: number;
    linkReady: number;
    manualReview: number;
    doNotLink: number;
    missingTarget: number;
    reviewerRequired: number;
  };
};

export type CanonicalTargetInspect = {
  productCode: string;
  conceptGenericName: string;
  legacyCatalogMedicationId?: string | null;
  baselineAvailable?: boolean;
  productIsActive?: boolean;
  conceptIsActive?: boolean;
  governanceStatus?: string | null;
};

function statsFromManifest(entries: HaitiCanonicalMedicationLinkageEntry[]) {
  return {
    total: entries.length,
    linkReady: entries.filter((e) => e.linkageStatus === "LINK_READY").length,
    manualReview: entries.filter((e) => e.linkageStatus === "MANUAL_REVIEW").length,
    doNotLink: entries.filter((e) => e.linkageStatus === "DO_NOT_LINK").length,
    missingTarget: entries.filter((e) => e.linkageStatus === "MISSING_CANONICAL_TARGET").length,
    reviewerRequired: entries.filter((e) => e.reviewerRequired).length,
  };
}

export function validateManifestStructure(
  entries: HaitiCanonicalMedicationLinkageEntry[]
): HaitiLinkageValidationIssue[] {
  const issues: HaitiLinkageValidationIssue[] = [];
  try {
    haitiCanonicalLinkageManifestSchema.parse(entries);
  } catch (err) {
    issues.push({
      kind: "MANIFEST_SCHEMA",
      message: err instanceof Error ? err.message : "manifest schema invalid",
    });
  }
  return issues;
}

export function validateDuplicateCatalogCodes(
  entries: HaitiCanonicalMedicationLinkageEntry[]
): HaitiLinkageValidationIssue[] {
  const issues: HaitiLinkageValidationIssue[] = [];
  const seen = new Map<string, number>();
  for (const e of entries) {
    const code = e.catalogMedicationCode.trim().toUpperCase();
    seen.set(code, (seen.get(code) ?? 0) + 1);
  }
  for (const [code, count] of seen) {
    if (count > 1) {
      issues.push({
        kind: "DUPLICATE_CATALOG_CODE",
        catalogMedicationCode: code,
        message: `duplicate catalogMedicationCode (${count})`,
      });
    }
  }
  return issues;
}

export function validateDuplicateCanonicalTargets(
  entries: HaitiCanonicalMedicationLinkageEntry[]
): HaitiLinkageValidationIssue[] {
  const issues: HaitiLinkageValidationIssue[] = [];
  const productCodes = new Map<string, string>();
  const packageCodes = new Map<string, string>();

  for (const e of entries) {
    const catalog = e.catalogMedicationCode;
    for (const [map, field, kind] of [
      [productCodes, e.proposedProductCode, "DUPLICATE_PRODUCT_CODE"],
      [packageCodes, e.proposedPackageCode, "DUPLICATE_PACKAGE_CODE"],
    ] as const) {
      const prev = map.get(field);
      if (prev && prev !== catalog) {
        issues.push({
          kind,
          catalogMedicationCode: catalog,
          message: `${field} already used by ${prev}`,
        });
      } else {
        map.set(field, catalog);
      }
    }
  }
  return issues;
}

export function validateCatalogCoverage(
  entries: HaitiCanonicalMedicationLinkageEntry[],
  formularyRows: HaitiMedicationFormularyRow[]
): HaitiLinkageValidationIssue[] {
  const issues: HaitiLinkageValidationIssue[] = [];
  const formularyCodes = new Set(formularyRows.map((r) => r.code.trim().toUpperCase()));
  const manifestCodes = new Set(entries.map((e) => e.catalogMedicationCode.trim().toUpperCase()));

  for (const code of formularyCodes) {
    if (!manifestCodes.has(code)) {
      issues.push({
        kind: "MISSING_MANIFEST_ENTRY",
        catalogMedicationCode: code,
        message: "formulary code missing from manifest",
      });
    }
  }
  for (const e of entries) {
    const code = e.catalogMedicationCode.trim().toUpperCase();
    if (!formularyCodes.has(code)) {
      issues.push({
        kind: "ORPHAN_MANIFEST_CODE",
        catalogMedicationCode: code,
        message: "manifest code not in Haiti formulary source",
      });
    }
    if (isBaselineCatalogCode(code)) {
      issues.push({
        kind: "BASELINE_CATALOG_LEAK",
        catalogMedicationCode: code,
        message: "19G baseline catalog code must not appear in Haiti manifest",
      });
    }
  }
  if (entries.length !== HAITI_MEDICATION_FORMULARY_EXPECTED_COUNT) {
    issues.push({
      kind: "MANIFEST_COUNT",
      message: `expected ${HAITI_MEDICATION_FORMULARY_EXPECTED_COUNT} entries, got ${entries.length}`,
    });
  }
  return issues;
}

export function validateQuarantineTargets(
  entries: HaitiCanonicalMedicationLinkageEntry[],
  existingTargets?: CanonicalTargetInspect[]
): HaitiLinkageValidationIssue[] {
  const issues: HaitiLinkageValidationIssue[] = [];

  for (const e of entries) {
    if (productCodeLooksQuarantined(e.proposedProductCode)) {
      issues.push({
        kind: "QUARANTINE_TARGET_PREFIX",
        catalogMedicationCode: e.catalogMedicationCode,
        message: "proposed product code uses import artifact prefix",
      });
    }
  }

  for (const target of existingTargets ?? []) {
    const classId = classifyQuarantine({
      conceptGenericName: target.conceptGenericName,
      productCode: target.productCode,
      baselineAvailable: target.baselineAvailable,
      productIsActive: target.productIsActive,
      conceptIsActive: target.conceptIsActive,
      governanceStatus: target.governanceStatus,
    });
    if (classId) {
      const decision = isQuarantinedCanonicalProduct({
        conceptGenericName: target.conceptGenericName,
        productCode: target.productCode,
        baselineAvailable: target.baselineAvailable,
        productIsActive: target.productIsActive,
        conceptIsActive: target.conceptIsActive,
        governanceStatus: target.governanceStatus,
      });
      if (decision === "QUARANTINE") {
        issues.push({
          kind: "QUARANTINE_TARGET",
          message: `${target.productCode}: ${getQuarantineReason(classId)}`,
        });
      }
    }
  }

  return issues;
}

export function validateControlledReviewRequirements(
  entries: HaitiCanonicalMedicationLinkageEntry[]
): HaitiLinkageValidationIssue[] {
  const issues: HaitiLinkageValidationIssue[] = [];
  for (const e of entries) {
    if (
      (e.safetyFlags.controlled || e.safetyFlags.opioid) &&
      !e.reviewerRequired &&
      e.linkageStatus !== "DO_NOT_LINK"
    ) {
      issues.push({
        kind: "CONTROLLED_AUTO_LINK",
        catalogMedicationCode: e.catalogMedicationCode,
        message: "controlled/opioid requires reviewerRequired",
      });
    }
    if (e.linkageStatus === "LINK_READY" && rejectAutoLinkForHighRiskFlags(e.safetyFlags)) {
      issues.push({
        kind: "HIGH_RISK_LINK_READY",
        catalogMedicationCode: e.catalogMedicationCode,
        message: "LINK_READY not allowed for controlled/high-alert/LASA/opioid",
      });
    }
  }
  return issues;
}

export function validateHighAlertReviewRequirements(
  entries: HaitiCanonicalMedicationLinkageEntry[]
): HaitiLinkageValidationIssue[] {
  const issues: HaitiLinkageValidationIssue[] = [];
  for (const e of entries) {
    if ((e.safetyFlags.highAlert || e.safetyFlags.lasa) && !e.reviewerRequired && e.linkageStatus !== "DO_NOT_LINK") {
      issues.push({
        kind: "HIGH_ALERT_AUTO_LINK",
        catalogMedicationCode: e.catalogMedicationCode,
        message: "high-alert/LASA requires reviewerRequired",
      });
    }
    if (e.safetyFlags.insulin && !e.reviewerRequired) {
      issues.push({
        kind: "INSULIN_REVIEW",
        catalogMedicationCode: e.catalogMedicationCode,
        message: "insulin SKU should have reviewerRequired",
      });
    }
  }
  return issues;
}

export function validateBillingRequirements(
  entries: HaitiCanonicalMedicationLinkageEntry[],
  formularyByCode: Record<string, HaitiMedicationFormularyRow>
): HaitiLinkageValidationIssue[] {
  const issues: HaitiLinkageValidationIssue[] = [];
  for (const e of entries) {
    const row = formularyByCode[e.catalogMedicationCode];
    if (!row) continue;
    const billable = isBillableCatalogMedicationRow(row);
    if (billable && !e.billingFlags.hasHcpcs && e.linkageStatus === "LINK_READY") {
      issues.push({
        kind: "BILLING_UNMAPPED_BILLABLE",
        catalogMedicationCode: e.catalogMedicationCode,
        message: "billable row marked LINK_READY without HCPCS manifest",
      });
    }
    if (billable && !e.billingFlags.billingReady && !e.reviewerRequired) {
      issues.push({
        kind: "BILLING_NOT_READY",
        catalogMedicationCode: e.catalogMedicationCode,
        message: "billable injectable without billingReady should require review",
      });
    }
    if (e.billingFlags.hasNdc && !e.billingFlags.hasHcpcs && billable) {
      issues.push({
        kind: "NDC_WITHOUT_HCPCS",
        catalogMedicationCode: e.catalogMedicationCode,
        message: "NDC manifest without HCPCS — verify billing path",
      });
    }
  }
  return issues;
}

export function validateSearchRequirements(
  entries: HaitiCanonicalMedicationLinkageEntry[]
): HaitiLinkageValidationIssue[] {
  const issues: HaitiLinkageValidationIssue[] = [];
  const displayKeys = new Map<string, string>();

  for (const e of entries) {
    if (!e.displayName?.trim() || !e.genericName?.trim()) {
      issues.push({
        kind: "INCOMPLETE_DISPLAY",
        catalogMedicationCode: e.catalogMedicationCode,
        message: "displayName and genericName required for search stability",
      });
    }
    const key = `${e.genericName.trim().toLowerCase()}|${e.strength.trim().toLowerCase()}|${e.route.trim().toLowerCase()}|${e.form.trim().toLowerCase()}`;
    const prev = displayKeys.get(key);
    if (prev && prev !== e.catalogMedicationCode) {
      issues.push({
        kind: "DUPLICATE_SEARCH_DIMENSIONS",
        catalogMedicationCode: e.catalogMedicationCode,
        message: `same search dimensions as ${prev}`,
      });
    } else {
      displayKeys.set(key, e.catalogMedicationCode);
    }
    if (hasGovernanceManifestCodeDrift(e.catalogMedicationCode) && e.linkageStatus === "LINK_READY") {
      issues.push({
        kind: "GOVERNANCE_CODE_DRIFT",
        catalogMedicationCode: e.catalogMedicationCode,
        message: "governance manifest code drift — cannot be LINK_READY",
      });
    }
  }
  return issues;
}

export function validateAliasRequirements(
  formularyRows: HaitiMedicationFormularyRow[]
): HaitiLinkageValidationIssue[] {
  const issues: HaitiLinkageValidationIssue[] = [];
  for (const row of formularyRows) {
    if (hasSharedAliasCollision(row)) {
      issues.push({
        kind: "ALIAS_COLLISION",
        catalogMedicationCode: row.code,
        message: "row uses shared clinical alias collision shortcut",
      });
    }
  }
  return issues;
}

export function validateManifest(
  entries: HaitiCanonicalMedicationLinkageEntry[],
  options?: {
    formularyRows?: HaitiMedicationFormularyRow[];
    existingTargets?: CanonicalTargetInspect[];
  }
): HaitiLinkageValidationResult {
  const formularyRows = options?.formularyRows ?? [];
  const formularyByCode = Object.fromEntries(formularyRows.map((r) => [r.code, r]));

  const issues: HaitiLinkageValidationIssue[] = [
    ...validateManifestStructure(entries),
    ...validateDuplicateCatalogCodes(entries),
    ...validateDuplicateCanonicalTargets(entries),
    ...(formularyRows.length > 0 ? validateCatalogCoverage(entries, formularyRows) : []),
    ...validateQuarantineTargets(entries, options?.existingTargets),
    ...validateControlledReviewRequirements(entries),
    ...validateHighAlertReviewRequirements(entries),
    ...validateBillingRequirements(entries, formularyByCode),
    ...validateSearchRequirements(entries),
    ...(formularyRows.length > 0 ? validateAliasRequirements(formularyRows) : []),
  ];

  return {
    pass: issues.length === 0,
    issues,
    stats: statsFromManifest(entries),
  };
}

export function assertHaitiCanonicalLinkageManifest(
  entries: HaitiCanonicalMedicationLinkageEntry[],
  formularyRows?: HaitiMedicationFormularyRow[]
): void {
  const result = validateManifest(entries, { formularyRows });
  const blocking = result.issues.filter(
    (i) => i.kind !== "ALIAS_COLLISION" && i.kind !== "GOVERNANCE_CODE_DRIFT"
  );
  if (blocking.length > 0) {
    throw new Error(
      `[haiti-canonical-linkage] manifest invalid: ${blocking.map((i) => i.message).join("; ")}`
    );
  }
}

/** Validate built manifest matches formulary source (strict). */
export function validateBuiltManifestAgainstFormulary(
  formularyRows: HaitiMedicationFormularyRow[]
): HaitiLinkageValidationResult {
  const built = buildHaitiCanonicalLinkageManifest(formularyRows);
  return validateManifest(built, { formularyRows });
}

export function parseAndValidateHaitiLinkageManifest(
  value: unknown,
  formularyRows?: HaitiMedicationFormularyRow[]
): HaitiLinkageValidationResult {
  const entries = parseHaitiCanonicalLinkageManifest(value);
  return validateManifest(entries, { formularyRows });
}
