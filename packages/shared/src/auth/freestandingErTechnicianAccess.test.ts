import { describe, expect, it } from "vitest";
import {
  canAccessMarAsFreestandingErTechnician,
  canReadFreestandingErObservationPatients,
  canReadFreestandingErOrdersResultsContext,
  canReadFreestandingErTrackboard,
  hasStandardTrackboardClinicalRole,
} from "./freestandingErTechnicianAccess.js";

const freestandingErLines = ["EMERGENCY", "OBSERVATION", "LABORATORY", "RADIOLOGY"] as const;

describe("freestandingErTechnicianAccess (MEDUI.ED.TECH.3)", () => {
  it("LAB tech + FREESTANDING_ER + EMERGENCY/OBS/LAB → can read ED trackboard", () => {
    expect(
      canReadFreestandingErTrackboard({
        roleCodes: ["LAB"],
        facilityType: "FREESTANDING_ER",
        facilityServiceLines: [...freestandingErLines],
        departmentCode: "LABORATORY",
      })
    ).toBe(true);
  });

  it("RAD tech + FREESTANDING_ER + EMERGENCY/OBS/RAD → can read ED trackboard", () => {
    expect(
      canReadFreestandingErTrackboard({
        roleCodes: ["RADIOLOGY"],
        facilityType: "FREESTANDING_ER",
        facilityServiceLines: [...freestandingErLines],
        departmentCode: "RADIOLOGY",
      })
    ).toBe(true);
  });

  it("LAB tech + CLINIC → cannot read ED trackboard", () => {
    expect(
      canReadFreestandingErTrackboard({
        roleCodes: ["LAB"],
        facilityType: "CLINIC",
        facilityServiceLines: ["OBSERVATION", "LABORATORY"],
        departmentCode: "LAB",
      })
    ).toBe(false);
  });

  it("LAB tech + HOSPITAL + LABORATORY only → cannot read ED trackboard", () => {
    expect(
      canReadFreestandingErTrackboard({
        roleCodes: ["LAB"],
        facilityType: "HOSPITAL",
        facilityServiceLines: ["LABORATORY"],
        departmentCode: "LABORATORY",
      })
    ).toBe(false);
  });

  it("RN/Provider/Admin use standard trackboard roles", () => {
    expect(hasStandardTrackboardClinicalRole(["RN"])).toBe(true);
    expect(hasStandardTrackboardClinicalRole(["PROVIDER"])).toBe(true);
    expect(hasStandardTrackboardClinicalRole(["ADMIN"])).toBe(true);
    expect(hasStandardTrackboardClinicalRole(["LAB"])).toBe(false);
  });

  it("observation patients readable when OBSERVATION line present", () => {
    expect(
      canReadFreestandingErObservationPatients({
        roleCodes: ["LAB"],
        facilityType: "FREESTANDING_ER",
        facilityServiceLines: [...freestandingErLines],
        departmentCode: "LAB",
      })
    ).toBe(true);
  });

  it("orders/results context follows trackboard eligibility", () => {
    expect(
      canReadFreestandingErOrdersResultsContext({
        roleCodes: ["RADIOLOGY"],
        facilityType: "URGENT_CARE",
        facilityServiceLines: [...freestandingErLines],
        departmentCode: "EMERGENCY",
      })
    ).toBe(true);
  });

  it("does not grant MAR access", () => {
    expect(
      canAccessMarAsFreestandingErTechnician({
        roleCodes: ["LAB"],
        facilityType: "FREESTANDING_ER",
        facilityServiceLines: [...freestandingErLines],
      })
    ).toBe(false);
  });

  it("legacy null department still allows freestanding ER lab tech", () => {
    expect(
      canReadFreestandingErTrackboard({
        roleCodes: ["LAB"],
        facilityType: "FREESTANDING_ER",
        facilityServiceLines: [...freestandingErLines],
        departmentCode: null,
      })
    ).toBe(true);
  });
});
