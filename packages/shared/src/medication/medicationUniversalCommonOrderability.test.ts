import { describe, expect, it } from "vitest";
import {
  UNIVERSAL_COMMON_MEDICATION_ORDERABILITY_PROGRAM_KEY,
  decideUniversalCommonOrderabilityCertification,
} from "./medicationUniversalCommonOrderability.js";

describe("Universal Common Medication Orderability", () => {
  it("uses a stable program key", () => {
    expect(UNIVERSAL_COMMON_MEDICATION_ORDERABILITY_PROGRAM_KEY).toContain(
      "UNIVERSAL_COMMON_MEDICATION_ORDERABILITY"
    );
  });

  it("requires 100% universal benchmark for full CERTIFIED", () => {
    expect(
      decideUniversalCommonOrderabilityCertification({
        schemaOk: true,
        regressionOk: true,
        fabricatedData: false,
        dualLayerBulkActivated: false,
        orderMutations: 0,
        marMutations: 0,
        chartMutations: 0,
        completionIdempotent: true,
        hardAcceptancePass: true,
        benchmarkFamilyCount: 5301,
        benchmarkSearchPassRate: 0.999,
        benchmarkOrderabilityPassRate: 1,
        exactBrandRankingPassRate: 1,
        exactGenericRankingPassRate: 1,
        missingFamilyCount: 0,
        familySearchPassRate: 1,
      })
    ).toBe("MEDICATION_FORMULATION_STRENGTH_COMPLETION_CERTIFIED_WITH_REVIEW_ITEMS");
  });

  it("certifies when universal benchmark is fully complete", () => {
    expect(
      decideUniversalCommonOrderabilityCertification({
        schemaOk: true,
        regressionOk: true,
        fabricatedData: false,
        dualLayerBulkActivated: false,
        orderMutations: 0,
        marMutations: 0,
        chartMutations: 0,
        completionIdempotent: true,
        hardAcceptancePass: true,
        benchmarkFamilyCount: 5301,
        benchmarkSearchPassRate: 1,
        benchmarkOrderabilityPassRate: 1,
        exactBrandRankingPassRate: 1,
        exactGenericRankingPassRate: 1,
        missingFamilyCount: 0,
        familySearchPassRate: 1,
      })
    ).toBe("MEDICATION_FORMULATION_STRENGTH_COMPLETION_CERTIFIED");
  });
});
