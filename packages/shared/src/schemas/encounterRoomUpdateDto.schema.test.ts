import { describe, expect, it } from "vitest";
import { encounterRoomUpdateDtoSchema } from "./patient.js";

describe("encounterRoomUpdateDtoSchema (K.10B.10A)", () => {
  it("accepts ED unitCode with room and reason", () => {
    const parsed = encounterRoomUpdateDtoSchema.safeParse({
      room: "2",
      unitCode: "ED",
      reason: "ROOM_CHANGE",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.unitCode).toBe("ED");
      expect(parsed.data.room).toBe("2");
    }
  });

  it("normalizes EMERGENCY unitCode alias to ED", () => {
    const parsed = encounterRoomUpdateDtoSchema.safeParse({
      room: "2",
      unitCode: "EMERGENCY",
      reason: "ROOM_CHANGE",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.unitCode).toBe("ED");
    }
  });

  it("accepts null room clear with null reason", () => {
    const parsed = encounterRoomUpdateDtoSchema.safeParse({
      room: null,
      unitCode: "ED",
      reason: null,
      reasonOther: null,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.room).toBeNull();
      expect(parsed.data.reason).toBeNull();
    }
  });

  it("accepts frontend payload with null unitCode and reason", () => {
    const parsed = encounterRoomUpdateDtoSchema.safeParse({
      room: "4",
      unitCode: null,
      reason: null,
      reasonOther: null,
    });
    expect(parsed.success).toBe(true);
  });
});
