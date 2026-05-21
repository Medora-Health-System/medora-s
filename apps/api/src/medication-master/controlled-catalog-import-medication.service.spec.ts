import { ControlledCatalogImportMedicationService } from "./controlled-catalog-import-medication.service";
import { classifyControlledMedicationRow } from "./controlled-catalog-import-risk.util";

describe("ControlledCatalogImportMedicationService", () => {
  it("blocks order search commit without confirmations", async () => {
    const prisma = {} as never;
    const service = new ControlledCatalogImportMedicationService(
      prisma,
      { log: jest.fn() } as never,
      { assertFacilityScope: jest.fn() } as never,
      {} as never,
      {} as never
    );

    await expect(
      service.commit(
        Buffer.from("medication,dose,form\nA,1mg,Tab"),
        "test.csv",
        {
          facilityId: "00000000-0000-4000-8000-000000000001",
          enableProviderOrderSearch: true,
          confirmOrderSearchEnablement: false,
          confirmMarRemainsOff: true,
          confirmBillingRemainsOff: true,
          note: "test",
        },
        "user-1",
        "00000000-0000-4000-8000-000000000001"
      )
    ).rejects.toThrow(/Confirmation requise/);
  });
});

describe("controlled catalog import — high risk never safe", () => {
  it("insulin is not SAFE_LOW_RISK", () => {
    expect(
      classifyControlledMedicationRow(
        { medication: "Insulin Regular", dose: "100 units/mL", form: "Injection" },
        null
      )
    ).toBe("HIGH_RISK_MANUAL_REVIEW");
  });
});
