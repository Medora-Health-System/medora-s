import {
  evaluateConcurrentEncounterCreate,
  D4C10B_CERTIFICATION_ID,
} from "@medora/shared";

describe("MEDUI.D4C.10B API concurrency contracts", () => {
  it("exports certification id", () => {
    expect(D4C10B_CERTIFICATION_ID).toBe("MEDUI.D4C.10B");
  });

  it("OPEN Clinic does not block Dental", () => {
    const d = evaluateConcurrentEncounterCreate({
      pathway: "GENERAL_CREATE",
      requestedType: "OUTPATIENT",
      requestedServiceLine: "DENTAL",
      existingOpen: [{ id: "c1", type: "OUTPATIENT", status: "OPEN", serviceLine: "CLINIC" }],
    });
    expect(d.allowed).toBe(true);
  });

  it("same Dental episode reuses existing encounterId", () => {
    const d = evaluateConcurrentEncounterCreate({
      pathway: "GENERAL_CREATE",
      requestedType: "OUTPATIENT",
      requestedServiceLine: "DENTAL",
      existingOpen: [{ id: "d1", type: "OUTPATIENT", status: "OPEN", serviceLine: "DENTAL" }],
    });
    expect(d.allowed).toBe(true);
    if (d.allowed) {
      expect(d.code).toBe("IDEMPOTENT_REUSE");
      expect(d.reuseEncounterId).toBe("d1");
    }
  });

  it("registration-only patient (no open) allows Dental", () => {
    expect(
      evaluateConcurrentEncounterCreate({
        pathway: "GENERAL_CREATE",
        requestedType: "OUTPATIENT",
        requestedServiceLine: "DENTAL",
        existingOpen: [],
      }).allowed
    ).toBe(true);
  });

  it("does not treat global OPEN_ENCOUNTER_EXISTS for distinct service lines", () => {
    const d = evaluateConcurrentEncounterCreate({
      pathway: "GENERAL_CREATE",
      requestedType: "OUTPATIENT",
      requestedServiceLine: "DENTAL",
      existingOpen: [{ id: "c1", type: "OUTPATIENT", status: "OPEN", serviceLine: "CLINIC" }],
    });
    expect(d.allowed).toBe(true);
    if (d.allowed) expect(d.code).not.toBe("OK"); // ALLOW_DISTINCT_SERVICE_LINE
    expect(JSON.stringify(d)).not.toContain("OPEN_ENCOUNTER_EXISTS");
  });

  it("preserves duplicate inpatient block", () => {
    const d = evaluateConcurrentEncounterCreate({
      pathway: "DIRECT_ADMISSION",
      requestedType: "INPATIENT",
      existingOpen: [{ id: "ip1", type: "INPATIENT", status: "OPEN", serviceLine: "MEDSURG" }],
    });
    expect(d.allowed).toBe(false);
    if (!d.allowed) expect(d.code).toBe("DUPLICATE_INPATIENT");
  });
});
