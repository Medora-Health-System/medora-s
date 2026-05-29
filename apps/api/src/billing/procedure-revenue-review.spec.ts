import { BadRequestException, NotFoundException } from "@nestjs/common";
import {
  BillingReviewStatus,
  BillingSourceModule,
  OrderStatus,
} from "@prisma/client";
import { FORBIDDEN_PROCEDURE_REVENUE_REVIEW_KEYS } from "@medora/shared";
import { ProcedureRevenueReviewService } from "./procedure-revenue-review.service";

const medproc6Metadata = {
  medproc6: true,
  sourceType: "PROCEDURE_ORDER",
  enterpriseProcedureId: "endotracheal_intubation",
  orderItemId: "oi1",
  encounterId: "e1",
  mappingStatus: "READY_FOR_REVIEW",
  readinessStatus: "REVIEW_REQUIRED",
  documentationLinked: true,
  facilityChargeMasterLinked: false,
  requiresDocumentationReview: false,
  requiresCoderReview: true,
  requiresFacilityChargeMaster: true,
  previewCodeCandidates: [],
  reasons: ["CODER_REVIEW_REQUIRED"],
  warnings: [],
};

describe("ProcedureRevenueReviewService (MEDPROC.7)", () => {
  function buildService(overrides?: {
    billingEvent?: Record<string, unknown> | null;
    orderItem?: { id: string } | null;
  }) {
    const billingEventUpdate = jest.fn().mockResolvedValue({
      id: "be1",
      reviewStatus: BillingReviewStatus.REVIEWED,
      metadata: { ...medproc6Metadata, medproc7: true, revenueReviewStatus: "APPROVED_FOR_EXPORT" },
    });
    const prisma = {
      billingEvent: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "be1",
            sourceRecordId: "oi1",
            encounterId: "e1",
            metadata: medproc6Metadata,
            reviewStatus: BillingReviewStatus.CAPTURED,
            createdAt: new Date("2026-05-28T12:00:00.000Z"),
            serviceDate: new Date("2026-05-28T12:00:00.000Z"),
            encounter: { billingClassification: "EMERGENCY_DEPARTMENT", createdAt: new Date() },
          },
        ]),
        findFirst: jest.fn().mockResolvedValue(
          overrides?.billingEvent === null
            ? null
            : {
                id: "be1",
                encounterId: "e1",
                patientId: "p1",
                sourceRecordId: "oi1",
                reviewStatus: BillingReviewStatus.CAPTURED,
                metadata: medproc6Metadata,
                eventType: "PROCEDURE_ORDER_REVIEW",
                sourceModule: BillingSourceModule.PROCEDURE,
                ...(overrides?.billingEvent ?? {}),
              }
        ),
        update: billingEventUpdate,
        create: jest.fn(),
      },
      orderItem: {
        findMany: jest.fn().mockResolvedValue(
          overrides?.orderItem === null
            ? []
            : [{ id: "oi1", enterpriseProcedureId: "endotracheal_intubation" }]
        ),
        findFirst: jest.fn().mockResolvedValue(overrides?.orderItem === null ? null : { id: "oi1", order: { id: "ord1" } }),
        update: jest.fn(),
      },
      billingReviewDecision: {
        upsert: jest.fn().mockResolvedValue({ id: "brd1" }),
      },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          billingEvent: { update: billingEventUpdate },
          billingReviewDecision: {
            upsert: jest.fn().mockResolvedValue({ id: "brd1" }),
          },
        })
      ),
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    return { svc: new ProcedureRevenueReviewService(prisma as never, audit as never), prisma, audit, billingEventUpdate };
  }

  it("queue endpoint returns procedure review events", async () => {
    const { svc } = buildService();
    const result = await svc.getQueue({ facilityId: "f1" });
    expect(result.previewOnly).toBe(true);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.enterpriseProcedureId).toBe("endotracheal_intubation");
    expect(result.rows[0]?.procedureBillingSideReview).toBeDefined();
  });

  it("filters documentation missing", async () => {
    const { svc, prisma } = buildService();
    prisma.billingEvent.findMany.mockResolvedValue([
      {
        id: "be2",
        sourceRecordId: "oi2",
        encounterId: "e1",
        metadata: { ...medproc6Metadata, documentationLinked: false, requiresDocumentationReview: true },
        reviewStatus: BillingReviewStatus.CAPTURED,
        createdAt: new Date(),
        serviceDate: new Date(),
        encounter: { billingClassification: "URGENT_CARE", createdAt: new Date() },
      },
    ]);
    prisma.orderItem.findMany.mockResolvedValue([{ id: "oi2" }]);
    const result = await svc.getQueue({ facilityId: "f1", documentationMissing: true });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.documentationLinked).toBe(false);
  });

  it("decision endpoint records governance decision", async () => {
    const { svc, audit } = buildService();
    const result = await svc.recordDecision("f1", "be1", {
      decision: "APPROVE_FOR_EXPORT_REVIEW",
      reasonCode: "OTHER_REVIEW_REQUIRED",
    }, "user1");
    expect(result.previewOnly).toBe(true);
    expect(result.revenueReviewStatus).toBe("APPROVED_FOR_EXPORT");
    expect(audit.log).toHaveBeenCalledWith(
      expect.anything(),
      "PROCEDURE_REVENUE_REVIEW_DECISION",
      expect.objectContaining({
        metadata: expect.objectContaining({
          enterpriseProcedureId: "endotracheal_intubation",
          decision: "APPROVE_FOR_EXPORT_REVIEW",
        }),
      })
    );
  });

  it("documentation missing decision works", async () => {
    const { svc } = buildService();
    const result = await svc.recordDecision("f1", "be1", {
      decision: "HOLD_FOR_DOCUMENTATION",
      reasonCode: "DOCUMENTATION_MISSING",
    }, "user1");
    expect(result.revenueReviewStatus).toBe("NEEDS_DOCUMENTATION");
  });

  it("reject not billable works", async () => {
    const { svc, billingEventUpdate } = buildService();
    await svc.recordDecision("f1", "be1", {
      decision: "REJECT_NOT_BILLABLE",
      reasonCode: "NOT_BILLABLE_PER_POLICY",
      note: "policy",
    }, "user1");
    expect(billingEventUpdate.mock.calls[0]?.[0].data.reviewStatus).toBe(BillingReviewStatus.SKIPPED);
  });

  it("non-procedure BillingEvent rejected", async () => {
    const { svc } = buildService({
      billingEvent: {
        eventType: "CHARGE_CAPTURE",
        metadata: { foo: "bar" },
      },
    });
    await expect(
      svc.recordDecision("f1", "be1", { decision: "APPROVE_FOR_EXPORT_REVIEW", reasonCode: "OTHER_REVIEW_REQUIRED" }, "u1")
    ).rejects.toThrow(BadRequestException);
  });

  it("missing billing event returns 404", async () => {
    const { svc } = buildService({ billingEvent: null });
    await expect(
      svc.recordDecision("f1", "missing", { decision: "APPROVE_FOR_EXPORT_REVIEW", reasonCode: "OTHER_REVIEW_REQUIRED" }, "u1")
    ).rejects.toThrow(NotFoundException);
  });

  it("no new BillingEvent created on decision", async () => {
    const { svc, prisma } = buildService();
    await svc.recordDecision("f1", "be1", {
      decision: "HOLD_FOR_CODER_REVIEW",
      reasonCode: "CODER_REVIEW_REQUIRED",
    }, "u1");
    expect(prisma.billingEvent.create).not.toHaveBeenCalled();
  });

  it("order status unchanged", async () => {
    const { svc, prisma } = buildService();
    await svc.recordDecision("f1", "be1", {
      decision: "APPROVE_FOR_EXPORT_REVIEW",
      reasonCode: "OTHER_REVIEW_REQUIRED",
    }, "u1");
    expect(prisma.orderItem.update).not.toHaveBeenCalled();
  });

  it("audit metadata PHI-safe", async () => {
    const { svc, audit } = buildService();
    await svc.recordDecision("f1", "be1", {
      decision: "APPROVE_FOR_EXPORT_REVIEW",
      reasonCode: "OTHER_REVIEW_REQUIRED",
    }, "u1");
    const meta = audit.log.mock.calls[0]?.[2]?.metadata as Record<string, unknown>;
    for (const forbidden of FORBIDDEN_PROCEDURE_REVENUE_REVIEW_KEYS) {
      expect(meta).not.toHaveProperty(forbidden);
    }
  });

  it("orphan warning when order item missing", async () => {
    const { svc } = buildService({ orderItem: null });
    const queue = await svc.getQueue({ facilityId: "f1" });
    expect(queue.rows[0]?.orphanWarning).toBe(true);
  });
});
