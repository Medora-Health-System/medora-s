import { PlatformStaffController } from "./platform-staff.controller";

describe("PlatformStaffController provisioning persona contract", () => {
  const staff = { provision: jest.fn() };
  const controller = new PlatformStaffController(staff as any, {} as any, {} as any);
  const request = { user: { userId: "admin-1" } };

  beforeEach(() => staff.provision.mockReset().mockResolvedValue({ id: "profile-1" }));

  it("accepts and forwards a canonical provisioning payload through DTO parsing", async () => {
    await controller.provision(request, "user-1", {
      persona: "IMPLEMENTATION",
      reason: "Medora Staff",
      ticketReference: "IMPLEMENTATION-001",
    });

    expect(staff.provision).toHaveBeenCalledWith(
      "admin-1",
      "user-1",
      "IMPLEMENTATION",
      "Medora Staff",
      "IMPLEMENTATION-001",
    );
  });

  it.each(["Implementation", "Support", "Billing Operations", "Compliance / Security", "Platform Operations"])(
    "rejects display label %s during DTO parsing",
    (persona) => expect(() => controller.provision(request, "user-1", { persona, reason: "Medora Staff" })).toThrow(),
  );
});
