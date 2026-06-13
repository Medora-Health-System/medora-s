import { describe, expect, it } from "vitest";
import {
  FREESTANDING_ER_DELEGATED_TECHNICIAN_PROCEDURE_IDS,
  requestorMayPerformEnterpriseProcedureAction,
  requestorMayAcknowledgeEnterpriseProcedureForFacility,
  requestorMayCompleteEnterpriseProcedureForFacility,
  requestorMayStartEnterpriseProcedureForFacility,
} from "./freestandingErTechnicianProcedureGovernance.js";
import { resolveProcedureExecutionProfile } from "../procedures/enterpriseProcedureExecutionProfile.js";

const FREESTANDING = "FREESTANDING_ER" as const;
const HOSPITAL = "HOSPITAL" as const;

describe("freestandingErTechnicianProcedureGovernance (MEDUI.ED.PROCEDURE.TECH.1)", () => {
  it("exports explicit delegated procedure allowlist", () => {
    expect(FREESTANDING_ER_DELEGATED_TECHNICIAN_PROCEDURE_IDS).toEqual(
      expect.arrayContaining([
        "ekg_ecg",
        "ekg_rhythm_strip",
        "blood_draw_specimen_collection",
        "blood_culture_collection",
      ])
    );
  });

  describe("EKG — LAB full workflow at freestanding ER", () => {
    const profile = resolveProcedureExecutionProfile({ enterpriseProcedureId: "ekg_ecg" });

    it("allows LAB acknowledge, start, and complete", () => {
      expect(
        requestorMayAcknowledgeEnterpriseProcedureForFacility(["LAB"], FREESTANDING, "ekg_ecg", profile)
      ).toBe(true);
      expect(
        requestorMayStartEnterpriseProcedureForFacility(["LAB"], FREESTANDING, "ekg_ecg", profile)
      ).toBe(true);
      expect(
        requestorMayCompleteEnterpriseProcedureForFacility(["LAB"], FREESTANDING, "ekg_ecg", profile)
      ).toBe(true);
    });

    it("blocks LAB at hospital facility even with catalog tech roles", () => {
      expect(
        requestorMayCompleteEnterpriseProcedureForFacility(["LAB"], HOSPITAL, "ekg_ecg", profile)
      ).toBe(false);
      expect(
        requestorMayAcknowledgeEnterpriseProcedureForFacility(["LAB"], HOSPITAL, "ekg_ecg", profile)
      ).toBe(false);
    });
  });

  describe("EKG — RADIOLOGY full workflow at freestanding ER", () => {
    const profile = resolveProcedureExecutionProfile({ enterpriseProcedureId: "ekg_ecg" });

    it("allows RADIOLOGY acknowledge, start, and complete when catalog permits", () => {
      expect(
        requestorMayAcknowledgeEnterpriseProcedureForFacility(
          ["RADIOLOGY"],
          FREESTANDING,
          "ekg_ecg",
          profile
        )
      ).toBe(true);
      expect(
        requestorMayStartEnterpriseProcedureForFacility(
          ["RADIOLOGY"],
          FREESTANDING,
          "ekg_ecg",
          profile
        )
      ).toBe(true);
      expect(
        requestorMayCompleteEnterpriseProcedureForFacility(
          ["RADIOLOGY"],
          FREESTANDING,
          "ekg_ecg",
          profile
        )
      ).toBe(true);
    });
  });

  describe("nursing-only procedures — technicians blocked", () => {
    it("blocks LAB from foley at freestanding ER", () => {
      const profile = resolveProcedureExecutionProfile({ enterpriseProcedureId: "foley_catheter" });
      expect(
        requestorMayPerformEnterpriseProcedureAction({
          roleCodes: ["LAB"],
          facilityType: FREESTANDING,
          enterpriseProcedureId: "foley_catheter",
          profile,
          action: "complete",
        })
      ).toBe(false);
    });

    it("blocks RADIOLOGY from wound care at freestanding ER", () => {
      const profile = resolveProcedureExecutionProfile({ enterpriseProcedureId: "wound_care" });
      expect(
        requestorMayPerformEnterpriseProcedureAction({
          roleCodes: ["RADIOLOGY"],
          facilityType: FREESTANDING,
          enterpriseProcedureId: "wound_care",
          profile,
          action: "complete",
        })
      ).toBe(false);
    });

    it("blocks LAB from IV fluids setup at freestanding ER", () => {
      const profile = resolveProcedureExecutionProfile({ enterpriseProcedureId: "iv_fluids_setup" });
      expect(
        requestorMayPerformEnterpriseProcedureAction({
          roleCodes: ["LAB"],
          facilityType: FREESTANDING,
          enterpriseProcedureId: "iv_fluids_setup",
          profile,
          action: "acknowledge",
        })
      ).toBe(false);
    });
  });

  describe("RN workflows unchanged", () => {
    it("RN may still complete foley at hospital", () => {
      const profile = resolveProcedureExecutionProfile({ enterpriseProcedureId: "foley_catheter" });
      expect(
        requestorMayCompleteEnterpriseProcedureForFacility(["RN"], HOSPITAL, "foley_catheter", profile)
      ).toBe(true);
    });

    it("RN may complete EKG at hospital without freestanding gate", () => {
      const profile = resolveProcedureExecutionProfile({ enterpriseProcedureId: "ekg_ecg" });
      expect(
        requestorMayCompleteEnterpriseProcedureForFacility(["RN"], HOSPITAL, "ekg_ecg", profile)
      ).toBe(true);
    });
  });

  describe("specimen collection — LAB delegated at freestanding ER", () => {
    const profile = resolveProcedureExecutionProfile({
      enterpriseProcedureId: "blood_draw_specimen_collection",
    });

    it("allows LAB full workflow", () => {
      expect(
        requestorMayAcknowledgeEnterpriseProcedureForFacility(
          ["LAB"],
          FREESTANDING,
          "blood_draw_specimen_collection",
          profile
        )
      ).toBe(true);
      expect(
        requestorMayCompleteEnterpriseProcedureForFacility(
          ["LAB"],
          FREESTANDING,
          "blood_draw_specimen_collection",
          profile
        )
      ).toBe(true);
    });
  });
});
