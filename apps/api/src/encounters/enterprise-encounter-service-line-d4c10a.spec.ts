/**
 * MEDUI.D4C.10A — API-facing provenance contracts (static + resolver).
 */
import {
  assertEncounterServiceLineEnabledForFacility,
  EncounterServiceLineResolutionError,
  inferDeterministicHistoricalServiceLine,
  resolveAuthoritativeEncounterServiceLine,
  serviceLinesMatchForConcurrency,
} from "@medora/shared";

describe("MEDUI.D4C.10A encounter serviceLine create mappings", () => {
  it("Dental OUTPATIENT → DENTAL", () => {
    expect(
      resolveAuthoritativeEncounterServiceLine({
        encounterType: "OUTPATIENT",
        requestedServiceLine: "DENTAL",
        roomLabel: "DENTAL",
      }).serviceLine
    ).toBe("DENTAL");
  });

  it("Clinic OUTPATIENT → CLINIC", () => {
    expect(
      resolveAuthoritativeEncounterServiceLine({ encounterType: "OUTPATIENT" }).serviceLine
    ).toBe("CLINIC");
  });

  it("ED → EMERGENCY", () => {
    expect(
      resolveAuthoritativeEncounterServiceLine({ encounterType: "EMERGENCY" }).serviceLine
    ).toBe("EMERGENCY");
  });

  it("Inpatient → MEDSURG; observation billing → OBSERVATION", () => {
    expect(
      resolveAuthoritativeEncounterServiceLine({
        encounterType: "INPATIENT",
        workflowHint: "DIRECT_ADMISSION",
      }).serviceLine
    ).toBe("MEDSURG");
    expect(
      resolveAuthoritativeEncounterServiceLine({
        encounterType: "INPATIENT",
        billingClassification: "OBSERVATION",
      }).serviceLine
    ).toBe("OBSERVATION");
  });

  it("rejects disabled Dental on Clinic-only facility", () => {
    expect(() =>
      assertEncounterServiceLineEnabledForFacility({
        facilityType: "CLINIC",
        configuredServiceLines: ["CLINIC"],
        serviceLine: "DENTAL",
      })
    ).toThrow(EncounterServiceLineResolutionError);
  });

  it("allows historical disabled-line encounters to remain conceptually readable (null/unknown ok)", () => {
    expect(
      inferDeterministicHistoricalServiceLine({
        type: "OUTPATIENT",
        nursingAssessment: {
          dentalServiceLineV1: { serviceLine: "DENTAL" },
        },
      })
    ).toBe("DENTAL");
    // Gate applies to NEW creates only — historical rows keep their persisted token.
    expect(serviceLinesMatchForConcurrency("DENTAL", "DENTAL")).toBe(true);
  });

  it("two OUTPATIENT lines differ for concurrency prep", () => {
    expect(serviceLinesMatchForConcurrency("CLINIC", "DENTAL")).toBe(false);
  });

  it("does not fabricate CLINIC for untagged OUTPATIENT history", () => {
    expect(inferDeterministicHistoricalServiceLine({ type: "OUTPATIENT" })).toBeNull();
  });
});
