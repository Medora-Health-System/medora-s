import { describe, expect, it } from "vitest";
import {
  requestorMayAcknowledgeEnterpriseProcedure,
  requestorMayCompleteEnterpriseProcedure,
  requestorRoleCodesMatchExecutionRole,
  resolveProcedureExecutionProfile,
} from "./enterpriseProcedureExecutionProfile.js";

describe("resolveProcedureExecutionProfile (MEDPROC.4)", () => {
  it("resolves execution profile for known catalog ids", () => {
    const profile = resolveProcedureExecutionProfile({ enterpriseProcedureId: "foley_catheter" });
    expect(profile).not.toBeNull();
    expect(profile?.executionRoleCategory).toBe("NURSING");
  });

  it("maps intubation to provider execution", () => {
    const profile = resolveProcedureExecutionProfile({ enterpriseProcedureId: "endotracheal_intubation" });
    expect(profile?.executionRoleCategory).toBe("PROVIDER");
    expect(profile?.completeRoles).toEqual(["PROVIDER"]);
    expect(profile?.acknowledgeRoles).toEqual(expect.arrayContaining(["PROVIDER", "RN"]));
    expect(profile?.canProviderExecute).toBe(true);
    expect(profile?.canNurseExecute).toBe(false);
  });

  it("maps foley to nursing execution", () => {
    const profile = resolveProcedureExecutionProfile({ enterpriseProcedureId: "foley_catheter" });
    expect(profile?.executionRoleCategory).toBe("NURSING");
    expect(profile?.completeRoles).toEqual(["RN"]);
    expect(profile?.canNurseExecute).toBe(true);
    expect(profile?.canProviderExecute).toBe(false);
  });

  it("maps nebulizer to respiratory execution", () => {
    const profile = resolveProcedureExecutionProfile({ enterpriseProcedureId: "nebulizer_treatment" });
    expect(profile?.executionRoleCategory).toBe("RESPIRATORY");
    expect(profile?.completeRoles).toEqual(["RT"]);
    expect(profile?.canNurseExecute).toBe(true);
  });

  it("maps specimen collection to lab execution", () => {
    const profile = resolveProcedureExecutionProfile({ enterpriseProcedureId: "blood_draw_specimen_collection" });
    expect(profile?.executionRoleCategory).toBe("LAB");
    expect(profile?.completeRoles).toEqual(expect.arrayContaining(["LAB_TECH", "RN"]));
    expect(profile?.canTechExecute).toBe(true);
  });

  it("returns null for unknown procedure ids", () => {
    expect(resolveProcedureExecutionProfile({ enterpriseProcedureId: "unknown_xyz" })).toBeNull();
    expect(resolveProcedureExecutionProfile({ enterpriseProcedureId: null })).toBeNull();
  });
});

describe("enterprise procedure execution role authorization (MEDPROC.4)", () => {
  it("allows provider to complete intubation but not RN", () => {
    const profile = resolveProcedureExecutionProfile({ enterpriseProcedureId: "endotracheal_intubation" });
    expect(requestorMayAcknowledgeEnterpriseProcedure(["RN"], profile)).toBe(true);
    expect(requestorMayCompleteEnterpriseProcedure(["RN"], profile)).toBe(false);
    expect(requestorMayCompleteEnterpriseProcedure(["PROVIDER"], profile)).toBe(true);
  });

  it("allows RN to complete foley but not provider-only completion", () => {
    const profile = resolveProcedureExecutionProfile({ enterpriseProcedureId: "foley_catheter" });
    expect(requestorMayCompleteEnterpriseProcedure(["RN"], profile)).toBe(true);
    expect(requestorMayCompleteEnterpriseProcedure(["PROVIDER"], profile)).toBe(false);
  });

  it("allows RN proxy for RT nebulizer tasks", () => {
    const profile = resolveProcedureExecutionProfile({ enterpriseProcedureId: "nebulizer_treatment" });
    expect(requestorRoleCodesMatchExecutionRole(["RN"], "RT")).toBe(true);
    expect(requestorMayCompleteEnterpriseProcedure(["RN"], profile)).toBe(true);
    expect(requestorMayCompleteEnterpriseProcedure(["PROVIDER"], profile)).toBe(false);
  });

  it("allows LAB tech and RN for specimen collection", () => {
    const profile = resolveProcedureExecutionProfile({ enterpriseProcedureId: "blood_draw_specimen_collection" });
    expect(requestorMayCompleteEnterpriseProcedure(["LAB"], profile)).toBe(true);
    expect(requestorMayCompleteEnterpriseProcedure(["RN"], profile)).toBe(true);
    expect(requestorMayCompleteEnterpriseProcedure(["PROVIDER"], profile)).toBe(false);
  });

  it("aligns EKG catalog roles for LAB and RADIOLOGY technicians (MEDUI.ED.PROCEDURE.TECH.1)", () => {
    const profile = resolveProcedureExecutionProfile({ enterpriseProcedureId: "ekg_ecg" });
    expect(profile?.acknowledgeRoles).toEqual(expect.arrayContaining(["LAB_TECH", "RADIOLOGY_TECH", "RN"]));
    expect(profile?.completeRoles).toEqual(expect.arrayContaining(["LAB_TECH", "RADIOLOGY_TECH", "RN"]));
    expect(requestorMayAcknowledgeEnterpriseProcedure(["LAB"], profile)).toBe(true);
    expect(requestorMayAcknowledgeEnterpriseProcedure(["RADIOLOGY"], profile)).toBe(true);
    expect(requestorMayCompleteEnterpriseProcedure(["LAB"], profile)).toBe(true);
    expect(requestorMayCompleteEnterpriseProcedure(["RADIOLOGY"], profile)).toBe(true);
  });
});
