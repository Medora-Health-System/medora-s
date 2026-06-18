import { RevenueCycleClaimAuditService } from "./revenue-cycle-claim-audit.service";

const facilityId = "fac-1";
const claimId = "claim-1";

function makePrismaMock(submission: unknown) {
  return {
    claimSubmission: {
      findFirst: jest.fn().mockResolvedValue(submission),
      groupBy: jest.fn().mockResolvedValue([
        { status: "ACCEPTED", _count: { _all: 2 } },
        { status: "REJECTED", _count: { _all: 1 } },
      ]),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({ id: "prov-1", firstName: "Marie", lastName: "Doc" }),
    },
    patientInsuranceCoverage: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    billingEvent: {
      findMany: jest.fn().mockResolvedValue([{ priceSnapshot: 100, units: 2 }]),
    },
  };
}

function makeSubmission(overrides: Record<string, unknown> = {}) {
  return {
    id: claimId,
    status: "REJECTED",
    claimType: "PROFESSIONAL_837P",
    encounterId: "enc-1",
    createdAt: new Date("2026-06-01T10:00:00.000Z"),
    updatedAt: new Date("2026-06-02T10:00:00.000Z"),
    externalReference: null,
    encounter: {
      id: "enc-1",
      createdAt: new Date("2026-06-01T10:00:00.000Z"),
      dischargedAt: new Date("2026-06-01T14:00:00.000Z"),
      physicianAssignedUserId: "prov-1",
      patientId: "pat-1",
      patient: { firstName: "Jean", lastName: "Paul", mrn: "MRN-200" },
    },
    attempts: [
      {
        id: "att-1",
        transport: "MANUAL",
        ok: true,
        failureCode: null,
        errorMessage: null,
        retryEligible: false,
        createdAt: new Date("2026-06-02T09:00:00.000Z"),
      },
    ],
    acknowledgments: [
      {
        id: "ack-1",
        kind: "277CA",
        statusCode: "CLAIM_REJECTED",
        message: "Subscriber mismatch",
        warningCode: null,
        receivedAt: new Date("2026-06-02T11:00:00.000Z"),
        parsedJson: { lifecycle: { reasonCode: "SUBSCRIBER_MISMATCH" } },
        rawText: "STC*A3",
      },
    ],
    operationalEvents: [
      {
        eventAt: new Date("2026-06-02T09:00:00.000Z"),
        statusAfter: "SENT",
        message: null,
      },
    ],
    ...overrides,
  };
}

describe("RevenueCycleClaimAuditService (MEDUI.ADMIN.REVENUE.4)", () => {
  it("returns audit DTO for facility-scoped claim", async () => {
    const prisma = makePrismaMock(makeSubmission());
    const service = new RevenueCycleClaimAuditService(prisma as never);
    const audit = await service.getClaimAudit(facilityId, claimId);
    expect(audit.claim.claimId).toBe(claimId);
    expect(audit.auditStatus).toBe("REVIEW_REQUIRED");
    expect(audit.rejectionHistory.length).toBeGreaterThan(0);
    expect(audit.claim.claimAmount).toBe(200);
  });

  it("scopes lookup by facility and claim id", async () => {
    const prisma = makePrismaMock(makeSubmission());
    const service = new RevenueCycleClaimAuditService(prisma as never);
    await service.getClaimAudit(facilityId, claimId);
    expect(prisma.claimSubmission.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: claimId, facilityId },
      })
    );
  });
});
