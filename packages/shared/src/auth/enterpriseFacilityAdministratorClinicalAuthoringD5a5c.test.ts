import { describe, expect, it } from "vitest";
import {
  D5A5C_CERTIFICATION_ID,
  hasFacilityClinicalAuthoringRoleCodes,
  isFacilityAdministratorRoleCodes,
  isPlatformOperatorOnlyRoleCodes,
  resolveFacilityClinicalAuthoringAuthority,
} from "./enterpriseFacilityAdministratorClinicalAuthoringD5a5c.js";
import { resolveEnterpriseDentalEncounterAuthoring } from "./enterpriseDentalEncounterAuthoringD5a5b.js";
import { dentalAuthoringReadOnlyReasonMessageFr } from "./enterpriseDentalEncounterAuthoringD5a5b.js";

describe("MEDUI.D5A.5C facility administrator clinical authoring", () => {
  it("certification id", () => {
    expect(D5A5C_CERTIFICATION_ID).toBe("MEDUI.D5A.5C");
  });

  it("1: PROVIDER + module enabled => WRITE", () => {
    const a = resolveFacilityClinicalAuthoringAuthority({
      roleCodes: ["PROVIDER"],
      moduleEnabled: true,
      encounterStatus: "OPEN",
    });
    expect(a.allowed).toBe(true);
  });

  it("2: FACILITY_ADMIN only + module enabled => WRITE", () => {
    expect(isFacilityAdministratorRoleCodes(["ADMIN"])).toBe(true);
    expect(hasFacilityClinicalAuthoringRoleCodes(["ADMIN"])).toBe(true);
    const a = resolveFacilityClinicalAuthoringAuthority({
      roleCodes: ["ADMIN"],
      moduleEnabled: true,
      encounterStatus: "OPEN",
    });
    expect(a.allowed).toBe(true);
    const dental = resolveEnterpriseDentalEncounterAuthoring({
      roleCodes: ["ADMIN"],
      dentalCareEnabled: true,
      encounterStatus: "OPEN",
      serviceLine: "DENTAL",
    });
    expect(dental.isReadOnly).toBe(false);
    expect(dental.canEditPeriodontal).toBe(true);
    expect(dental.canEditOdontogram).toBe(true);
    expect(dental.canEditTreatmentPlan).toBe(true);
    expect(dental.canDocumentProcedure).toBe(true);
    expect(dental.canEditEnterpriseHistory).toBe(true);
  });

  it("3: FACILITY_ADMIN + PROVIDER => WRITE", () => {
    const a = resolveFacilityClinicalAuthoringAuthority({
      roleCodes: ["ADMIN", "PROVIDER"],
      moduleEnabled: true,
      encounterStatus: "OPEN",
    });
    expect(a.allowed).toBe(true);
  });

  it("4: PLATFORM_ADMIN only => DENY clinical", () => {
    expect(isPlatformOperatorOnlyRoleCodes(["MEDORA_SUPER_ADMIN"])).toBe(true);
    expect(hasFacilityClinicalAuthoringRoleCodes(["MEDORA_SUPER_ADMIN"])).toBe(false);
    const a = resolveFacilityClinicalAuthoringAuthority({
      roleCodes: ["MEDORA_SUPER_ADMIN"],
      moduleEnabled: true,
      encounterStatus: "OPEN",
    });
    expect(a.allowed).toBe(false);
    expect(a.reason).toBe("NO_FACILITY_CLINICAL_AUTHORITY");
  });

  it("6: Facility Admin + module disabled => DENY", () => {
    const a = resolveFacilityClinicalAuthoringAuthority({
      roleCodes: ["ADMIN"],
      moduleEnabled: false,
      encounterStatus: "OPEN",
    });
    expect(a.allowed).toBe(false);
    expect(a.reason).toBe("MODULE_DISABLED");
  });

  it("7: explicit restriction => DENY when flag set", () => {
    const a = resolveFacilityClinicalAuthoringAuthority({
      roleCodes: ["ADMIN"],
      moduleEnabled: true,
      encounterStatus: "OPEN",
      explicitClinicalAuthoringDenied: true,
    });
    expect(a.allowed).toBe(false);
    expect(a.reason).toBe("EXPLICIT_RESTRICTION");
  });

  it("8–9: OPEN write; CLOSED read-only", () => {
    const open = resolveEnterpriseDentalEncounterAuthoring({
      roleCodes: ["ADMIN"],
      dentalCareEnabled: true,
      encounterStatus: "OPEN",
      serviceLine: "DENTAL",
    });
    expect(open.isReadOnly).toBe(false);
    const closed = resolveEnterpriseDentalEncounterAuthoring({
      roleCodes: ["ADMIN"],
      dentalCareEnabled: true,
      encounterStatus: "CLOSED",
      serviceLine: "DENTAL",
    });
    expect(closed.isReadOnly).toBe(true);
    expect(closed.readOnlyReason).toBe("ENCOUNTER_NOT_OPEN");
  });

  it("read-only message must not require PROVIDER for facility admin case", () => {
    const msg = dentalAuthoringReadOnlyReasonMessageFr("NO_CLINICAL_CAPABILITY");
    expect(msg.toLowerCase()).not.toContain("provider");
  });
});
