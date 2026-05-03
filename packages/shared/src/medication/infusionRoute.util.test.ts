import { describe, expect, it } from "vitest";
import { isIvpbInfusionRoute } from "./infusionRoute.util.js";

describe("isIvpbInfusionRoute", () => {
  it("accepts IVPB and infusion hints", () => {
    expect(isIvpbInfusionRoute("IVPB")).toBe(true);
    expect(isIvpbInfusionRoute("  ivpb  ")).toBe(true);
    expect(isIvpbInfusionRoute("IV piggyback")).toBe(true);
    expect(isIvpbInfusionRoute("continuous infusion")).toBe(true);
  });

  it("rejects IV push / bolus / plain IVP", () => {
    expect(isIvpbInfusionRoute("IVP")).toBe(false);
    expect(isIvpbInfusionRoute("IV push")).toBe(false);
    expect(isIvpbInfusionRoute("IV bolus")).toBe(false);
    expect(isIvpbInfusionRoute("")).toBe(false);
    expect(isIvpbInfusionRoute(null)).toBe(false);
  });
});
