import { ForbiddenException } from "@nestjs/common";
import { PlatformCountryScopeService } from "./platform-country-scope.service";

jest.mock("../auth/platform-principal", () => ({ resolvePlatformAuthority: jest.fn(async (_p: unknown, userId: string) => ({ granted: userId === "owner" })) }));

describe("PlatformCountryScopeService", () => {
  const prisma: any = {
    platformCountryScopeGrant: { findMany: jest.fn(), findFirst: jest.fn() },
    facility: { findUnique: jest.fn() },
  };
  const service = new PlatformCountryScopeService(prisma);
  beforeEach(() => jest.clearAllMocks());

  it("keeps authoritative platform principal global", async () => {
    await expect(service.assertCountry("owner", "HT")).resolves.toBeUndefined();
    expect(prisma.platformCountryScopeGrant.findFirst).not.toHaveBeenCalled();
  });
  it("fails closed without explicit delegated geography", async () => {
    prisma.platformCountryScopeGrant.findFirst.mockResolvedValue(null);
    await expect(service.assertCountry("delegate", "US")).rejects.toBeInstanceOf(ForbiddenException);
  });
  it("allows only an active exact country grant", async () => {
    prisma.platformCountryScopeGrant.findFirst.mockResolvedValue({ id: "g1" });
    await expect(service.assertCountry("delegate", "us")).resolves.toBeUndefined();
    expect(prisma.platformCountryScopeGrant.findFirst).toHaveBeenCalledWith({ where: { userId: "delegate", countryCode: "US", isActive: true }, select: { id: true } });
  });
  it("derives facility country server-side", async () => {
    prisma.facility.findUnique.mockResolvedValue({ country: "HT" });
    prisma.platformCountryScopeGrant.findFirst.mockResolvedValue({ id: "g2" });
    await service.assertFacility("delegate", "facility-haiti");
    expect(prisma.facility.findUnique).toHaveBeenCalledWith({ where: { id: "facility-haiti" }, select: { country: true } });
    expect(prisma.platformCountryScopeGrant.findFirst).toHaveBeenCalledWith({ where: { userId: "delegate", countryCode: "HT", isActive: true }, select: { id: true } });
  });
});
