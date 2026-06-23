import { describe, expect, it } from "vitest";
import { buildVaccineDuplicateProtectionReport } from "./vaccineDuplicateProtection.js";
import { buildVaccineManufacturerGovernanceReport } from "./vaccineCompletionCoverageAudit.js";

describe("VaccineDuplicateProtectionReport", () => {
  const report = buildVaccineDuplicateProtectionReport();
  const manufacturer = buildVaccineManufacturerGovernanceReport();

  it("passes vaccine duplicate protection", () => {
    expect(report.decision).toBe("PASS");
  });

  it("blocks duplicate Tdap/Td/DTaP rows", () => {
    expect(report.duplicateTdapTdDtapRows).toBe(0);
  });

  it("blocks duplicate influenza families", () => {
    expect(report.duplicateInfluenzaFamilies).toBe(0);
  });

  it("blocks duplicate COVID families", () => {
    expect(report.duplicateCovidFamilies).toBe(0);
  });

  it("audits duplicate CVX mappings", () => {
    expect(report.duplicateCvxMappings).toBe(0);
  });

  it("audits duplicate NDC mappings", () => {
    expect(report.duplicateNdcMappings).toBe(0);
  });

  it("blocks duplicate provider-search vaccine rows", () => {
    expect(report.duplicateProviderSearchVaccineRows).toBe(0);
  });

  it("blocks internal catalog-code leakage", () => {
    expect(report.internalCatalogCodeLeakage).toBe(0);
  });

  it("certifies centralized manufacturer catalog", () => {
    expect(manufacturer.centralizedCatalog).toBe(true);
  });

  it("supports unknown manufacturer", () => {
    expect(manufacturer.unknownManufacturer).toBe(true);
  });

  it("supports other manufacturer", () => {
    expect(manufacturer.otherManufacturer).toBe(true);
  });

  it("has no manufacturer language leakage", () => {
    expect(manufacturer.languageLeakage).toBe(0);
  });
});
