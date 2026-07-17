import {
  assertReadOnlyPrismaSurface,
  classifyProductionVsFixture,
  findDuplicateStrings,
  isDevSampleRow,
  isFixtureLikeCode,
  READ_ONLY_MUTATION_METHODS,
  sortKeysDeep,
  stableJsonStringify,
} from "./medication-audit-types";
import { collectSeedFileCounts } from "./medication-catalog-metrics";
import {
  buildBaselineMaturityDomains,
  computeMaturityForEmptyCatalog,
  computeMaturityPercentage,
  computeMaturitySummary,
  MATURITY_DOMAIN_COUNT,
  resolveFinalDecision,
} from "./medication-maturity-score";
import { buildImplementationRoadmap, ROADMAP_PHASE_COUNT } from "./medication-roadmap";

describe("medication intelligence phase 1 audit tooling", () => {
  it("computes maturity percentage from domain scores", () => {
    const domains = buildBaselineMaturityDomains();
    const summary = computeMaturitySummary(domains);
    expect(domains).toHaveLength(MATURITY_DOMAIN_COUNT);
    expect(summary.percentage).toBe(computeMaturityPercentage(domains));
    expect(summary.percentage).toBeGreaterThan(40);
    expect(summary.percentage).toBeLessThan(60);
  });

  it("handles empty catalog metrics in maturity helper", () => {
    const summary = computeMaturityForEmptyCatalog();
    expect(summary.domainCount).toBe(28);
    expect(summary.maxPossible).toBe(140);
  });

  it("detects duplicate strings", () => {
    expect(findDuplicateStrings(["A", "a", "B", "C"])).toEqual(["a"]);
    expect(findDuplicateStrings(["unique"])).toEqual([]);
  });

  it("detects fixture MST_ code patterns", () => {
    expect(isFixtureLikeCode("GENERIC_MST_ABC")).toBe(true);
    expect(isFixtureLikeCode("ROUTE_IM_MST_001")).toBe(true);
    expect(isFixtureLikeCode("IBUPROFEN_200")).toBe(false);
  });

  it("classifies DEV-SAMPLE vs production-like rows", () => {
    expect(isDevSampleRow({ code: "R50.9", description: "MEDORA DEV SAMPLE ONLY" })).toBe(true);
    expect(isDevSampleRow({ code: "IBUPROFEN_200", name: "Ibuprofen" })).toBe(false);
    const classified = classifyProductionVsFixture(["IBUPROFEN_200", "GENERIC_MST_X", "ACETAMINOPHEN_500"]);
    expect(classified.fixtureLike).toBe(1);
    expect(classified.productionLike).toBe(2);
  });

  it("reports roadmap phase count = 11", () => {
    const roadmap = buildImplementationRoadmap("seed_files_only", "MEDIUM");
    expect(ROADMAP_PHASE_COUNT).toBe(11);
    expect(roadmap.phases).toHaveLength(11);
    expect(roadmap.milestones.map((row) => row.id).sort()).toEqual(["A", "B", "C", "D", "E", "F", "G"]);
  });

  it("serializes JSON with stable sorted keys", () => {
    const first = stableJsonStringify({ z: 1, a: { y: 2, b: 3 } });
    const second = stableJsonStringify({ a: { b: 3, y: 2 }, z: 1 });
    expect(first).toBe(second);
    expect(first.indexOf('"a"')).toBeLessThan(first.indexOf('"z"'));
  });

  it("sortKeysDeep is deterministic", () => {
    expect(sortKeysDeep({ b: 1, a: 2 })).toEqual({ a: 2, b: 1 });
  });

  it("documents read-only mutation guard for audit runners", () => {
    expect(assertReadOnlyPrismaSurface(["findMany", "count", "$queryRaw"])).toBe(true);
    expect(assertReadOnlyPrismaSurface(["create"])).toBe(false);
    expect(READ_ONLY_MUTATION_METHODS).toContain("update");
    expect(READ_ONLY_MUTATION_METHODS).toContain("deleteMany");
  });

  it("counts orphan/missing identifier counters from seed fallback shape", () => {
    const seeds = collectSeedFileCounts();
    expect(seeds.haitiMedicationCatalogFull).toBeGreaterThan(0);
    expect(seeds.haitiMedicationCatalog).toBeLessThanOrEqual(seeds.haitiMedicationCatalogFull);
  });

  it("resolves foundation repair decision when RxNorm is zero", () => {
    const metrics = {
      liveCounts: { rxNormPopulated: 0, catalogMedication: 100 },
    } as Parameters<typeof resolveFinalDecision>[0];
    expect(resolveFinalDecision(metrics, 51.4)).toBe("MEDICATION_ENGINE_FOUNDATION_REPAIR_REQUIRED");
  });
});

describe("audit runner source guard", () => {
  it("run-medication-readiness-audit.ts does not call prisma create/update/delete", () => {
    const { readFileSync } = require("node:fs") as typeof import("node:fs");
    const { join } = require("node:path") as typeof import("node:path");
    const source = readFileSync(join(__dirname, "run-medication-readiness-audit.ts"), "utf8");
    for (const method of ["create(", "update(", "delete(", "upsert(", "createMany(", "updateMany(", "deleteMany("]) {
      expect(source.includes(`.${method}`)).toBe(false);
    }
  });
});
