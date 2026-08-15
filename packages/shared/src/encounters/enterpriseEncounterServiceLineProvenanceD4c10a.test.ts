import { describe, expect, it } from "vitest";
import {
  assertEncounterServiceLineEnabledForFacility,
  encounterServiceLineIsUnknown,
  EncounterServiceLineResolutionError,
  inferDeterministicHistoricalServiceLine,
  isServiceLineCompatibleWithEncounterType,
  normalizePersistedEncounterServiceLine,
  resolveAuthoritativeEncounterServiceLine,
  serviceLinesMatchForConcurrency,
  D4C10A_PRISMA_STORAGE,
} from "./enterpriseEncounterServiceLineProvenanceD4c10a.js";

describe("MEDUI.D4C.10A encounter service-line provenance", () => {
  it("uses string registry storage (not Prisma enum dual authority)", () => {
    expect(D4C10A_PRISMA_STORAGE).toBe("STRING_REGISTRY_VALIDATED");
  });

  it("normalizes MedoraServiceLine tokens", () => {
    expect(normalizePersistedEncounterServiceLine("dental")).toBe("DENTAL");
    expect(normalizePersistedEncounterServiceLine("CLINIC_CARE")).toBe("CLINIC");
    expect(normalizePersistedEncounterServiceLine("")).toBeNull();
    expect(encounterServiceLineIsUnknown(null)).toBe(true);
  });

  it("resolves Dental create to DENTAL", () => {
    const r = resolveAuthoritativeEncounterServiceLine({
      encounterType: "OUTPATIENT",
      requestedServiceLine: "DENTAL",
    });
    expect(r).toEqual({ serviceLine: "DENTAL", source: "REQUESTED" });
  });

  it("resolves Clinic outpatient to CLINIC", () => {
    const r = resolveAuthoritativeEncounterServiceLine({
      encounterType: "OUTPATIENT",
    });
    expect(r).toEqual({ serviceLine: "CLINIC", source: "ENCOUNTER_TYPE" });
  });

  it("resolves ED to EMERGENCY", () => {
    expect(
      resolveAuthoritativeEncounterServiceLine({ encounterType: "EMERGENCY" }).serviceLine
    ).toBe("EMERGENCY");
  });

  it("resolves urgent care type to URGENT_CARE", () => {
    expect(
      resolveAuthoritativeEncounterServiceLine({ encounterType: "URGENT_CARE" }).serviceLine
    ).toBe("URGENT_CARE");
  });

  it("resolves inpatient direct admission to MEDSURG", () => {
    expect(
      resolveAuthoritativeEncounterServiceLine({
        encounterType: "INPATIENT",
        workflowHint: "DIRECT_ADMISSION",
      }).serviceLine
    ).toBe("MEDSURG");
  });

  it("resolves observation placement to OBSERVATION", () => {
    expect(
      resolveAuthoritativeEncounterServiceLine({
        encounterType: "INPATIENT",
        billingClassification: "OBSERVATION",
        workflowHint: "PLACEMENT_OBSERVATION",
      }).serviceLine
    ).toBe("OBSERVATION");
  });

  it("rejects incompatible requested service line", () => {
    expect(() =>
      resolveAuthoritativeEncounterServiceLine({
        encounterType: "EMERGENCY",
        requestedServiceLine: "DENTAL",
      })
    ).toThrow(EncounterServiceLineResolutionError);
  });

  it("gates disabled Dental on Clinic-only facility", () => {
    expect(() =>
      assertEncounterServiceLineEnabledForFacility({
        facilityType: "CLINIC",
        configuredServiceLines: ["CLINIC", "LABORATORY"],
        careProfileJson: { careProfile: "CLINIC" },
        serviceLine: "DENTAL",
      })
    ).toThrow(/not enabled/i);
    expect(() =>
      assertEncounterServiceLineEnabledForFacility({
        facilityType: "CLINIC",
        configuredServiceLines: ["CLINIC", "DENTAL"],
        careProfileJson: { careProfile: "CLINIC" },
        serviceLine: "DENTAL",
      })
    ).not.toThrow();
  });

  it("allows Clinic via registration capability when serviceLinesJson omits CLINIC", () => {
    expect(() =>
      assertEncounterServiceLineEnabledForFacility({
        facilityType: "CLINIC",
        configuredServiceLines: ["OBSERVATION", "LABORATORY"],
        careProfileJson: { careProfile: "CLINIC" },
        serviceLine: "CLINIC",
      })
    ).not.toThrow();
  });

  it("does not invent CLINIC for historical outpatient without dental tag", () => {
    expect(
      inferDeterministicHistoricalServiceLine({
        type: "OUTPATIENT",
        roomLabel: "2",
      })
    ).toBeNull();
  });

  it("deterministically infers DENTAL from tag / roomLabel", () => {
    expect(
      inferDeterministicHistoricalServiceLine({
        type: "OUTPATIENT",
        roomLabel: "DENTAL",
      })
    ).toBe("DENTAL");
    expect(
      inferDeterministicHistoricalServiceLine({
        type: "OUTPATIENT",
        nursingAssessment: {
          dentalServiceLineV1: { careSetting: "DENTAL", serviceLine: "DENTAL" },
        },
      })
    ).toBe("DENTAL");
  });

  it("concurrency helper requires both sides known and equal", () => {
    expect(serviceLinesMatchForConcurrency("CLINIC", "CLINIC")).toBe(true);
    expect(serviceLinesMatchForConcurrency("CLINIC", "DENTAL")).toBe(false);
    expect(serviceLinesMatchForConcurrency(null, "CLINIC")).toBe(false);
    expect(serviceLinesMatchForConcurrency("CLINIC", null)).toBe(false);
  });

  it("allows two OUTPATIENT encounters to differ by serviceLine conceptually", () => {
    expect(isServiceLineCompatibleWithEncounterType("OUTPATIENT", "CLINIC")).toBe(true);
    expect(isServiceLineCompatibleWithEncounterType("OUTPATIENT", "DENTAL")).toBe(true);
    expect(serviceLinesMatchForConcurrency("CLINIC", "DENTAL")).toBe(false);
  });
});
