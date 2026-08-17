/**
 * MEDUI.INP.2C — Nursing Assessment final UX convergence gates.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import en from "@/i18n/messages/en";
import fr from "@/i18n/messages/fr";
import { buildSummaryLines } from "./InpatientNursingAssessmentPanel";
import type { NursingBoardRow } from "@/features/clinical-documentation/NursingDocumentationBoard";

const root = join(__dirname);
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const board = read("../clinical-documentation/NursingDocumentationBoard.tsx");
const panel = read("InpatientNursingAssessmentPanel.tsx");
const rail = read("NursingAssessmentContextRail.tsx");
const overview = read("InpatientOverviewView.tsx");
const rows = read("inpatientNursingBoardRowsInp1b6.ts");
const api = readFileSync(
  join(root, "../../../../api/src/encounters/encounters.controller.ts"),
  "utf8",
);

describe("MEDUI.INP.2C nursing assessment UX convergence", () => {
  it("A — preserves INP.1B.6 board architecture", () => {
    expect(board).toContain('data-testid="nursing-clinical-finding-header"');
    expect(board).toContain("sticky");
    expect(board).toContain("onCopyPrevious");
    expect(board).toContain("onNew");
    expect(board).toContain("copiedFieldIds");
    expect(board).toContain("nursing-clinical-documented-at");
    expect(panel).toContain("/inpatient-nursing-assessments");
    expect(panel).toContain("/inpatient-nursing-assessment-events");
  });

  it("B — rapid chips without automatic WNL default", () => {
    expect(board).toContain("nursing-rapid-chips-");
    expect(board).toContain("aria-pressed");
    expect(board).not.toMatch(/onChange\([^)]*WNL/);
    expect(rows).toContain("No silent WNL default");
  });

  it("C — draft vs historical chrome + discard + copied verify", () => {
    expect(board).toContain("nursing-column-draft");
    expect(board).toContain("nursing-column-historical");
    expect(board).toContain("nursing-discard-draft");
    expect(board).toContain("copiedVerifyLabel");
    expect(board).toContain("aria-readonly");
    expect(panel).toContain("onDiscard");
    expect(panel).toContain("copiedVerify");
  });

  it("D — concise summary omits empty sections", () => {
    const sampleRows: NursingBoardRow[] = [
      { id: "levelOfConsciousness", label: "LOC", group: "Neurological", options: [{ value: "ALERT", label: "Alert" }] },
      { id: "painScore", label: "Pain", group: "Pain", kind: "number" },
      { id: "narrative", label: "Note", group: "Narrative", kind: "textarea" },
    ];
    const lines = buildSummaryLines({ levelOfConsciousness: "ALERT", painScore: 2 }, sampleRows);
    expect(lines.some((l) => l.startsWith("Neurological:"))).toBe(true);
    expect(lines.some((l) => l.startsWith("Pain:"))).toBe(true);
    expect(lines.some((l) => l.startsWith("Narrative:"))).toBe(false);
    expect(lines.join(" ")).not.toMatch(/Not charted|Non documenté/i);
  });

  it("E — assessment context rail is projection-only", () => {
    expect(rail).toContain('data-persistence="none"');
    expect(rail).toContain("nursing-assessment-context-rail");
    expect(rail).not.toMatch(/apiFetch|method:\s*[\"']POST|method:\s*[\"']PATCH/);
    expect(panel).toContain("NursingAssessmentContextRail");
  });

  it("F — Overview keeps admission baseline vs current assessment distinct", () => {
    expect(overview).toContain("overview-nursing-admission-projection");
    expect(overview).toContain("overview-nursing-assessment-projection");
    expect(overview).toContain("overview-mobility-baseline-vs-current");
    expect(overview).toContain("assessmentBaseline");
    expect(overview).toContain("assessmentCurrent");
  });

  it("G — role gates unchanged (RN/ADMIN write; provider GET)", () => {
    expect(api).toMatch(
      /inpatient-nursing-assessments[\s\S]*?@RequireRoles\([\s\S]*?RoleCode\.RN[\s\S]*?RoleCode\.ADMIN/,
    );
    const workspace = read("InpatientWorkspacePanel.tsx");
    expect(workspace).toContain('canEditAssessment={');
    expect(workspace).toContain('roles.includes("RN") || roles.includes("ADMIN")');
  });

  it("H — EN/FR inp2c keys mirrored", () => {
    const enBoard = (en as Record<string, unknown>).inpatientNursingAssessmentInp2c as {
      board: Record<string, string>;
    };
    const frBoard = (fr as Record<string, unknown>).inpatientNursingAssessmentInp2c as {
      board: Record<string, string>;
    };
    expect(Object.keys(enBoard.board).sort()).toEqual(Object.keys(frBoard.board).sort());
    expect(frBoard.board.copiedVerify).toMatch(/Copié/);
    expect(frBoard.board.draft).toMatch(/BROUILLON/);
  });

  it("I — hub remains inpatient-only mount; no ED catalog coupling", () => {
    expect(panel).toContain('careSetting="INPATIENT"');
    expect(panel).not.toContain("erNursingReassessment");
    expect(panel).not.toContain("EmergencyNursing");
  });
});
