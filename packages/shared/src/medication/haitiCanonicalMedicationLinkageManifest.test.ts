import { describe, expect, it } from "vitest";
import {
  HAITI_CANONICAL_LINKAGE_BY_CATALOG_CODE,
  HAITI_CANONICAL_LINKAGE_MANIFEST,
  HAITI_CANONICAL_LINKAGE_MANIFEST_EXPECTED_COUNT,
} from "./haitiCanonicalMedicationLinkageManifest.js";
import { HAITI_MEDICATION_FORMULARY_CATALOG } from "./haitiMedicationFormularyCatalog.js";
import { validateManifest } from "./haitiCanonicalMedicationValidation.js";

describe("haitiCanonicalMedicationLinkageManifest", () => {
  it("has 253 Haiti formulary entries", () => {
    expect(HAITI_CANONICAL_LINKAGE_MANIFEST.length).toBe(253);
    expect(HAITI_CANONICAL_LINKAGE_MANIFEST_EXPECTED_COUNT).toBe(253);
  });

  it("indexes by catalogMedicationCode without duplicates", () => {
    expect(Object.keys(HAITI_CANONICAL_LINKAGE_BY_CATALOG_CODE).length).toBe(253);
  });

  it("defaults to MISSING_CANONICAL_TARGET or MANUAL_REVIEW (no bulk LINK_READY)", () => {
    const linkReady = HAITI_CANONICAL_LINKAGE_MANIFEST.filter((e) => e.linkageStatus === "LINK_READY");
    expect(linkReady.length).toBe(0);
    const missing = HAITI_CANONICAL_LINKAGE_MANIFEST.filter(
      (e) => e.linkageStatus === "MISSING_CANONICAL_TARGET"
    );
    const manual = HAITI_CANONICAL_LINKAGE_MANIFEST.filter((e) => e.linkageStatus === "MANUAL_REVIEW");
    expect(missing.length + manual.length).toBe(253);
  });

  it("passes strict validation against formulary source", () => {
    const result = validateManifest(HAITI_CANONICAL_LINKAGE_MANIFEST, {
      formularyRows: HAITI_MEDICATION_FORMULARY_CATALOG,
    });
    const blocking = result.issues.filter(
      (i) => i.kind !== "ALIAS_COLLISION" && i.kind !== "GOVERNANCE_CODE_DRIFT"
    );
    expect(blocking).toEqual([]);
    expect(result.stats.total).toBe(253);
  });

  it("includes ceftriaxone with billing flags from M1.4B manifest", () => {
    const entry = HAITI_CANONICAL_LINKAGE_BY_CATALOG_CODE["CEFTRIAXONE_1_G_INJECTABLE_INJECTION"];
    expect(entry).toBeDefined();
    expect(entry.billingFlags.hasHcpcs).toBe(true);
    expect(entry.tranche).toBe("T1");
  });
});
