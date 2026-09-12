import { NotFoundException } from "@nestjs/common";
import { PatientMedicationsService } from "./patient-medications.service";

describe("PatientMedicationsService", () => {
  const access = {
    portalAccountId: "account-a",
    sessionId: "session-a",
    patientId: "patient-a",
    facilityId: "facility-a",
  };

  it("queries medication orders through authorized patient + facility scope", async () => {
    const prisma = {
      order: { findMany: jest.fn().mockResolvedValue([]) },
      catalogMedication: { findMany: jest.fn().mockResolvedValue([]) },
    } as any;
    const audit = { record: jest.fn().mockResolvedValue(undefined) } as any;
    const service = new PatientMedicationsService(prisma, audit);

    await service.list(access, {});

    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          facilityId: "facility-a",
          patientId: "patient-a",
          type: "MEDICATION",
        },
        select: expect.objectContaining({
          items: expect.objectContaining({
            where: {
              catalogItemType: "MEDICATION",
              medicationFulfillmentIntent: "PHARMACY_DISPENSE",
            },
          }),
        }),
      })
    );
  });

  it("returns 404 for an order item outside the patient prescription projection", async () => {
    const prisma = {
      order: { findMany: jest.fn().mockResolvedValue([]) },
      catalogMedication: { findMany: jest.fn() },
    } as any;
    const audit = { record: jest.fn() } as any;
    const service = new PatientMedicationsService(prisma, audit);

    await expect(service.get(access, "foreign-medication-item", {})).rejects.toBeInstanceOf(NotFoundException);
    expect(audit.record).not.toHaveBeenCalled();
  });
});
