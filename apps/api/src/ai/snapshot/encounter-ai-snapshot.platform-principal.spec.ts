import { EncounterAiSnapshotBuilder } from "./encounter-ai-snapshot.builder.js";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const FACILITY_ID = "22222222-2222-4222-8222-222222222222";

function createPrisma(options?: {
  facilityMembership?: boolean;
  platformUser?: any;
  facilityActive?: boolean;
}) {
  const facilityMembership = options?.facilityMembership ?? false;
  const facilityActive = options?.facilityActive ?? true;

  return {
    userRole: {
      findFirst: jest.fn(async () => (facilityMembership ? { id: "facility-role" } : null)),
    },
    user: {
      findUnique: jest.fn(async () => options?.platformUser ?? null),
    },
    facility: {
      findFirst: jest.fn(async (args: any) =>
        facilityActive && args.where.id === FACILITY_ID && args.where.isActive === true
          ? { id: FACILITY_ID }
          : null
      ),
    },
  } as any;
}

function platformPrincipalUser(overrides: any = {}) {
  return {
    id: USER_ID,
    isActive: true,
    canCreateFacilities: true,
    userRoles: [{ id: "super-admin-assignment" }],
    ...overrides,
  };
}

describe("EncounterAiSnapshotBuilder platform-principal authorization", () => {
  async function authorize(prisma: any, facilityId = FACILITY_ID) {
    const builder = new EncounterAiSnapshotBuilder(prisma);
    await (builder as any).assertActorFacilityAccess(USER_ID, facilityId);
  }

  it("keeps ordinary active facility membership as the primary authorization path", async () => {
    const prisma = createPrisma({ facilityMembership: true });

    await expect(authorize(prisma)).resolves.toBeUndefined();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.facility.findFirst).not.toHaveBeenCalled();
    expect(prisma.userRole.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: USER_ID,
          facilityId: FACILITY_ID,
          isActive: true,
          facility: { isActive: true },
        }),
      })
    );
  });

  it("allows an authoritative platform principal inside an explicit active facility context", async () => {
    const prisma = createPrisma({ platformUser: platformPrincipalUser(), facilityActive: true });

    await expect(authorize(prisma)).resolves.toBeUndefined();
    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: USER_ID } })
    );
    expect(prisma.facility.findFirst).toHaveBeenCalledWith({
      where: { id: FACILITY_ID, isActive: true },
      select: { id: true },
    });
  });

  it("denies an actor with neither facility membership nor platform authority", async () => {
    const prisma = createPrisma();

    await expect(authorize(prisma)).rejects.toThrow(
      "Actor does not have access to the requested facility"
    );
    expect(prisma.facility.findFirst).not.toHaveBeenCalled();
  });

  it("denies platform authority when the selected facility is inactive or unknown", async () => {
    const prisma = createPrisma({ platformUser: platformPrincipalUser(), facilityActive: false });

    await expect(authorize(prisma)).rejects.toThrow(
      "Actor does not have access to the requested facility"
    );
  });

  it("denies a platform principal without an explicit facility context", async () => {
    const prisma = createPrisma({ platformUser: platformPrincipalUser(), facilityActive: true });

    await expect(authorize(prisma, "")).rejects.toThrow(
      "Actor does not have access to the requested facility"
    );
    expect(prisma.facility.findFirst).not.toHaveBeenCalled();
  });

  it("denies inactive or capability-disabled platform accounts", async () => {
    const inactive = createPrisma({
      platformUser: platformPrincipalUser({ isActive: false }),
      facilityActive: true,
    });
    const noCapability = createPrisma({
      platformUser: platformPrincipalUser({ canCreateFacilities: false }),
      facilityActive: true,
    });

    await expect(authorize(inactive)).rejects.toThrow(
      "Actor does not have access to the requested facility"
    );
    await expect(authorize(noCapability)).rejects.toThrow(
      "Actor does not have access to the requested facility"
    );
  });
});
