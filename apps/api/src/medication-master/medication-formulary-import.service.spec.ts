import { BadRequestException } from "@nestjs/common";
import { MedicationFormularyImportService } from "./medication-formulary-import.service";
import { FORMULARY_WORKBOOK_REQUIRED_COLUMNS } from "./formulary-workbook.constants";

function csvHeader(): string {
  return FORMULARY_WORKBOOK_REQUIRED_COLUMNS.join(",");
}

function csvDataRow(overrides: Record<string, string> = {}): string {
  const base: Record<string, string> = {
    workbook_row_id: "PRI_001",
    generic_name: "Norepinephrine",
    display_name_fr: "Norépinéphrine",
    concentration_display: "4 mg/4 mL",
    route: "IV",
    dosage_form: "injectable",
    administration_type: "PUSH",
    package_type: "VIAL",
    package_description: "4 mL vial",
    reconciliation_status: "NEW_PRODUCT_REQUIRED",
    billing_unit_strategy: "PER_MG",
    wastage_billable: "no",
    billing_review_status: "approved",
    controlled_substance: "no",
    high_alert: "yes",
    lasa_risk: "none",
    safety_review_status: "approved",
    infusion_capable: "no",
    mar_workflow: "SINGLE_DOSE",
    bedside_administer: "yes",
    pharmacy_dispense: "no",
    default_fulfillment_intent: "ADMINISTER_CHART",
    formulary_category: "VASOPRESSOR",
    ed_formulary: "yes",
    unit_of_measure_stock: "vial",
    unit_of_measure_billing: "mg",
    source_inventory_description: "Norepinephrine vial",
    import_gate_status: "READY",
    overall_status: "approved",
    pharmacy_signoff: "Pharm Lead",
    nursing_signoff: "RN",
    ed_md_signoff: "MD",
    aliases: "levophed",
    ...overrides,
  };
  return FORMULARY_WORKBOOK_REQUIRED_COLUMNS.map((c) => base[c] ?? "").join(",");
}

describe("MedicationFormularyImportService", () => {
  const prisma = {
    facility: { findUnique: jest.fn() },
    medicationFormularyImportStaging: {
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
      findMany: jest.fn(),
    },
    catalogMedication: { findMany: jest.fn() },
    medicationConcept: { create: jest.fn() },
    medicationProduct: { create: jest.fn() },
    medicationPackage: { create: jest.fn() },
  };

  const service = new MedicationFormularyImportService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("dry-run does not write staging rows", async () => {
    const csv = `${csvHeader()}\n${csvDataRow()}`;
    const result = await service.importStaging({ csv, dryRun: true }, null);
    expect(result.summary.dryRun).toBe(true);
    expect(result.summary.rowsWritten).toBe(0);
    expect(prisma.medicationFormularyImportStaging.createMany).not.toHaveBeenCalled();
    expect(prisma.medicationConcept.create).not.toHaveBeenCalled();
    expect(prisma.medicationProduct.create).not.toHaveBeenCalled();
    expect(prisma.medicationPackage.create).not.toHaveBeenCalled();
  });

  it("import writes only MedicationFormularyImportStaging", async () => {
    const csv = `${csvHeader()}\n${csvDataRow()}`;
    const result = await service.importStaging(
      { csv, dryRun: false, batchId: "test-batch-1" },
      "user-1"
    );
    expect(result.summary.rowsWritten).toBe(1);
    expect(prisma.medicationFormularyImportStaging.createMany).toHaveBeenCalledTimes(1);
    const arg = (prisma.medicationFormularyImportStaging.createMany as jest.Mock).mock.calls[0][0];
    expect(arg.data[0].batchId).toBe("test-batch-1");
    expect(arg.data[0].importedByUserId).toBe("user-1");
    expect(prisma.medicationConcept.create).not.toHaveBeenCalled();
  });

  it("stores validationErrors on invalid rows", async () => {
    const csv = `${csvHeader()}\n${csvDataRow({ route: "NOT_A_ROUTE" })}`;
    const result = await service.importStaging({ csv, dryRun: false, batchId: "bad-batch" }, "u1");
    const arg = (prisma.medicationFormularyImportStaging.createMany as jest.Mock).mock.calls[0][0];
    expect(arg.data[0].validationErrors).toBeDefined();
    expect(result.summary.validRows).toBe(0);
    expect(result.summary.blockedRows).toBe(1);
  });

  it("rejects CSV missing required columns", async () => {
    await expect(
      service.importStaging({ csv: "workbook_row_id\nx", dryRun: true }, null)
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
