import { BadRequestException } from "@nestjs/common";
import { MedicationProductGovernanceService } from "./medication-product-governance.service";
import { MedicationMasterExplorerService } from "./medication-master-explorer.service";

describe("MedicationProductGovernanceService", () => {
  const prisma = {
    medicationProduct: { findUnique: jest.fn(), update: jest.fn() },
    facilityFormularyItem: { findMany: jest.fn() },
    medicationPackage: { findFirst: jest.fn() },
    auditLog: { findMany: jest.fn() },
  };
  const audit = { log: jest.fn() };
  const explorer = { assertFacilityScope: jest.fn() } as unknown as MedicationMasterExplorerService;

  const service = new MedicationProductGovernanceService(prisma as never, explorer, audit as never);

  const productRow = {
    id: "prod-1",
    code: "PROD-1",
    governanceStatus: "READY_FOR_ACTIVATION",
    activationApprovedAt: null,
    activationApprovedByUserId: null,
    governanceNotes: null,
    administrationType: "PUSH",
    concept: {
      code: "C1",
      safetyProfile: { isHighAlert: false },
      searchAliases: [],
    },
      administrationProfile: { requiresInfusionSession: false, defaultMarWorkflow: "STANDARD" },
    infusionProfile: null,
    searchAliases: [],
    packages: [
      {
        id: "pkg-1",
        code: "PKG-1",
        ndc11: "12345678901",
        billingProfiles: [{ requiresManualReview: false }],
        facilityFormulary: { isOnFormulary: true, isEDFormulary: false },
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.medicationProduct.findUnique = jest.fn().mockResolvedValue(productRow);
    prisma.facilityFormularyItem.findMany = jest.fn().mockResolvedValue([
      { packageId: "pkg-1", isOnFormulary: true, isEDFormulary: false },
    ]);
    prisma.medicationPackage.findFirst = jest.fn().mockResolvedValue(null);
    prisma.medicationProduct.update = jest.fn().mockResolvedValue({
      id: "prod-1",
      code: "PROD-1",
      governanceStatus: "ACTIVATION_APPROVED",
      conceptId: "c1",
    });
    prisma.auditLog.findMany = jest.fn().mockResolvedValue([]);
  });

  it("blocks approval when readiness incomplete", async () => {
    prisma.medicationProduct.findUnique = jest.fn().mockResolvedValue({
      ...productRow,
      concept: { ...productRow.concept, safetyProfile: null },
    });

    await expect(
      service.approveActivation("prod-1", { facilityId: "fac-1" }, "user-1")
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.medicationProduct.update).not.toHaveBeenCalled();
  });

  it("requires governance note for block", async () => {
    await expect(
      service.blockProduct("prod-1", { facilityId: "fac-1", governanceNote: "  " }, "user-1")
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("approves and writes audit when ready", async () => {
    const result = await service.approveActivation(
      "prod-1",
      { facilityId: "fac-1", governanceNote: "OK pharmacie" },
      "user-1"
    );
    expect(result.governanceOnly).toBe(true);
    expect(audit.log).toHaveBeenCalledWith(
      "UPDATE",
      "MEDICATION_PRODUCT_GOVERNANCE",
      expect.objectContaining({
        entityId: "prod-1",
        critical: true,
        metadata: expect.objectContaining({ governanceAction: "APPROVE_ACTIVATION", runtimeCutover: false }),
      })
    );
  });
});
