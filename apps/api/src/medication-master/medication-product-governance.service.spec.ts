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

  const validActionBody = {
    facilityId: "fac-1",
    governanceNote: "OK pharmacie",
    confirmExactSourcePreserved: true as const,
    confirmDuplicateGovernanceResolved: true as const,
  };

  it("requires confirmations and note for approve", async () => {
    await expect(
      service.approveActivation(
        "prod-1",
        { facilityId: "fac-1" } as Parameters<typeof service.approveActivation>[1],
        "user-1"
      )
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.approveActivation(
        "prod-1",
        { ...validActionBody, confirmExactSourcePreserved: false as unknown as true },
        "user-1"
      )
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.medicationProduct.update).not.toHaveBeenCalled();
  });

  it("blocks approval when readiness incomplete", async () => {
    prisma.medicationProduct.findUnique = jest.fn().mockResolvedValue({
      ...productRow,
      concept: { ...productRow.concept, safetyProfile: null },
    });

    await expect(
      service.approveActivation("prod-1", validActionBody, "user-1")
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.medicationProduct.update).not.toHaveBeenCalled();
  });

  it("requires governance note and confirmations for block", async () => {
    await expect(
      service.blockProduct(
        "prod-1",
        { facilityId: "fac-1", governanceNote: "  " } as Parameters<typeof service.blockProduct>[1],
        "user-1"
      )
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.blockProduct(
        "prod-1",
        {
          facilityId: "fac-1",
          governanceNote: "blocked",
          confirmExactSourcePreserved: false as unknown as true,
          confirmDuplicateGovernanceResolved: true,
        },
        "user-1"
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("approves and writes audit when ready", async () => {
    const result = await service.approveActivation("prod-1", validActionBody, "user-1");
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
