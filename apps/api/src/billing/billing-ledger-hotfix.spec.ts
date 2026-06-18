import { BadRequestException } from "@nestjs/common";
import { BillingReviewStatus, BillingSide, BillingSourceModule, BillingCodeType } from "@prisma/client";
import { buildEncounterClaimsFromEvents, ClaimBuilderService } from "./claim-builder.service";
import { MANUAL_BILLING_REVIEW_UNRESOLVED_MESSAGE } from "./billing.service";
import { ClaimTransmissionService } from "./claim-transmission.service";
import { BILLING_LEDGER_ARTIFACT_STATUS } from "./billing-ledger-artifact.util";
import { QueuesController } from "../queues/queues.controller";

function labBillingEvent(overrides: Partial<{
  diagnosisCodes: string | null;
  procedureCode: string | null;
}> = {}) {
  return {
    id: "be-1",
    sourceModule: BillingSourceModule.LAB_RESULT,
    sourceRecordId: "lab-1",
    reviewStatus: BillingReviewStatus.CAPTURED,
    codeType: BillingCodeType.CPT,
    code: overrides.procedureCode ?? "80053",
    procedureCode: overrides.procedureCode ?? "80053",
    hcpcsCode: null,
    diagnosisCodes:
      overrides.diagnosisCodes !== undefined ? overrides.diagnosisCodes : "E11.9",
    serviceDate: new Date("2026-06-01T10:00:00.000Z"),
    descriptionSnapshot: "CMP",
    billingSide: BillingSide.PROFESSIONAL,
    revenueCode: null,
    modifier1: null,
    modifier2: null,
    createdAt: new Date("2026-06-01T10:00:00.000Z"),
  };
}

describe("billing ledger hotfix (MEDUI.BILLING.HOTFIX.1)", () => {
  it("1 — ledger claim assembly stays open with missing diagnosis linkage", () => {
    const result = buildEncounterClaimsFromEvents([labBillingEvent({ diagnosisCodes: null }) as never], 0);
    expect(result.professional.totalLines).toBeGreaterThan(0);
    expect(
      result.validation.summary.warnings.some((w) => w.code === "PROCEDURE_WITHOUT_DIAGNOSIS_LINK")
    ).toBe(true);
    expect(result.validation.meta.diagnosisLinked).toBe(false);
  });

  it("2 — ledger claim assembly reports no billable events when CPT lines are absent", () => {
    const result = buildEncounterClaimsFromEvents([], 1);
    expect(result.summary.totalLines).toBe(0);
    expect(result.validation.summary.warnings.some((w) => w.code === "NO_BILLABLE_EVENTS")).toBe(true);
  });

  it("3 — buildEncounterClaims returns validation blockers when manual review is unresolved", async () => {
    const billingService = {
      getEncounterManualReviewGate: jest.fn().mockResolvedValue({
        encounterId: "enc-1",
        unresolvedCount: 1,
        unresolvedItems: [{ orderItemId: "oi-1" }],
        doNotBillOrderItemIds: [],
      }),
      getDoNotBillBillingEventIdsForEncounter: jest.fn(),
    };
    const prisma = {
      billingEvent: {
        findMany: jest.fn().mockResolvedValue([labBillingEvent()]),
      },
      diagnosis: {
        count: jest.fn().mockResolvedValue(0),
      },
    };

    const svc = new ClaimBuilderService(prisma as never, billingService as never);
    const result = await svc.buildEncounterClaims("fac-1", "enc-1");

    expect(result.validation.summary.blockers.some((b) => b.code === "MANUAL_BILLING_REVIEW_UNRESOLVED")).toBe(
      true
    );
    expect(result.summary.ready).toBe(false);
    expect(billingService.getEncounterManualReviewGate).toHaveBeenCalled();
  });

  it("4 — claim-export route returns NOT_READY instead of 400 for incomplete data", async () => {
    const claimExportService = {
      buildEncounterClaimExport: jest
        .fn()
        .mockRejectedValue(new BadRequestException("MISSING_PAYER_CONTEXT")),
    };
    const controller = new QueuesController(
      {} as never,
      {} as never,
      claimExportService as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never
    );
    const result = await controller.getEncounterClaimExport("enc-1", { facilityId: "fac-1" });
    expect(result).toMatchObject({
      status: BILLING_LEDGER_ARTIFACT_STATUS.NOT_READY,
      blockers: ["MISSING_PAYER_CONTEXT"],
    });
  });

  it("5 — x12-preview route returns NOT_READY instead of 400 for incomplete data", async () => {
    const x12837GeneratorService = {
      buildEncounterX12Preview: jest
        .fn()
        .mockRejectedValue(new BadRequestException("CLAIM_EXPORT_NOT_READY")),
    };
    const controller = new QueuesController(
      {} as never,
      {} as never,
      {} as never,
      x12837GeneratorService as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never
    );
    const result = await controller.getEncounterX12Preview("enc-1", { facilityId: "fac-1" });
    expect(result).toMatchObject({
      status: BILLING_LEDGER_ARTIFACT_STATUS.NOT_READY,
    });
  });

  it("6 — submission-debug returns NOT_READY payload when claim export is incomplete", async () => {
    const prisma = {
      encounter: { findFirst: jest.fn().mockResolvedValue({ id: "enc-1" }) },
      claimSubmission: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const claimExportService = {
      buildEncounterClaimExport: jest
        .fn()
        .mockRejectedValue(new BadRequestException("MISSING_PAYER_CONTEXT")),
    };
    const svc = new ClaimTransmissionService(
      prisma as never,
      {} as never,
      claimExportService as never,
      {} as never,
      {} as never
    );
    const result = await svc.getEncounterSubmissionDebug("fac-1", "enc-1");
    expect(result).toMatchObject({
      status: BILLING_LEDGER_ARTIFACT_STATUS.NOT_READY,
      claimReady: false,
      blockedByCompleteness: true,
      submissions: [],
    });
  });

  it("7 — submission-debug route wraps BadRequest as NOT_READY", async () => {
    const claimTransmissionService = {
      getEncounterSubmissionDebug: jest
        .fn()
        .mockRejectedValue(new BadRequestException("CLAIM_NOT_READY_FOR_SUBMISSION")),
    };
    const controller = new QueuesController(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      claimTransmissionService as never,
      {} as never,
      {} as never,
      {} as never
    );
    const result = await controller.getEncounterSubmissionDebug("enc-1", { facilityId: "fac-1" });
    expect(result).toMatchObject({
      status: BILLING_LEDGER_ARTIFACT_STATUS.NOT_READY,
      claimReady: false,
      submissions: [],
    });
  });

  it("8 — ready encounter claim assembly still returns structured claims", () => {
    const result = buildEncounterClaimsFromEvents([labBillingEvent() as never], 1);
    expect(result.professional.totalLines).toBeGreaterThan(0);
    expect(result.validation.summary.blockers.some((b) => b.code === "MANUAL_BILLING_REVIEW_UNRESOLVED")).toBe(
      false
    );
  });

  it("9 — assertEncounterManualReviewResolved still blocks finalize mutations only", async () => {
    const billingService = {
      getEncounterManualReviewGate: jest.fn().mockResolvedValue({
        encounterId: "enc-1",
        unresolvedCount: 1,
        unresolvedItems: [],
        doNotBillOrderItemIds: [],
      }),
    };
    const { BillingService } = await import("./billing.service");
    const svc = new BillingService({} as never, {} as never);
    jest.spyOn(svc, "getEncounterManualReviewGate").mockImplementation(billingService.getEncounterManualReviewGate);

    await expect(svc.assertEncounterManualReviewResolved("fac-1", "enc-1")).rejects.toThrow(BadRequestException);
    await expect(svc.assertEncounterManualReviewResolved("fac-1", "enc-1")).rejects.toThrow(
      MANUAL_BILLING_REVIEW_UNRESOLVED_MESSAGE
    );
  });

  it("10 — archive-visible billing-incomplete encounter gets 200 NOT_READY from claims route on read failure", async () => {
    const encounterId = "enc-billing-ledger-regression";
    const claimBuilderService = {
      buildEncounterClaims: jest
        .fn()
        .mockRejectedValue(new BadRequestException("Manual billing review unresolved for this encounter.")),
    };
    const controller = new QueuesController(
      {} as never,
      claimBuilderService as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never
    );
    const result = await controller.getEncounterClaimAssembly(encounterId, { facilityId: "fac-er-1" });
    expect(result).toMatchObject({
      status: BILLING_LEDGER_ARTIFACT_STATUS.NOT_READY,
      blockers: expect.arrayContaining([expect.stringContaining("Manual billing review unresolved")]),
    });
    expect((result as { status: string }).status).not.toBe("400");
  });
});
