import { describe, expect, it } from "vitest";
import { runChartCertificationBenchmarkStageA } from "./chartCertificationBenchmark.js";
import { buildEdClosedEncounterCertification } from "./edClosedEncounterCertification.js";
import { ED_DISCHARGE_MODE_ADMISSION } from "./edEncounterLifecycle.js";

describe("chartCertificationBenchmark Stage A", () => {
  it("runs measured synthetic fixtures without duplicates", () => {
    const metrics = runChartCertificationBenchmarkStageA();
    expect(metrics.cases).toBeGreaterThanOrEqual(3);
    expect(metrics.duplicateRate).toBe(0);
    expect(metrics.precision).toBeGreaterThan(0);
    expect(metrics.recall).toBeGreaterThan(0);
  });

  it("admission fixture never emits home discharge summary deficiency", () => {
    const result = buildEdClosedEncounterCertification({
      lifecycleSnapshot: {
        status: "OPEN",
        providerDocumentationStatus: "SIGNED",
        chiefComplaint: "ACS",
        providerNote: "Admit",
        encounterType: "EMERGENCY",
        dischargeSummaryJson: { dischargeMode: ED_DISCHARGE_MODE_ADMISSION },
        admissionSummaryJson: { admittingService: "Medicine" },
        nursingAssessment: {
          nursingEvalV1: { sections: { assessment: { text: "RN" } } },
          erHandoffV1: { readyForInpatientTransfer: true },
        },
      },
    });
    expect(result.deficiencies.some((d) => d.id === "doc:DISCHARGE_SUMMARY")).toBe(false);
  });
});
