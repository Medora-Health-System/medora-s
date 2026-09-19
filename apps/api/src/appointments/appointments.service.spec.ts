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

  it("counts calendar dates in facility timezone independently of roster pagination", async () => {
    const { service, prisma } = makeService();
    prisma.facility.findFirst.mockResolvedValue({
      id: facilityId, country: "US", facilityType: "CLINIC",
      serviceLinesJson: null, facilityCareProfileJson: null,
      billingSiteType: null, billingClassificationMode: null,
      timezone: "America/Chicago",
    });
    const beforeMidnight = new Date("2026-10-06T04:30:00.000Z");
    const afterMidnight = new Date("2026-10-06T05:30:00.000Z");
    const appointmentFindMany = jest.fn()
      .mockResolvedValueOnce([
        { scheduledStartAt: beforeMidnight },
        { scheduledStartAt: afterMidnight },
      ])
      .mockResolvedValueOnce([]);
    Object.assign(prisma, {
      appointment: {
        findMany: appointmentFindMany,
        count: jest.fn().mockResolvedValue(502),
      },
    });
    const result = await service.listCalendar(
      facilityId, new Date("2026-10-05T00:00:00.000Z"),
      new Date("2026-10-07T00:00:00.000Z"), undefined, undefined, undefined, 500,
    );
    expect(result.dailyCounts).toEqual({ "2026-10-05": 1, "2026-10-06": 1 });
    expect(result.timezone).toBe("America/Chicago");
    expect(result.total).toBe(502);
    expect(result.hasMore).toBe(true);
    expect(result.nextOffset).toBe(500);
    expect(appointmentFindMany).toHaveBeenNthCalledWith(2, expect.objectContaining({
      skip: 500, take: 500,
      where: expect.objectContaining({ facilityId }),
    }));
  });

});
