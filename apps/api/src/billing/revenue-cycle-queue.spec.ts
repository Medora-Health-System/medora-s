import { ClaimSubmissionStatus, EncounterStatus } from "@prisma/client";
import { REVENUE_CYCLE_QUEUE } from "@medora/shared";
import { RevenueCycleQueueService } from "./revenue-cycle-queue.service";

describe("RevenueCycleQueueService (MEDUI.ADMIN.REVENUE.2)", () => {
  const facilityId = "fac-rev-1";

  function buildEncounter(overrides: Record<string, unknown> = {}) {
    return {
      id: "enc-rev-1",
      createdAt: new Date("2026-06-01T10:00:00.000Z"),
      dischargedAt: new Date("2026-06-01T14:00:00.000Z"),
      physicianAssignedUserId: "prov-1",
      status: EncounterStatus.CLOSED,
      dischargeStatus: "HOME",
      patient: {
        firstName: "Marie",
        lastName: "Joseph",
        mrn: "MRN-100",
      },
      ...overrides,
    };
  }

  function buildPrismaMock(encounters: ReturnType<typeof buildEncounter>[]) {
    return {
      encounter: {
        findMany: jest.fn().mockResolvedValue(encounters),
      },
      diagnosis: {
        groupBy: jest.fn().mockResolvedValue(
          encounters.map((encounter) => ({
            encounterId: encounter.id,
            _count: { _all: encounter.id === "enc-coding" ? 0 : 1 },
          }))
        ),
      },
      billingEvent: {
        findMany: jest.fn().mockImplementation(async () => {
          const events: Array<Record<string, unknown>> = [];
          for (const encounter of encounters) {
            if (encounter.id === "enc-billing") {
              events.push({
                encounterId: encounter.id,
                reviewStatus: "CAPTURED",
                sourceModule: "LAB_RESULT",
                procedureCode: null,
                hcpcsCode: null,
                code: null,
                diagnosisCodes: null,
              });
            } else {
              events.push({
                encounterId: encounter.id,
                reviewStatus: "VALIDATED",
                sourceModule: "LAB_RESULT",
                procedureCode: "80053",
                hcpcsCode: null,
                code: "80053",
                diagnosisCodes: "E11.9",
              });
            }
          }
          return events;
        }),
      },
      claimSubmission: {
        findMany: jest.fn().mockResolvedValue(
          encounters.flatMap((encounter) => {
            if (encounter.id === "enc-submitted") {
              return [{ encounterId: encounter.id, status: ClaimSubmissionStatus.SENT as ClaimSubmissionStatus }];
            }
            if (encounter.id === "enc-paid") {
              return [{ encounterId: encounter.id, status: ClaimSubmissionStatus.ACCEPTED as ClaimSubmissionStatus }];
            }
            return [] as Array<{ encounterId: string; status: ClaimSubmissionStatus }>;
          })
        ),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([
          { id: "prov-1", firstName: "Dr", lastName: "Laurent" },
        ]),
      },
    };
  }

  it("is facility scoped and bounded", async () => {
    const prisma = buildPrismaMock([buildEncounter()]);
    const service = new RevenueCycleQueueService(prisma as never);
    const result = await service.listRevenueCycleQueue({ facilityId, limit: 999 });

    expect(prisma.encounter.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ facilityId }),
        take: RevenueCycleQueueService.MAX_LIMIT,
      })
    );
    expect(result.limit).toBe(RevenueCycleQueueService.MAX_LIMIT);
  });

  it("classifies ready-for-billing rows", async () => {
    const prisma = buildPrismaMock([buildEncounter({ id: "enc-ready" })]);
    const service = new RevenueCycleQueueService(prisma as never);
    const result = await service.listRevenueCycleQueue({ facilityId });
    expect(result.rows[0]?.queue).toBe(REVENUE_CYCLE_QUEUE.READY_FOR_BILLING);
  });

  it("classifies billing deficiency rows", async () => {
    const prisma = buildPrismaMock([buildEncounter({ id: "enc-billing" })]);
    const service = new RevenueCycleQueueService(prisma as never);
    const result = await service.listRevenueCycleQueue({ facilityId });
    expect(result.rows[0]?.queue).toBe(REVENUE_CYCLE_QUEUE.BILLING_DEFICIENCY);
  });

  it("classifies coding review rows", async () => {
    const prisma = buildPrismaMock([buildEncounter({ id: "enc-coding" })]);
    const service = new RevenueCycleQueueService(prisma as never);
    const result = await service.listRevenueCycleQueue({ facilityId });
    expect(result.rows[0]?.queue).toBe(REVENUE_CYCLE_QUEUE.CODING_REVIEW);
  });

  it("classifies submitted claim rows", async () => {
    const prisma = buildPrismaMock([buildEncounter({ id: "enc-submitted" })]);
    const service = new RevenueCycleQueueService(prisma as never);
    const result = await service.listRevenueCycleQueue({ facilityId });
    expect(result.rows[0]?.queue).toBe(REVENUE_CYCLE_QUEUE.CLAIM_SUBMITTED);
  });

  it("classifies paid claim rows", async () => {
    const prisma = buildPrismaMock([buildEncounter({ id: "enc-paid" })]);
    const service = new RevenueCycleQueueService(prisma as never);
    const result = await service.listRevenueCycleQueue({ facilityId });
    expect(result.rows[0]?.queue).toBe(REVENUE_CYCLE_QUEUE.CLAIM_PAID);
  });

  it("filters by queue and search", async () => {
    const prisma = buildPrismaMock([
      buildEncounter({ id: "enc-ready", patient: { firstName: "Marie", lastName: "Joseph", mrn: "MRN-100" } }),
      buildEncounter({ id: "enc-billing", patient: { firstName: "Jean", lastName: "Paul", mrn: "MRN-200" } }),
    ]);
    const service = new RevenueCycleQueueService(prisma as never);
    const filtered = await service.listRevenueCycleQueue({
      facilityId,
      queue: REVENUE_CYCLE_QUEUE.BILLING_DEFICIENCY,
      search: "Jean",
    });
    expect(filtered.rows).toHaveLength(1);
    expect(filtered.rows[0]?.patientName).toContain("Jean");
  });

  it("returns counts and ledger href", async () => {
    const prisma = buildPrismaMock([
      buildEncounter({ id: "enc-ready" }),
      buildEncounter({ id: "enc-billing" }),
    ]);
    const service = new RevenueCycleQueueService(prisma as never);
    const result = await service.listRevenueCycleQueue({ facilityId });
    expect(result.counts.READY_FOR_BILLING).toBeGreaterThanOrEqual(1);
    expect(result.rows[0]?.ledgerHref).toContain("/app/billing/encounters/");
  });
});
