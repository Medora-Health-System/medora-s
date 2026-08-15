import {
  D4C10C_CERTIFICATION_ID,
  buildEnterpriseEncounterCreateLockMaterial,
  evaluateConcurrentEncounterCreate,
} from "@medora/shared";
import { hashEnterpriseEncounterCreateLockKeys } from "./encounter-create-race-lock.util";

describe("MEDUI.D4C.10C enterprise encounter create race contracts", () => {
  it("exports certification id", () => {
    expect(D4C10C_CERTIFICATION_ID).toBe("MEDUI.D4C.10C");
  });

  it("same Dental unbound launch shares one lock key", () => {
    const a = hashEnterpriseEncounterCreateLockKeys(
      buildEnterpriseEncounterCreateLockMaterial({
        facilityId: "f1",
        patientId: "p1",
        serviceLine: "DENTAL",
      })
    );
    const b = hashEnterpriseEncounterCreateLockKeys(
      buildEnterpriseEncounterCreateLockMaterial({
        facilityId: "f1",
        patientId: "p1",
        serviceLine: "DENTAL",
        appointmentId: null,
      })
    );
    expect(a).toEqual(b);
  });

  it("Clinic + Dental take distinct locks (valid concurrency)", () => {
    const clinic = hashEnterpriseEncounterCreateLockKeys(
      buildEnterpriseEncounterCreateLockMaterial({
        facilityId: "f1",
        patientId: "p1",
        serviceLine: "CLINIC",
      })
    );
    const dental = hashEnterpriseEncounterCreateLockKeys(
      buildEnterpriseEncounterCreateLockMaterial({
        facilityId: "f1",
        patientId: "p1",
        serviceLine: "DENTAL",
      })
    );
    expect(clinic).not.toEqual(dental);
  });

  it("Dental + ED take distinct locks", () => {
    const dental = hashEnterpriseEncounterCreateLockKeys(
      buildEnterpriseEncounterCreateLockMaterial({
        facilityId: "f1",
        patientId: "p1",
        serviceLine: "DENTAL",
      })
    );
    const ed = hashEnterpriseEncounterCreateLockKeys(
      buildEnterpriseEncounterCreateLockMaterial({
        facilityId: "f1",
        patientId: "p1",
        serviceLine: "EMERGENCY",
      })
    );
    expect(dental).not.toEqual(ed);
  });

  it("different appointment IDs take distinct locks", () => {
    const a = hashEnterpriseEncounterCreateLockKeys(
      buildEnterpriseEncounterCreateLockMaterial({
        facilityId: "f1",
        patientId: "p1",
        serviceLine: "CLINIC",
        appointmentId: "appt-a",
      })
    );
    const b = hashEnterpriseEncounterCreateLockKeys(
      buildEnterpriseEncounterCreateLockMaterial({
        facilityId: "f1",
        patientId: "p1",
        serviceLine: "CLINIC",
        appointmentId: "appt-b",
      })
    );
    expect(a).not.toEqual(b);
  });

  it("cross-facility same patient does not share lock", () => {
    const a = hashEnterpriseEncounterCreateLockKeys(
      buildEnterpriseEncounterCreateLockMaterial({
        facilityId: "f1",
        patientId: "p1",
        serviceLine: "DENTAL",
      })
    );
    const b = hashEnterpriseEncounterCreateLockKeys(
      buildEnterpriseEncounterCreateLockMaterial({
        facilityId: "f2",
        patientId: "p1",
        serviceLine: "DENTAL",
      })
    );
    expect(a).not.toEqual(b);
  });

  it("policy: concurrent same Dental unbound → IDEMPOTENT_REUSE", () => {
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

  it("policy: Clinic + Dental remain ALLOW_DISTINCT_SERVICE_LINE", () => {
    const d = evaluateConcurrentEncounterCreate({
      pathway: "GENERAL_CREATE",
      requestedType: "OUTPATIENT",
      requestedServiceLine: "DENTAL",
      existingOpen: [{ id: "c1", type: "OUTPATIENT", status: "OPEN", serviceLine: "CLINIC" }],
    });
    expect(d.allowed).toBe(true);
    if (d.allowed) expect(d.code).toBe("ALLOW_DISTINCT_SERVICE_LINE");
  });

  it("policy: different Clinic appointment IDs may create distinct episodes", () => {
    const d = evaluateConcurrentEncounterCreate({
      pathway: "GENERAL_CREATE",
      requestedType: "OUTPATIENT",
      requestedServiceLine: "CLINIC",
      requestedAppointmentId: "appt-b",
      existingOpen: [
        {
          id: "c1",
          type: "OUTPATIENT",
          status: "OPEN",
          serviceLine: "CLINIC",
          appointmentId: "appt-a",
        },
      ],
    });
    expect(d.allowed).toBe(true);
    if (d.allowed) expect(d.code).not.toBe("IDEMPOTENT_REUSE");
  });

  it("policy: same appointment check-in reuses", () => {
    const d = evaluateConcurrentEncounterCreate({
      pathway: "GENERAL_CREATE",
      requestedType: "OUTPATIENT",
      requestedServiceLine: "CLINIC",
      requestedAppointmentId: "appt-a",
      existingOpen: [
        {
          id: "c1",
          type: "OUTPATIENT",
          status: "OPEN",
          serviceLine: "CLINIC",
          appointmentId: "appt-a",
        },
      ],
    });
    expect(d.allowed).toBe(true);
    if (d.allowed) {
      expect(d.code).toBe("IDEMPOTENT_REUSE");
      expect(d.reuseEncounterId).toBe("c1");
    }
  });

  it("D3E.6D inpatient duplicate block unchanged", () => {
    const d = evaluateConcurrentEncounterCreate({
      pathway: "DIRECT_ADMISSION",
      requestedType: "INPATIENT",
      existingOpen: [{ id: "ip1", type: "INPATIENT", status: "OPEN", serviceLine: "MEDSURG" }],
    });
    expect(d.allowed).toBe(false);
    if (!d.allowed) expect(d.code).toBe("DUPLICATE_INPATIENT");
  });

  it("legacy null serviceLine vs Dental remains ALLOW", () => {
    const d = evaluateConcurrentEncounterCreate({
      pathway: "GENERAL_CREATE",
      requestedType: "OUTPATIENT",
      requestedServiceLine: "DENTAL",
      existingOpen: [{ id: "leg", type: "OUTPATIENT", status: "OPEN", serviceLine: null }],
    });
    expect(d.allowed).toBe(true);
  });

  it("legacy null serviceLine vs Clinic remains conservative block", () => {
    const d = evaluateConcurrentEncounterCreate({
      pathway: "GENERAL_CREATE",
      requestedType: "OUTPATIENT",
      requestedServiceLine: "CLINIC",
      existingOpen: [{ id: "leg", type: "OUTPATIENT", status: "OPEN", serviceLine: null }],
    });
    expect(d.allowed).toBe(false);
  });

  it("source: EncountersService audits ENCOUNTER_CREATE only after created (not reuse)", () => {
    const fs = require("fs") as typeof import("fs");
    const path = require("path") as typeof import("path");
    const src = fs.readFileSync(path.join(__dirname, "encounters.service.ts"), "utf8");
    expect(src).toContain('if (txnResult.kind === "reuse")');
    expect(src).toContain("acquireEnterpriseEncounterCreateRaceLock");
    const reuseIdx = src.indexOf('if (txnResult.kind === "reuse")');
    const auditIdx = src.indexOf("AuditAction.ENCOUNTER_CREATE", reuseIdx);
    expect(auditIdx).toBeGreaterThan(reuseIdx);
    expect(src.slice(reuseIdx, auditIdx)).toContain("return toEncounterClinicResponse");
  });

  it("source: appointment check-in skips ENCOUNTER_CREATE on reuse", () => {
    const fs = require("fs") as typeof import("fs");
    const path = require("path") as typeof import("path");
    const src = fs.readFileSync(
      path.join(__dirname, "../appointments/appointments.service.ts"),
      "utf8"
    );
    expect(src).toContain('if (result.kind === "created")');
    expect(src).toContain('kind: "reuse" as const');
    expect(src).toContain("acquireEnterpriseEncounterCreateRaceLock");
  });
});
