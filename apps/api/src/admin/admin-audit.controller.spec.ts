import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { AdminAuditController } from "./admin-audit.controller";

describe("D4SEC.1C.2A audit controller inputs", () => {
  const service = { listCustomerEvents: jest.fn().mockResolvedValue({ events: [], nextCursor: null }) };
  const controller = new AdminAuditController(service as never);

  beforeEach(() => service.listCustomerEvents.mockClear());

  it("passes authenticated identity and selected facility to the authoritative service boundary", async () => {
    await controller.listEvents(
      { user: { userId: "admin-a", facilityId: "facility-a" }, headers: { "x-facility-id": "facility-a" } },
      {}
    );
    expect(service.listCustomerEvents).toHaveBeenCalledWith("admin-a", "facility-a", expect.any(Object));
  });

  it.each(["facilityId", "userId", "page"])("rejects substituted/unknown %s query input", async (key) => {
    await expect(controller.listEvents(
      { user: { userId: "admin-a", facilityId: "facility-a" }, headers: {} },
      { [key]: "facility-b" }
    )).rejects.toBeInstanceOf(BadRequestException);
  });

  it("fails closed for empty facility context", async () => {
    await expect(controller.listEvents({ user: { userId: "admin-a" }, headers: {} }, {}))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it("fails closed for missing authenticated identity", async () => {
    await expect(controller.listEvents({ user: { facilityId: "facility-a" }, headers: {} }, {}))
      .rejects.toBeInstanceOf(ForbiddenException);
  });
});
