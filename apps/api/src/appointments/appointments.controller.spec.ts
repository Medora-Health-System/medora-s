import { BadRequestException } from "@nestjs/common";
import { AppointmentsController } from "./appointments.controller";

describe("AppointmentsController calendar validation", () => {
  const service = { listCalendar: jest.fn().mockResolvedValue({ items: [] }), searchProviders: jest.fn() };
  const controller = new AppointmentsController(service as never);
  const request = {
    facilityId: "facility-a", user: { userId: "staff-a" },
    headers: { "user-agent": "test" }, ip: "127.0.0.1",
  };
  const from = "2026-10-05T00:00:00.000Z";
  const to = "2026-10-06T00:00:00.000Z";

  beforeEach(() => jest.clearAllMocks());

  it.each([
    ["missing timezone", "2026-10-05T00:00:00", to, undefined],
    ["invalid date", "2026-13-05T00:00:00Z", to, undefined],
    ["reversed range", to, from, undefined],
    ["range over 32 days", from, "2026-11-07T00:00:00Z", undefined],
    ["negative offset", from, to, "-1"],
    ["noninteger offset", from, to, "1.5"],
  ])("rejects %s before querying appointments", async (_label, start, end, offset) => {
    await expect(controller.calendar(start, end, offset, request)).rejects.toBeInstanceOf(BadRequestException);
    expect(service.listCalendar).not.toHaveBeenCalled();
  });

  it("passes validated facility and pagination to service", async () => {
    await controller.calendar(from, to, "500", request);
    expect(service.listCalendar).toHaveBeenCalledWith(
      "facility-a", new Date(from), new Date(to), "staff-a", "127.0.0.1", "test", 500,
    );
  });

  it("rejects provider searches shorter than three characters", async () => {
    await expect(controller.searchProviders("Sm", request)).rejects.toBeInstanceOf(BadRequestException);
    expect(service.searchProviders).not.toHaveBeenCalled();
  });
});
