import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
const root = join(process.cwd(), "src");
const read = (p: string) => readFileSync(join(root, p), "utf8");
describe("INP.1B inpatient nursing UI isolation", () => {
  const panel = read(
    "features/inpatient-workspace/InpatientNursingAssessmentPanel.tsx",
  );
  const rows = read(
    "features/inpatient-workspace/inpatientNursingBoardRowsInp1b6.ts",
  );
  const host = read(
    "features/inpatient-workspace/InpatientNursingAssessmentSection.tsx",
  );
  it("mounts the native assessment and not the ED engine", () => {
    expect(host).toContain("<InpatientNursingAssessmentPanel");
    expect(host).not.toContain("EmergencyNursingReassessmentPanel");
  });
  it("uses dedicated save and immutable history endpoints", () => {
    expect(panel).toContain("/inpatient-nursing-assessments");
    expect(panel).toContain("/inpatient-nursing-assessment-events");
    expect(panel).not.toContain("erNursingReassessmentV1");
  });
  it("charts canonical select values", () => {
    expect(rows).toContain("options: choice(");
    expect(panel).toContain("patchAssessment");
  });
  it("keeps assessment persistence focused and delegates other records", () => {
    expect(rows).toContain("Lines / Drains / Devices");
    expect(rows).toContain("Intake & Output");
    expect(panel).toContain("ClinicalDocumentationHub");
    expect(panel).not.toContain("EmergencyNursing");
  });
  it("has complete EN/FR assessment and reassessment catalogs", () => {
    expect(
      read("i18n/messages/inpatientNursingAssessmentInp1b.en.ts"),
    ).toContain('title: "Nursing Assessment"');
    expect(
      read("i18n/messages/inpatientNursingAssessmentInp1b.fr.ts"),
    ).toContain('title: "Évaluation infirmière"');
  });
  it("places nursing immediately after overview in nursing navigation", () => {
    const nav = read(
      "features/inpatient-workspace/inpatientWorkspaceSections.ts",
    );
    const block = nav.slice(
      nav.indexOf("INPATIENT_NURSING_STICKY_NAV_SECTIONS"),
      nav.indexOf("INPATIENT_PROVIDER_STICKY_NAV_SECTIONS"),
    );
    expect(block.indexOf('id: "nursing"')).toBeGreaterThan(
      block.indexOf('id: "overview"'),
    );
  });
});
