import { RevenueCyclePaymentsService } from "./revenue-cycle-payments.service";

const facilityId = "fac-1";

function makePrismaMock(submissions: unknown[], billingRows: unknown[] = []) {
  return {
    claimSubmission: {
      findMany: jest.fn().mockResolvedValue(submissions),
    },
    billingEvent: {
      findMany: jest.fn().mockResolvedValue(billingRows),
    },
    patientInsuranceCoverage: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
}

function makeSubmission(overrides: Record<string, unknown> = {}) {
  return {
    id: "claim-1",
    status: "ACCEPTED",
    encounterId: "enc-1",
    encounter: {
      id: "enc-1",
      createdAt: new Date("2026-06-01T10:00:00.000Z"),
      dischargedAt: new Date("2026-06-01T14:00:00.000Z"),
      patientId: "pat-1",
      patient: { firstName: "Marie", lastName: "Joseph", mrn: "MRN-100" },
    },
    acknowledgments: [],
    ...overrides,
  };
}

describe("RevenueCyclePaymentsService (MEDUI.ADMIN.REVENUE.5)", () => {
  it("scopes query by facility and payment-relevant statuses", async () => {
    const prisma = makePrismaMock([]);
    const service = new RevenueCyclePaymentsService(prisma as never);
    await service.listRevenueCyclePayments({ facilityId });
    expect(prisma.claimSubmission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ facilityId }),
        take: RevenueCyclePaymentsService.MAX_LIMIT,
      })
    );
  });

  it("projects payment rows with expected and paid amounts", async () => {
    const prisma = makePrismaMock(
      [makeSubmission()],
      [{ encounterId: "enc-1", priceSnapshot: 100, units: 2 }]
    );
    const service = new RevenueCyclePaymentsService(prisma as never);
    const result = await service.listRevenueCyclePayments({ facilityId });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]!.expectedAmount).toBe(200);
    expect(result.rows[0]!.paidAmount).toBe(200);
    expect(result.rows[0]!.queue).toBe("PAYMENT_RECEIVED");
  });

  it("filters by payment queue", async () => {
    const prisma = makePrismaMock(
      [
        makeSubmission({ id: "claim-pending", status: "ACK_PENDING" }),
        makeSubmission({ id: "claim-denied", status: "REJECTED", acknowledgments: [{ statusCode: "CLAIM_REJECTED", message: "Denied", parsedJson: null, kind: "277CA" }] }),
      ],
      [
        { encounterId: "enc-1", priceSnapshot: 50, units: 1 },
        { encounterId: "enc-1", priceSnapshot: 50, units: 1 },
      ]
    );
    const service = new RevenueCyclePaymentsService(prisma as never);
    const denied = await service.listRevenueCyclePayments({ facilityId, queue: "DENIED" });
    expect(denied.rows).toHaveLength(1);
    expect(denied.rows[0]!.queue).toBe("DENIED");
    expect(denied.rows[0]!.denialCode).toBeTruthy();
  });

  it("caps limit to MAX_LIMIT", async () => {
    const prisma = makePrismaMock([]);
    const service = new RevenueCyclePaymentsService(prisma as never);
    const result = await service.listRevenueCyclePayments({ facilityId, limit: 999 });
    expect(result.limit).toBe(RevenueCyclePaymentsService.MAX_LIMIT);
  });
});
