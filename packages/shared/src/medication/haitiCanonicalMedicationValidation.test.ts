import { describe, expect, it } from "vitest";
import { buildHaitiCanonicalLinkageEntry } from "./haitiCanonicalMedicationLinkageBuild.js";
import { HAITI_MEDICATION_FORMULARY_CATALOG } from "./haitiMedicationFormularyCatalog.js";
import {
  HAITI_CANONICAL_LINKAGE_MANIFEST,
} from "./haitiCanonicalMedicationLinkageManifest.js";
import {
  validateBillingRequirements,
  validateControlledReviewRequirements,
  validateDuplicateCatalogCodes,
  validateManifest,
  validateQuarantineTargets,
  validateSearchRequirements,
} from "./haitiCanonicalMedicationValidation.js";

describe("haitiCanonicalMedicationValidation", () => {
  it("detects duplicate catalog codes", () => {
    const dup = [
      ...HAITI_CANONICAL_LINKAGE_MANIFEST.slice(0, 2),
      { ...HAITI_CANONICAL_LINKAGE_MANIFEST[0], proposedProductCode: "OTHER" },
    ];
    const issues = validateDuplicateCatalogCodes(dup);
    expect(issues.some((i) => i.kind === "DUPLICATE_CATALOG_CODE")).toBe(true);
  });

  it("requires reviewer for controlled opioids in manifest", () => {
    const morphine = HAITI_CANONICAL_LINKAGE_MANIFEST.find((e) =>
      e.catalogMedicationCode.includes("MORPHINE")
    );
    expect(morphine).toBeDefined();
    expect(morphine?.safetyFlags.opioid).toBe(true);
    expect(morphine?.reviewerRequired).toBe(true);
    expect(morphine?.linkageStatus).toBe("MANUAL_REVIEW");
    const issues = validateControlledReviewRequirements(HAITI_CANONICAL_LINKAGE_MANIFEST);
    expect(issues.filter((i) => i.kind === "CONTROLLED_AUTO_LINK")).toEqual([]);
  });

  it("flags quarantined existing targets", () => {
    const issues = validateQuarantineTargets(HAITI_CANONICAL_LINKAGE_MANIFEST, [
      {
        productCode: "PRI_ER_ACETAMINOPHEN_TEST",
        conceptGenericName: "Acetaminophen",
        baselineAvailable: true,
        productIsActive: false,
        conceptIsActive: false,
      },
    ]);
    expect(issues.some((i) => i.kind === "QUARANTINE_TARGET_PREFIX" || i.kind === "QUARANTINE_TARGET")).toBe(
      true
    );
  });

  it("validates billable rows without spurious LINK_READY billing errors", () => {
    const formularyByCode = Object.fromEntries(HAITI_MEDICATION_FORMULARY_CATALOG.map((r) => [r.code, r]));
    const issues = validateBillingRequirements(HAITI_CANONICAL_LINKAGE_MANIFEST, formularyByCode);
    expect(issues.filter((i) => i.kind === "BILLING_UNMAPPED_BILLABLE")).toEqual([]);
  });

  it("validates search dimension uniqueness in manifest", () => {
    const issues = validateSearchRequirements(HAITI_CANONICAL_LINKAGE_MANIFEST);
    expect(issues.filter((i) => i.kind === "DUPLICATE_SEARCH_DIMENSIONS")).toEqual([]);
  });

  it("built entry for oral amoxicillin is MISSING_CANONICAL_TARGET", () => {
    const row = HAITI_MEDICATION_FORMULARY_CATALOG.find((r) => r.code === "AMOXICILLIN_500");
    expect(row).toBeDefined();
    const entry = buildHaitiCanonicalLinkageEntry(row!);
    expect(entry.linkageStatus).toBe("MISSING_CANONICAL_TARGET");
    expect(entry.proposedProductCode).toBe("AMOXICILLIN_500");
  });

  it("full manifest validation passes blocking checks", () => {
    const result = validateManifest(HAITI_CANONICAL_LINKAGE_MANIFEST, {
      formularyRows: HAITI_MEDICATION_FORMULARY_CATALOG,
    });
    expect(result.pass || result.issues.every((i) => ["ALIAS_COLLISION", "GOVERNANCE_CODE_DRIFT"].includes(i.kind))).toBe(
      true
    );
  });
});
