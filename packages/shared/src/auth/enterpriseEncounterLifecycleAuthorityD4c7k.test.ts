import { describe, expect, it } from "vitest";
import {
  assertNoForbiddenD4c7kLifecycleAuthority,
  buildD4c7kPlatformActionContext,
  canCloseEncounter,
  canReopenEncounter,
  D4C7K_FORBIDDEN_LIFECYCLE_AUTHORITY_NAMES,
  D4C7K_REOPEN_CODES,
  ENCOUNTER_LIFECYCLE_PERMISSIONS,
  hasEncounterLifecyclePermission,
  isD4c7kPlatformSupportOverrideOnly,
  projectD4c7kReopenResult,
  resolveCloseLifecycleTransitionType,
  resolveReopenWorkspaceTarget,
  shouldSetDischargedAtOnEnterpriseClose,
  validateReopenReason,
} from "./enterpriseEncounterLifecycleAuthorityD4c7k.js";

describe("MEDUI.D4C.7K enterprise encounter lifecycle authority", () => {
  it("grants CLOSE to Provider, RN, Facility ADMIN, and platform admin", () => {
    expect(canCloseEncounter(["PROVIDER"])).toBe(true);
    expect(canCloseEncounter(["RN"])).toBe(true);
    expect(canCloseEncounter(["ADMIN"])).toBe(true);
    expect(canCloseEncounter(["MEDORA_SUPER_ADMIN"])).toBe(true);
    expect(canCloseEncounter(["PHYSICIAN"])).toBe(true);
  });

  it("denies CLOSE to unrelated staff", () => {
    expect(canCloseEncounter(["FRONT_DESK"])).toBe(false);
    expect(canCloseEncounter(["LAB"])).toBe(false);
    expect(canCloseEncounter(["PHARMACY"])).toBe(false);
    expect(canCloseEncounter(["BILLING"])).toBe(false);
    expect(canCloseEncounter([])).toBe(false);
  });

  it("grants REOPEN only to Facility ADMIN and platform admin", () => {
    expect(canReopenEncounter(["ADMIN"])).toBe(true);
    expect(canReopenEncounter(["MEDORA_SUPER_ADMIN"])).toBe(true);
    expect(canReopenEncounter(["PROVIDER"])).toBe(false);
    expect(canReopenEncounter(["RN"])).toBe(false);
    expect(
      hasEncounterLifecyclePermission(ENCOUNTER_LIFECYCLE_PERMISSIONS.REOPEN_ENCOUNTER, ["PROVIDER", "RN"])
    ).toBe(false);
  });

  it("detects platform support-only override", () => {
    expect(isD4c7kPlatformSupportOverrideOnly(["MEDORA_SUPER_ADMIN"])).toBe(true);
    expect(isD4c7kPlatformSupportOverrideOnly(["MEDORA_SUPER_ADMIN", "ADMIN"])).toBe(false);
    expect(isD4c7kPlatformSupportOverrideOnly(["PROVIDER"])).toBe(false);
  });

  it("validates reopen reason", () => {
    expect(validateReopenReason("  ").ok).toBe(false);
    expect(validateReopenReason("ab").code).toBe(D4C7K_REOPEN_CODES.REASON_REQUIRED);
    expect(validateReopenReason("Accidental close").ok).toBe(true);
  });

  it("never writes dischargedAt on a generic close, whatever the encounter type", () => {
    for (const encounterType of ["OUTPATIENT", "EMERGENCY", "URGENT_CARE", "INPATIENT", null]) {
      expect(
        shouldSetDischargedAtOnEnterpriseClose({
          encounterType,
          hasExplicitDischargePayload: false,
        })
      ).toBe(false);
    }
  });

  it("writes dischargedAt only for an explicit discharge workflow", () => {
    expect(
      shouldSetDischargedAtOnEnterpriseClose({
        encounterType: "OUTPATIENT",
        hasExplicitDischargePayload: true,
      })
    ).toBe(true);
    expect(
      shouldSetDischargedAtOnEnterpriseClose({
        encounterType: "INPATIENT",
        hasExplicitDischargePayload: false,
        forceDischargedAt: true,
      })
    ).toBe(true);
  });

  it("builds platform support context without identity resolution", () => {
    const support = buildD4c7kPlatformActionContext({
      facilityId: "f1",
      platformPrincipal: true,
      hasFacilityMembership: false,
      actorRoleCodes: ["MEDORA_SUPER_ADMIN"],
    });
    expect(support).toEqual({
      platformPrincipal: true,
      crossFacilitySupportAction: true,
      facilityContextId: "f1",
      supportOverride: true,
    });

    const facilityAdmin = buildD4c7kPlatformActionContext({
      facilityId: "f1",
      actorRoleCodes: ["ADMIN"],
    });
    expect(facilityAdmin.platformPrincipal).toBe(false);
    expect(facilityAdmin.crossFacilitySupportAction).toBe(false);
    expect(facilityAdmin.supportOverride).toBe(false);
  });

  it("resolves care-setting workspace targets", () => {
    expect(resolveReopenWorkspaceTarget({ encounterType: "OUTPATIENT" }).workspaceTarget).toBe(
      "/app/clinic-care"
    );
    expect(resolveReopenWorkspaceTarget({ encounterType: "EMERGENCY" }).workspaceTarget).toBe("/app");
    expect(resolveReopenWorkspaceTarget({ encounterType: "INPATIENT" }).careSetting).toBe("INPATIENT");
  });

  it("records CLOSED_AGAIN after a prior reopen cycle", () => {
    expect(resolveCloseLifecycleTransitionType(0)).toBe("ENCOUNTER_CLOSED");
    expect(resolveCloseLifecycleTransitionType(2)).toBe("ENCOUNTER_CLOSED_AGAIN");
  });

  it("projects reopen result with immutability flags false", () => {
    const result = projectD4c7kReopenResult({
      encounterId: "e1",
      previousStatus: "CLOSED",
      reopenedAt: "2026-07-30T12:00:00.000Z",
      reopenedByUserId: "u1",
      version: 3,
      facilityId: "f1",
      encounterType: "OUTPATIENT",
      warnings: [D4C7K_REOPEN_CODES.BILLING_PRESERVED],
    });
    expect(result.status).toBe("OPEN");
    expect(result.transitionType).toBe("ENCOUNTER_REOPENED");
    expect(result.roomAssignmentRestored).toBe(false);
    expect(result.billingReopened).toBe(false);
    expect(result.signedDocumentationUnlocked).toBe(false);
    expect(result.prescriptionsUnlocked).toBe(false);
  });

  it("forbids care-setting-specific lifecycle service names", () => {
    for (const name of D4C7K_FORBIDDEN_LIFECYCLE_AUTHORITY_NAMES) {
      expect(assertNoForbiddenD4c7kLifecycleAuthority(name)).toBe(false);
    }
    expect(assertNoForbiddenD4c7kLifecycleAuthority("EnterpriseEncounterLifecycleService")).toBe(
      true
    );
  });

  it("void/archive permissions remain non-operational", () => {
    expect(
      hasEncounterLifecyclePermission(ENCOUNTER_LIFECYCLE_PERMISSIONS.VOID_ENCOUNTER, ["ADMIN"])
    ).toBe(false);
    expect(
      hasEncounterLifecyclePermission(ENCOUNTER_LIFECYCLE_PERMISSIONS.ARCHIVE_ENCOUNTER, [
        "MEDORA_SUPER_ADMIN",
      ])
    ).toBe(false);
  });
});
