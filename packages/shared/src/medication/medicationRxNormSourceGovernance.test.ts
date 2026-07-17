import { describe, expect, it } from "vitest";
import {
  assertRealSyntheticBoundary,
  buildRealReleaseIdentifier,
  isRealSourceClassification,
  REAL_IMPORT_MODE_VALUES,
  requiresFullReleaseConfirm,
  resolveIsSyntheticFromClassification,
  RXNORM_NORMALIZATION_VERSION,
  RXNORM_RELEASE_MANIFEST_VERSION,
  RXNORM_SOURCE_CLASSIFICATION_VALUES,
  stagingDataClassificationForSource,
  validateRxNormReleaseManifest,
  type RxNormReleaseManifest,
} from "./medicationRxNormSourceGovernance.js";

const BASE_MANIFEST: RxNormReleaseManifest = {
  manifestVersion: RXNORM_RELEASE_MANIFEST_VERSION,
  sourceClassification: "DEV_SAMPLE",
  releaseScope: "DEVELOPMENT_SUBSET",
  releaseVersionOfficial: "STRUCTURAL-P5-20261007",
  licenseAcknowledged: true,
  importPurpose: "PHASE_5_NONCLINICAL_VALIDATION",
  termTypes: ["IN", "SCD", "SBD", "DF", "GPCK"],
  rxcuiAllowlist: [],
  files: [
    {
      fileName: "structural-rxnconso-p5.rrf.fixture",
      fileRole: "RXNCONSO",
      sha256: "a".repeat(64),
    },
  ],
};

describe("medicationRxNormSourceGovernance", () => {
  it("exports stable enum values", () => {
    expect(RXNORM_SOURCE_CLASSIFICATION_VALUES).toContain("NLM_OFFICIAL");
    expect(RXNORM_SOURCE_CLASSIFICATION_VALUES).toContain("DEV_SAMPLE");
    expect(REAL_IMPORT_MODE_VALUES).toContain("STAGE_REAL_REFERENCE");
    expect(RXNORM_NORMALIZATION_VERSION).toBe("RXNORM_NORMALIZATION_V1");
  });

  it("validates a well-formed manifest", () => {
    expect(validateRxNormReleaseManifest(BASE_MANIFEST)).toEqual([]);
  });

  it("rejects unacknowledged license", () => {
    const errors = validateRxNormReleaseManifest({
      ...BASE_MANIFEST,
      licenseAcknowledged: false,
    });
    expect(errors.some((entry) => entry.includes("licenseAcknowledged"))).toBe(true);
  });

  it("requires exactly one RXNCONSO file", () => {
    const errors = validateRxNormReleaseManifest({
      ...BASE_MANIFEST,
      files: [
        {
          fileName: "only-rxnsat.rrf.fixture",
          fileRole: "RXNSAT",
          sha256: "a".repeat(64),
        },
      ],
    });
    expect(errors.some((entry) => entry.includes("RXNCONSO"))).toBe(true);
  });

  it("detects real vs non-real classifications", () => {
    expect(isRealSourceClassification("NLM_OFFICIAL")).toBe(true);
    expect(isRealSourceClassification("APPROVED_NLM_EXTRACT")).toBe(true);
    expect(isRealSourceClassification("DEV_SAMPLE")).toBe(false);
    expect(isRealSourceClassification("SYNTHETIC_FIXTURE")).toBe(false);
  });

  it("requires full-release confirmation for FULL_RELEASE scope", () => {
    expect(requiresFullReleaseConfirm("FULL_RELEASE")).toBe(true);
    expect(requiresFullReleaseConfirm("DEVELOPMENT_SUBSET")).toBe(false);
  });

  it("derives isSynthetic from classification", () => {
    expect(resolveIsSyntheticFromClassification("NLM_OFFICIAL")).toBe(false);
    expect(resolveIsSyntheticFromClassification("DEV_SAMPLE")).toBe(true);
  });

  it("maps staging data classification by source", () => {
    expect(stagingDataClassificationForSource("NLM_OFFICIAL")).toBe("REFERENCE");
    expect(stagingDataClassificationForSource("DEV_SAMPLE")).toBe("DEV_SAMPLE");
    expect(stagingDataClassificationForSource("SYNTHETIC_FIXTURE")).toBe("FIXTURE");
  });

  it("builds deterministic release identifiers", () => {
    const id = buildRealReleaseIdentifier({
      releaseVersionOfficial: "2026AA",
      releaseScope: "DEVELOPMENT_SUBSET",
      manifestHashSha256: "abcdef0123456789".padEnd(64, "0"),
    });
    expect(id).toBe("REAL-2026AA-DEVELOPMENT_SUBSET-abcdef012345");
  });

  it("enforces real/synthetic boundary rules", () => {
    expect(() =>
      assertRealSyntheticBoundary({
        sourceClassification: "NLM_OFFICIAL",
        isSynthetic: true,
      })
    ).toThrow(/RealSyntheticBoundaryViolation/);

    expect(() =>
      assertRealSyntheticBoundary({
        sourceClassification: "NLM_OFFICIAL",
        isSynthetic: false,
        rxcui: "SYNTH000001",
      })
    ).toThrow(/SYNTH-prefixed/);

    expect(() =>
      assertRealSyntheticBoundary({
        sourceClassification: "DEV_SAMPLE",
        isSynthetic: true,
        rxcui: "900000001",
      })
    ).not.toThrow();
  });
});
