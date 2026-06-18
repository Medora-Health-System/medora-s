import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { BillingReviewDecisionStatus } from "@prisma/client";
import { BillingService } from "./billing.service";

function buildBillingServiceForBulk(overrides?: {
  existingDecisions?: Record<string, BillingReviewDecisionStatus | undefined>;
  orderItemExists?: Record<string, boolean>;
}) {
  const existingDecisions = overrides?.existingDecisions ?? {};
  const orderItemExists = overrides?.orderItemExists ?? { "oi-1": true, "oi-2": true, "oi-3": true };

  const billingReviewDecisionUpsert = jest.fn().mockImplementation(async ({ where, create, update }) => {
    const orderItemId = where.facilityId_orderItemId.orderItemId;
    return {
      id: `brd-${orderItemId}`,
      facilityId: "f1",
      encounterId: "e1",
      patientId: "p1",
      orderItemId,
      decision: create?.decision ?? update?.decision,
      notes: create?.notes ?? update?.notes ?? null,
      reviewerId: create?.reviewerId ?? update?.reviewerId,
      reviewedAt: create?.reviewedAt ?? update?.reviewedAt ?? new Date(),
      billingEventId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  const prisma = {
    billingReviewDecision: {
      findUnique: jest.fn().mockImplementation(async ({ where }) => {
        if (where.id) {
          const orderItemId = String(where.id).replace("brd-", "");
          return {
            id: where.id,
            facilityId: "f1",
            encounterId: "e1",
            patientId: "p1",
            orderItemId,
            decision: BillingReviewDecisionStatus.APPROVED,
            notes: null,
            reviewerId: "user-1",
            reviewedAt: new Date(),
            billingEventId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            reviewer: { firstName: "Platform", lastName: "Principal", email: "pp@example.com" },
          };
        }
        const decision = existingDecisions[where.facilityId_orderItemId.orderItemId];
        return decision ? { decision } : null;
      }),
      upsert: billingReviewDecisionUpsert,
    },
    orderItem: {
      findFirst: jest.fn().mockImplementation(async ({ where }) => {
        if (orderItemExists[where.id]) {
          return {
            id: where.id,
            order: { id: "ord-1", encounterId: "e1", patientId: "p1" },
          };
        }
        return null;
      }),
    },
    $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        billingReviewDecision: { upsert: billingReviewDecisionUpsert },
      })
    ),
  };

  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const svc = new BillingService(prisma as never, audit as never);
  return { svc, prisma, audit, billingReviewDecisionUpsert };
}

describe("manualBillingReviewBulkApproval API (MEDUI.BILLING.MANUAL_REVIEW.1)", () => {
  it("rejects empty bulk approval", async () => {
    const { svc } = buildBillingServiceForBulk();
    await expect(
      svc.bulkUpsertManualBillingReviewDecision("f1", { itemIds: [], decision: "APPROVED" }, "user-1")
    ).rejects.toThrow(BadRequestException);
  });

  it("rejects over max item count", async () => {
    const { svc } = buildBillingServiceForBulk();
    const itemIds = Array.from({ length: 101 }, (_, i) => `oi-${i}`);
    await expect(
      svc.bulkUpsertManualBillingReviewDecision("f1", { itemIds, decision: "APPROVED" }, "user-1")
    ).rejects.toThrow(BadRequestException);
  });

  it("rejects duplicate ids", async () => {
    const { svc } = buildBillingServiceForBulk();
    await expect(
      svc.bulkUpsertManualBillingReviewDecision(
        "f1",
        { itemIds: ["oi-1", "oi-1"], decision: "APPROVED" },
        "user-1"
      )
    ).rejects.toThrow(BadRequestException);
  });

  it("rejects bulk DO_NOT_BILL", async () => {
    const { svc } = buildBillingServiceForBulk();
    await expect(
      svc.bulkUpsertManualBillingReviewDecision(
        "f1",
        { itemIds: ["oi-1"], decision: "DO_NOT_BILL" },
        "user-1"
      )
    ).rejects.toThrow(BadRequestException);
  });

  it("rejects bulk NEEDS_INFO", async () => {
    const { svc } = buildBillingServiceForBulk();
    await expect(
      svc.bulkUpsertManualBillingReviewDecision(
        "f1",
        { itemIds: ["oi-1"], decision: "NEEDS_INFO" },
        "user-1"
      )
    ).rejects.toThrow(BadRequestException);
  });

  it("requires reviewer authentication", async () => {
    const { svc } = buildBillingServiceForBulk();
    await expect(
      svc.bulkUpsertManualBillingReviewDecision("f1", { itemIds: ["oi-1"], decision: "APPROVED" })
    ).rejects.toThrow(ForbiddenException);
  });

  it("approves selected items and returns summary", async () => {
    const { svc } = buildBillingServiceForBulk();
    const result = await svc.bulkUpsertManualBillingReviewDecision(
      "f1",
      { itemIds: ["oi-1", "oi-2"], decision: "APPROVED" },
      "user-1"
    );
    expect(result.requested).toBe(2);
    expect(result.approved).toBe(2);
    expect(result.skipped).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.results).toHaveLength(2);
  });

  it("records audit per approved item with BULK_APPROVAL source", async () => {
    const { svc, audit } = buildBillingServiceForBulk();
    await svc.bulkUpsertManualBillingReviewDecision(
      "f1",
      { itemIds: ["oi-1"], decision: "APPROVED", reason: "Routine review" },
      "user-1"
    );
    expect(audit.log).toHaveBeenCalledTimes(1);
    expect(audit.log).toHaveBeenCalledWith(
      expect.anything(),
      "BILLING_REVIEW_DECISION",
      expect.objectContaining({
        userId: "user-1",
        metadata: expect.objectContaining({
          orderItemId: "oi-1",
          decision: BillingReviewDecisionStatus.APPROVED,
          source: "BULK_APPROVAL",
          bulkReason: "Routine review",
        }),
      })
    );
  });

  it("preserves reviewer id on bulk approval", async () => {
    const { svc, billingReviewDecisionUpsert } = buildBillingServiceForBulk();
    await svc.bulkUpsertManualBillingReviewDecision(
      "f1",
      { itemIds: ["oi-1"], decision: "APPROVED" },
      "reviewer-42"
    );
    expect(billingReviewDecisionUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ reviewerId: "reviewer-42" }),
        update: expect.objectContaining({ reviewerId: "reviewer-42" }),
      })
    );
  });

  it("skips already approved items safely", async () => {
    const { svc, audit } = buildBillingServiceForBulk({
      existingDecisions: { "oi-1": BillingReviewDecisionStatus.APPROVED },
    });
    const result = await svc.bulkUpsertManualBillingReviewDecision(
      "f1",
      { itemIds: ["oi-1", "oi-2"], decision: "APPROVED" },
      "user-1"
    );
    expect(result.approved).toBe(1);
    expect(result.skipped).toBe(1);
    expect(audit.log).toHaveBeenCalledTimes(1);
  });

  it("skips procedure documented pseudo ids", async () => {
    const { svc } = buildBillingServiceForBulk();
    const result = await svc.bulkUpsertManualBillingReviewDecision(
      "f1",
      { itemIds: ["proc-doc_evt-1"], decision: "APPROVED" },
      "user-1"
    );
    expect(result.approved).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.results[0]?.status).toBe("skipped");
  });

  it("does not create billing events or post payments", async () => {
    const { svc, prisma } = buildBillingServiceForBulk();
    await svc.bulkUpsertManualBillingReviewDecision(
      "f1",
      { itemIds: ["oi-1"], decision: "APPROVED" },
      "user-1"
    );
    expect(prisma).not.toHaveProperty("billingEvent.create");
    expect(prisma).not.toHaveProperty("payment");
  });

  it("controller exposes bulk-decision before param route", () => {
    const fs = require("node:fs");
    const path = require("node:path");
    const controller = fs.readFileSync(
      path.join(__dirname, "billing.controller.ts"),
      "utf8"
    );
    const bulkIndex = controller.indexOf('@Post("billing/manual-review/bulk-decision")');
    const paramIndex = controller.indexOf('@Post("billing/manual-review/:orderItemId/decision")');
    expect(bulkIndex).toBeGreaterThan(-1);
    expect(paramIndex).toBeGreaterThan(bulkIndex);
  });
});
