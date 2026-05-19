import { BadRequestException } from "@nestjs/common";
import { AuditAction } from "@prisma/client";
import { loadMedicationCatalogIndex } from "./priority-er-inventory-catalog-index";
import { MedicationStagingDuplicateGovernanceService } from "./medication-staging-duplicate-governance.service";

jest.mock("./priority-er-inventory-catalog-index", () => ({
  loadMedicationCatalogIndex: jest.fn(),
}));
import { medicationFormularyImportStagingPromotionFixture } from "./medication-formulary-import-staging.types";
import { evaluatePriorityErPromotionEligibility } from "./priority-er-inventory-promotion-eligibility.util";

const stagingRow = medicationFormularyImportStagingPromotionFixture({
  id: "st-gov-1",
  reconciliationStatus: "POSSIBLE_DUPLICATE",
  reviewFlags: ["MANUAL_REVIEW_REQUIRED", "POSSIBLE_DUPLICATE"],
});

beforeEach(() => {
  (loadMedicationCatalogIndex as jest.Mock).mockResolvedValue({
    entries: [],
    aliasToEntryKeys: new Map(),
  });
});

function makeService() {
  const prisma = {
    medicationFormularyImportStaging: {
      findMany: jest.fn().mockResolvedValue([stagingRow]),
      findUnique: jest.fn().mockResolvedValue(stagingRow),
      update: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve({ ...stagingRow, ...data })
      ),
    },
    medicationConcept: { findUnique: jest.fn().mockResolvedValue({ id: "concept-1" }) },
    medicationProduct: { findUnique: jest.fn().mockResolvedValue({ id: "product-1" }) },
  };
  const audit = { log: jest.fn() };
  const explorer = {
    assertFacilityScope: jest.fn(),
  };
  const service = new MedicationStagingDuplicateGovernanceService(
    prisma as never,
    audit as never,
    explorer as never
  );
  return { service, prisma, audit, explorer };
}

describe("MedicationStagingDuplicateGovernanceService (19F)", () => {
  it("lists Priority ER staging rows with exact source fields", async () => {
    const { service } = makeService();
    const res = await service.listStagingDuplicates({ limit: 10, offset: 0 });
    expect(res.total).toBe(1);
    expect(res.items[0]?.medication).toBe("Fixture medication");
    expect(res.items[0]?.exactSourceText).toContain("Fixture medication");
    expect(res.items[0]?.medication).not.toMatch(/Acétaminophène/i);
  });

  it("resolve requires confirmExactSourcePreserved via DTO (note + decision)", async () => {
    const { service, audit } = makeService();
    const row = await service.resolveStagingDuplicate(
      "st-gov-1",
      {
        decision: "CREATE_NEW_APPROVED",
        note: "Approved for inactive canonical promotion",
        confirmExactSourcePreserved: true,
        facilityId: "fac-1",
      },
      "user-1"
    );
    expect(row.governance.governanceDecision).toBe("CREATE_NEW_APPROVED");
    expect(audit.log).toHaveBeenCalledWith(
      AuditAction.UPDATE,
      "MEDICATION_DUPLICATE_REVIEWED",
      expect.objectContaining({
        metadata: expect.objectContaining({
          stagingRowId: "st-gov-1",
          decision: "CREATE_NEW_APPROVED",
        }),
      })
    );
    const meta = (audit.log as jest.Mock).mock.calls[0][2].metadata;
    expect(JSON.stringify(meta)).not.toContain("Acetaminophen");
  });

  it("block prevents promotion eligibility", async () => {
    const { service, prisma } = makeService();
    await service.blockStagingDuplicate(
      "st-gov-1",
      { note: "Duplicate of existing formulary row", facilityId: "fac-1" },
      "user-1"
    );
    const updated = (prisma.medicationFormularyImportStaging.update as jest.Mock).mock.calls[0][0]
      .data;
    const eligibility = evaluatePriorityErPromotionEligibility({
      ...stagingRow,
      rawJson: updated.rawJson,
      reviewFlags: updated.reviewFlags,
    });
    expect(eligibility.eligible).toBe(false);
  });

  it("rejects LINK_TO_EXISTING without link targets", async () => {
    const { service } = makeService();
    await expect(
      service.resolveStagingDuplicate(
        "st-gov-1",
        {
          decision: "LINK_TO_EXISTING",
          note: "Link attempt without target",
          confirmExactSourcePreserved: true,
        },
        "user-1"
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("validates linked concept exists", async () => {
    const { service, prisma } = makeService();
    prisma.medicationConcept.findUnique.mockResolvedValue(null);
    await expect(
      service.resolveStagingDuplicate(
        "st-gov-1",
        {
          decision: "LINK_TO_EXISTING",
          note: "Link to missing concept",
          confirmExactSourcePreserved: true,
          linkedConceptId: "missing",
        },
        "user-1"
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
