import { NotFoundException } from "@nestjs/common";
import { PatientRecordsService } from "./patient-records.service";

describe("PatientRecordsService", () => {
  const access = {
    portalAccountId: "account-a",
    sessionId: "session-a",
    patientId: "patient-a",
    facilityId: "facility-a",
  };

  it("lists visits with both facilityId and patientId constraints", async () => {
    const prisma = {
      encounter: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    } as any;
    const audit = { record: jest.fn().mockResolvedValue(undefined) } as any;
    const service = new PatientRecordsService(prisma, audit);

    await service.listVisits(access, {});

    expect(prisma.encounter.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { facilityId: "facility-a", patientId: "patient-a" },
      })
    );
  });

  it("loads a visit with id + facilityId + patientId and returns 404 otherwise", async () => {
    const prisma = {
      encounter: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    } as any;
    const audit = { record: jest.fn() } as any;
    const service = new PatientRecordsService(prisma, audit);

    await expect(service.getVisit(access, "encounter-b", {})).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.encounter.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "encounter-b",
          facilityId: "facility-a",
          patientId: "patient-a",
        },
      })
    );
    expect(audit.record).not.toHaveBeenCalled();
  });
});
