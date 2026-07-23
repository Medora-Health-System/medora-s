/**
 * D4A.2.8-HF3 — Authority still blocks genuine cross-facility access (security invariant).
 */

import { describe, expect, it } from "vitest";
import { resolveHospitalEncounterAuthority } from "../index.js";

const WAYNE = "90395a66-20d0-4165-aa76-e37ba3d520ed";
const OTHER = "084ee961-6fd2-44fc-b7eb-821076882729";
const REQ = "8ad88df5-68e0-4fc8-9ca6-2eb116d32ced";

describe("D4A.2.8-HF3 cross-facility authority invariant", () => {
  it("still returns FACILITY_MISMATCH when expected facility disagrees with encounter", () => {
    const r = resolveHospitalEncounterAuthority({
      requestedEncounterId: REQ,
      expectedFacilityId: OTHER,
      foundById: {
        id: REQ,
        facilityId: WAYNE,
        patientId: "p1",
        type: "INPATIENT",
        status: "OPEN",
        admissionSummaryJson: { requestedEncounterType: "INPATIENT" },
      },
      workspace: "INPATIENT",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.category).toBe("FACILITY_MISMATCH");
    }
  });

  it("allows matching Wayne facility", () => {
    const r = resolveHospitalEncounterAuthority({
      requestedEncounterId: REQ,
      expectedFacilityId: WAYNE,
      foundById: {
        id: REQ,
        facilityId: WAYNE,
        patientId: "p1",
        type: "INPATIENT",
        status: "OPEN",
        admissionSummaryJson: { requestedEncounterType: "INPATIENT" },
      },
      workspace: "INPATIENT",
    });
    expect(r.ok).toBe(true);
  });
});
