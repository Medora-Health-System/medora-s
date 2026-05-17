import { describe, expect, it } from "vitest";
import {
  labRadiologyEffectiveClinicalTimeDtoSchema,
  validateLabRadiologyEffectiveClinicalTime,
} from "./labRadiologyEffectiveClinicalTime.js";

describe("labRadiologyEffectiveClinicalTime", () => {
  const encounterAnchor = new Date("2026-05-16T08:00:00Z");
  const orderCreated = new Date("2026-05-16T10:00:00Z");
  const orderItemCreated = new Date("2026-05-16T10:05:00Z");
  const documented = new Date("2026-05-16T14:00:00Z");
  const now = new Date("2026-05-16T18:00:00Z");

  it("accepts effectiveClinicalTime alias on PATCH DTO", () => {
    const parsed = labRadiologyEffectiveClinicalTimeDtoSchema.safeParse({
      effectiveClinicalTime: "2026-05-16T13:00:00.000Z",
      reason: "Delayed documentation correction",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects future timestamps", () => {
    const result = validateLabRadiologyEffectiveClinicalTime({
      effectiveTime: new Date("2099-01-01T12:00:00Z"),
      now,
      encounterAnchorAt: encounterAnchor,
      documentedAt: documented,
      orderCreatedAt: orderCreated,
      orderItemCreatedAt: orderItemCreated,
      adjustmentVersion: 0,
      reason: "ok",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FUTURE_TIME");
  });

  it("requires detailed reason for >24h backdate", () => {
    const effective = new Date("2026-05-16T11:00:00Z");
    const systemDoc = new Date("2026-05-18T14:00:00Z");
    const result = validateLabRadiologyEffectiveClinicalTime({
      effectiveTime: effective,
      now,
      encounterAnchorAt: encounterAnchor,
      documentedAt: systemDoc,
      orderCreatedAt: orderCreated,
      orderItemCreatedAt: orderItemCreated,
      adjustmentVersion: 0,
      reason: "short",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("REASON_TOO_SHORT_FOR_LARGE_BACKDATE");
  });
});
