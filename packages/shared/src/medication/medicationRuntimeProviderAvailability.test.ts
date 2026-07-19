import { describe, expect, it } from "vitest";
import {
  MEDICATION_RUNTIME_PROVIDER_AVAILABILITY_CERTIFICATION_ID,
  decideMedicationRuntimeProviderAvailability,
} from "./medicationRuntimeProviderAvailability.js";

describe("Medication Runtime Provider Availability", () => {
  it("uses runtime certification id", () => {
    expect(MEDICATION_RUNTIME_PROVIDER_AVAILABILITY_CERTIFICATION_ID).toContain(
      "RUNTIME_PROVIDER_AVAILABILITY"
    );
  });

  it("fails closed when snapshot bypass was used", () => {
    expect(
      decideMedicationRuntimeProviderAvailability({
        schemaOk: true,
        regressionOk: true,
        targetIsProductionEquivalent: true,
        usedRealMedicationCatalogService: true,
        usedSnapshotBypassValidator: true,
        hardAcceptancePass: true,
        orderMutations: 0,
        marMutations: 0,
        chartMutations: 0,
        fabricatedData: false,
        runtimeSearchPassRate: 1,
        runtimeOrderabilityPassRate: 1,
        completelyAbsentCount: 0,
        databaseApplyCompleted: true,
      })
    ).toBe("MEDICATION_RUNTIME_PROVIDER_AVAILABILITY_NOT_CERTIFIED");
  });

  it("fails closed when hard acceptance fails", () => {
    expect(
      decideMedicationRuntimeProviderAvailability({
        schemaOk: true,
        regressionOk: true,
        targetIsProductionEquivalent: true,
        usedRealMedicationCatalogService: true,
        usedSnapshotBypassValidator: false,
        hardAcceptancePass: false,
        orderMutations: 0,
        marMutations: 0,
        chartMutations: 0,
        fabricatedData: false,
        runtimeSearchPassRate: 1,
        runtimeOrderabilityPassRate: 1,
        completelyAbsentCount: 0,
        databaseApplyCompleted: true,
      })
    ).toBe("MEDICATION_RUNTIME_PROVIDER_AVAILABILITY_NOT_CERTIFIED");
  });

  it("certifies when production-path evidence is complete", () => {
    expect(
      decideMedicationRuntimeProviderAvailability({
        schemaOk: true,
        regressionOk: true,
        targetIsProductionEquivalent: true,
        usedRealMedicationCatalogService: true,
        usedSnapshotBypassValidator: false,
        hardAcceptancePass: true,
        orderMutations: 0,
        marMutations: 0,
        chartMutations: 0,
        fabricatedData: false,
        runtimeSearchPassRate: 1,
        runtimeOrderabilityPassRate: 1,
        completelyAbsentCount: 0,
        databaseApplyCompleted: true,
      })
    ).toBe("MEDICATION_RUNTIME_PROVIDER_AVAILABILITY_CERTIFIED");
  });
});
