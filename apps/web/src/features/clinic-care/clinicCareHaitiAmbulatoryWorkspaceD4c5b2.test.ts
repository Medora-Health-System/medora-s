/**
 * MEDUI.D4C.5B.2 — web source guards for Haiti ambulatory workspace completion.
 */

import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const featureDir = __dirname;

function read(rel: string): string {
  return readFileSync(join(featureDir, rel), "utf8");
}

describe("MEDUI.D4C.5B.2 Haiti ambulatory web mounts", () => {
  it("A — panels mount EmergencyTriagePanel for intake", () => {
    const panels = read("ClinicCareAmbulatoryWorkspacePanels.tsx");
    expect(panels).toContain("EmergencyTriagePanel");
    expect(panels).toContain('data-testid="clinic-care-ambulatory-intake"');
  });

  it("B — Clinical Data uses CLINIC + document filter (not ED hub)", () => {
    const panels = read("ClinicCareAmbulatoryWorkspacePanels.tsx");
    expect(panels).toContain('careSetting="CLINIC"');
    expect(panels).toContain("filterDocumentCards");
    const clinicalData = read("../emergency/EmergencyClinicalDataPanel.tsx");
    expect(clinicalData).toContain("documentCardFilter");
    expect(clinicalData).toContain("filterHaitiAmbulatoryClinicalDataCards");
  });

  it("C — nursing mounts AMBULATORY care setting", () => {
    const panels = read("ClinicCareAmbulatoryWorkspacePanels.tsx");
    expect(panels).toContain('careSetting="AMBULATORY"');
    expect(panels).not.toContain('careSetting="OBSERVATION"');
    expect(panels).toContain("clinicCareD4c5b2.nursing.title");
  });

  it("D — follow-up mounts shared discharge engine", () => {
    const panels = read("ClinicCareAmbulatoryWorkspacePanels.tsx");
    expect(panels).toContain("PatientDischargeInstructionsClosureCard");
    expect(panels).toContain("clinic-care-ambulatory-discharge-engine");
    expect(existsSync(join(featureDir, "ClinicDischarge.tsx"))).toBe(false);
  });

  it("E — summary mounts EmergencyVisitSummaryPanel (saved record)", () => {
    const panels = read("ClinicCareAmbulatoryWorkspacePanels.tsx");
    expect(panels).toContain("EmergencyVisitSummaryPanel");
    expect(panels).toContain("ivAccessFetchEnabled={false}");
    expect(existsSync(join(featureDir, "ClinicSummary.tsx"))).toBe(false);
  });

  it("F — Rx tile panel exists without ClinicPrescription", () => {
    expect(existsSync(join(featureDir, "ClinicCareAmbulatoryPrescriptionPanel.tsx"))).toBe(true);
    const rx = read("ClinicCareAmbulatoryPrescriptionPanel.tsx");
    expect(rx).toContain('medicationOrderMode="DEFAULT"');
    expect(rx).toContain("CreateOrderModal");
    expect(existsSync(join(featureDir, "ClinicPrescription.tsx"))).toBe(false);
  });

  it("G — medications hide shift timeline for Haiti ambulatory", () => {
    const panels = read("ClinicCareAmbulatoryWorkspacePanels.tsx");
    expect(panels).toContain("showFacilityMarShiftTimeline={!hideShiftTimeline}");
    expect(panels).toContain("shouldHideMarShiftTimelineForHaitiAmbulatory");
    const mar = read("../encounters/../components/encounters/MedicationAdministrationTab.tsx".replace(
      "../encounters/../",
      "../../"
    ));
    // path from features/clinic-care → components/encounters
    const marSrc = readFileSync(
      join(featureDir, "../../components/encounters/MedicationAdministrationTab.tsx"),
      "utf8"
    );
    expect(marSrc).toContain("showFacilityMarShiftTimeline");
    void mar;
  });

  it("H — Med Eval passes facilityCountry for Haiti field hide", () => {
    const me = read("ClinicCareAmbulatoryMedicalEvaluationPanel.tsx");
    expect(me).toContain("facilityCountry");
    const workspace = read("../../components/encounters/ProviderDocumentationWorkspace.tsx");
    expect(workspace).toContain("shouldHideHaitiAmbulatoryRoutineMedEvalFields");
    expect(workspace).toContain("hideHaitiRoutineMedEval");
  });

  it("I — tiles include prescriptions + larger touch targets", () => {
    const nav = read("ClinicCareAmbulatoryWorkspaceSectionNav.tsx");
    expect(nav).toContain("minWidth: 76");
    expect(nav).toContain("minHeight: 64");
    expect(nav).toContain("whiteSpace: \"normal\"");
  });

  it("J — header always shows vitals card (missing ≠ hidden)", () => {
    const header = read("ClinicCareAmbulatoryPatientHeader.tsx");
    expect(header).toContain("clinicCareD4c5b2.empty.notDocumented");
    expect(header).toContain("EmergencyWorkspaceVitalsCard");
    expect(header).not.toContain("hasVitals || vitalsLoading");
  });

  it("K — orders board uses French display keys", () => {
    const board = read("ClinicCareAmbulatoryOrdersBoardView.tsx");
    expect(board).toContain("ambulatoryOrderStatusDisplayKey");
    expect(board).toContain("ambulatoryOrderPriorityDisplayKey");
  });

  it("L — no ClinicHPI / ClinicDiagnosis / ClinicRx / ClinicDischarge forks", () => {
    expect(existsSync(join(featureDir, "ClinicHPI.tsx"))).toBe(false);
    expect(existsSync(join(featureDir, "ClinicDiagnosis.tsx"))).toBe(false);
    expect(existsSync(join(featureDir, "ClinicRx.tsx"))).toBe(false);
    expect(existsSync(join(featureDir, "ClinicDischarge.tsx"))).toBe(false);
    expect(existsSync(join(featureDir, "ClinicNursingNote.tsx"))).toBe(false);
    expect(existsSync(join(featureDir, "ClinicSummary.tsx"))).toBe(false);
  });
});
