import { describe, expect, it } from "vitest";
import {
  isForbiddenBrandOnlyMatch,
  matchHaitiFormularyToCanonical,
  proposedConceptCodeForGeneric,
  proposedPackageCodeForProduct,
} from "./haitiCanonicalMedicationMatching.js";
import { HAITI_MEDICATION_FORMULARY_CATALOG } from "./haitiMedicationFormularyCatalog.js";

describe("haitiCanonicalMedicationMatching", () => {
  it("returns MISSING_CANONICAL_TARGET when no candidates exist", () => {
    const row = HAITI_MEDICATION_FORMULARY_CATALOG.find(
      (r) => r.code === "CEFTRIAXONE_1_G_INJECTABLE_INJECTION"
    )!;
    const result = matchHaitiFormularyToCanonical({
      formularyRow: row,
      catalogMedicationCode: row.code,
      existingProductCandidates: [],
    });
    expect(result.linkageStatus).toBe("MISSING_CANONICAL_TARGET");
    expect(result.confidence).toBe("EXACT");
  });

  it("rejects quarantined code-exact candidate", () => {
    const row = HAITI_MEDICATION_FORMULARY_CATALOG[0];
    const result = matchHaitiFormularyToCanonical({
      formularyRow: row,
      catalogMedicationCode: row.code,
      existingProductCandidates: [
        {
          code: row.code,
          conceptGenericName: "Acetaminophen clone",
          baselineAvailable: true,
          productIsActive: false,
          conceptIsActive: false,
        },
      ],
    });
    expect(result.linkageStatus).toBe("DO_NOT_LINK");
  });

  it("derives stable proposed concept and package codes", () => {
    expect(proposedConceptCodeForGeneric("Ceftriaxone")).toBe("HAITI_CEFTRIAXONE");
    expect(proposedPackageCodeForProduct("CEFTRIAXONE_1_G_INJECTABLE_INJECTION")).toBe(
      "CEFTRIAXONE_1_G_INJECTABLE_INJECTION_PKG_DEFAULT"
    );
  });

  it("forbids brand-only matching policy", () => {
    expect(isForbiddenBrandOnlyMatch("Tylenol")).toBe(true);
  });
});
