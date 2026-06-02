/**
 * M1.5R — Haiti canonical stabilization remediation (classifiers + link audit; no DB).
 */

import { HAITI_CANONICAL_LINKAGE_MANIFEST } from "./haitiCanonicalMedicationLinkageManifest.js";
import {
  classifyQuarantine,
  isAcetaminophenCloneGeneric,
  isBlockedMedTestGeneric,
  isImportArtifactProductCode,
  isQuarantinedCanonicalProduct,
  isRegularInsulinCloneGeneric,
} from "./haitiCanonicalMedicationQuarantine.js";
import { isBaselineCatalogCode } from "./haitiCanonicalMedicationMatching.js";
import type { HaitiCanonicalMedicationLinkageEntry } from "./haitiCanonicalMedicationLinkageTypes.js";

export const HAITI_M15R_VERSION = "M1.5R" as const;

export type LegacyLinkClassification =
  | "CORRECT"
  | "INCORRECT"
  | "MISSING"
  | "DUPLICATE"
  | "QUARANTINED";

export type LegacyLinkAuditRow = {
  productId: string;
  productCode: string;
  catalogId: string | null;
  catalogCode: string | null;
  conceptGenericName: string;
  classification: LegacyLinkClassification;
  reason: string;
};

export type LegacyLinkAuditSummary = {
  correct: number;
  incorrect: number;
  missing: number;
  duplicate: number;
  quarantined: number;
  totalLinkedProducts: number;
  rows: LegacyLinkAuditRow[];
};

export type CatalogPollutionRow = {
  catalogId: string;
  catalogCode: string;
  genericName: string | null;
  pollutionKind: "19G_BASELINE" | "19G_ACET_CLONE" | "PRI_ER_ACET" | "IMPORT_TEST";
  isActive: boolean;
};

/** Catalog codes that must not appear in provider medication search. */
export function isProviderSearchPollutionCatalogCode(catalogCode: string): boolean {
  const code = catalogCode.trim().toUpperCase();
  if (isBaselineCatalogCode(code)) return true;
  if (code.startsWith("PRI_ER_ACET")) return true;
  return false;
}

export function providerSearchPollutionKind(
  catalogCode: string
): CatalogPollutionRow["pollutionKind"] | null {
  const code = catalogCode.trim().toUpperCase();
  if (code.startsWith("19G1-ACET")) return "19G_ACET_CLONE";
  if (code.startsWith("PRI_ER_ACET")) return "PRI_ER_ACET";
  if (code.startsWith("19G")) return "19G_BASELINE";
  return null;
}

export type LegacyLinkInspectInput = {
  productId: string;
  productCode: string;
  conceptGenericName: string;
  baselineAvailable: boolean;
  legacyCatalogMedicationId: string | null;
  catalogCode: string | null;
  catalogExists: boolean;
};

export function isInvalidLegacyLinkage(input: LegacyLinkInspectInput): boolean {
  if (!input.legacyCatalogMedicationId) return false;

  const quarantine = isQuarantinedCanonicalProduct({
    productCode: input.productCode,
    conceptGenericName: input.conceptGenericName,
    baselineAvailable: input.baselineAvailable,
  });
  if (quarantine === "QUARANTINE") return true;

  if (input.catalogCode && isProviderSearchPollutionCatalogCode(input.catalogCode)) {
    return true;
  }

  const productUpper = input.productCode.trim().toUpperCase();
  const catalogUpper = (input.catalogCode ?? "").trim().toUpperCase();
  if (productUpper.startsWith("19G") && catalogUpper && !catalogUpper.startsWith("19G")) {
    return true;
  }

  if (
    isAcetaminophenCloneGeneric(input.conceptGenericName) &&
    input.catalogCode &&
    !input.catalogCode.toUpperCase().startsWith("19G")
  ) {
    return true;
  }

  return false;
}

const MANIFEST_BY_CATALOG = Object.fromEntries(
  HAITI_CANONICAL_LINKAGE_MANIFEST.map((e) => [e.catalogMedicationCode, e])
) as Record<string, HaitiCanonicalMedicationLinkageEntry>;

export function classifyLegacyLinkRow(input: LegacyLinkInspectInput): LegacyLinkAuditRow {
  const base = {
    productId: input.productId,
    productCode: input.productCode,
    catalogId: input.legacyCatalogMedicationId,
    catalogCode: input.catalogCode,
    conceptGenericName: input.conceptGenericName,
  };

  if (!input.legacyCatalogMedicationId) {
    return {
      ...base,
      classification: "MISSING",
      reason: "no legacyCatalogMedicationId",
    };
  }

  if (!input.catalogExists) {
    return {
      ...base,
      classification: "INCORRECT",
      reason: "legacy FK points to missing catalog row",
    };
  }

  const quarantine = isQuarantinedCanonicalProduct({
    productCode: input.productCode,
    conceptGenericName: input.conceptGenericName,
    baselineAvailable: input.baselineAvailable,
  });

  if (quarantine === "QUARANTINE") {
    return {
      ...base,
      classification: "QUARANTINED",
      reason: "quarantine deny-list product must not link to clinical catalog",
    };
  }

  if (isInvalidLegacyLinkage(input)) {
    return {
      ...base,
      classification: "INCORRECT",
      reason: "baseline/clone product linked to Haiti clinical catalog",
    };
  }

  const manifest = input.catalogCode ? MANIFEST_BY_CATALOG[input.catalogCode] : undefined;
  if (manifest && input.productCode === manifest.proposedProductCode) {
    return {
      ...base,
      classification: "CORRECT",
      reason: "manifest-aligned Haiti linkage",
    };
  }

  if (input.catalogCode && input.productCode === input.catalogCode) {
    return {
      ...base,
      classification: "CORRECT",
      reason: "product code matches catalog code",
    };
  }

  return {
    ...base,
    classification: "CORRECT",
    reason: "linked non-quarantine product (pre-M1.5E)",
  };
}

export function summarizeLegacyLinkAudit(rows: LegacyLinkAuditRow[]): LegacyLinkAuditSummary {
  const summary: LegacyLinkAuditSummary = {
    correct: 0,
    incorrect: 0,
    missing: 0,
    duplicate: 0,
    quarantined: 0,
    totalLinkedProducts: rows.filter((r) => r.catalogId).length,
    rows,
  };
  for (const row of rows) {
    switch (row.classification) {
      case "CORRECT":
        summary.correct += 1;
        break;
      case "INCORRECT":
        summary.incorrect += 1;
        break;
      case "MISSING":
        summary.missing += 1;
        break;
      case "DUPLICATE":
        summary.duplicate += 1;
        break;
      case "QUARANTINED":
        summary.quarantined += 1;
        break;
    }
  }
  return summary;
}

export function detectDuplicateLegacyLinks(
  rows: Array<{ productId: string; legacyCatalogMedicationId: string | null }>
): string[] {
  const byCatalog = new Map<string, string[]>();
  for (const row of rows) {
    if (!row.legacyCatalogMedicationId) continue;
    const list = byCatalog.get(row.legacyCatalogMedicationId) ?? [];
    list.push(row.productId);
    byCatalog.set(row.legacyCatalogMedicationId, list);
  }
  return [...byCatalog.entries()].filter(([, ids]) => ids.length > 1).map(([catalogId]) => catalogId);
}

export function classifyCatalogPollution(input: {
  code: string;
  genericName: string | null;
  isActive: boolean;
}): CatalogPollutionRow | null {
  const kind = providerSearchPollutionKind(input.code);
  if (!kind) return null;
  return {
    catalogId: "",
    catalogCode: input.code,
    genericName: input.genericName,
    pollutionKind: kind,
    isActive: input.isActive,
  };
}

export function isQuarantineBlockedForLinkageAndSearch(input: {
  productCode?: string | null;
  conceptGenericName?: string | null;
  catalogCode?: string | null;
  baselineAvailable?: boolean;
}): boolean {
  if (input.catalogCode && isProviderSearchPollutionCatalogCode(input.catalogCode)) {
    return true;
  }
  const productCode = input.productCode ?? "";
  if (isImportArtifactProductCode(productCode)) return true;
  if (isAcetaminophenCloneGeneric(input.conceptGenericName)) return true;
  if (isRegularInsulinCloneGeneric(input.conceptGenericName)) return true;
  if (isBlockedMedTestGeneric(input.conceptGenericName)) return true;
  if (input.baselineAvailable === true) return true;
  if (
    productCode &&
    isQuarantinedCanonicalProduct({
      productCode,
      conceptGenericName: input.conceptGenericName ?? "",
      baselineAvailable: input.baselineAvailable ?? false,
    }) === "QUARANTINE"
  ) {
    return true;
  }
  return classifyQuarantine({
    productCode: input.productCode,
    conceptGenericName: input.conceptGenericName,
    baselineAvailable: input.baselineAvailable,
  }) != null;
}
