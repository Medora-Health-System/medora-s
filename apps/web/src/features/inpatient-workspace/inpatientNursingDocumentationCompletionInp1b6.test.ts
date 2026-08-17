import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), "src", path), "utf8");

describe("INP.1B.6 inpatient nursing documentation completion", () => {
  const panel = read("features/inpatient-workspace/InpatientNursingAssessmentPanel.tsx");
  const board = read("features/clinical-documentation/NursingDocumentationBoard.tsx");
  const rows = read("features/inpatient-workspace/inpatientNursingBoardRowsInp1b6.ts");
  const overviewView = read("features/inpatient-workspace/InpatientOverviewView.tsx");
  const overviewProj = read("features/inpatient-workspace/projectInpatientOverview.ts");
  const sharedV1 = readFileSync(
    join(process.cwd(), "../../packages/shared/src/encounters/inpatientNursingAssessmentV1.ts"),
    "utf8",
  );
  const en = read("i18n/messages/inpatientNursingAssessmentInp1b.en.ts");
  const fr = read("i18n/messages/inpatientNursingAssessmentInp1b.fr.ts");
  const overviewEn = read("i18n/messages/inpatientOverviewD4a34.en.ts");
  const overviewFr = read("i18n/messages/inpatientOverviewD4a34.fr.ts");
  const edNursing = read("features/emergency/EmergencyNursingReassessmentPanel.tsx");
  const obsPanel = read("features/clinical-documentation/ClinicalDocumentationHub.tsx");

  it("1-2 does not render encounter UUID or server-authored technical sentence", () => {
    expect(panel).not.toContain("Encounter {encounterId}");
    expect(panel).not.toMatch(/Encounter\}?\s*\{encounterId\}/);
    expect(panel).not.toContain("server-authored");
    expect(panel).not.toContain("Reassessment date, time and author identity are server-authored");
    expect(panel).not.toContain("attribuées par le serveur");
  });

  it("3-4 sticky Clinical Finding and horizontal scroll viewport", () => {
    expect(board).toContain('data-testid="nursing-clinical-finding-header"');
    expect(board).toContain("position: \"sticky\"");
    expect(board).toContain("left: 0");
    expect(board).toContain('data-testid="nursing-board-scroll"');
    expect(board).toContain("overflowX: \"auto\"");
  });

  it("5-10 historical read-only, draft editable, add/copy/copied indicator", () => {
    expect(board).toContain('column.id === "draft" && !readOnly');
    expect(panel).toContain("emptyDraft()");
    expect(panel).toContain("onCopyPrevious");
    expect(board).toContain("copiedFieldIds.has");
    expect(panel).toContain("next.delete(id)");
  });

  it("11-12 clinician clinical time and independent server audit time", () => {
    expect(sharedV1).toContain("clinicalDocumentedAt");
    expect(sharedV1).toContain("normalizeInpatientClinicalDocumentedAt");
    expect(sharedV1).toContain("authoredAt");
    expect(board).toContain('data-testid="nursing-clinical-documented-at"');
    expect(panel).toContain("clinicalDocumentedAt");
  });

  it("13-14 I&O and devices through Clinical Documentation authority", () => {
    expect(panel).toContain("ClinicalDocumentationHub");
    expect(panel).toContain('careSetting="INPATIENT"');
    expect(panel).toContain("inpatientNursingAssessmentInp2c.board.hubHint");
    expect(panel).toContain("ClinicalDocumentationHub");
    expect(panel).toContain('careSetting="INPATIENT"');
    expect(rows).toContain("Intake & Output");
    expect(rows).toContain("Lines / Drains / Devices");
  });

  it("15 complete inpatient sections exist", () => {
    for (const group of [
      "Neurological",
      "Pain",
      "Respiratory",
      "Cardiovascular",
      "Gastrointestinal",
      "Genitourinary",
      "Skin / Wounds",
      "Mobility / Fall",
      "Lines / Drains / Devices",
      "Safety",
      "Nutrition / Hydration",
      "Intake & Output",
      "Education / Communication",
      "Psychosocial",
      "Narrative",
    ]) {
      expect(rows).toContain(`group: "${group}"`);
    }
  });

  it("16-17 section-organized Nursing Summary from current/latest", () => {
    expect(panel).toContain("SectionSummary");
    expect(panel).toContain("nursing-section-summary");
    expect(panel).toContain("summarySource = draft ? toBoardValues(draft)");
  });

  it("18-19 Overview consumes assessment projection without nursing persistence", () => {
    expect(overviewView).toContain("overview-nursing-assessment-projection");
    expect(overviewView).toContain("openNursingAssessment");
    expect(overviewProj).toContain("assessmentOverview");
    expect(overviewView).not.toContain("inpatient-nursing-assessments");
  });

  it("20-22 Patient Chart / print / Timeline remain adapters (shared authority)", () => {
    expect(sharedV1).toContain("projectPatientChartInpatientAssessment");
    expect(sharedV1).toContain("projectPrintExportInpatientAssessment");
    expect(sharedV1).toContain("adaptInpatientNursingAssessmentToClinicalRecord");
    expect(sharedV1).toContain("serverAuthoredAt");
    const chartExport = readFileSync(
      join(process.cwd(), "../../apps/api/src/encounters/chart-export.service.ts"),
      "utf8",
    );
    expect(chartExport).toContain("inpatientNursingDocumentationFromAssessment");
    expect(chartExport).toContain("INPATIENT_NURSING_ASSESSMENT_V1_KEY");
  });

  it("23-24 Clinical Documentation catalog for inpatient; no ED triage/ESI import", () => {
    expect(panel).toContain("ClinicalDocumentationHub");
    expect(panel).not.toContain("erNursingReassessmentV1");
    expect(panel).not.toContain("triage");
    expect(panel).not.toContain("ESI");
    expect(obsPanel).toContain("listClinicalDocumentationCardsForCareSetting");
  });

  it("25-28 RN/Admin authoring and PCT/RT boundaries preserved in panel messaging", () => {
    expect(panel).toContain("readOnly={isLocked}");
    expect(panel).toContain("inpatientNursingAssessmentInp2c.board.readOnly");
  });

  it("29-30 EN/FR labels present", () => {
    expect(en).toContain("Nursing Assessment");
    expect(fr).toContain("Évaluation");
    expect(overviewEn).toContain("openNursingAssessment");
    expect(overviewFr).toContain("openNursingAssessment");
  });

  it("31-32 ED and Observation surfaces still present (isolation regression markers)", () => {
    expect(edNursing).toContain("ClinicalDocumentationHub");
    expect(edNursing).toContain("EmergencyNursingDocumentationGrid");
    expect(obsPanel).toContain("careSetting");
  });

  it("33-37 clinical vs audit time and no duplicate overview persistence", () => {
    expect(sharedV1).toContain("resolveInpatientNursingClinicalOccurredAt");
    expect(sharedV1).toContain("INPATIENT_CLINICAL_TIME_MAX_PAST_MS");
    expect(overviewView).toContain("onNavigateSection?.(\"nursing\")");
    expect(panel).not.toContain("nursingAssessmentJson");
  });
});
