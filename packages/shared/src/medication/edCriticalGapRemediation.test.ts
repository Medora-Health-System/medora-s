import { describe, expect, it } from "vitest";
import {
  ED_CLONIDINE_FORMULARY_ENTRIES,
  ED_CRITICAL_ALIAS_UPSERTS,
  ED_CATALOG_HARMONIZATION,
  ED_LEGACY_ADMIN_TYPE_REMEDIATION,
  ED_LEGACY_ADMIN_TYPE_REMEDIATION_BY_CATALOG_CODE,
  isEdMarCompatibleAdministrationType,
  resolveEdLegacyAdminTypeRemediation,
  resolveEdProductAdministrationType,
  validateEdCatalogHarmonizationManifest,
  validateEdClonidineFormularyEntries,
  validateEdLegacyAdminTypeRemediationManifest,
} from "./edCriticalGapRemediation.js";

describe("edCriticalGapRemediation (M1.8B)", () => {
  it("defines clonidine 0.1 mg and 0.2 mg oral SKUs", () => {
    expect(validateEdClonidineFormularyEntries()).toEqual([]);
    expect(ED_CLONIDINE_FORMULARY_ENTRIES.map((e) => e.catalogCode)).toEqual([
      "CLONIDINE_0_1_MG_COMPRIME_ORAL",
      "CLONIDINE_0_2_MG_COMPRIME_ORAL",
    ]);
    for (const entry of ED_CLONIDINE_FORMULARY_ENTRIES) {
      expect(entry.administrationType).toBe("ORAL");
      expect(entry.searchTerms).toContain("clonidine");
      expect(entry.searchTerms).toContain("catapres");
    }
  });

  it("remediates heparin INJECTION → SQ (prophylaxis vial, not infusion bag)", () => {
    expect(
      resolveEdLegacyAdminTypeRemediation("HEPARIN_5000UI_ML_INJECTABLE", "INJECTION")
    ).toBe("SQ");
    expect(
      resolveEdProductAdministrationType(
        "HEPARIN_5000UI_ML_INJECTABLE",
        "INJECTION",
        "INJECTION"
      )
    ).toBe("SQ");
    expect(isEdMarCompatibleAdministrationType("SQ")).toBe(true);
    expect(isEdMarCompatibleAdministrationType("INJECTION")).toBe(false);
  });

  it("remediates insulin SUBCUTANEOUS → SQ", () => {
    for (const code of [
      "REGULAR_INSULIN_100_UI_PER_ML_INJECTABLE_SUBCUTANEOUS",
      "NPH_INSULIN_100_UI_PER_ML_INJECTABLE_SUBCUTANEOUS",
      "INSULIN_LISPRO_100_UI_ML_INJECTABLE_SOUS_CUTANEE",
      "INSULIN_GLARGINE_100_UI_ML_INJECTABLE_SOUS_CUTANEE",
      "INSULIN_ASPART_100_UI_ML_INJECTABLE_SOUS_CUTANEE",
    ]) {
      expect(resolveEdLegacyAdminTypeRemediation(code, "SUBCUTANEOUS")).toBe("SQ");
      expect(isEdMarCompatibleAdministrationType("SQ")).toBe(true);
    }
  });

  it("preserves existing MAR-safe administration types", () => {
    expect(
      resolveEdLegacyAdminTypeRemediation("HEPARIN_5000UI_ML_INJECTABLE", "SQ")
    ).toBe("SQ");
    expect(
      resolveEdLegacyAdminTypeRemediation(
        "INSULIN_LISPRO_100_UI_ML_INJECTABLE_SOUS_CUTANEE",
        "SQ"
      )
    ).toBe("SQ");
  });

  it("indexes legacy remediation by catalog code", () => {
    expect(Object.keys(ED_LEGACY_ADMIN_TYPE_REMEDIATION_BY_CATALOG_CODE)).toHaveLength(
      ED_LEGACY_ADMIN_TYPE_REMEDIATION.length
    );
    expect(validateEdLegacyAdminTypeRemediationManifest()).toEqual([]);
  });

  it("includes Reglan, Pitocin, and Catapres alias upserts", () => {
    const reglan = ED_CRITICAL_ALIAS_UPSERTS.find(
      (e) => e.catalogCode === "METOCLOPRAMIDE_10_MG_PER_2_ML_INJECTABLE_INJECTION"
    );
    const pitocin = ED_CRITICAL_ALIAS_UPSERTS.find(
      (e) => e.catalogCode === "OXYTOCIN_10_UI_PER_ML_INJECTABLE_INJECTION"
    );
    expect(reglan?.aliases.map((a) => a.toLowerCase())).toContain("reglan");
    expect(pitocin?.aliases.map((a) => a.toLowerCase())).toContain("pitocin");
    expect(
      ED_CRITICAL_ALIAS_UPSERTS.some((e) => e.catalogCode === "CLONIDINE_0_1_MG_COMPRIME_ORAL")
    ).toBe(true);
  });

  it("defines non-destructive catalog harmonization mappings", () => {
    expect(validateEdCatalogHarmonizationManifest()).toEqual([]);
    const adrenaline = ED_CATALOG_HARMONIZATION.find(
      (e) => e.canonicalCatalogCode === "ADRENALINE_1_MG_PER_ML_INJECTABLE_INJECTION"
    );
    expect(adrenaline?.crossSearchAliases).toContain("epinephrine");
    expect(adrenaline?.wave4DuplicateCodes.length).toBeGreaterThan(0);
  });
});
