import {
  acquireBedAssignmentRaceLock,
  buildBedAssignmentLockMaterial,
  D4A43A_CERTIFICATION_ID,
  hashBedAssignmentLockKeys,
} from "./encounter-bed-assignment-race-lock.util";

describe("MEDUI.D4A.4.3A encounter-bed-assignment-race-lock.util", () => {
  it("exports certification id", () => {
    expect(D4A43A_CERTIFICATION_ID).toBe("MEDUI.D4A.4.3A");
  });

  it("builds stable lock material from facility + canonical bed key", () => {
    expect(
      buildBedAssignmentLockMaterial({ facilityId: "fac-1", canonicalBedKey: "MS:4" })
    ).toBe("MEDUI.D4A.4.3A|BED_ASSIGN|fac-1|MS:4");
  });

  it("hashes lock material to two int32 advisory keys", () => {
    const material = buildBedAssignmentLockMaterial({
      facilityId: "f1",
      canonicalBedKey: "MS:4",
    });
    const keys = hashBedAssignmentLockKeys(material);
    expect(Number.isInteger(keys.key1)).toBe(true);
    expect(Number.isInteger(keys.key2)).toBe(true);
    expect(keys.key1).not.toBe(keys.key2);
  });

  it("acquires pg_advisory_xact_lock before returning", async () => {
    const tx = {
      $executeRawUnsafe: jest.fn(async () => undefined),
    };
    const material = buildBedAssignmentLockMaterial({
      facilityId: "fac",
      canonicalBedKey: "MS:4",
    });
    const expected = hashBedAssignmentLockKeys(material);

    const result = await acquireBedAssignmentRaceLock(tx, {
      facilityId: "fac",
      canonicalBedKey: "MS:4",
    });

    expect(tx.$executeRawUnsafe).toHaveBeenCalledWith(
      "SELECT pg_advisory_xact_lock($1::int, $2::int)",
      expected.key1,
      expected.key2
    );
    expect(result).toEqual({ ...expected, material });
  });

  it("uses distinct keys for different destination beds", () => {
    const a = hashBedAssignmentLockKeys(
      buildBedAssignmentLockMaterial({ facilityId: "fac", canonicalBedKey: "MS:4" })
    );
    const b = hashBedAssignmentLockKeys(
      buildBedAssignmentLockMaterial({ facilityId: "fac", canonicalBedKey: "MS:1" })
    );
    expect(a).not.toEqual(b);
  });
});
