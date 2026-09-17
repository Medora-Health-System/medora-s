import { RoleCode } from "@prisma/client";
import { tryAuthorizeTechnologyItCareSupport } from "./technology-it-care-support";

function prisma(activeIt = true) {
  return {
    $queryRawUnsafe: jest.fn().mockResolvedValue(activeIt ? [{ ok: 1 }] : []),
    facility: { findFirst: jest.fn().mockResolvedValue({ id: "facility-a" }) },
  } as any;
}

describe("Phase 18C Technology / IT care support authority", () => {
  it("allows an active Technology IT employee to read a safe facility admin route", async () => {
    const request: any = { method: "GET", originalUrl: "/admin/users", user: {} };
    await expect(
      tryAuthorizeTechnologyItCareSupport(
        prisma(true), request, "facility-a", "it-user", [RoleCode.ADMIN]
      )
    ).resolves.toBe(true);
    expect(request.technologyItCareSupport).toBe(true);
    expect(request.platformPrincipal).toBe(false);
  });

  it.each([
    ["POST", "/admin/users"],
    ["PATCH", "/facility-configuration/facility-a"],
    ["GET", "/patients"],
    ["GET", "/encounters/enc-1"],
    ["GET", "/admin/billing"],
    ["GET", "/admin/roi"],
    ["GET", "/orders"],
  ])("denies %s %s", async (method, originalUrl) => {
    const request: any = { method, originalUrl, user: {} };
    await expect(
      tryAuthorizeTechnologyItCareSupport(
        prisma(true), request, "facility-a", "it-user", [RoleCode.ADMIN]
      )
    ).resolves.toBe(false);
  });

  it("does not convert inactive or non-IT staff into care support authority", async () => {
    const request: any = { method: "GET", originalUrl: "/admin/users", user: {} };
    await expect(
      tryAuthorizeTechnologyItCareSupport(
        prisma(false), request, "facility-a", "not-it", [RoleCode.ADMIN]
      )
    ).resolves.toBe(false);
  });

  it("never satisfies a MEDORA_SUPER_ADMIN-only route", async () => {
    const request: any = { method: "GET", originalUrl: "/admin/system-health", user: {} };
    await expect(
      tryAuthorizeTechnologyItCareSupport(
        prisma(true), request, "facility-a", "it-user", [RoleCode.MEDORA_SUPER_ADMIN]
      )
    ).resolves.toBe(false);
  });
});
