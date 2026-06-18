import { BadRequestException } from "@nestjs/common";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BillingCodeType,
  BillingReviewStatus,
  BillingSide,
  BillingSourceModule,
  EncounterBillingFinalizationStatus,
} from "@prisma/client";
import { BillingAutoMappingService } from "./billing-auto-mapping.service";
import { resolveBillingAutoMappingProposal } from "./billing-auto-mapping-resolver.util";

jest.mock("./billing-auto-mapping-resolver.util", () => ({
  resolveBillingAutoMappingProposal: jest.fn(),
}));

jest.mock("./billing-capture-sync-from-ledger.util", () => ({
  syncBillingCaptureItemFromLedgerRow: jest.fn().mockResolvedValue(undefined),
}));

describe("BillingAutoMappingService bulk apply (MEDUI.BILLING.AUTO_MAPPING.1A)", () => {
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
    patient: { firstName: "Jean", lastName: "Dupont", mrn: "MRN-1", globalMrn: "G-1" },
  };

  function buildService() {
    const prisma = {
      encounter: {
        findFirst: jest.fn().mockResolvedValue({
          id: "e1",
          billingFinalizationStatus: EncounterBillingFinalizationStatus.NOT_READY,
        }),
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

  it("workspace endpoint returns counts and rows", async () => {
    const { svc } = buildService();
    const workspace = await svc.getAutoMappingWorkspace("f1");
    expect(workspace.counts.total).toBeGreaterThanOrEqual(1);
    expect(workspace.rows[0].queue).toBe("APPLY_READY");
    expect(workspace.rows[0].patientName).toBe("Jean Dupont");
  });

  it("bulk apply succeeds for apply-ready rows", async () => {
    const { svc, audit } = buildService();
    const result = await svc.bulkApplyAutoMappings("f1", ["be-1"], "u1");
    expect(result.applied).toBe(1);
    expect(result.appliedLedgerRowIds).toEqual(["be-1"]);
    expect(audit.log).toHaveBeenCalledWith(
      "UPDATE",
      "AUTO_MAPPING_APPLIED",
      expect.objectContaining({
        metadata: expect.objectContaining({
          source: "BULK_AUTO_MAPPING",
          ledgerRowId: "be-1",
        }),
      })
    );
  });

  it("bulk apply skips invalid review-required rows", async () => {
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
    const { svc } = buildService();
    const result = await svc.bulkApplyAutoMappings("f1", ["be-1"], "u1");
    expect(result.applied).toBe(0);
    expect(result.skipped).toBeGreaterThanOrEqual(1);
  });

  it("bulk apply requires ledgerRowIds", async () => {
    const { svc } = buildService();
    await expect(svc.bulkApplyAutoMappings("f1", [], "u1")).rejects.toThrow(BadRequestException);
  });

  it("bulk apply enforces max count", async () => {
    const { svc } = buildService();
    const ids = Array.from({ length: 501 }, (_, i) => `id-${i}`);
    await expect(svc.bulkApplyAutoMappings("f1", ids, "u1")).rejects.toThrow(BadRequestException);
  });
});

describe("billingAutoMappingBulkApply.api routes", () => {
  it("controller exposes workspace and bulk-apply endpoints", () => {
    const controller = readFileSync(join(__dirname, "billing.controller.ts"), "utf8");
    expect(controller).toContain('@Get("billing/auto-mapping/workspace")');
    expect(controller).toContain('@Post("billing/auto-mapping/bulk-apply")');
    expect(controller).toContain("RoleCode.BILLING, RoleCode.ADMIN");
  });
});
