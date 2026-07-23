/**
 * D4A.2.7C — Shared rapid convergence contract tests.
 */
import { describe, expect, it } from "vitest";
import {
  INPATIENT_RAPID_CONVERGENCE_CERTIFICATION_ID,
  INPATIENT_ADMISSION_CLINICAL_SECTIONS,
  NURSING_ADMISSION_STAGES,
  allNursingAdmissionStageSectionIds,
  applyMutuallyExclusiveSelection,
  IMMEDIATE_CONCERN_OPTIONS,
  localizeRapidOption,
  sentenceCaseClinicalLabel,
  observationBootstrapRejectsEdAndInpatient,
  mayShowIndicatorAsNotPresent,
  rapidConvergenceMustNotEnablePlacement,
  rapidConvergenceMustNotInferDevices,
  rapidConvergenceMustNotSilentCarryForward,
  rapidConvergenceMustPreserveTwentyAdmissionSections,
  rapidConvergenceMustStoreCodesNotLabels,
  readTechnicianTasksDoc,
  mergeTechnicianTasksIntoSummary,
  emptyTechnicianTasksDoc,
} from "../index.js";

describe("MEDUI.INPATIENT_RAPID_CONVERGENCE.D4A2_7C shared", () => {
  it("exposes certification and invariants", () => {
    expect(INPATIENT_RAPID_CONVERGENCE_CERTIFICATION_ID).toBe(
      "MEDUI.INPATIENT_RAPID_CONVERGENCE.D4A2_7C"
    );
    expect(rapidConvergenceMustNotEnablePlacement()).toBe(true);
    expect(rapidConvergenceMustStoreCodesNotLabels()).toBe(true);
    expect(rapidConvergenceMustNotInferDevices()).toBe(true);
    expect(rapidConvergenceMustPreserveTwentyAdmissionSections()).toBe(true);
    expect(rapidConvergenceMustNotSilentCarryForward()).toBe(true);
  });

  it("maps all 20 admission sections into six stages without loss", () => {
    expect(INPATIENT_ADMISSION_CLINICAL_SECTIONS).toHaveLength(20);
    expect(NURSING_ADMISSION_STAGES).toHaveLength(6);
    const mapped = allNursingAdmissionStageSectionIds();
    expect(mapped).toHaveLength(20);
    for (const id of INPATIENT_ADMISSION_CLINICAL_SECTIONS) {
      expect(mapped).toContain(id);
    }
  });

  it("applies mutually exclusive rapid selections", () => {
    const withNone = applyMutuallyExclusiveSelection(
      IMMEDIATE_CONCERN_OPTIONS,
      ["AIRWAY"],
      "NONE"
    );
    expect(withNone).toContain("NONE");
    expect(withNone).not.toContain("AIRWAY");
    const withAirway = applyMutuallyExclusiveSelection(
      IMMEDIATE_CONCERN_OPTIONS,
      ["NONE"],
      "AIRWAY"
    );
    expect(withAirway).toContain("AIRWAY");
    expect(withAirway).not.toContain("NONE");
  });

  it("localizes option catalogs without treating labels as authority", () => {
    const en = localizeRapidOption(IMMEDIATE_CONCERN_OPTIONS[0]!, "en");
    const fr = localizeRapidOption(IMMEDIATE_CONCERN_OPTIONS[0]!, "fr");
    expect(en.code).toBe(fr.code);
    expect(en.label).not.toBe(fr.label);
  });

  it("humanizes compressed clinical terminology", () => {
    expect(sentenceCaseClinicalLabel("Painpresent")).toBe("Pain present");
    expect(sentenceCaseClinicalLabel("Urgentprovidernotification")).toBe(
      "Urgent provider notification"
    );
    expect(sentenceCaseClinicalLabel("Providerresponse")).toBe("Provider response");
    expect(sentenceCaseClinicalLabel("Medeconstatus")).toBe(
      "Medication reconciliation status"
    );
    expect(sentenceCaseClinicalLabel("Fallriskresult")).toBe("Fall-risk result");
    expect(sentenceCaseClinicalLabel("Iomonitoringrequired")).toBe(
      "Intake and output monitoring required"
    );
  });

  it("never treats SOURCE_UNAVAILABLE device indicators as Not present", () => {
    expect(mayShowIndicatorAsNotPresent("SOURCE_UNAVAILABLE")).toBe(false);
    expect(mayShowIndicatorAsNotPresent("NOT_PRESENT")).toBe(true);
  });

  it("gates observation bootstrap against ED and non-observation inpatient", () => {
    expect(
      observationBootstrapRejectsEdAndInpatient({ type: "EMERGENCY" }).ok
    ).toBe(false);
    expect(
      observationBootstrapRejectsEdAndInpatient({
        type: "INPATIENT",
        billingClassification: "INPATIENT",
      }).ok
    ).toBe(false);
    expect(
      observationBootstrapRejectsEdAndInpatient({
        type: "INPATIENT",
        billingClassification: "OBSERVATION",
      }).ok
    ).toBe(true);
  });

  it("persists technician tasks in admission summary JSON helpers", () => {
    const empty = emptyTechnicianTasksDoc("2026-01-01T00:00:00.000Z");
    const merged = mergeTechnicianTasksIntoSummary({}, empty);
    const read = readTechnicianTasksDoc(merged);
    expect(read.version).toBe(1);
    expect(read.tasks).toEqual([]);
  });
});
