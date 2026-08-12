import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
const read = (path: string) => readFileSync(join(process.cwd(), "src", path), "utf8");

describe("INP.1B.5 shared nursing documentation board", () => {
  const panel = read("features/inpatient-workspace/InpatientNursingAssessmentPanel.tsx");
  const board = read("features/clinical-documentation/NursingDocumentationBoard.tsx");
  const composition = read("features/inpatient-workspace/InpatientNursingAssessmentSection.tsx");

  it("mounts the shared board and removes the rejected tab presentation", () => {
    expect(panel).toContain("<NursingDocumentationBoard");
    expect(board).toContain('data-testid="nursing-documentation-board"');
    expect(panel).not.toContain("setTab(");
    expect(panel).not.toContain("assessment-section-");
    expect(composition).toContain("<InpatientNursingAssessmentPanel");
  });
  it("renders immutable saved columns and only edits the draft", () => {
    expect(panel).toContain("history.map");
    expect(board).toContain('column.id === "draft" && !readOnly');
    expect(board).toContain("CURRENT · SAVED");
    expect(board).toContain("DRAFT");
  });
  it("creates blank or copied unsaved reassessments without mutating history", () => {
    expect(panel).toContain("emptyDraft()");
    expect(panel).toContain("structuredFindings: { ...clinical.structuredFindings }");
    expect(panel).toContain("Previous values copied into a new unsaved draft");
    expect(panel).not.toMatch(/setHistory\([^)]*draft/);
  });
  it("uses only INP.1A authority and leaves ED persistence out", () => {
    expect(panel).toContain("/inpatient-nursing-assessments");
    expect(panel).toContain("/inpatient-nursing-assessment-events");
    expect(panel).not.toContain("erNursingReassessmentV1");
    expect(panel).not.toContain("triage");
    expect(panel).not.toContain("trauma");
  });
  it("supports hourly columns, copied-value visibility and role-derived read-only mode", () => {
    expect(board).toContain("+ Add column");
    expect(board).toContain("copiedFieldIds.has");
    expect(panel).toContain("readOnly={isLocked}");
    expect(panel).toContain("RN or Admin authority");
  });
  it("contains professional complete bedside row labels and no internal release terminology", () => {
    for (const label of ["Mental status", "Respiratory effort", "Peripheral perfusion", "Voiding / urinary status", "Wounds / pressure concern", "Lines / drains / devices", "Nutrition / hydration", "Nursing narrative"]) expect(panel).toContain(label);
    expect(panel).not.toMatch(/D4A|D4B|EDOC|CurrentDouleur|Chute Risque|Lines dispositifs/);
  });
});
