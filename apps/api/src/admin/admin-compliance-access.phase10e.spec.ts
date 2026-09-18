import "reflect-metadata";
import { PLATFORM_PRINCIPAL_FACILITY_CONTEXT_KEY } from "../common/guards/roles.guard";
import { AdminComplianceController } from "./admin-compliance.controller";

describe("admin compliance platform operator access", () => {
  const method = AdminComplianceController.prototype.getCompliance;

  it("opts into authoritative platform-principal facility context", () => {
    expect(
      Reflect.getMetadata(PLATFORM_PRINCIPAL_FACILITY_CONTEXT_KEY, method)
    ).toBe(true);
  });

  it("remains MEDORA_SUPER_ADMIN-only", () => {
    expect(Reflect.getMetadata("roles", method)).toEqual([
      "MEDORA_SUPER_ADMIN",
    ]);
  });
});
