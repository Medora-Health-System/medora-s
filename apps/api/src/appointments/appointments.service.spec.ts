import { AppointmentsService } from "./appointments.service";

describe("AppointmentsService facility-scoped provider search", () => {
  const facilityId = "facility-a";
  const provider = { id: "provider-a", firstName: "Ada", lastName: "Smith" };
  const makeService = () => {
    const prisma = {
      facility: { findFirst: jest.fn().mockResolvedValue({
        id: facilityId, country: "US", facilityType: "CLINIC",
        serviceLinesJson: null, facilityCareProfileJson: null,
        billingSiteType: null, billingClassificationMode: null,
      }) },
      user: { findMany: jest.fn().mockResolvedValue([provider]) },
    };
    const audit = { log: jest.fn() };
    return { service: new AppointmentsService(prisma as never, audit as never), prisma };
  };

  it("exports the service", () => {
    expect(AppointmentsService).toBeDefined();
  });

  it("only searches active provider memberships in the requested facility", async () => {
    const { service, prisma } = makeService();
    const result = await service.searchProviders(facilityId, "Smi");
    expect(result).toEqual([{ id: "provider-a", displayName: "Ada Smith" }]);
    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        isActive: true,
        userRoles: { some: {
          facilityId,
          isActive: true,
          facility: { isActive: true },
          role: { code: "PROVIDER" },
        } },
      }),
      take: 20,
    }));
  });

  it("does not return users when no authorized provider matches", async () => {
    const { service, prisma } = makeService();
    prisma.user.findMany.mockResolvedValue([]);
    await expect(service.searchProviders(facilityId, "Smi")).resolves.toEqual([]);
  });
  it("rejects an appointment provider without active membership in this facility", async () => {
    const { service, prisma } = makeService();
    const patientFindFirst = jest.fn().mockResolvedValue({ id: "patient-a" });
    const providerFindFirst = jest.fn().mockResolvedValue(null);
    const appointmentCreate = jest.fn();
    Object.assign(prisma, {
      patient: { findFirst: patientFindFirst },
      appointment: { create: appointmentCreate },
    });
    Object.assign(prisma.user, { findFirst: providerFindFirst });
    await expect(service.create(facilityId, {
      patientId: "patient-a",
      providerId: "provider-from-other-facility",
      scheduledStartAt: new Date("2026-10-05T15:00:00.000Z"),
    } as never)).rejects.toThrow("Active provider membership at this facility required");
    expect(providerFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: "provider-from-other-facility",
        isActive: true,
        userRoles: { some: {
          facilityId,
          isActive: true,
          facility: { isActive: true },
          role: { code: "PROVIDER" },
        } },
      }),
    }));
    expect(appointmentCreate).not.toHaveBeenCalled();
  });

});
