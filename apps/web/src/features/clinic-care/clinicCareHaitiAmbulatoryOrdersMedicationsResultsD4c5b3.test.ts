/**
 * MEDUI.D4C.5B.3 — web source guards for Haiti ambulatory orders/meds/results.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const featureDir = __dirname;

function read(rel: string): string {
  return readFileSync(join(featureDir, rel), "utf8");
}

describe("MEDUI.D4C.5B.3 Haiti ambulatory web mounts", () => {
  it("A — intake mounts SIMPLE_CLINIC_INTAKE presentation for Haiti", () => {
    const panels = read("ClinicCareAmbulatoryWorkspacePanels.tsx");
    expect(panels).toContain("resolveHaitiAmbulatoryIntakePresentation");
    expect(panels).toContain("presentationMode={intakePresentation.presentationMode}");
    expect(panels).toContain("haitiAmbulatoryOrdersMedicationMode");
  });

  it("B — Orders uses Haiti chart-admin medication mode (not global ED change)", () => {
    const panels = read("ClinicCareAmbulatoryWorkspacePanels.tsx");
    expect(panels).toContain("medicationOrderMode={ordersMedicationMode}");
    expect(panels).not.toMatch(/medicationOrderMode=\{"ER_ADMINISTER_ONLY"\}/);
  });

  it("C — Rx panel filters external prescriptions and blocks empty print", () => {
    const rx = read("ClinicCareAmbulatoryPrescriptionPanel.tsx");
    expect(rx).toContain("filterAmbulatoryExternalPrescriptionOrders");
    expect(rx).toContain("canPrintAmbulatoryExternalPrescriptions");
    expect(rx).toContain("getRxPrintHtml");
    expect(rx).toContain("localizeAmbulatoryMedicationSigForFrenchDisplay");
    expect(rx).not.toContain("ClinicPrescription");
  });

  it("D — EmergencyTriagePanel supports presentationMode without deleting ED", () => {
    const triage = read("../emergency/EmergencyTriagePanel.tsx");
    expect(triage).toContain('presentationMode = "FULL_ED_TRIAGE"');
    expect(triage).toContain("SIMPLE_CLINIC_INTAKE");
    expect(triage).toContain("clinicCareD4c5b3.intake.title");
    expect(triage).toContain("simpleClinicIntake ? null");
  });

  it("E — V1 sections hide trauma / safety / preferred pharmacy when flagged", () => {
    const v1 = read("../emergency/EmergencyTriageV1Sections.tsx");
    expect(v1).toContain("hideEdTriageChrome");
    expect(v1).toContain("preferredPharmacy");
    expect(v1).toContain("traumaBlockTitle");
  });

  it("F — no ClinicMAR / ClinicLabResult / ClinicRadiologyResult engines", () => {
    const panels = read("ClinicCareAmbulatoryWorkspacePanels.tsx");
    expect(panels).toContain("MedicationAdministrationTab");
    expect(panels).not.toContain("ClinicMAR");
    expect(panels).not.toContain("ClinicLabResult");
    expect(panels).not.toContain("ClinicRadiologyResult");
    expect(panels).not.toContain("ClinicMedicationOrder");
  });
});
