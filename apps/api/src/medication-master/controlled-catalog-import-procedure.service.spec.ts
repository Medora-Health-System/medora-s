import { ControlledCatalogImportProcedureService } from "./controlled-catalog-import-procedure.service";

describe("ControlledCatalogImportProcedureService", () => {
  it("commit does not create medication products", async () => {
    const prisma = {
      billingProcedureCode: {
        findFirst: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({ id: "proc-1" }),
      },
      medicationProduct: { create: jest.fn() },
      medicationConcept: { create: jest.fn() },
    };
    const service = new ControlledCatalogImportProcedureService(
      prisma as never,
      { log: jest.fn() } as never,
      { assertFacilityScope: jest.fn() } as never
    );

    const csv = Buffer.from(
      "code,code_system,short_description\n99213,CPT,Office visit\n",
      "utf-8"
    );
    await service.commit(
      csv,
      "procedures.csv",
      { facilityId: "00000000-0000-4000-8000-000000000001", note: "" },
      "user-1",
      "00000000-0000-4000-8000-000000000001"
    );

    expect(prisma.billingProcedureCode.upsert).toHaveBeenCalled();
    expect(prisma.medicationProduct.create).not.toHaveBeenCalled();
    expect(prisma.medicationConcept.create).not.toHaveBeenCalled();
  });
});
