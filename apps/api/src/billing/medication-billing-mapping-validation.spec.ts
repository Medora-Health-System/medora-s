import { HAITI_MEDICATION_CATALOG } from "../../prisma/data/haiti-medications";
import { deriveMedicationCode } from "../../prisma/helpers/seed-haiti-medication-catalog";
import {
  MEDICATION_BILLING_MAPPING_BY_CODE,
  MEDICATION_BILLING_MAPPING_COVERAGE_THRESHOLD_PCT,
  MEDICATION_BILLING_NDC_BY_CATALOG_CODE,
  isBillableCatalogMedicationRow,
} from "@medora/shared";
import {
  computeMedicationBillingCoverageReport,
  medicationBillingCoverageMeetsThreshold,
  validateGovernanceMedicationsHaveBillingMappings,
  validateMedicationBillingNdcLinkage,
  validateMedicationRevenuePathReadiness,
} from "@medora/shared";

describe("medication billing mapping validation (Haiti catalog)", () => {
  const catalogRows = HAITI_MEDICATION_CATALOG.map((row) => {
    const code = deriveMedicationCode(row);
    const manifest = MEDICATION_BILLING_MAPPING_BY_CODE[code];
    return {
      code,
      billingCodeDefault: manifest?.hcpcs ?? null,
      dosageForm: row.dosageForm,
      route: row.route,
      administrationType: row.administrationType ?? null,
      isActive: true,
    };
  });

  it("covers at least 95% of billable Haiti catalog medications via manifest", () => {
    const report = computeMedicationBillingCoverageReport(catalogRows);
    expect(report.billableMedications).toBeGreaterThan(80);
    expect(medicationBillingCoverageMeetsThreshold(report)).toBe(true);
    expect(report.coveragePct).toBeGreaterThanOrEqual(MEDICATION_BILLING_MAPPING_COVERAGE_THRESHOLD_PCT);
  });

  it("revenue path readiness passes when manifest HCPCS applied to billable rows", () => {
    const billable = catalogRows.filter(isBillableCatalogMedicationRow);
    const result = validateMedicationRevenuePathReadiness(billable);
    expect(result.pass).toBe(true);
  });

  it("NDC manifest has no orphan codes vs Haiti catalog", () => {
    const result = validateMedicationBillingNdcLinkage(
      catalogRows.map((r) => ({
        code: r.code,
        ndc11: MEDICATION_BILLING_NDC_BY_CATALOG_CODE[r.code]?.ndc11 ?? null,
        dosageForm: r.dosageForm,
        route: r.route,
        administrationType: r.administrationType,
        isActive: true,
      }))
    );
    expect(result.orphanNdcManifestCodes).toEqual([]);
    expect(result.invalidNdc).toEqual([]);
  });

  it("controlled and high-alert billable Haiti codes have manifest HCPCS mappings", () => {
    const sensitivePrefixes = [
      "MORPHINE_",
      "FENTANYL_",
      "HYDROMORPHONE_",
      "MIDAZOLAM_",
      "KETAMINE_",
      "HEPARIN_",
      "INSULIN_",
      "METHYLPREDNISOLONE_",
    ];
    const sensitiveCodes = catalogRows
      .filter(isBillableCatalogMedicationRow)
      .map((r) => r.code)
      .filter((code) => sensitivePrefixes.some((prefix) => code.startsWith(prefix)));

    expect(sensitiveCodes.length).toBeGreaterThan(5);
    const result = validateGovernanceMedicationsHaveBillingMappings(sensitiveCodes);
    expect(result.pass).toBe(true);
    expect(result.missingBillingMapping).toEqual([]);
  });
});
