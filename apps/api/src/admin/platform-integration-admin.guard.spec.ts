import { ForbiddenException } from "@nestjs/common";
import { PlatformIntegrationAdminGuard } from "./platform-integration-admin.guard";

const context = (user?: object): any => ({ switchToHttp: () => ({ getRequest: () => ({ user }) }) });
describe("PlatformIntegrationAdminGuard", () => {
  const user = { id: "u", isActive: true, canCreateFacilities: true, userRoles: [{ id: "super" }] };
  const prisma: any = { user: { findUnique: jest.fn(async () => user) } };
  const guard = new PlatformIntegrationAdminGuard(prisma);
  it("denies unauthenticated requests", async () => expect(guard.canActivate(context())).rejects.toBeInstanceOf(ForbiddenException));
  it("denies an ordinary or facility-only administrator", async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ ...user, canCreateFacilities: false, userRoles: [] });
    await expect(guard.canActivate(context({ userId: "u" }))).rejects.toBeInstanceOf(ForbiddenException);
  });
  it("permits only current database-backed platform authority", async () => expect(guard.canActivate(context({ userId: "u" }))).resolves.toBe(true));
});
