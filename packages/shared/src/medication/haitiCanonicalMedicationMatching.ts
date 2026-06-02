/**
 * M1.5D — Deterministic Haiti ↔ canonical matching helpers (no DB).
 */

import { deriveMedicationCatalogCode } from "./medicationCatalogCodeDerive.js";
import { MEDICATION_BILLING_MAPPING_BY_CODE } from "./medicationBillingMappingManifest.js";
import { MEDICATION_BILLING_NDC_BY_CATALOG_CODE } from "./medicationBillingNdcByCatalogCode.js";
import {
  isImportArtifactProductCode,
  isQuarantinedCanonicalProduct,
} from "./haitiCanonicalMedicationQuarantine.js";
import type {
  HaitiLinkageMatchRule,
  HaitiLinkageStatus,
  HaitiMedicationFormularyRow,
} from "./haitiCanonicalMedicationLinkageTypes.js";

export type CanonicalProductCandidate = {
  code: string;
  conceptGenericName: string;
  legacyCatalogMedicationId?: string | null;
  baselineAvailable?: boolean;
  productIsActive?: boolean;
  conceptIsActive?: boolean;
  governanceStatus?: string | null;
  packageNdc11?: string | null;
};

export type HaitiMatchInput = {
  formularyRow: HaitiMedicationFormularyRow;
  catalogMedicationCode: string;
  existingProductCandidates?: CanonicalProductCandidate[];
};

export type HaitiMatchResult = {
  linkageStatus: HaitiLinkageStatus;
  confidence: "EXACT" | "HIGH" | "MEDIUM" | "LOW";
  matchRule: HaitiLinkageMatchRule;
  matchedProductCode: string | null;
  rationale: string;
};

function norm(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeFormularyDimensions(row: HaitiMedicationFormularyRow): {
  genericName: string;
  strength: string;
  route: string;
  form: string;
} {
  return {
    genericName: norm(row.genericName),
    strength: norm(row.strength),
    route: norm(row.route),
    form: norm(row.dosageForm),
  };
}

export function dimensionsExactMatch(
  a: ReturnType<typeof normalizeFormularyDimensions>,
  b: ReturnType<typeof normalizeFormularyDimensions>
): boolean {
  return (
    a.genericName === b.genericName &&
    a.strength === b.strength &&
    a.route === b.route &&
    a.form === b.form
  );
}

export function findCandidateByExactCode(
  candidates: CanonicalProductCandidate[],
  catalogCode: string
): CanonicalProductCandidate | undefined {
  const code = catalogCode.trim().toUpperCase();
  return candidates.find((c) => c.code.trim().toUpperCase() === code);
}

export function findCandidatesByDimensions(
  candidates: CanonicalProductCandidate[],
  row: HaitiMedicationFormularyRow
): CanonicalProductCandidate[] {
  const dims = normalizeFormularyDimensions(row);
  return candidates.filter((c) =>
    dimensionsExactMatch(dims, {
      genericName: norm(c.conceptGenericName),
      strength: dims.strength,
      route: dims.route,
      form: dims.form,
    })
  );
}

export function isForbiddenBrandOnlyMatch(_brandQuery: string): boolean {
  return true;
}

export function isQuarantinedMatchTarget(candidate: CanonicalProductCandidate): boolean {
  const decision = isQuarantinedCanonicalProduct({
    conceptGenericName: candidate.conceptGenericName,
    productCode: candidate.code,
    baselineAvailable: candidate.baselineAvailable,
    productIsActive: candidate.productIsActive,
    conceptIsActive: candidate.conceptIsActive,
    governanceStatus: candidate.governanceStatus,
    packageNdc11: candidate.packageNdc11,
  });
  return decision === "QUARANTINE";
}

/** Priority-ordered match — never returns LINK_READY for quarantined targets. */
export function matchHaitiFormularyToCanonical(input: HaitiMatchInput): HaitiMatchResult {
  const { formularyRow, catalogMedicationCode } = input;
  const candidates = input.existingProductCandidates ?? [];

  const byCode = findCandidateByExactCode(candidates, catalogMedicationCode);
  if (byCode) {
    if (isQuarantinedMatchTarget(byCode)) {
      return {
        linkageStatus: "DO_NOT_LINK",
        confidence: "EXACT",
        matchRule: "CODE_EXACT",
        matchedProductCode: byCode.code,
        rationale: "Exact code match points to quarantined canonical product",
      };
    }
    return {
      linkageStatus: "MANUAL_REVIEW",
      confidence: "EXACT",
      matchRule: "CODE_EXACT",
      matchedProductCode: byCode.code,
      rationale: "Existing product code match — verify legacy FK before M1.5E",
    };
  }

  const byDims = findCandidatesByDimensions(candidates, formularyRow);
  const safeDims = byDims.filter((c) => !isQuarantinedMatchTarget(c));
  if (safeDims.length > 1) {
    return {
      linkageStatus: "MANUAL_REVIEW",
      confidence: "MEDIUM",
      matchRule: "DERIVED_CODE",
      matchedProductCode: null,
      rationale: "Multiple non-quarantined canonical candidates for same dimensions",
    };
  }
  if (safeDims.length === 1) {
    return {
      linkageStatus: "MANUAL_REVIEW",
      confidence: "HIGH",
      matchRule: "DERIVED_CODE",
      matchedProductCode: safeDims[0].code,
      rationale: "Single dimension match — confirm not a clone before link",
    };
  }

  const ndcEntry = MEDICATION_BILLING_NDC_BY_CATALOG_CODE[catalogMedicationCode];
  if (ndcEntry?.ndc11) {
    const ndcMatches = candidates.filter((c) => c.packageNdc11 === ndcEntry.ndc11);
    if (ndcMatches.length === 1 && !isQuarantinedMatchTarget(ndcMatches[0])) {
      return {
        linkageStatus: "MANUAL_REVIEW",
        confidence: "HIGH",
        matchRule: "MANIFEST_HCPCS",
        matchedProductCode: ndcMatches[0].code,
        rationale: "NDC manifest match to single canonical package",
      };
    }
    if (ndcMatches.length > 1) {
      return {
        linkageStatus: "MANUAL_REVIEW",
        confidence: "MEDIUM",
        matchRule: "MANIFEST_HCPCS",
        matchedProductCode: null,
        rationale: "NDC match ambiguous across canonical packages",
      };
    }
  }

  const hcpcs = MEDICATION_BILLING_MAPPING_BY_CODE[catalogMedicationCode];
  if (hcpcs) {
    return {
      linkageStatus: "MISSING_CANONICAL_TARGET",
      confidence: "EXACT",
      matchRule: "DERIVED_CODE",
      matchedProductCode: null,
      rationale: "No safe canonical target; create chain in M1.5E (HCPCS manifest present)",
    };
  }

  const derived = deriveMedicationCatalogCode(formularyRow);
  if (derived !== catalogMedicationCode) {
    return {
      linkageStatus: "MANUAL_REVIEW",
      confidence: "LOW",
      matchRule: "MANUAL",
      matchedProductCode: null,
      rationale: "Catalog code derivation mismatch — manual review",
    };
  }

  return {
    linkageStatus: "MISSING_CANONICAL_TARGET",
    confidence: "EXACT",
    matchRule: "DERIVED_CODE",
    matchedProductCode: null,
    rationale: "No existing safe canonical product; create in M1.5E",
  };
}

export function proposedConceptCodeForGeneric(genericName: string): string {
  const slug = genericName
    .toUpperCase()
    .replace(/\s*\+\s*/g, "_")
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return `HAITI_${slug || "UNKNOWN"}`;
}

export function proposedPackageCodeForProduct(productCode: string): string {
  return `${productCode.trim()}_PKG_DEFAULT`;
}

export function isBaselineCatalogCode(catalogCode: string): boolean {
  return catalogCode.trim().toUpperCase().startsWith("19G");
}

export function rejectAutoLinkForHighRiskFlags(flags: {
  controlled: boolean;
  highAlert: boolean;
  lasa: boolean;
  opioid: boolean;
}): boolean {
  return flags.controlled || flags.highAlert || flags.lasa || flags.opioid;
}

export function productCodeLooksQuarantined(productCode: string): boolean {
  return isImportArtifactProductCode(productCode);
}
