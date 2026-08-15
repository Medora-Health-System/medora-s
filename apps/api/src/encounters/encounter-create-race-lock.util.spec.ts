import {
  buildEnterpriseEncounterCreateLockMaterial,
  D4C10C_CERTIFICATION_ID,
} from "@medora/shared";
import {
  acquireEnterpriseEncounterCreateRaceLock,
  hashEnterpriseEncounterCreateLockKeys,
} from "./encounter-create-race-lock.util";

describe("MEDUI.D4C.10C encounter-create-race-lock.util", () => {
  it("exports certification id via util re-export path", () => {
    expect(D4C10C_CERTIFICATION_ID).toBe("MEDUI.D4C.10C");
  });

  it("hashes lock material to two int32 advisory keys", () => {
    const material = buildEnterpriseEncounterCreateLockMaterial({
      facilityId: "f1",
      patientId: "p1",
      serviceLine: "DENTAL",
    });
    const keys = hashEnterpriseEncounterCreateLockKeys(material);
    expect(Number.isInteger(keys.key1)).toBe(true);
    expect(Number.isInteger(keys.key2)).toBe(true);
    expect(keys.key1).not.toBe(keys.key2);
  });

  it("acquires pg_advisory_xact_lock before returning", async () => {
    const calls: unknown[][] = [];
    const tx = {
      $executeRawUnsafe: jest.fn(async (sql: string, ...values: unknown[]) => {
        calls.push([sql, ...values]);
      }),
    };
    const material = buildEnterpriseEncounterCreateLockMaterial({
      facilityId: "fac",
      patientId: "pat",
      serviceLine: "CLINIC",
      appointmentId: "appt-9",
    });
    const expected = hashEnterpriseEncounterCreateLockKeys(material);

    const result = await acquireEnterpriseEncounterCreateRaceLock(tx, {
      facilityId: "fac",
      patientId: "pat",
      serviceLine: "CLINIC",
      appointmentId: "appt-9",
    });

    expect(tx.$executeRawUnsafe).toHaveBeenCalledWith(
      "SELECT pg_advisory_xact_lock($1::int, $2::int)",
      expected.key1,
      expected.key2
    );
    expect(result).toEqual({ ...expected, material });
    expect(calls).toHaveLength(1);
  });
});
