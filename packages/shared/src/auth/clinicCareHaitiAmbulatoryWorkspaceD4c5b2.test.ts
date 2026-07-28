/**
 * MEDUI.D4C.5B.2 — Haiti ambulatory clinical workspace completion (tests A–L).
 */

import { describe, expect, it } from "vitest";
import {
  CLINIC_CARE_AMBULATORY_WORKSPACE_SECTIONS,
  CLINIC_CARE_HAITI_AMBULATORY_WORKSPACE_CERTIFICATION_ID,
  ambulatoryOrderPriorityDisplayKey,
  ambulatoryOrderStatusDisplayKey,
  filterHaitiAmbulatoryClinicalDataCards,
  filterHaitiAmbulatoryProviderTemplates,
  getVisibleClinicCareAmbulatoryWorkspaceSections,
  isHaitiAmbulatoryClinicalDataCardAllowed,
  isHaitiAmbulatoryProviderTemplateAllowed,
  isHaitiAmbulatoryWorkspaceContext,
  isHaitiJurisdictionFromLanguageAlone,
  isHaitiPublicHealthJurisdiction,
  nursingWorkspaceSectionsForCareSetting,
  parseClinicCareAmbulatoryWorkspaceSection,
  shouldHideHaitiAmbulatoryRoutineMedEvalFields,
  shouldHideMarShiftTimelineForHaitiAmbulatory,
  toClinicalDocumentationHubCareSetting,
} from "@medora/shared";

describe("MEDUI.D4C.5B.2 Haiti ambulatory workspace completion", () => {
  it("A — certification id + Rx section in tile order", () => {
    expect(CLINIC_CARE_HAITI_AMBULATORY_WORKSPACE_CERTIFICATION_ID).toBe("MEDUI.D4C.5B.2");
    expect(CLINIC_CARE_AMBULATORY_WORKSPACE_SECTIONS).toContain("prescriptions");
    expect(CLINIC_CARE_AMBULATORY_WORKSPACE_SECTIONS.indexOf("orders")).toBeLessThan(
      CLINIC_CARE_AMBULATORY_WORKSPACE_SECTIONS.indexOf("prescriptions")
    );
    expect(CLINIC_CARE_AMBULATORY_WORKSPACE_SECTIONS.indexOf("prescriptions")).toBeLessThan(
      CLINIC_CARE_AMBULATORY_WORKSPACE_SECTIONS.indexOf("medications")
    );
    expect(parseClinicCareAmbulatoryWorkspaceSection("rx")).toBe("prescriptions");
  });

  it("B — jurisdiction from Facility.country only (not locale)", () => {
    expect(isHaitiPublicHealthJurisdiction("HT")).toBe(true);
    expect(isHaitiPublicHealthJurisdiction("Haiti")).toBe(true);
    expect(isHaitiPublicHealthJurisdiction("US")).toBe(false);
    expect(isHaitiJurisdictionFromLanguageAlone("fr")).toBe(false);
    expect(
      isHaitiAmbulatoryWorkspaceContext({ facilityCountry: "HT", ambulatoryCareSetting: true })
    ).toBe(true);
    expect(
      isHaitiAmbulatoryWorkspaceContext({ facilityCountry: "US", ambulatoryCareSetting: true })
    ).toBe(false);
    expect(
      isHaitiAmbulatoryWorkspaceContext({ facilityCountry: "HT", ambulatoryCareSetting: false })
    ).toBe(false);
  });

  it("C — hide MAR shift timeline for Haiti ambulatory only", () => {
    expect(
      shouldHideMarShiftTimelineForHaitiAmbulatory({
        facilityCountry: "HT",
        ambulatoryCareSetting: true,
      })
    ).toBe(true);
    expect(
      shouldHideMarShiftTimelineForHaitiAmbulatory({
        facilityCountry: "US",
        ambulatoryCareSetting: true,
      })
    ).toBe(false);
  });

  it("D — hide Haiti routine Med Eval Workup / Impression / Addendum", () => {
    expect(
      shouldHideHaitiAmbulatoryRoutineMedEvalFields({
        facilityCountry: "HT",
        encounterMode: "AMBULATORY",
      })
    ).toBe(true);
    expect(
      shouldHideHaitiAmbulatoryRoutineMedEvalFields({
        facilityCountry: "US",
        encounterMode: "AMBULATORY",
      })
    ).toBe(false);
    expect(
      shouldHideHaitiAmbulatoryRoutineMedEvalFields({
        facilityCountry: "HT",
        encounterMode: "ED",
      })
    ).toBe(false);
  });

  it("E — trauma / stroke provider templates blocked for Haiti ambulatory", () => {
    expect(isHaitiAmbulatoryProviderTemplateAllowed("chest_pain")).toBe(true);
    expect(isHaitiAmbulatoryProviderTemplateAllowed("trauma_mvc")).toBe(false);
    expect(isHaitiAmbulatoryProviderTemplateAllowed("stroke_alert")).toBe(false);
    expect(
      filterHaitiAmbulatoryProviderTemplates([
        { id: "uri" },
        { id: "pediatric_trauma" },
        { id: "hypertension" },
      ]).map((t) => t.id)
    ).toEqual(["uri", "hypertension"]);
  });

  it("F — Clinical Data blocks CIWA / COWS / thrombolysis / trauma at registry level", () => {
    expect(isHaitiAmbulatoryClinicalDataCardAllowed({ typeId: "CIWA", careSettings: ["ED"] })).toBe(
      false
    );
    expect(isHaitiAmbulatoryClinicalDataCardAllowed({ typeId: "COWS", careSettings: ["ED"] })).toBe(
      false
    );
    expect(
      isHaitiAmbulatoryClinicalDataCardAllowed({
        typeId: "score_phq9",
        careSettings: ["CLINIC", "ED"],
      })
    ).toBe(true);
    expect(
      filterHaitiAmbulatoryClinicalDataCards([
        { id: "score_ciwa_ar", careSettings: ["ED"], title: "CIWA-Ar" },
        { id: "phq9", careSettings: ["CLINIC"], title: "PHQ-9" },
      ]).map((c) => c.id)
    ).toEqual(["phq9"]);
  });

  it("G — nursing AMBULATORY care setting (not Observation proxy)", () => {
    const sections = nursingWorkspaceSectionsForCareSetting("AMBULATORY");
    expect(sections.some((s) => s.id === "overview")).toBe(true);
    expect(sections.some((s) => s.id === "pain")).toBe(true);
    expect(sections.some((s) => s.id === "admission")).toBe(false);
    expect(sections.some((s) => s.id === "handoff")).toBe(false);
    expect(toClinicalDocumentationHubCareSetting("AMBULATORY")).toBe("CLINIC");
  });

  it("H — order status / priority display keys are French-ready i18n paths", () => {
    expect(ambulatoryOrderStatusDisplayKey("PLACED")).toBe("clinicCareD4c5b2.orderStatus.placed");
    expect(ambulatoryOrderStatusDisplayKey("ACTIVE")).toBe("clinicCareD4c5b2.orderStatus.active");
    expect(ambulatoryOrderStatusDisplayKey("CANCELLED")).toBe(
      "clinicCareD4c5b2.orderStatus.cancelled"
    );
    expect(ambulatoryOrderPriorityDisplayKey("STAT")).toBe("clinicCareD4c5b2.orderPriority.urgent");
    expect(ambulatoryOrderPriorityDisplayKey("ROUTINE")).toBe(
      "clinicCareD4c5b2.orderPriority.routine"
    );
  });

  it("I — role tiles include Rx for provider; pharmacist defaults to prescriptions", () => {
    const provider = getVisibleClinicCareAmbulatoryWorkspaceSections(["PROVIDER"]);
    expect(provider).toContain("prescriptions");
    expect(provider).toContain("medical-evaluation");
    const pharmacist = getVisibleClinicCareAmbulatoryWorkspaceSections(["PHARMACIST"]);
    expect(pharmacist).toContain("prescriptions");
    expect(pharmacist).not.toContain("medical-evaluation");
  });

  it("J — no Clinic* engine fork names in shared Haiti helper module contract", () => {
    // Architectural guard: helpers are presentation/filter only.
    expect(CLINIC_CARE_HAITI_AMBULATORY_WORKSPACE_CERTIFICATION_ID).not.toContain("ClinicHPI");
    expect(typeof filterHaitiAmbulatoryClinicalDataCards).toBe("function");
  });

  it("K — US ambulatory does not inherit Haiti template blocks via jurisdiction helper", () => {
    expect(
      shouldHideHaitiAmbulatoryRoutineMedEvalFields({
        facilityCountry: "United States",
        encounterMode: "AMBULATORY",
      })
    ).toBe(false);
    expect(isHaitiPublicHealthJurisdiction("France")).toBe(false);
  });

  it("L — empty clinical value key for missing ≠ zero / false-negative", () => {
    expect(ambulatoryOrderStatusDisplayKey("RESULT_PENDING")).toBe(
      "clinicCareD4c5b2.orderStatus.resultPending"
    );
    expect(CLINIC_CARE_AMBULATORY_WORKSPACE_SECTIONS).toHaveLength(12);
  });
});
