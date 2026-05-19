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

  it("search is GET-only explorer with ADMIN or MEDORA_SUPER_ADMIN", () => {
    const handler = (MedicationMasterController.prototype as unknown as Record<string, unknown>)[
      "searchMedicationMaster"
    ];
    const roles = Reflect.getMetadata("roles", handler as object) as RoleCode[];
    expect(roles).toEqual([...FACILITY_OR_PLATFORM_ADMIN_ROLES]);
  });

  it("getMedicationConcept is read-only GET with ADMIN or MEDORA_SUPER_ADMIN", () => {
    const handler = (MedicationMasterController.prototype as unknown as Record<string, unknown>)[
      "getMedicationConcept"
    ];
    const roles = Reflect.getMetadata("roles", handler as object) as RoleCode[];
    expect(roles).toEqual([...FACILITY_OR_PLATFORM_ADMIN_ROLES]);
  });

  it("getFacilityFormulary is read-only GET with ADMIN or MEDORA_SUPER_ADMIN", () => {
    const handler = (MedicationMasterController.prototype as unknown as Record<string, unknown>)[
      "getFacilityFormulary"
    ];
    const roles = Reflect.getMetadata("roles", handler as object) as RoleCode[];
    expect(roles).toEqual([...FACILITY_OR_PLATFORM_ADMIN_ROLES]);
  });

  it("explorer endpoints do not expose order/MAR/billing mutation handlers", () => {
    const proto = MedicationMasterController.prototype as unknown as Record<string, unknown>;
    const explorerKeys = ["searchMedicationMaster", "getMedicationConcept", "getFacilityFormulary"];
    for (const key of explorerKeys) {
      expect(typeof proto[key]).toBe("function");
    }
    expect(proto["placeOrder"]).toBeUndefined();
    expect(proto["administerMedication"]).toBeUndefined();
    expect(proto["captureBilling"]).toBeUndefined();
  });

  it("has no POST/PATCH/DELETE on concepts/:id (validation review is GET-only)", () => {
    const proto = MedicationMasterController.prototype as unknown as Record<string, unknown>;
    expect(proto["updateMedicationConcept"]).toBeUndefined();
    expect(proto["activateMedicationConcept"]).toBeUndefined();
    expect(proto["promoteConcept"]).toBeUndefined();
  });

  it("governance endpoints are GET-only with ADMIN or MEDORA_SUPER_ADMIN", () => {
    const proto = MedicationMasterController.prototype as unknown as Record<string, unknown>;
    const keys = [
      "getGovernanceSummary",
      "getGovernanceWarnings",
      "getGovernanceUnmapped",
      "getGovernanceDuplicates",
    ];
    for (const key of keys) {
      expect(typeof proto[key]).toBe("function");
      const roles = Reflect.getMetadata("roles", proto[key] as object) as RoleCode[];
      expect(roles).toEqual([...FACILITY_OR_PLATFORM_ADMIN_ROLES]);
    }
    expect(proto["activateGovernance"]).toBeUndefined();
    expect(proto["promoteGovernance"]).toBeUndefined();
  });
});
