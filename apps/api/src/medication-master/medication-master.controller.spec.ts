import "reflect-metadata";
import { RoleCode } from "@prisma/client";
import { MedicationMasterController } from "./medication-master.controller";
import { FACILITY_OR_PLATFORM_ADMIN_ROLES } from "../common/auth/platform-operator-roles";

describe("MedicationMasterController RBAC", () => {
  it("import-staging requires ADMIN or MEDORA_SUPER_ADMIN", () => {
    const handler = (MedicationMasterController.prototype as unknown as Record<string, unknown>)[
      "importStaging"
    ];
    const roles = Reflect.getMetadata("roles", handler as object) as RoleCode[];
    expect(roles).toEqual([...FACILITY_OR_PLATFORM_ADMIN_ROLES]);
    expect(roles).toContain(RoleCode.ADMIN);
    expect(roles).toContain(RoleCode.MEDORA_SUPER_ADMIN);
  });

  it("catalog-backfill-analysis requires ADMIN or MEDORA_SUPER_ADMIN", () => {
    const handler = (MedicationMasterController.prototype as unknown as Record<string, unknown>)[
      "catalogBackfillAnalysis"
    ];
    const roles = Reflect.getMetadata("roles", handler as object) as RoleCode[];
    expect(roles).toEqual([...FACILITY_OR_PLATFORM_ADMIN_ROLES]);
  });

  it("promote-staging-row requires ADMIN or MEDORA_SUPER_ADMIN", () => {
    const handler = (MedicationMasterController.prototype as unknown as Record<string, unknown>)[
      "promoteStagingRow"
    ];
    const roles = Reflect.getMetadata("roles", handler as object) as RoleCode[];
    expect(roles).toEqual([...FACILITY_OR_PLATFORM_ADMIN_ROLES]);
  });
});
