import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
const read = (path: string) => readFileSync(join(process.cwd(), "src", path), "utf8");

describe("INP.1B.6 inpatient nursing documentation completion", () => {
  const panel = read("features/inpatient-workspace/InpatientNursingAssessmentPanel.tsx");
  const board = read("features/clinical-documentation/NursingDocumentationBoard.tsx");
  const overview = read("features/inpatient-workspace/InpatientNursingOverviewCard.tsx");

  it("removes implementation identifiers and technical audit prose", () => {
    expect(panel).not.toContain("Encounter {encounterId}");
    expect(panel).not.toContain("server-authored");
    expect(panel).not.toContain("attribuées par le serveur");
  });
  it("freezes findings inside a horizontally scrollable board with sticky headers", () => {
    expect(board).toContain('data-testid="nursing-board-scroll-viewport"');
    expect(board).toContain('overflowX: "auto"');
    expect(board).toContain('data-testid="clinical-finding-sticky-column"');
    expect(board).toContain("stickyHeaderCell");
    expect(board).toContain('position: "sticky"');
  });
  it("keeps immutable history and editable blank/copied drafts", () => {
    expect(board).toContain('column.id === "draft" && !readOnly');
    expect(panel).toContain("emptyDraft()");
    expect(panel).toContain("setCopied(new Set");
    expect(panel).toContain("next.delete(id)");
  });
  it("supports clinician-selected effective time independently from audit time", () => {
    expect(board).toContain('type="datetime-local"');
    expect(panel).toContain("clinicalEffectiveAt: draftTime");
    expect(panel).toContain("assessment.authoredAt");
  });
  it("covers complete bedside sections and uses enterprise projections", () => {
    for (const section of ["Neurological", "Pain", "Respiratory", "Cardiovascular", "Gastrointestinal", "Genitourinary", "Skin and wounds", "Mobility and safety", "Lines, drains and devices", "Safety", "Nutrition and hydration", "Intake and output", "Education and communication", "Psychosocial", "Narrative and significant events"]) expect(panel).toContain(section);
    expect(panel).toContain("enterprise projection");
  });
  it("projects the active/latest draft into a section-organized summary", () => {
    expect(panel).toContain('data-testid="section-organized-nursing-summary"');
    expect(panel).toContain("summaryValues = draft ?");
    expect(panel).not.toContain('?? "Not charted"');
  });
  it("reuses the care-setting-aware enterprise catalog without ED storage", () => {
    expect(panel).toContain('<ClinicalDocumentationHub careSetting="INPATIENT"');
    expect(panel).not.toContain("erNursingReassessmentV1");
    expect(panel).not.toContain("ESI");
  });
  it("adds a read-only authoritative Overview projection and deep link", () => {
    expect(overview).toContain("inpatient-nursing-assessment-events");
    expect(overview).not.toContain('method: "POST"');
    expect(overview).toContain("Open Nursing Assessment");
  });
});
