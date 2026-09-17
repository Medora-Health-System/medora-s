import { FacilityLifecyclePreflightService } from "./facility-lifecycle-preflight.service";

describe("FacilityLifecyclePreflightService", () => {
  function subject(values = { open: 0, assignments: 0, pending: 0, active: true }) {
    const prisma = {
      facility: { findUnique: jest.fn().mockResolvedValue({ id: "f1", name: "Fixture Facility", isActive: values.active }) },
      encounter: { count: jest.fn().mockResolvedValue(values.open) },
      userRole: { count: jest.fn().mockResolvedValue(values.assignments) },
      privilegedActionRequest: { count: jest.fn().mockResolvedValue(values.pending) },
    } as any;
    return { service: new FacilityLifecyclePreflightService(prisma), prisma };
  }

  it("returns aggregate-only non-destructive lifecycle evidence", async () => {
    const { service } = subject({ open: 2, assignments: 4, pending: 1, active: true });
    const result = await service.get("f1");
    expect(result.deactivation.nonDestructive).toBe(true);
    expect(result.deactivation.openEncounters).toBe(2);
    expect(result.deactivation.activeAssignments).toBe(4);
    expect(result.deactivation.pendingPrivilegedActions).toBe(1);
    expect(result.deactivation.warnings).toEqual([
      "OPEN_ENCOUNTERS_PRESENT",
      "ACTIVE_USER_ASSIGNMENTS_PRESENT",
      "LIFECYCLE_REQUEST_ALREADY_PENDING",
    ]);
  });

  it("does not read patient or chart rows for lifecycle preflight", async () => {
    const { service, prisma } = subject();
    await service.get("f1");
    expect(prisma.encounter.count).toHaveBeenCalledWith({ where: { facilityId: "f1", status: "OPEN" } });
    expect(prisma.userRole.count).toHaveBeenCalledWith({ where: { facilityId: "f1", isActive: true } });
  });
});
