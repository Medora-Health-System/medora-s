/**
 * Phase 2C.4B — trauma order set CT head successor migration (enterprise registry guard).
 */
import { describe, expect, it } from "vitest";
import { enterpriseOrderSetByCode } from "@medora/shared";

describe("enterprise trauma CT head order set (2C.4B)", () => {
  it("uses CT_HEAD_WO_CONTRAST as primary trauma ctHead catalogCode", () => {
    const trauma = enterpriseOrderSetByCode("ed_trauma_activation_v1");
    const ctHead = trauma?.optionalItems.find((item) => item.key === "ctHead");
    expect(ctHead?.catalogCode).toBe("CT_HEAD_WO_CONTRAST");
    expect(ctHead?.catalogCode).not.toBe("CT_HEAD");
  });

  it("keeps CT_HEAD as transition fallback in trauma ctHead catalogCodes", () => {
    const trauma = enterpriseOrderSetByCode("ed_trauma_activation_v1");
    const ctHead = trauma?.optionalItems.find((item) => item.key === "ctHead");
    expect(ctHead?.catalogCodes).toContain("CT_HEAD");
  });
});
