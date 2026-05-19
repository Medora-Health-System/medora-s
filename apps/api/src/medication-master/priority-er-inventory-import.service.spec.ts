import { BadRequestException } from "@nestjs/common";
import { PriorityErInventoryImportService } from "./priority-er-inventory-import.service";
import {
  buildHeaderlessPriorityErInventoryXlsxBuffer,
  buildPriorityErInventoryXlsxBuffer,
} from "./priority-er-inventory-workbook.util"; // active parser (not xlsx.util re-export)
import { loadMedicationCatalogIndex } from "./priority-er-inventory-catalog-index";

jest.mock("./priority-er-inventory-catalog-index", () => ({
  loadMedicationCatalogIndex: jest.fn(),
}));

describe("PriorityErInventoryImportService", () => {
  const prisma = {
    facility: { findUnique: jest.fn() },
    medicationFormularyImportStaging: {
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
      groupBy: jest.fn().mockResolvedValue([]),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    medicationConcept: { create: jest.fn() },
    medicationProduct: { create: jest.fn() },
    medicationPackage: { create: jest.fn() },
  };

  const service = new PriorityErInventoryImportService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
    (loadMedicationCatalogIndex as jest.Mock).mockResolvedValue({ entries: [], aliasToEntryKeys: new Map() });
  });

  const sampleBuffer = () =>
    buildPriorityErInventoryXlsxBuffer([
      { medication: "Atorvastatin", dose: "40 mg", form: "PO" },
      { medication: "Norepinephrine", dose: "4 mg/4 mL", form: "IV" },
    ]);

  it("dryRun does not write staging rows", async () => {
    const result = await service.importFromXlsxBuffer(
      sampleBuffer(),
      "PHARMACY INVENTORY LIST (1).xlsx",
      { dryRun: true },
      null
    );
    expect(result.summary.dryRun).toBe(true);
    expect(result.summary.stagedRows).toBe(0);
    expect(prisma.medicationFormularyImportStaging.createMany).not.toHaveBeenCalled();
    expect(prisma.medicationConcept.create).not.toHaveBeenCalled();
  });

  it("dryRun returns duplicate reconciliation summary", async () => {
    const result = await service.importFromXlsxBuffer(
      sampleBuffer(),
      "inventory.xlsx",
      { dryRun: true },
      null
    );
    expect(result.summary.totalRows).toBe(2);
    expect(result.rowOutcomes).toHaveLength(2);
    expect(result.summary.newCandidates).toBe(2);
  });

  it("dryRun=false writes only MedicationFormularyImportStaging", async () => {
    const result = await service.importFromXlsxBuffer(
      sampleBuffer(),
      "inventory.xlsx",
      { dryRun: false, batchId: "pri-er-test-batch" },
      "user-1"
    );
    expect(result.summary.stagedRows).toBe(2);
    expect(prisma.medicationFormularyImportStaging.createMany).toHaveBeenCalledTimes(1);
    const arg = (prisma.medicationFormularyImportStaging.createMany as jest.Mock).mock.calls[0][0];
    expect(arg.data[0].batchId).toBe("pri-er-test-batch");
    expect(arg.data[0].overallStatus).toBe("draft");
    expect(arg.data[0].importGateStatus).toBe("BLOCKED");
    expect(arg.data[0].sourceInventoryDescription).toBe("Atorvastatin 40 mg PO");
    expect(prisma.medicationConcept.create).not.toHaveBeenCalled();
    expect(prisma.medicationProduct.create).not.toHaveBeenCalled();
    expect(prisma.medicationPackage.create).not.toHaveBeenCalled();
  });

  it("adds BILLING_REVIEW_REQUIRED and NDC_REVIEW_REQUIRED flags", async () => {
    const result = await service.importFromXlsxBuffer(sampleBuffer(), "inventory.xlsx", { dryRun: true }, null);
    expect(result.rowOutcomes[0]?.reviewFlags).toContain("BILLING_REVIEW_REQUIRED");
    expect(result.rowOutcomes[0]?.reviewFlags).toContain("NDC_REVIEW_REQUIRED");
  });

  it("imports headerless 3-column workbook in dry-run without runtime activation", async () => {
    const buffer = buildHeaderlessPriorityErInventoryXlsxBuffer([
      { medication: "Acetaminophen", dose: "100mg/100ml", form: "Injection" },
    ]);
    const result = await service.importFromXlsxBuffer(
      buffer,
      "PHARMACY INVENTORY LIST (1).xlsx",
      { dryRun: true },
      null
    );
    expect(result.summary.headerlessDetected).toBe(true);
    expect(result.summary.stagedRows).toBe(0);
    expect(result.rowOutcomes[0]?.sourceInventoryDescription).toBe(
      "Acetaminophen 100mg/100ml Injection"
    );
    expect(prisma.medicationFormularyImportStaging.createMany).not.toHaveBeenCalled();
    expect(prisma.medicationConcept.create).not.toHaveBeenCalled();
  });

  it("rejects empty workbook buffer with structured error", async () => {
    try {
      await service.importFromXlsxBuffer(Buffer.alloc(0), "empty.xlsx", { dryRun: true }, null);
      fail("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
      const body = (e as BadRequestException).getResponse() as { code?: string };
      expect(body.code).toBe("EMPTY_FILE");
    }
  });
});
