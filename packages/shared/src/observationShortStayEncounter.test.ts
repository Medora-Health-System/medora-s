import { describe, expect, it } from "vitest";
import {
  admissionSummaryJsonSuggestsObservationShortStay,
  hasAdmissionSummaryAnyPopulatedField,
  isObservationShortStayEncounter,
} from "./observationShortStayEncounter";

describe("isObservationShortStayEncounter", () => {
  it("returns true for production-like INPATIENT OPEN with admittedAt even if careLevel missing", () => {
    expect(
      isObservationShortStayEncounter({
        type: "INPATIENT",
        status: "OPEN",
        admittedAt: "2026-01-10T14:00:00.000Z",
        admissionSummaryJson: { admissionReason: "Douleur thoracique", serviceUnit: "Urgences" },
      })
    ).toBe(true);
  });

  it("returns true when careLevel matches observation / short stay", () => {
    expect(
      isObservationShortStayEncounter({
        type: "INPATIENT",
        status: "OPEN",
        admittedAt: null,
        admissionSummaryJson: { careLevel: "Observation" },
      })
    ).toBe(true);
  });

  it("returns true when observation wording appears in a non-careLevel admission field", () => {
    expect(
      isObservationShortStayEncounter({
        type: "INPATIENT",
        status: "OPEN",
        admittedAt: null,
        admissionSummaryJson: { admissionDiagnosis: "Surveillance — court séjour" },
      })
    ).toBe(true);
  });

  it("returns false for EMERGENCY", () => {
    expect(
      isObservationShortStayEncounter({
        type: "EMERGENCY",
        status: "OPEN",
        admittedAt: "2026-01-10T14:00:00.000Z",
        admissionSummaryJson: { careLevel: "Observation" },
      })
    ).toBe(false);
  });

  it("returns false when INPATIENT is CLOSED", () => {
    expect(
      isObservationShortStayEncounter({
        type: "INPATIENT",
        status: "CLOSED",
        admittedAt: "2026-01-10T14:00:00.000Z",
        admissionSummaryJson: { careLevel: "Observation" },
      })
    ).toBe(false);
  });

  it("returns false for OPEN INPATIENT with no admittedAt and empty admission packet", () => {
    expect(
      isObservationShortStayEncounter({
        type: "INPATIENT",
        status: "OPEN",
        admittedAt: null,
        admissionSummaryJson: {},
      })
    ).toBe(false);
  });
});

describe("hasAdmissionSummaryAnyPopulatedField", () => {
  it("is false for null", () => {
    expect(hasAdmissionSummaryAnyPopulatedField(null)).toBe(false);
  });
});

describe("admissionSummaryJsonSuggestsObservationShortStay", () => {
  it("detects short stay wording in initialPlan", () => {
    expect(
      admissionSummaryJsonSuggestsObservationShortStay({
        initialPlan: "Short stay monitoring",
      })
    ).toBe(true);
  });
});
