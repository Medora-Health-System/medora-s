import "reflect-metadata";
import { PLATFORM_PRINCIPAL_FACILITY_CONTEXT_KEY } from "../common/guards/roles.guard";
import { AdminSystemHealthController } from "./admin-system-health.controller";
import { AdminBackupReadinessController } from "./admin-backup-readiness.controller";
import { AdminRoiMonitoringController } from "./admin-roi-monitoring.controller";

function method(target: object, name: string): Function {
  const fn = (target as Record<string, unknown>)[name];
  if (typeof fn !== "function") throw new Error(`Missing method ${name}`);
  return fn;
}

describe("platform operator monitoring access metadata", () => {
  it.each([
    [AdminSystemHealthController.prototype, "getSystemHealth"],
    [AdminSystemHealthController.prototype, "postTestAlert"],
    [AdminBackupReadinessController.prototype, "getBackupReadiness"],
    [AdminRoiMonitoringController.prototype, "summary"],
  ] as const)("%s.%s opts into authoritative platform-principal facility context", (prototype, name) => {
    expect(
      Reflect.getMetadata(
        PLATFORM_PRINCIPAL_FACILITY_CONTEXT_KEY,
        method(prototype, name)
      )
    ).toBe(true);
  });

  it.each([
    [AdminSystemHealthController.prototype, "getSystemHealth"],
    [AdminSystemHealthController.prototype, "postTestAlert"],
    [AdminBackupReadinessController.prototype, "getBackupReadiness"],
    [AdminRoiMonitoringController.prototype, "summary"],
  ] as const)("%s.%s remains MEDORA_SUPER_ADMIN-only", (prototype, name) => {
    expect(Reflect.getMetadata("roles", method(prototype, name))).toEqual([
      "MEDORA_SUPER_ADMIN",
    ]);
  });
});
