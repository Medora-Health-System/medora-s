/**
 * MEDUI.D4A.3.3 — Compact header finalization + nursing workspace consolidation.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import en from "@/i18n/messages/en";
import fr from "@/i18n/messages/fr";
import {
  INPATIENT_NURSING_STICKY_NAV_SECTIONS,
  INPATIENT_PROVIDER_STICKY_NAV_SECTIONS,
  parseInpatientWorkspaceSection,
} from "./inpatientWorkspaceSections";
import { nursingPrimaryNav, providerPrimaryNav } from "@medora/shared";

const root = join(__dirname);

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

describe("MEDUI.D4A.3.3 inpatient header + nursing consolidation", () => {
  it("compacts IV/allergy/code/isolation on one nowrap clinical-cards row", () => {
    const src = read("EnterpriseHospitalPatientHeader.tsx");
    expect(src).toContain('flexWrap: "nowrap"');
    expect(src).toContain("ivCompactCard");
    expect(src).toContain("statusChipCard");
    expect(src).toContain("inpatientHeaderNursingD4a33.iv.activeIv");
    expect(src).toContain("inpatient-header-isolation-card");
    expect(src).not.toContain("ivActive.slice");
  });

  it("wires interactive clinical status editors (not overview navigation stubs)", () => {
    const active = read("InpatientActiveWorkspaceView.tsx");
    expect(active).toContain("InpatientAllergyEditorModal");
    expect(active).toContain("InpatientCodeStatusEditorModal");
    expect(active).toContain("InpatientIsolationEditorModal");
    expect(active).toContain("EncounterIvAccessPanel");
    expect(active).not.toContain('onOpenAllergies={() => selectSection("overview")}');
    const editors = read("InpatientClinicalStatusEditors.tsx");
    expect(editors).toContain("DrugAllergySearchPanel");
    expect(editors).toContain("patchInpatientClinicalOps");
    expect(editors).toContain("setCodeStatus");
    expect(editors).toContain("setIsolation");
  });

  it("removes Longitudinal Overview strip completely", () => {
    expect(existsSync(join(root, "InpatientLongitudinalOverviewStrip.tsx"))).toBe(false);
    const active = read("InpatientActiveWorkspaceView.tsx");
    expect(active).not.toContain("InpatientLongitudinalOverviewStrip");
    expect(active).not.toContain("longitudinal");
  });

  it("nursing sticky nav order excludes Timeline/Summary and includes Assessment + Notes", () => {
    const ids = INPATIENT_NURSING_STICKY_NAV_SECTIONS.map((s) => s.id);
    expect(ids).toEqual([
      "overview",
      "orders",
      "medications",
      "results",
      "carePlan",
      "admission",
      "nursing",
      "notes",
      "dischargePlanning",
    ]);
    expect(ids).not.toContain("timeline");
    expect(ids).not.toContain("summary");
    expect(parseInpatientWorkspaceSection("notes")).toBe("notes");
  });

  it("provider sticky retains Timeline + Summary; nursing primary nav matches sticky intent", () => {
    const providerIds = INPATIENT_PROVIDER_STICKY_NAV_SECTIONS.map((s) => s.id);
    expect(providerIds).toContain("timeline");
    expect(providerIds).toContain("summary");
    expect(providerIds).not.toContain("notes");
    expect(providerPrimaryNav()).toContain("summary");
    const nursing = nursingPrimaryNav();
    expect(nursing).not.toContain("timeline");
    expect(nursing).not.toContain("summary");
    expect(nursing).toContain("notes");
  });

  it("reuses ED Nursing Assessment + Notes engines without forking", () => {
    const section = read("InpatientNursingAssessmentSection.tsx");
    expect(section).toContain("EmergencyNursingReassessmentPanel");
    expect(section).toContain('variant="inpatientEncounter"');
    expect(section).toContain("InpatientNursingHandoffPanel");
    expect(section).toContain("InpatientNursingTeamExecutionPanel");
    const panel = read("InpatientWorkspacePanel.tsx");
    expect(panel).toContain("EmergencyErNotesPanel");
    expect(panel).toContain("printDischarge");
    expect(panel).toContain("inpatient-print-discharge-summary");
    const edNursing = readFileSync(
      join(root, "../emergency/EmergencyNursingReassessmentPanel.tsx"),
      "utf8"
    );
    expect(edNursing).toContain("inpatientEncounter");
    expect(edNursing).toContain('careSetting={hubCareSetting}');
  });

  it("Observation keeps showAssignmentActions; inpatient does not enable assignment", () => {
    const obs = readFileSync(
      join(root, "../observation-workspace/ObservationActiveWorkspaceView.tsx"),
      "utf8"
    );
    expect(obs).toContain("showAssignmentActions");
    const active = read("InpatientActiveWorkspaceView.tsx");
    expect(active).not.toContain("showAssignmentActions");
    expect(active).not.toContain("onAssignToMe");
  });

  it("mirrors D4A.3.3 i18n keys EN/FR", () => {
    expect(Object.keys(en.inpatientHeaderNursingD4a33.nav)).toEqual(
      Object.keys(fr.inpatientHeaderNursingD4a33.nav)
    );
    expect(Object.keys(en.inpatientHeaderNursingD4a33.codeStatusEditor.options)).toEqual(
      Object.keys(fr.inpatientHeaderNursingD4a33.codeStatusEditor.options)
    );
    expect(en.inpatientHeaderNursingD4a33.nav.nursingAssessment).toBeTruthy();
    expect(fr.inpatientHeaderNursingD4a33.nav.nursingAssessment).toBeTruthy();
    expect(fr.inpatientHeaderNursingD4a33.discharge.printSummary).not.toMatch(/Print/i);
  });
});
