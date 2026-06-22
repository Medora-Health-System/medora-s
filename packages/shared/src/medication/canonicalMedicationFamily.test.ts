import { describe, expect, it } from "vitest";
import {
  buildCanonicalMedicationFamilies,
  buildMedicationAdministrationNormalizationReport,
  buildMedicationNormalizationMaturityProjectionReport,
  certifyMedicationNormalizationI18n,
  certifyCanonicalMedicationFamilies,
  runMedicationCanonicalNormalizationCertification,
  TDAP_CANONICAL_CATALOG_CODE,
} from "./medicationCanonicalNormalization.js";
import { buildUnifiedOrderabilityMap } from "./medicationOrderabilityCertification.js";
import type { MedicationOrderabilityRecord } from "./medicationOrderabilityGovernance.js";

function records(): MedicationOrderabilityRecord[] {
  return [...buildUnifiedOrderabilityMap().values()];
}

describe("CanonicalMedicationFamilyCertification", () => {
  it("assigns every catalog medication to exactly one canonical family", () => {
    const cert = certifyCanonicalMedicationFamilies();
    expect(cert.decision).toBe("PASS");
    expect(cert.unassignedCatalogCodes).toEqual([]);
    expect(cert.families.flatMap((f) => f.catalogProducts).length).toBe(cert.totalMedications);
  });

  it("builds a Lisinopril canonical family with brand aliases", () => {
    const family = buildCanonicalMedicationFamilies().find((f) => f.familyKey === "lisinopril");
    expect(family).toBeDefined();
    expect(family?.brands).toContain("zestril");
    expect(family?.catalogProducts.some((p) => p.catalogCode === "LISINOPRIL_10")).toBe(true);
  });

  it("keeps strength variants inside one canonical family", () => {
    const families = buildCanonicalMedicationFamilies(
      records().filter((r) => r.genericName.toLowerCase() === "carvedilol")
    );
    expect(families).toHaveLength(1);
    expect(families[0]!.strengths.length).toBeGreaterThan(1);
  });

  it("keeps route variants inside one canonical family", () => {
    const families = buildCanonicalMedicationFamilies(
      records().filter((r) => r.genericName.toLowerCase() === "metoprolol")
    );
    expect(families).toHaveLength(1);
    expect(families[0]!.routes.length).toBeGreaterThan(1);
  });

  it("certifies family counts and variant counts", () => {
    const cert = certifyCanonicalMedicationFamilies();
    expect(cert.totalFamilies).toBeGreaterThan(0);
    expect(cert.familiesWithMultipleStrengths).toBeGreaterThan(0);
    expect(cert.familiesWithMultipleRoutes).toBeGreaterThan(0);
  });

  it("preserves orderable product metadata without changing orderability", () => {
    const family = buildCanonicalMedicationFamilies().find((f) =>
      f.catalogProducts.some((p) => p.catalogCode === "AMLODIPINE_5_MG_COMPRIME_ORAL")
    );
    const product = family?.catalogProducts.find((p) => p.catalogCode === "AMLODIPINE_5_MG_COMPRIME_ORAL");
    expect(product?.orderable).toBe(true);
  });

  it("includes Tdap in a vaccine canonical family", () => {
    const family = buildCanonicalMedicationFamilies().find((f) =>
      f.catalogProducts.some((p) => p.catalogCode === TDAP_CANONICAL_CATALOG_CODE)
    );
    expect(family).toBeDefined();
    expect(family?.catalogProducts[0]?.displayNameEn.toLowerCase()).toContain("tdap");
  });

  it("orchestrator returns the canonical-family report", () => {
    const report = runMedicationCanonicalNormalizationCertification();
    expect(report.ticket).toBe("MEDUI.MEDICATION.DUPLICATE_NORMALIZATION_AND_CANONICAL_ORDERING.1");
    expect(report.canonicalMedicationFamilyCertification.decision).toBe("PASS");
  });

  it("does not report compatibility side effects", () => {
    const report = runMedicationCanonicalNormalizationCertification();
    expect(report.compatibility.activationChanged).toBe(false);
    expect(report.compatibility.providerSearchChanged).toBe(false);
    expect(report.compatibility.formularyStatusChanged).toBe(false);
    expect(report.compatibility.migrationsRequired).toBe(false);
  });

  it("audits MAR normalization without changing administration workflows", () => {
    const report = buildMedicationAdministrationNormalizationReport();
    expect(report.marReadyProducts).toBeGreaterThan(0);
    expect(["PASS", "FAIL"]).toContain(report.decision);
  });

  it("certifies medication normalization i18n report shape", () => {
    const report = certifyMedicationNormalizationI18n();
    expect(report.rowsAudited).toBe(records().length);
    expect(["PASS", "FAIL"]).toContain(report.decision);
  });

  it("projects maturity toward the 4.5 target after normalization phases", () => {
    const projection = buildMedicationNormalizationMaturityProjectionReport();
    expect(projection.currentScore).toBeGreaterThanOrEqual(3.4);
    expect(projection.projectedAfterNormalization).toBeGreaterThanOrEqual(projection.currentScore);
    expect(projection.projectedAfterVaccineCompletion).toBeLessThanOrEqual(projection.targetScore);
  });
});
