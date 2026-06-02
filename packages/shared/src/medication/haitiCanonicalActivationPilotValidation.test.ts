import { describe, expect, it } from "vitest";
import {
  HAITI_CANONICAL_ACTIVATION_PILOT_ELIGIBLE,
  HAITI_CANONICAL_ACTIVATION_PILOT_MANIFEST,
  HAITI_CANONICAL_ACTIVATION_PILOT_STATS,
  HAITI_CANONICAL_ACTIVATION_PILOT_T1_CAP,
} from "./haitiCanonicalActivationPilotManifest.js";
import {
  assertPilotManifestReady,
  computePilotReadinessScores,
  validatePilotActivationCandidate,
  validatePilotManifestStructure,
  validateProviderSearchNonRegression,
} from "./haitiCanonicalActivationPilotValidation.js";
import { detectPilotManifestDuplicates } from "./haitiCanonicalActivationPilotDuplicate.js";

describe("haitiCanonicalActivationPilotValidation (M1.5G)", () => {
  it("keeps T1 pilot manifest within cap", () => {
    expect(HAITI_CANONICAL_ACTIVATION_PILOT_MANIFEST.length).toBeLessThanOrEqual(
      HAITI_CANONICAL_ACTIVATION_PILOT_T1_CAP
    );
    expect(HAITI_CANONICAL_ACTIVATION_PILOT_STATS.t1Total).toBe(82);
    expect(HAITI_CANONICAL_ACTIVATION_PILOT_STATS.pilotEligible).toBeLessThanOrEqual(82);
    expect(assertPilotManifestReady).not.toThrow();
  });

  it("detects no manifest-level duplicate catalog codes", () => {
    const dupes = detectPilotManifestDuplicates(HAITI_CANONICAL_ACTIVATION_PILOT_MANIFEST);
    expect(dupes.filter((d) => d.severity === "blocking")).toHaveLength(0);
    expect(validatePilotManifestStructure().filter((i) => i.severity === "blocking")).toHaveLength(0);
  });

  it("blocks activation for non-eligible manual-review rows", () => {
    const morphine = HAITI_CANONICAL_ACTIVATION_PILOT_MANIFEST.find((e) =>
      e.catalogMedicationCode.includes("MORPHINE")
    );
    expect(morphine?.pilotEligible).toBe(false);
    if (morphine) {
      const issues = validatePilotActivationCandidate(morphine, {}, []);
      expect(issues.some((i) => i.kind === "NOT_PILOT_ELIGIBLE")).toBe(true);
    }
  });

  it("requires full chain for eligible rows", () => {
    const entry = HAITI_CANONICAL_ACTIVATION_PILOT_ELIGIBLE[0];
    expect(entry).toBeDefined();
    const issues = validatePilotActivationCandidate(entry!, {}, []);
    expect(issues.some((i) => i.kind === "MISSING_PRODUCT")).toBe(true);
  });

  it("passes billing preservation when chain matches catalog", () => {
    const entry = HAITI_CANONICAL_ACTIVATION_PILOT_ELIGIBLE[0]!;
    const chain = {
      concept: { code: entry.proposedConceptCode, isActive: false },
      product: {
        productId: "p1",
        productCode: entry.proposedProductCode,
        legacyCatalogMedicationId: "cat-1",
        conceptGenericName: entry.genericName,
        baselineAvailable: false,
        packageNdc11: null,
        packageCode: entry.proposedPackageCode,
      },
      package: { code: entry.proposedPackageCode, isActive: false, ndc11: null },
      catalog: {
        catalogId: "cat-1",
        catalogCode: entry.catalogMedicationCode,
        genericName: entry.genericName,
        ndc11: null,
        billingCodeDefault: null,
      },
      safetyProfile: {
        isControlled: false,
        isHighAlert: false,
        requiresWitness: false,
        requiresDoubleSign: false,
        lasaGroupId: null,
      },
      billingProfileHcpcs: null,
    };
    const issues = validatePilotActivationCandidate(entry, chain, [chain.product!]);
    expect(issues.filter((i) => i.severity === "blocking")).toHaveLength(0);
  });

  it("flags provider search inflation", () => {
    const { issues, inflation } = validateProviderSearchNonRegression({
      catalogIdsBefore: ["a", "b"],
      catalogIdsAfter: ["a", "b", "c"],
    });
    expect(inflation).toBe(1);
    expect(issues.some((i) => i.kind === "SEARCH_INFLATION")).toBe(true);
  });

  it("computes pilot readiness scores", () => {
    const scores = computePilotReadinessScores({
      linkageIntegrityScore: 90,
      billingScore: 85,
      governanceScore: 80,
      searchInflation: 0,
    });
    expect(scores.activationSafety).toBeGreaterThan(70);
    expect(scores.enterpriseReadiness).toBeGreaterThan(60);
  });
});
