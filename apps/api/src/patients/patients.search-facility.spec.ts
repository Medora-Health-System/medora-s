import { PatientsService } from "./patients.service";

describe("PatientsService.search facility identity", () => {
  it("returns the Patient.id for the active facility and never another facility", async () => {
    const patient = { id: "11111111-1111-4111-8111-111111111111", firstName: "David", lastName: "B", mrn: "MS-2026-705E1B86" };
    const prisma = {
      patient: {
        findMany: jest.fn().mockResolvedValue([patient]),
      },
    } as any;
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new PatientsService(prisma, audit as any);
    const rows = await service.search("facility-a", { q: "David" });
    expect(prisma.patient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ facilityId: "facility-a" }),
      }),
    );
    expect(rows).toEqual([expect.objectContaining({ id: patient.id })]);
  });

  it("CASE D: search in Facility B returns that facility's Patient.id and never Facility A", async () => {
    const patient = { id: "11111111-1111-4111-8111-111111111111", firstName: "David", lastName: "B", mrn: "MS-2026-705E1B86" };
    const prisma = {
      patient: {
        findMany: jest.fn().mockResolvedValue([patient]),
      },
    } as any;
    const service = new PatientsService(prisma, { log: jest.fn() } as any);
    const rows = await service.search("facility-b", { q: "David" });
    expect(prisma.patient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ facilityId: "facility-b" }),
      }),
    );
    expect(rows).toEqual([expect.objectContaining({ id: patient.id })]);
  });
});
