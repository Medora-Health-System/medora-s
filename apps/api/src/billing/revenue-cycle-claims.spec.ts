import { RevenueCycleClaimsService } from "./revenue-cycle-claims.service";

const facilityId = "fac-1";

function makePrismaMock(submissions: unknown[]) {
  return {
    claimSubmission: {
      findMany: jest.fn().mockResolvedValue(submissions),
    },
    user: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    patientInsuranceCoverage: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
}

function makeSubmission(overrides: Record<string, unknown> = {}) {
  return {
    id: "claim-1",
    status: "SENT",
    updatedAt: new Date("2026-06-02T10:00:00.000Z"),
    encounterId: "enc-1",
    encounter: {
      id: "enc-1",
      createdAt: new Date("2026-06-01T10:00:00.000Z"),
      dischargedAt: new Date("2026-06-01T14:00:00.000Z"),
      physicianAssignedUserId: null,
      patientId: "pat-1",
      patient: { firstName: "Marie", lastName: "Joseph", mrn: "MRN-100" },
    },
    acknowledgments: [],
    attempts: [{ createdAt: new Date("2026-06-02T09:00:00.000Z") }],
    ...overrides,
  };
}

describe("RevenueCycleClaimsService (MEDUI.ADMIN.REVENUE.3)", () => {
  it("scopes query by facility and workspace statuses", async () => {
    const prisma = makePrismaMock([]);
    const service = new RevenueCycleClaimsService(prisma as never);
    await service.listRevenueCycleClaims({ facilityId });
    expect(prisma.claimSubmission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ facilityId }),
        take: RevenueCycleClaimsService.MAX_LIMIT,
      })
    );
  });

  it("returns projected rows with claim and ledger hrefs", async () => {
    const prisma = makePrismaMock([makeSubmission()]);
    const service = new RevenueCycleClaimsService(prisma as never);
    const result = await service.listRevenueCycleClaims({ facilityId });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]!.claimId).toBe("claim-1");
    expect(result.rows[0]!.queue).toBe("SENT");
    expect(result.rows[0]!.ledgerHref).toContain("enc-1");
    expect(result.rows[0]!.claimHref).toContain("claimSubmission=claim-1");
  });

  it("filters by queue", async () => {
    const prisma = makePrismaMock([
      makeSubmission({ id: "claim-sent", status: "SENT" }),
      makeSubmission({
        id: "claim-accepted",
        status: "ACCEPTED",
        encounterId: "enc-2",
        encounter: {
          id: "enc-2",
          createdAt: new Date("2026-06-01T10:00:00.000Z"),
          dischargedAt: new Date("2026-06-01T14:00:00.000Z"),
          physicianAssignedUserId: null,
          patientId: "pat-2",
          patient: { firstName: "Jean", lastName: "Paul", mrn: "MRN-200" },
        },
      }),
    ]);
    const service = new RevenueCycleClaimsService(prisma as never);
    const result = await service.listRevenueCycleClaims({
      facilityId,
      queue: "ACCEPTED",
    });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]!.queue).toBe("ACCEPTED");
    expect(result.counts.ACCEPTED).toBe(1);
  });

  it("caps limit to MAX_LIMIT", async () => {
    const prisma = makePrismaMock([]);
    const service = new RevenueCycleClaimsService(prisma as never);
    const result = await service.listRevenueCycleClaims({ facilityId, limit: 999 });
    expect(result.limit).toBe(RevenueCycleClaimsService.MAX_LIMIT);
  });
});
