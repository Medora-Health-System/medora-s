import { Prisma } from "@prisma/client";
import { MedicationProductActivationGovernanceService } from "./medication-product-activation-governance.service";
import { MedicationMasterExplorerService } from "./medication-master-explorer.service";
import { AuditService } from "../common/services/audit.service";

describe("MedicationProductActivationGovernanceService pending review (19H.1)", () => {
  const prisma = {
    medicationProduct: { findMany: jest.fn() },
    medicationFormularyImportStaging: { findMany: jest.fn() },
  };

  const explorer = {
    assertFacilityScope: jest.fn(),
  } as unknown as MedicationMasterExplorerService;

  const audit = {} as unknown as AuditService;

  const service = new MedicationProductActivationGovernanceService(
    prisma as never,
    explorer,
    audit
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns empty list on Prisma query failure instead of throwing", async () => {
    prisma.medicationFormularyImportStaging.findMany = jest.fn().mockResolvedValue([]);
    prisma.medicationProduct.findMany = jest.fn().mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("column does not exist", {
        code: "P2022",
        clientVersion: "test",
      })
    );

    const result = await service.listPendingGovernanceActivationReview({
      facilityId: "11111111-1111-1111-1111-111111111111",
      limit: 50,
    });

    expect(result).toEqual({ items: [], total: 0 });
    const findArgs = prisma.medicationProduct.findMany.mock.calls[0]?.[0] as {
      select?: Record<string, unknown>;
    };
    expect(findArgs?.select?.id).toBe(true);
    expect(findArgs?.select).not.toHaveProperty("baselineAvailable");
  });

  it("scopes facility via formulary or promoted staging product ids", async () => {
    prisma.medicationFormularyImportStaging.findMany = jest.fn().mockResolvedValue([
      {
        promotionResultJson: { productId: "prod-global-1" },
      },
    ]);
    prisma.medicationProduct.findMany = jest.fn().mockResolvedValue([]);

    await service.listPendingGovernanceActivationReview({
      facilityId: "11111111-1111-1111-1111-111111111111",
      limit: 100,
    });

    expect(prisma.medicationProduct.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              OR: expect.arrayContaining([
                expect.objectContaining({
                  packages: expect.any(Object),
                }),
                { id: { in: ["prod-global-1"] } },
              ]),
            }),
            { governanceStatus: "REVIEW_REQUIRED" },
          ]),
        }),
      })
    );
  });
});
