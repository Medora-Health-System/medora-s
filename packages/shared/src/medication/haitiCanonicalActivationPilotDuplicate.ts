/**
 * M1.5G — Duplicate-risk detection for Haiti pilot activation.
 */

import type { HaitiCanonicalActivationPilotEntry } from "./haitiCanonicalActivationPilotTypes.js";
import type { HaitiPilotActivationValidationIssue } from "./haitiCanonicalActivationPilotTypes.js";

export type PilotDbProductSnapshot = {
  productId: string;
  productCode: string;
  legacyCatalogMedicationId: string | null;
  conceptGenericName: string;
  baselineAvailable: boolean;
  packageNdc11?: string | null;
  packageCode?: string | null;
};

export type PilotDbCatalogSnapshot = {
  catalogId: string;
  catalogCode: string;
  genericName: string | null;
  ndc11: string | null;
  billingCodeDefault: string | null;
};

export function detectPilotManifestDuplicates(
  entries: HaitiCanonicalActivationPilotEntry[]
): HaitiPilotActivationValidationIssue[] {
  const issues: HaitiPilotActivationValidationIssue[] = [];
  const byCatalog = new Map<string, number>();
  const byProduct = new Map<string, number>();

  for (const e of entries) {
    byCatalog.set(e.catalogMedicationCode, (byCatalog.get(e.catalogMedicationCode) ?? 0) + 1);
    byProduct.set(e.proposedProductCode, (byProduct.get(e.proposedProductCode) ?? 0) + 1);
  }

  for (const [code, count] of byCatalog) {
    if (count > 1) {
      issues.push({
        kind: "DUPLICATE_CATALOG_CODE",
        catalogMedicationCode: code,
        message: `duplicate catalogMedicationCode in pilot manifest (${count})`,
        severity: "blocking",
      });
    }
  }
  for (const [code, count] of byProduct) {
    if (count > 1) {
      issues.push({
        kind: "DUPLICATE_PRODUCT_CODE",
        catalogMedicationCode: code,
        message: `duplicate proposedProductCode in pilot manifest (${count})`,
        severity: "blocking",
      });
    }
  }

  return issues;
}

export function detectPilotActivationDuplicates(
  entry: HaitiCanonicalActivationPilotEntry,
  product: PilotDbProductSnapshot | null,
  allPilotProducts: PilotDbProductSnapshot[]
): HaitiPilotActivationValidationIssue[] {
  const issues: HaitiPilotActivationValidationIssue[] = [];
  const code = entry.catalogMedicationCode;

  if (!product) {
    issues.push({
      kind: "MISSING_PRODUCT",
      catalogMedicationCode: code,
      message: `MedicationProduct ${entry.proposedProductCode} not found`,
      severity: "blocking",
    });
    return issues;
  }

  if (product.productCode !== entry.proposedProductCode) {
    issues.push({
      kind: "PRODUCT_CODE_MISMATCH",
      catalogMedicationCode: code,
      message: "product code does not match manifest",
      severity: "blocking",
    });
  }

  if (product.baselineAvailable) {
    issues.push({
      kind: "BASELINE_PRODUCT",
      catalogMedicationCode: code,
      message: "baseline product cannot be pilot-activated",
      severity: "blocking",
    });
  }

  const legacyOwners = allPilotProducts.filter(
    (p) => p.legacyCatalogMedicationId && p.legacyCatalogMedicationId === product.legacyCatalogMedicationId
  );
  if (legacyOwners.length > 1) {
    issues.push({
      kind: "DUPLICATE_LEGACY_LINK",
      catalogMedicationCode: code,
      message: "multiple products share the same legacyCatalogMedicationId",
      severity: "blocking",
    });
  }

  const otherLegacy = allPilotProducts.find(
    (p) =>
      p.productId !== product.productId &&
      p.legacyCatalogMedicationId &&
      product.legacyCatalogMedicationId &&
      p.legacyCatalogMedicationId === product.legacyCatalogMedicationId
  );
  if (otherLegacy) {
    issues.push({
      kind: "DUPLICATE_LINKED_CATALOG",
      catalogMedicationCode: code,
      message: `catalog already linked to product ${otherLegacy.productCode}`,
      severity: "blocking",
    });
  }

  const ndc = product.packageNdc11?.trim();
  if (ndc) {
    const ndcDupes = allPilotProducts.filter(
      (p) => p.productId !== product.productId && p.packageNdc11?.trim() === ndc
    );
    if (ndcDupes.length > 0) {
      issues.push({
        kind: "DUPLICATE_NDC",
        catalogMedicationCode: code,
        message: `NDC11 ${ndc} shared with ${ndcDupes.map((p) => p.productCode).join(", ")}`,
        severity: "blocking",
      });
    }
  }

  return issues;
}

/** Provider search identity = catalogMedication.id (legacy-authoritative). */
export function detectProviderSearchIdentityDuplicates(
  catalogRows: PilotDbCatalogSnapshot[]
): HaitiPilotActivationValidationIssue[] {
  const issues: HaitiPilotActivationValidationIssue[] = [];
  const byCode = new Map<string, string[]>();
  for (const row of catalogRows) {
    const list = byCode.get(row.catalogCode) ?? [];
    list.push(row.catalogId);
    byCode.set(row.catalogCode, list);
  }
  for (const [code, ids] of byCode) {
    if (ids.length > 1) {
      issues.push({
        kind: "DUPLICATE_PROVIDER_SEARCH_IDENTITY",
        catalogMedicationCode: code,
        message: `multiple catalog rows for code ${code} (${ids.length} ids)`,
        severity: "blocking",
      });
    }
  }
  return issues;
}
