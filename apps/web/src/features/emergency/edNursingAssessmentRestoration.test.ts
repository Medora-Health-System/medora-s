import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  erNursingReassessmentFormFromEncounter,
  legacyReassessmentColumnFromEncounter,
} from "./emergencyNursingReassessmentV1";

const webRoot = join(import.meta.dirname, "../..");
const readWeb = (path: string) => readFileSync(join(webRoot, path), "utf8");
const readRepo = (path: string) => readFileSync(join(webRoot, "../../..", path), "utf8");

describe("ED nursing assessment restoration", () => {
  const emergencyWorkspace = readWeb("features/emergency/EmergencyActiveWorkspaceView.tsx");
  const panel = readWeb("features/emergency/EmergencyNursingReassessmentPanel.tsx");
  const grid = readWeb("features/emergency/EmergencyNursingDocumentationGrid.tsx");

  it("mounts the ED panel directly as the Emergency Nurse Assessment workspace", () => {
    const nursingBranch = emergencyWorkspace.slice(
      emergencyWorkspace.indexOf('activeSection === "nursing" && showNursingTab'),
      emergencyWorkspace.indexOf('activeSection === "nursing" && !showNursingTab')
    );
    expect(nursingBranch).toContain('data-testid="emergency-nursing-assessment-workspace"');
    expect(nursingBranch).toContain("<EmergencyNursingReassessmentPanel");
    expect(nursingBranch).not.toMatch(/Enterprise(?:Nursing|Respiratory|Rehabilitation|Interdisciplinary|CaseManagement|Provider)/);
  });

  it("leaves Observation and Inpatient on the enterprise nursing composition", () => {
    expect(readWeb("features/observation-workspace/ObservationWorkspacePanel.tsx"))
      .toContain("<EnterpriseNursingClinicalWorkspaceD4b2");
    expect(readWeb("features/inpatient-workspace/InpatientNursingAssessmentSection.tsx"))
      .toContain("<EnterpriseNursingClinicalWorkspaceD4b2");
  });

  it("reuses the dropdown grid, canonical catalog, save endpoint, and append-only event history", () => {
    expect(panel).toContain("<EmergencyNursingDocumentationGrid");
    expect(grid).toContain("const ROWS:");
    expect(grid).toContain("<select");
    expect(panel).toContain('apiFetch(`/encounters/${encounterId}/nursing-reassessment-events`');
    expect(panel).toContain('method: "PATCH"');
    expect(panel).toContain("reassessmentNewSession");
    expect(grid).toContain("persistedColumnsForRender");
    expect(grid).toContain("resolveReadonlyDisplay(");
    expect(grid).toContain("only the rightmost editable column is bound");
    expect(grid).toContain("disabled={formDisabled}");
  });

  it("preserves canonical values and reads legacy ABC, signature, and trauma data", () => {
    const nursingAssessment = {
      erNursingReassessmentV1: {
        reassessmentAt: "2026-08-11T12:00:00.000Z",
        mentalStatus: "alert",
        orientation: "oriented_x4",
        airway: "wnl",
        trend: "improved",
        signature: { savedAt: "2026-08-11T12:01:00.000Z", savedByDisplayName: "Ada Nurse" },
      },
      erTraumaSurveyV1: { primaryAirway: "normal" },
    };
    const form = erNursingReassessmentFormFromEncounter(nursingAssessment);
    expect(form.mentalStatus).toBe("alert");
    expect(form.orientation).toBe("oriented_x4");
    expect(form.airway).toBe("wnl");
    expect(form.trend).toBe("improving");
    expect(legacyReassessmentColumnFromEncounter(nursingAssessment)).toMatchObject({
      id: "legacy",
      performerDisplayName: "Ada Nurse",
      performerInitials: "AN",
      traumaSnapshot: { primaryAirway: "normal" },
    });
  });

  it("projects authoritative saved events into ED Summary and the longitudinal chart", () => {
    const summary = readWeb("features/emergency/EmergencyVisitSummaryPanel.tsx");
    const summaryModel = readWeb("features/emergency/emergencyVisitSummaryModel.ts");
    const timeline = readWeb("components/patient-chart/EncounterClinicalTimeline.tsx");
    const chartTabs = readWeb("components/patient-chart/PatientChartClinicalTabs.tsx");
    expect(summary).toContain('apiFetch(`/encounters/${encounterId}/nursing-reassessment-events`');
    expect(summary).toContain("nursingReassessmentEvents: reassessmentEvents");
    expect(summaryModel).toContain("erNursingReassessmentFormFromEncounter");
    expect(timeline).toContain("parseNursingAssessmentSectionsForChart(enc.nursingAssessment");
    expect(chartTabs).toContain("nursingAssessmentDisplayLines(enc.nursingAssessment");
  });

  it("uses one encounter JSON/event persistence path without a duplicate document", () => {
    const service = readRepo("apps/api/src/encounters/encounters.service.ts");
    expect(service).toContain("NURSING_ASSESSMENT_NAMESPACE_ER_NURSING_REASSESSMENT_V1");
    expect(service).toContain("EncounterClinicalEventType.NURSING_ASSESSMENT_SAVED");
    expect(service).toContain("listNursingReassessmentEvents(");
    expect(panel).not.toContain("/clinical-documentation/entries");
  });

  it("retains EN and FR message catalogs for the restored UI", () => {
    const en = readWeb("i18n/messages/en.ts");
    const fr = readWeb("i18n/messages/fr.ts");
    expect(en).toContain("emergencyNursingReassessment:");
    expect(fr).toContain("emergencyNursingReassessment:");
    expect(panel).toContain('t("emergencyNursingReassessment.');
    expect(grid).toContain("emergencyNursingReassessment.documentationGrid");
  });
});
