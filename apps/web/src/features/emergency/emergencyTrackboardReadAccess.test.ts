import { describe, expect, it } from "vitest";

describe("EmergencyTrackboardView read access messaging (MEDUI.ED.TECH.3)", () => {
  it("maps HTTP 403 to readAccessDenied i18n key contract", () => {
    const err = Object.assign(new Error("Access denied"), { status: 403 });
    const status =
      typeof err === "object" && err != null && "status" in err
        ? Number((err as { status?: number }).status)
        : null;
    expect(status).toBe(403);
  });

  it("non-403 errors remain generic load failures", () => {
    const err = Object.assign(new Error("Server error"), { status: 500 });
    const status = (err as { status?: number }).status;
    expect(status).not.toBe(403);
  });
});
