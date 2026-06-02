import { buildMedicationAdministrationCandidate } from "../billingCaptureV1.js";
import {
  MEDICATION_BILLING_MAPPING_BY_CODE,
  MEDICATION_BILLING_MAPPING_COVERAGE_THRESHOLD_PCT,
  MEDICATION_BILLING_MAPPING_ENTRIES,
  type MedicationBillingMappingManifestEntry,
  isBillableCatalogMedicationRow,
} from "./medicationBillingMappingManifest.js";
import { MEDICATION_BILLING_NDC_BY_CATALOG_CODE } from "./medicationBillingNdcByCatalogCode.js";

export type MedicationBillingMappingManifestIssue = {
  kind: "DUPLICATE_CATALOG_CODE" | "INVALID_HCPCS" | "EMPTY_MANIFEST";
  message: string;
};

export type MedicationBillingCoverageReport = {
  totalMedications: number;
  billableMedications: number;
  mappedMedications: number;
  unmappedMedications: number;
  coveragePct: number;
  duplicateManifestCodes: string[];
  orphanManifestCodes: string[];
};

export type MedicationBillingNdcValidationResult = {
  pass: boolean;
  missingNdc: string[];
  invalidNdc: string[];
  duplicateNdcAcrossCatalog: string[];
  orphanNdcManifestCodes: string[];
};

export type MedicationRevenuePathValidationResult = {
  pass: boolean;
  brokenCatalogCodes: string[];
};

export type MedicationGovernanceBillingValidationResult = {
  pass: boolean;
  missingBillingMapping: string[];
};

const HCPCS_J_PATTERN = /^J\d{4}$/;

export function validateMedicationBillingMappingManifest(
  entries: MedicationBillingMappingManifestEntry[] = MEDICATION_BILLING_MAPPING_ENTRIES
): MedicationBillingMappingManifestIssue[] {
  const issues: MedicationBillingMappingManifestIssue[] = [];
  if (entries.length === 0) {
    issues.push({ kind: "EMPTY_MANIFEST", message: "manifest is empty" });
    return issues;
  }

  const seen = new Map<string, number>();
  for (const entry of entries) {
    const code = entry.catalogCode.trim();
    if (!code) continue;
    seen.set(code, (seen.get(code) ?? 0) + 1);
    if (!HCPCS_J_PATTERN.test(entry.hcpcs.trim())) {
      issues.push({
        kind: "INVALID_HCPCS",
        message: `${code}: hcpcs ${entry.hcpcs} is not a J-code`,
      });
    }
  }

  for (const [code, count] of seen) {
    if (count > 1) {
      issues.push({ kind: "DUPLICATE_CATALOG_CODE", message: `duplicate catalogCode ${code}` });
    }
  }

  return issues;
}

export function assertMedicationBillingMappingManifest(
  entries: MedicationBillingMappingManifestEntry[] = MEDICATION_BILLING_MAPPING_ENTRIES
): void {
  const issues = validateMedicationBillingMappingManifest(entries);
  if (issues.length > 0) {
    throw new Error(
      `[medication-billing-mapping] manifest invalid: ${issues.map((i) => i.message).join("; ")}`
    );
  }
}

export type CatalogMedicationBillingRow = {
  code: string;
  billingCodeDefault?: string | null;
  ndc11?: string | null;
  dosageForm?: string | null;
  route?: string | null;
  administrationType?: string | null;
  isActive?: boolean;
};

export function computeMedicationBillingCoverageReport(
  catalogRows: CatalogMedicationBillingRow[],
  manifestByCode: Record<string, MedicationBillingMappingManifestEntry> = MEDICATION_BILLING_MAPPING_BY_CODE
): MedicationBillingCoverageReport {
  const active = catalogRows.filter((r) => r.isActive !== false);
  const billable = active.filter(isBillableCatalogMedicationRow);
  const catalogCodes = new Set(active.map((r) => r.code));

  const mapped = billable.filter((r) => {
    const manifest = manifestByCode[r.code];
    const defaultCode = r.billingCodeDefault?.trim();
    return Boolean(manifest?.hcpcs?.trim() || (defaultCode && HCPCS_J_PATTERN.test(defaultCode)));
  });

  const duplicateManifestCodes = MEDICATION_BILLING_MAPPING_ENTRIES.filter((e, i, arr) =>
    arr.findIndex((x) => x.catalogCode === e.catalogCode) !== i
  ).map((e) => e.catalogCode);

  const orphanManifestCodes = Object.keys(manifestByCode).filter((code) => !catalogCodes.has(code));

  const coveragePct =
    billable.length === 0 ? 100 : Math.round((mapped.length / billable.length) * 1000) / 10;

  return {
    totalMedications: active.length,
    billableMedications: billable.length,
    mappedMedications: mapped.length,
    unmappedMedications: billable.length - mapped.length,
    coveragePct,
    duplicateManifestCodes,
    orphanManifestCodes,
  };
}

export function medicationBillingCoverageMeetsThreshold(
  report: MedicationBillingCoverageReport,
  thresholdPct: number = MEDICATION_BILLING_MAPPING_COVERAGE_THRESHOLD_PCT
): boolean {
  return report.coveragePct >= thresholdPct;
}

export function validateMedicationBillingNdcLinkage(
  catalogRows: CatalogMedicationBillingRow[]
): MedicationBillingNdcValidationResult {
  const ndcByCatalog = MEDICATION_BILLING_NDC_BY_CATALOG_CODE;
  const missingNdc: string[] = [];
  const invalidNdc: string[] = [];
  const catalogCodes = new Set(catalogRows.map((r) => r.code));

  for (const code of Object.keys(ndcByCatalog)) {
    if (!catalogCodes.has(code)) continue;
    const row = catalogRows.find((r) => r.code === code);
    const manifestNdc = ndcByCatalog[code]?.ndc11;
    if (!manifestNdc || !/^\d{11}$/.test(manifestNdc)) {
      invalidNdc.push(code);
      continue;
    }
    if (!row?.ndc11?.trim()) {
      missingNdc.push(code);
    }
  }

  const ndcToCodes = new Map<string, string[]>();
  for (const row of catalogRows) {
    const ndc = row.ndc11?.trim();
    if (!ndc) continue;
    const list = ndcToCodes.get(ndc) ?? [];
    list.push(row.code);
    ndcToCodes.set(ndc, list);
  }
  const duplicateNdcAcrossCatalog = [...ndcToCodes.entries()]
    .filter(([, codes]) => codes.length > 1)
    .map(([ndc]) => ndc);

  const orphanNdcManifestCodes = Object.keys(ndcByCatalog).filter((code) => !catalogCodes.has(code));

  const pass =
    invalidNdc.length === 0 &&
    duplicateNdcAcrossCatalog.length === 0 &&
    orphanNdcManifestCodes.length === 0;

  return {
    pass,
    missingNdc,
    invalidNdc,
    duplicateNdcAcrossCatalog,
    orphanNdcManifestCodes,
  };
}

/** Static revenue-path readiness (no DB): manifest + capture candidate shape. */
export function validateMedicationRevenuePathReadiness(
  catalogRows: CatalogMedicationBillingRow[],
  manifestByCode: Record<string, MedicationBillingMappingManifestEntry> = MEDICATION_BILLING_MAPPING_BY_CODE
): MedicationRevenuePathValidationResult {
  const billable = catalogRows.filter(isBillableCatalogMedicationRow);
  const brokenCatalogCodes: string[] = [];

  for (const row of billable) {
    const hcpcs =
      row.billingCodeDefault?.trim() || manifestByCode[row.code]?.hcpcs?.trim() || "";
    if (!HCPCS_J_PATTERN.test(hcpcs)) {
      brokenCatalogCodes.push(row.code);
      continue;
    }

    const candidate = buildMedicationAdministrationCandidate({
      administrationId: "validation-mar",
      encounterId: "validation-enc",
      patientId: "validation-patient",
      facilityId: "validation-facility",
      medicationLabel: row.code,
      atIso: new Date(0).toISOString(),
      ndc11: row.ndc11 ?? null,
    });
    if (candidate.sourceType !== "MEDICATION_ADMINISTRATION" || !candidate.sourceId) {
      brokenCatalogCodes.push(row.code);
    }
  }

  return { pass: brokenCatalogCodes.length === 0, brokenCatalogCodes };
}

export function validateGovernanceMedicationsHaveBillingMappings(
  governanceCatalogCodes: string[],
  manifestByCode: Record<string, MedicationBillingMappingManifestEntry> = MEDICATION_BILLING_MAPPING_BY_CODE
): MedicationGovernanceBillingValidationResult {
  const missingBillingMapping = governanceCatalogCodes.filter((code) => {
    const manifest = manifestByCode[code];
    return !manifest?.hcpcs?.trim();
  });
  return { pass: missingBillingMapping.length === 0, missingBillingMapping };
}

export function resolveMedicationHcpcsForCatalogRow(
  row: CatalogMedicationBillingRow,
  manifestByCode: Record<string, MedicationBillingMappingManifestEntry> = MEDICATION_BILLING_MAPPING_BY_CODE
): string | null {
  const existing = row.billingCodeDefault?.trim();
  if (existing) return existing;
  return manifestByCode[row.code]?.hcpcs?.trim() ?? null;
}
