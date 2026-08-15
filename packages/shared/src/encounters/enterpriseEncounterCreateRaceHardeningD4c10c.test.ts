import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  D4C10C_CERTIFICATION_ID,
  buildEnterpriseEncounterCreateLockMaterial,
  enterpriseEncounterCreateEpisodeKey,
} from "./enterpriseEncounterCreateRaceHardeningD4c10c.js";

/** Mirror of API hash — keep in sync with encounter-create-race-lock.util.ts */
function hashLockKeys(material: string): { key1: number; key2: number } {
  const digest = createHash("sha256").update(material, "utf8").digest();
  const key1 = digest.readInt32BE(0);
  const key2 = digest.readInt32BE(4);
  return { key1, key2 };
}

describe("MEDUI.D4C.10C encounter create race lock material", () => {
  it("exports certification id", () => {
    expect(D4C10C_CERTIFICATION_ID).toBe("MEDUI.D4C.10C");
  });

  it("treats missing appointment as UNBOUND episode", () => {
    expect(enterpriseEncounterCreateEpisodeKey(null)).toBe("UNBOUND");
    expect(enterpriseEncounterCreateEpisodeKey("")).toBe("UNBOUND");
    expect(enterpriseEncounterCreateEpisodeKey("appt-1")).toBe("APPT:appt-1");
  });

  it("uses distinct lock material for Clinic vs Dental (same patient)", () => {
    const clinic = buildEnterpriseEncounterCreateLockMaterial({
      facilityId: "f1",
      patientId: "p1",
      serviceLine: "CLINIC",
    });
    const dental = buildEnterpriseEncounterCreateLockMaterial({
      facilityId: "f1",
      patientId: "p1",
      serviceLine: "DENTAL",
    });
    expect(clinic).not.toBe(dental);
    expect(hashLockKeys(clinic)).not.toEqual(hashLockKeys(dental));
  });

  it("uses distinct lock material for different appointments", () => {
    const a = buildEnterpriseEncounterCreateLockMaterial({
      facilityId: "f1",
      patientId: "p1",
      serviceLine: "CLINIC",
      appointmentId: "appt-1",
    });
    const b = buildEnterpriseEncounterCreateLockMaterial({
      facilityId: "f1",
      patientId: "p1",
      serviceLine: "CLINIC",
      appointmentId: "appt-2",
    });
    expect(hashLockKeys(a)).not.toEqual(hashLockKeys(b));
  });

  it("isolates facilities", () => {
    const a = buildEnterpriseEncounterCreateLockMaterial({
      facilityId: "f1",
      patientId: "p1",
      serviceLine: "DENTAL",
    });
    const b = buildEnterpriseEncounterCreateLockMaterial({
      facilityId: "f2",
      patientId: "p1",
      serviceLine: "DENTAL",
    });
    expect(hashLockKeys(a)).not.toEqual(hashLockKeys(b));
  });

  it("is stable for the same unbound Dental launch key", () => {
    const a = buildEnterpriseEncounterCreateLockMaterial({
      facilityId: "f1",
      patientId: "p1",
      serviceLine: "DENTAL",
    });
    const b = buildEnterpriseEncounterCreateLockMaterial({
      facilityId: "f1",
      patientId: "p1",
      serviceLine: "dental",
    });
    expect(hashLockKeys(a)).toEqual(hashLockKeys(b));
  });
});
