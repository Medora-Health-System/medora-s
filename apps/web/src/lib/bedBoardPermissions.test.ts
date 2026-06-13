import { describe, expect, it } from "vitest";
import { canManageBedOperationalStatus } from "./bedBoardPermissions";

describe("canManageBedOperationalStatus", () => {
  it("allows RN, PROVIDER, and ADMIN", () => {
    expect(canManageBedOperationalStatus(["RN"])).toBe(true);
    expect(canManageBedOperationalStatus(["PROVIDER"])).toBe(true);
    expect(canManageBedOperationalStatus(["ADMIN"])).toBe(true);
  });

  it("denies FRONT_DESK and BILLING", () => {
    expect(canManageBedOperationalStatus(["FRONT_DESK"])).toBe(false);
    expect(canManageBedOperationalStatus(["BILLING"])).toBe(false);
  });
});
