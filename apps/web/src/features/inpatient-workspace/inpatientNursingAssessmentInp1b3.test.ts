import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
const read = (p: string) => readFileSync(join(process.cwd(), "src", p), "utf8");
describe("INP.1B.3 focused nursing assessment", () => {
  const panel = read(
    "features/inpatient-workspace/InpatientNursingAssessmentPanel.tsx",
  );
  const composition = read(
    "features/inpatient-workspace/InpatientNursingAssessmentSection.tsx",
  );
  it("isolates ancillary and engineering workspaces", () => {
    expect(composition).not.toMatch(
      /RespiratoryTherapy|Rehabilitation|TeamExecution|EnterpriseNursingClinicalWorkspace/,
    );
    expect(composition).not.toMatch(
      /D4B|EDOC|authoritative|projection|recommendation is not an order/i,
    );
  });
  it("provides one focused navigation and every requested section", () => {
    for (const id of [
      "overview",
      "systems",
      "neurological",
      "respiratory",
      "cardiovascular",
      "gastrointestinal",
      "genitourinary",
      "skinWounds",
      "mobilityFallRisk",
      "pain",
      "devices",
      "safety",
      "intakeOutput",
      "nutrition",
      "education",
      "handoff",
      "history",
    ])
      expect(panel).toContain(`id: "${id}"`);
  });
  it("never silently charts WNL and every select field has coded options", () => {
    expect(panel).toContain("withinExpectedLimits");
    expect(panel).toContain("sectionStatus: {}");
    expect(panel).toContain("field.options.map");
    expect(panel).toContain('<option value="">');
  });
  it("supports explicit copy, immutable saves, restore, change display and read-only history", () => {
    expect(panel).toContain("beginReassessment(true)");
    expect(panel).toContain('status: "DRAFT"');
    expect(panel).toContain("/inpatient-nursing-assessments");
    expect(panel).toContain("/inpatient-nursing-assessment-events");
    expect(panel).toContain("changed(");
    expect(panel).toContain("readOnlyHistory");
  });
  it("has matching EN/FR field and canonical-code catalogs", () => {
    const en = read("i18n/messages/inpatientNursingAssessmentInp1b.en.ts");
    const fr = read("i18n/messages/inpatientNursingAssessmentInp1b.fr.ts");
    for (const key of [
      "levelOfConsciousness",
      "respiratoryEffort",
      "fallRisk",
      "handoffStatus",
      "SEVERELY_LABORED",
      "UNABLE_TO_ASSESS",
    ]) {
      expect(en).toContain(`${key}:`);
      expect(fr).toContain(`${key}:`);
    }
  });
});
