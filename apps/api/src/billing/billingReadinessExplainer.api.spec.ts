import { NotFoundException } from "@nestjs/common";
import { BillingService } from "./billing.service";

jest.mock("./claim-billing-identity.util", () => ({
  evaluateClaimIdentityGaps: jest.fn().mockResolvedValue(["MISSING_PAYER_CONTEXT"]),
}));

describe("billingReadinessExplainer API (MEDUI.BILLING.READINESS.EXPLAINER.1)", () => {
  function buildService() {
    const prisma = {
      encounter: {
        findFirst: jest.fn().mockResolvedValue({
          id: "e1",
          status: "CLOSED",
          dischargeStatus: "DISCHARGED",
          physicianAssignedUserId: null,
          patientId: "p1",
          dischargedAt: new Date("2026-06-01T12:00:00.000Z"),
          billingFinalizationStatus: "NOT_READY",
        }),
      },
      billingEvent: {
        findMany: jest.fn().mockResolvedValue([
          {
            reviewStatus: "CAPTURED",
            sourceModule: "LAB",
            billingSide: "PROFESSIONAL",
            procedureCode: null,
            hcpcsCode: null,
            code: "UNMAPPED",
            diagnosisCodes: null,
          },
        ]),
      },
      diagnosis: {
        count: jest.fn().mockResolvedValue(0),
      },
    };
    const audit = { log: jest.fn() };
    const svc = new BillingService(prisma as never, audit as never);
    jest.spyOn(svc, "getManualBillingReviewQueue").mockResolvedValue([
      {
        encounterId: "e1",
        patientId: "p1",
        patientName: "Test",
        orderItemId: "oi-1",
        medoraCode: "MED",
        category: "MEDICATION",
        displayName: "Med",
        billingStatus: "candidate_only",
        reason: "review",
        createdAt: "2026-06-01T12:00:00.000Z",
        latestDecision: {
          id: "d1",
          orderItemId: "oi-1",
          decision: "APPROVED",
          notes: null,
          reviewerId: "u1",
          reviewerName: "Reviewer",
          reviewedAt: "2026-06-02T12:00:00.000Z",
          billingEventId: null,
          createdAt: "2026-06-02T12:00:00.000Z",
          updatedAt: "2026-06-02T12:00:00.000Z",
        },
        decisionAuditTrail: [],
      },
      {
        encounterId: "e1",
        patientId: "p1",
        patientName: "Test",
        orderItemId: "oi-2",
        medoraCode: "LAB",
        category: "LAB",
        displayName: "Lab",
        billingStatus: "candidate_only",
        reason: "review",
        createdAt: "2026-06-01T12:00:00.000Z",
        latestDecision: null,
        decisionAuditTrail: [],
      },
    ] as never);
    return { svc, prisma };
  }

  it("returns explainer summary for encounter", async () => {
    const { svc } = buildService();
    const summary = await svc.getEncounterReadinessExplainer("f1", "e1");
    expect(summary.blockerCount).toBeGreaterThan(0);
    expect(summary.items.length).toBeGreaterThan(0);
  });

  it("approved manual review decisions are excluded from unresolved count", async () => {
    const { svc } = buildService();
    const counts = (await svc.summarizeManualReviewForEncounters("f1", ["e1"])).get("e1");
    expect(counts?.requiresReviewCount).toBe(2);
    expect(counts?.unresolvedCount).toBe(1);
  });

  it("all-approved manual review yields zero unresolved blockers", async () => {
    const { svc } = buildService();
    jest.spyOn(svc, "getManualBillingReviewQueue").mockResolvedValue([
      {
        encounterId: "e1",
        patientId: "p1",
        patientName: "Test",
        orderItemId: "oi-1",
        medoraCode: "MED",
        category: "MEDICATION",
        displayName: "Med",
        billingStatus: "candidate_only",
        reason: "review",
        createdAt: "2026-06-01T12:00:00.000Z",
        reviewAnchorType: "ORDER_ITEM",
        latestDecision: {
          id: "d1",
          orderItemId: "oi-1",
          decision: "APPROVED",
          notes: null,
          reviewerId: "u1",
          reviewerName: "Reviewer",
          reviewedAt: "2026-06-02T12:00:00.000Z",
          billingEventId: null,
          createdAt: "2026-06-02T12:00:00.000Z",
          updatedAt: "2026-06-02T12:00:00.000Z",
        },
        decisionAuditTrail: [],
      },
    ] as never);
    const counts = (await svc.summarizeManualReviewForEncounters("f1", ["e1"])).get("e1");
    expect(counts?.unresolvedCount).toBe(0);
    expect(counts?.requiresReviewCount).toBe(1);
  });

  it("includes payer identity gaps", async () => {
    const { svc } = buildService();
    const summary = await svc.getEncounterReadinessExplainer("f1", "e1");
    expect(summary.items.some((item) => item.category === "PAYER")).toBe(true);
  });

  it("throws when encounter missing", async () => {
    const { svc, prisma } = buildService();
    prisma.encounter.findFirst.mockResolvedValue(null);
    await expect(svc.getEncounterReadinessExplainer("f1", "missing")).rejects.toThrow(NotFoundException);
  });

  it("controller exposes read-only GET readiness-explainer", () => {
    const fs = require("node:fs");
    const path = require("node:path");
    const controller = fs.readFileSync(path.join(__dirname, "billing.controller.ts"), "utf8");
    expect(controller).toContain('@Get("billing/encounters/:encounterId/readiness-explainer")');
    const section = controller.slice(
      controller.indexOf('@Get("billing/encounters/:encounterId/readiness-explainer")'),
      controller.indexOf('@Get("billing/encounters/:encounterId/readiness-explainer")') + 400
    );
    expect(section).not.toContain("@Post");
    expect(section).not.toContain("@Patch");
  });

  it("queue service attaches readinessExplainer in billing queue read path", () => {
    const fs = require("node:fs");
    const path = require("node:path");
    const service = fs.readFileSync(path.join(__dirname, "../queues/queues.service.ts"), "utf8");
    const queueSection = service.slice(service.indexOf("async getBillingQueue"), service.indexOf("async getBillingEncounterSummary"));
    expect(queueSection).toContain("readinessExplainer");
    expect(queueSection).toContain("buildBillingReadinessExplainerSummary");
    expect(queueSection).not.toContain("submitClaim");
  });
});
