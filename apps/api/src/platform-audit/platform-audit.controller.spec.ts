import { GUARDS_METADATA } from "@nestjs/common/constants";
import { PlatformAuditController } from "./platform-audit.controller";

describe("PlatformAuditController D4SEC.1C.2C.2", () => {
  it("uses only JWT authentication at the route boundary; service performs authoritative DB authorization", () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, PlatformAuditController) as any[];
    expect(guards).toHaveLength(1);
  });

  it("rejects unauthenticated invocation and unknown query controls", async () => {
    const service = { listEvents: jest.fn() };
    const controller = new PlatformAuditController(service as any);
    await expect(controller.listEvents({ user: {} }, {})).rejects.toMatchObject({ status: 403 });
    await expect(controller.listEvents({ user: { userId: "principal" } }, { grant: "true" })).rejects.toMatchObject({ status: 400 });
    expect(service.listEvents).not.toHaveBeenCalled();
  });

  it("does not use email or facility headers as authority inputs", async () => {
    const service = { listEvents: jest.fn().mockResolvedValue({ events: [], nextCursor: null }) };
    const controller = new PlatformAuditController(service as any);
    await controller.listEvents({ user: { userId: "immutable-id", email: "replacement@example.test" }, headers: { "x-facility-id": "substitution" } }, {});
    expect(service.listEvents).toHaveBeenCalledWith("immutable-id", { limit: 50 });
  });
});
