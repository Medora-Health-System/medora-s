import { describe, expect, it } from "vitest";
import {
  D4C10B_CERTIFICATION_ID,
  evaluateConcurrentEncounterCreate,
} from "./concurrentEncounterPolicyV1.js";

describe("MEDUI.D4C.10B concurrent multi-service encounter policy", () => {
  it("exports certification id", () => {
    expect(D4C10B_CERTIFICATION_ID).toBe("MEDUI.D4C.10B");
  });

  it("allows Clinic then Dental (distinct service lines)", () => {
    const d = evaluateConcurrentEncounterCreate({
      pathway: "GENERAL_CREATE",
      requestedType: "OUTPATIENT",
      requestedServiceLine: "DENTAL",
      existingOpen: [{ id: "c1", type: "OUTPATIENT", status: "OPEN", serviceLine: "CLINIC" }],
    });
    expect(d.allowed).toBe(true);
    if (d.allowed) expect(d.code).toBe("ALLOW_DISTINCT_SERVICE_LINE");
  });

  it("allows Dental then Clinic", () => {
    const d = evaluateConcurrentEncounterCreate({
      pathway: "GENERAL_CREATE",
      requestedType: "OUTPATIENT",
      requestedServiceLine: "CLINIC",
      existingOpen: [{ id: "d1", type: "OUTPATIENT", status: "OPEN", serviceLine: "DENTAL" }],
    });
    expect(d.allowed).toBe(true);
  });

  it("reuses same Dental episode on double-click (no appointment)", () => {
    const d = evaluateConcurrentEncounterCreate({
      pathway: "GENERAL_CREATE",
      requestedType: "OUTPATIENT",
      requestedServiceLine: "DENTAL",
      existingOpen: [{ id: "d1", type: "OUTPATIENT", status: "OPEN", serviceLine: "DENTAL" }],
    });
    expect(d).toEqual({
      allowed: true,
      code: "IDEMPOTENT_REUSE",
      reuseEncounterId: "d1",
    });
  });

  it("allows second Clinic episode when appointment ids differ", () => {
    const d = evaluateConcurrentEncounterCreate({
      pathway: "GENERAL_CREATE",
      requestedType: "OUTPATIENT",
      requestedServiceLine: "CLINIC",
      requestedAppointmentId: "appt-2",
      existingOpen: [
        {
          id: "c1",
          type: "OUTPATIENT",
          status: "OPEN",
          serviceLine: "CLINIC",
          appointmentId: "appt-1",
        },
      ],
    });
    expect(d.allowed).toBe(true);
  });

  it("allows Dental when legacy null OUTPATIENT exists (does not invent CLINIC)", () => {
    const d = evaluateConcurrentEncounterCreate({
      pathway: "GENERAL_CREATE",
      requestedType: "OUTPATIENT",
      requestedServiceLine: "DENTAL",
      existingOpen: [{ id: "legacy", type: "OUTPATIENT", status: "OPEN", serviceLine: null }],
    });
    expect(d.allowed).toBe(true);
  });

  it("conservatively blocks Clinic when legacy null OUTPATIENT exists", () => {
    const d = evaluateConcurrentEncounterCreate({
      pathway: "GENERAL_CREATE",
      requestedType: "OUTPATIENT",
      requestedServiceLine: "CLINIC",
      existingOpen: [{ id: "legacy", type: "OUTPATIENT", status: "OPEN", serviceLine: null }],
    });
    expect(d.allowed).toBe(false);
    if (!d.allowed) {
      expect(d.code).toBe("DUPLICATE_ACTIVE_SERVICE_ENCOUNTER");
      expect(d.existingEncounterId).toBe("legacy");
    }
  });

  it("allows ED + Dental", () => {
    const d = evaluateConcurrentEncounterCreate({
      pathway: "GENERAL_CREATE",
      requestedType: "OUTPATIENT",
      requestedServiceLine: "DENTAL",
      existingOpen: [{ id: "ed1", type: "EMERGENCY", status: "OPEN", serviceLine: "EMERGENCY" }],
    });
    expect(d.allowed).toBe(true);
  });

  it("preserves ED + Inpatient hospital allowance", () => {
    const d = evaluateConcurrentEncounterCreate({
      pathway: "DIRECT_ADMISSION",
      requestedType: "INPATIENT",
      existingOpen: [{ id: "ed1", type: "EMERGENCY", status: "OPEN", serviceLine: "EMERGENCY" }],
    });
    expect(d.allowed).toBe(true);
    if (d.allowed) expect(d.code).toBe("ALLOW_ED_PLUS_INPATIENT");
  });

  it("still blocks uncorrelated duplicate Inpatient", () => {
    const d = evaluateConcurrentEncounterCreate({
      pathway: "DIRECT_ADMISSION",
      requestedType: "INPATIENT",
      existingOpen: [{ id: "ip1", type: "INPATIENT", status: "OPEN", serviceLine: "MEDSURG" }],
    });
    expect(d.allowed).toBe(false);
    if (!d.allowed) expect(d.code).toBe("DUPLICATE_INPATIENT");
  });

  it("registration-only (no open) allows Dental", () => {
    const d = evaluateConcurrentEncounterCreate({
      pathway: "GENERAL_CREATE",
      requestedType: "OUTPATIENT",
      requestedServiceLine: "DENTAL",
      existingOpen: [],
    });
    expect(d).toEqual({ allowed: true, code: "OK" });
  });

  it("GENERAL_CREATE no longer uses global any-open block for distinct lines", () => {
    const d = evaluateConcurrentEncounterCreate({
      pathway: "GENERAL_CREATE",
      requestedType: "OUTPATIENT",
      requestedServiceLine: "DENTAL",
      existingOpen: [
        { id: "c1", type: "OUTPATIENT", status: "OPEN", serviceLine: "CLINIC" },
        { id: "ed1", type: "EMERGENCY", status: "OPEN", serviceLine: "EMERGENCY" },
      ],
    });
    expect(d.allowed).toBe(true);
  });
});
