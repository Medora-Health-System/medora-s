import {
  ED_CLONIDINE_FORMULARY_ENTRIES,
  ED_CRITICAL_ALIAS_UPSERTS,
  ED_LEGACY_ADMIN_TYPE_REMEDIATION,
  ENTERPRISE_MEDICATION_REQUIRED_SEARCH_PAIRS,
  isEdMarCompatibleAdministrationType,
  resolveEdProductAdministrationType,
} from "@medora/shared";
import { expandMedicationSearchQuery } from "./medication-catalog-search.util";

describe("M1.8B ED critical gap remediation", () => {
  it("clonidine formulary entries are ORAL and MAR-compatible", () => {
    for (const entry of ED_CLONIDINE_FORMULARY_ENTRIES) {
      expect(entry.administrationType).toBe("ORAL");
      expect(isEdMarCompatibleAdministrationType(entry.administrationType)).toBe(true);
    }
  });

  it("heparin remediation yields MAR-compatible administration type", () => {
    const resolved = resolveEdProductAdministrationType(
      "HEPARIN_5000UI_ML_INJECTABLE",
      "INJECTION",
      "INJECTION"
    );
    expect(resolved).toBe("SQ");
    expect(isEdMarCompatibleAdministrationType(resolved)).toBe(true);
  });

  it("insulin remediation yields MAR-compatible SQ administration type", () => {
    for (const target of ED_LEGACY_ADMIN_TYPE_REMEDIATION.filter((e) =>
      e.catalogCode.includes("INSULIN")
    )) {
      const resolved = resolveEdProductAdministrationType(
        target.catalogCode,
        "SUBCUTANEOUS",
        "SUBCUTANEOUS"
      );
      expect(resolved).toBe("SQ");
      expect(isEdMarCompatibleAdministrationType(resolved)).toBe(true);
    }
  });

  it("includes Reglan, Pitocin, and Catapres critical alias upserts", () => {
    const codes = new Set(ED_CRITICAL_ALIAS_UPSERTS.map((e) => e.catalogCode));
    expect(codes.has("METOCLOPRAMIDE_10_MG_PER_2_ML_INJECTABLE_INJECTION")).toBe(true);
    expect(codes.has("OXYTOCIN_10_UI_PER_ML_INJECTABLE_INJECTION")).toBe(true);
    expect(codes.has("CLONIDINE_0_1_MG_COMPRIME_ORAL")).toBe(true);
  });

  it("legacy INJECTION is MAR-blocked before remediation", () => {
    expect(isEdMarCompatibleAdministrationType("INJECTION")).toBe(false);
  });

  it("required search pairs cover M1.8B brand/generic queries", () => {
    const pairs = ENTERPRISE_MEDICATION_REQUIRED_SEARCH_PAIRS;
    const hasPair = (generic: string, brand: string) =>
      pairs.some(
        (p) => p.generic.toLowerCase() === generic && p.brand.toLowerCase() === brand
      );

    expect(hasPair("metoclopramide", "reglan")).toBe(true);
    expect(hasPair("oxytocin", "pitocin")).toBe(true);
    expect(hasPair("clonidine", "catapres")).toBe(true);
    expect(hasPair("insulin lispro", "humalog")).toBe(true);
    expect(hasPair("insulin glargine", "lantus")).toBe(true);
  });

  it("search expansion resolves M1.8B clinical shorthand tokens", () => {
    expect(expandMedicationSearchQuery("reglan")).toContain("metoclopramide");
    expect(expandMedicationSearchQuery("pitocin")).toContain("oxytocin");
    expect(expandMedicationSearchQuery("catapres")).toContain("clonidine");
    expect(expandMedicationSearchQuery("heparin")).toContain("heparin");
    expect(expandMedicationSearchQuery("lispro").length).toBeGreaterThan(0);
    expect(expandMedicationSearchQuery("glargine").length).toBeGreaterThan(0);
    expect(expandMedicationSearchQuery("nph").length).toBeGreaterThan(0);
  });

  it("insulin drip SKU is not in SUBCUTANEOUS remediation scope", () => {
    const remediatedCodes = ED_LEGACY_ADMIN_TYPE_REMEDIATION.map((e) => e.catalogCode);
    expect(remediatedCodes).not.toContain(
      "REGULAR_INSULIN_100_UI_ML_DRIP_KIT_PERFUSION_INTRAVEINEUSE"
    );
  });

  it("heparin premix drip SKU is not in legacy remediation scope", () => {
    const remediatedCodes = ED_LEGACY_ADMIN_TYPE_REMEDIATION.map((e) => e.catalogCode);
    expect(remediatedCodes).not.toContain("HEPARIN_25000_UNITS_500_ML_PERFUSION_INTRAVEINEUSE");
    expect(remediatedCodes).toContain("HEPARIN_5000UI_ML_INJECTABLE");
  });
});
