import { BadRequestException } from "@nestjs/common";
import {
  BillingCodeType,
  BillingReviewStatus,
  BillingSide,
  BillingSourceModule,
  EncounterBillingFinalizationStatus,
} from "@prisma/client";
import {
  buildBillingAutoMappingCandidateSignature,
  resolveBillingAutoMappingDecision,
} from "@medora/shared";
import { BillingAutoMappingService } from "./billing-auto-mapping.service";
import { resolveBillingAutoMappingProposal } from "./billing-auto-mapping-resolver.util";

jest.mock("./billing-auto-mapping-resolver.util", () => ({
  resolveBillingAutoMappingProposal: jest.fn(),
}));

jest.mock("./billing-capture-sync-from-ledger.util", () => ({
  syncBillingCaptureItemFromLedgerRow: jest.fn().mockResolvedValue(undefined),
}));

describe("BillingAutoMappingService (MEDUI.BILLING.AUTO_MAPPING.1)", () => {
  const baseRow = {
    id: "be-1",
    facilityId: "f1",
    patientId: "p1",
    encounterId: "e1",
    sourceModule: BillingSourceModule.LAB_RESULT,
    sourceRecordId: "r1",
    code: "UNMAPPED",
    procedureCode: null,
    hcpcsCode: null,
    codeType: BillingCodeType.INTERNAL,
    billingSide: BillingSide.UNKNOWN,
    reviewStatus: BillingReviewStatus.CAPTURED,
    descriptionSnapshot: "CBC",
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  function buildService() {
    const prisma = {
      encounter: {
        findFirst: jest.fn().mockResolvedValue({
          id: "e1",
          billingFinalizationStatus: EncounterBillingFinalizationStatus.NOT_READY,
        }),
        findMany: jest.fn().mockResolvedValue([{ id: "e1" }]),
      },
      billingEvent: {
        findMany: jest.fn().mockResolvedValue([baseRow]),
        findFirst: jest.fn().mockResolvedValue(baseRow),
        update: jest.fn().mockImplementation(({ data }) => ({ ...baseRow, ...data })),
      },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          billingEvent: {
            update: jest.fn().mockImplementation(({ data }) => ({ ...baseRow, ...data })),
          },
        })
      ),
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const billingService = {
      getDoNotBillBillingEventIdsForEncounter: jest.fn().mockResolvedValue(new Set<string>()),
    };
    const svc = new BillingAutoMappingService(prisma as never, audit as never, billingService as never);
    return { svc, prisma, audit, billingService };
  }

  beforeEach(() => {
    jest.resetAllMocks();
    (resolveBillingAutoMappingProposal as jest.Mock).mockResolvedValue({
      candidateType: "LAB",
      sourceLabel: "CBC",
      normalizedKey: "cbc",
      confidence: "HIGH",
      ambiguousCatalogMatch: false,
      medicationAdministrationRouteMissing: false,
      procedureCode: "85025",
      hcpcsCode: null,
      code: "85025",
      codeType: BillingCodeType.CPT,
      billingSide: BillingSide.FACILITY,
      descriptionSnapshot: "CBC panel",
    });
  });

  it("preview endpoint returns candidates only", async () => {
    const { svc } = buildService();
    const preview = await svc.previewAutoMappingsForEncounter("f1", "e1");
    expect(preview.candidates.length).toBe(1);
    expect(preview.applyCount).toBe(1);
    expect(preview.candidates[0].decision).toBe("APPLY");
  });

  it("apply requires explicit selected ids", async () => {
    const { svc } = buildService();
    await expect(svc.applyAutoMappingsForEncounter("f1", "e1", [], "u1")).rejects.toThrow(BadRequestException);
  });

  it("apply audits every change", async () => {
    const { svc, audit } = buildService();
    const preview = await svc.previewAutoMappingsForEncounter("f1", "e1");
    await svc.applyAutoMappingsForEncounter("f1", "e1", [preview.candidates[0].ledgerLineId], "u1");
    expect(audit.log).toHaveBeenCalledWith(
      "UPDATE",
      "BILLING_AUTO_MAPPING",
      expect.objectContaining({
        metadata: expect.objectContaining({
          source: "AUTO_MAPPING_USER_APPLIED",
          ledgerLineId: "be-1",
        }),
      })
    );
  });

  it("rejects stale candidate signatures", async () => {
    const { svc } = buildService();
    const preview = await svc.previewAutoMappingsForEncounter("f1", "e1");
    (resolveBillingAutoMappingProposal as jest.Mock).mockResolvedValueOnce({
      candidateType: "LAB",
      sourceLabel: "CBC",
      normalizedKey: "cbc",
      confidence: "HIGH",
      ambiguousCatalogMatch: false,
      medicationAdministrationRouteMissing: false,
      procedureCode: "80053",
      hcpcsCode: null,
      code: "80053",
      codeType: BillingCodeType.CPT,
      billingSide: BillingSide.FACILITY,
      descriptionSnapshot: "Changed",
    });
    const result = await svc.applyAutoMappingsForEncounter("f1", "e1", [preview.candidates[0].ledgerLineId], "u1");
    expect(result.staleCount).toBe(1);
    expect(result.appliedCount).toBe(0);
  });

  it("enforces max apply count", async () => {
    const { svc } = buildService();
    const ids = Array.from({ length: 101 }, (_, i) => `id-${i}`);
    await expect(svc.applyAutoMappingsForEncounter("f1", "e1", ids, "u1")).rejects.toThrow(BadRequestException);
  });

  it("medication administration without route → REVIEW in preview", async () => {
    (resolveBillingAutoMappingProposal as jest.Mock).mockResolvedValue({
      candidateType: "MEDICATION_ADMINISTRATION",
      sourceLabel: "Drug",
      normalizedKey: "drug",
      confidence: "HIGH",
      ambiguousCatalogMatch: false,
      medicationAdministrationRouteMissing: true,
      procedureCode: null,
      hcpcsCode: "J1234",
      code: "J1234",
      codeType: BillingCodeType.HCPCS,
      billingSide: BillingSide.BOTH,
      descriptionSnapshot: "Drug",
    });
    const { svc, prisma } = buildService();
    prisma.billingEvent.findMany.mockResolvedValue([
      { ...baseRow, sourceModule: BillingSourceModule.MED_ADMIN, hcpcsCode: "UNMAPPED" },
    ]);
    const preview = await svc.previewAutoMappingsForEncounter("f1", "e1");
    expect(preview.reviewCount).toBe(1);
    expect(preview.applyCount).toBe(0);
  });
});

describe("billingAutoMapping governance integration", () => {
  it("manually edited line → SKIP", () => {
    expect(
      resolveBillingAutoMappingDecision({
        confidence: "HIGH",
        candidateType: "LAB",
        isUnmapped: true,
        isManuallyEdited: true,
        isDoNotBill: false,
        isVoidedOrSkipped: false,
        isFinalizedEncounter: false,
        hasCatalogMatch: true,
      })
    ).toBe("SKIP");
  });

  it("candidate signature is stable", () => {
    const sig = buildBillingAutoMappingCandidateSignature({
      ledgerLineId: "be-1",
      currentCode: "UNMAPPED",
      proposedCode: "85025",
      normalizedKey: "cbc",
      proposedCodeType: "CPT",
    });
    expect(sig).toContain("85025");
  });
});
