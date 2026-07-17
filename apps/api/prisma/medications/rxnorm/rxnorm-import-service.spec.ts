import { createHash } from "node:crypto";
import {
  assertCandidateNotAutoVerified,
  buildRxNormRowChecksumKey,
  normalizeRxNormDisplayTerm,
} from "@medora/shared";
import { canActivateRelease, canRollbackRelease } from "./rxnorm-import-service";
import {
  detectDuplicateNormalizedNames,
  parseSyntheticRxNormFixture,
} from "./parse-rxnorm-synthetic";
import { computeRxNormRowChecksum } from "./rxnorm-row-checksum";

const FIXTURE_PATH = `${__dirname}/fixtures/synthetic-rxnorm-cert-p3.json`;

describe("rxnorm synthetic parser", () => {
  it("parses certification fixture and rejects unsupported rows", () => {
    const parsed = parseSyntheticRxNormFixture({
      filePath: FIXTURE_PATH,
      expectedReleaseIdentifier: "SYNTHETIC-CERT-P3-20260717",
    });

    expect(parsed.fixture.notRealRxNorm).toBe(true);
    expect(parsed.acceptedRows.length).toBeGreaterThan(20);
    expect(parsed.rejectedRows.length).toBeGreaterThan(0);
    expect(parsed.rejectedRows.some((row) => row.rejectionReason?.includes("unsupported_term_type"))).toBe(
      true
    );
  });

  it("flags duplicate normalized names in accepted rows", () => {
    const parsed = parseSyntheticRxNormFixture({ filePath: FIXTURE_PATH });
    const duplicates = detectDuplicateNormalizedNames(parsed.acceptedRows);
    expect(duplicates.some((entry) => entry.includes("ondansetron"))).toBe(true);
  });

  it("normalizes display terms consistently", () => {
    expect(normalizeRxNormDisplayTerm("Acetaminophen 500 MG")).toBe("acetaminophen 500 mg");
  });
});

describe("rxnorm row checksum", () => {
  it("is idempotent for stable fields", () => {
    const fields = {
      rxcui: "SYNTH000001",
      termType: "IN",
      displayTerm: "Acetaminophen",
    };
    const first = computeRxNormRowChecksum(fields);
    const second = computeRxNormRowChecksum(fields);
    expect(first).toBe(second);
    expect(first).toHaveLength(64);
    expect(createHash("sha256").update(buildRxNormRowChecksumKey(fields), "utf8").digest("hex")).toBe(first);
  });
});

describe("rxnorm import state helpers", () => {
  it("requires STAGED status for activation", () => {
    expect(canActivateRelease("STAGED", 0)).toBe(true);
    expect(canActivateRelease("STAGED", 1)).toBe(false);
    expect(canActivateRelease("REGISTERED", 0)).toBe(false);
  });

  it("allows rollback for ACTIVE or STAGED releases", () => {
    expect(canRollbackRelease("ACTIVE")).toBe(true);
    expect(canRollbackRelease("STAGED")).toBe(true);
    expect(canRollbackRelease("REGISTERED")).toBe(false);
  });

  it("forbids auto verification", () => {
    expect(() => assertCandidateNotAutoVerified(true)).toThrow(/forbidden/i);
  });
});

describe("rxnorm clinical isolation", () => {
  it("keeps synthetic fixture non-real and fixture-classified", () => {
    const parsed = parseSyntheticRxNormFixture({ filePath: FIXTURE_PATH });
    expect(parsed.fixture.notRealRxNorm).toBe(true);
    expect(parsed.fixture.fixtureKind).toBe("SYNTHETIC_CERTIFICATION");
    expect(parsed.acceptedRows.every((row) => row.rxcui.startsWith("SYNTH"))).toBe(true);
    expect(parsed.acceptedRows.every((row) => row.dataClassification === "FIXTURE")).toBe(true);
  });
});
