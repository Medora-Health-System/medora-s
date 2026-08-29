/**
 * INP.PROV.1C — Layout containment / overflow regression guards (source contracts).
 * Protects the inpatient Provider Documentation chart width from horizontal expansion.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname);
const read = (name: string) => readFileSync(join(root, name), "utf8");

const workspace = read("InpatientProviderDocumentationWorkspaceInpProv1b.tsx");
const panel = read("InpatientProviderWorkspacePanel.tsx");
const systemsEditor = read("InpatientHpSystemFindingsEditorInpProv1c.tsx");

describe("INP.PROV.1C layout containment", () => {
  it("constrains workspace root against page-level horizontal overflow", () => {
    expect(workspace).toContain('data-testid="inp-prov-1b-workspace"');
    expect(workspace).toContain("overflowX: \"hidden\"");
    expect(workspace).toMatch(/maxWidth:\s*"100%"/);
    expect(workspace).toMatch(/minWidth:\s*0/);
  });

  it("uses a contained three-column main grid with minmax(0,1fr) editor", () => {
    expect(workspace).toContain('data-testid="inp-prov-1b-main-grid"');
    expect(workspace).toContain(
      "minmax(180px, 220px) minmax(0, 1fr) minmax(260px, 300px)"
    );
    expect(workspace).toContain('data-testid="inp-prov-1b-notes-navigator"');
    expect(workspace).toContain('data-testid="inp-prov-1b-editor"');
    expect(workspace).toContain('data-testid="inp-prov-1b-right-rail"');
    expect(workspace).toContain("min-width: 0");
  });

  it("collapses columns at medium and narrow breakpoints", () => {
    expect(workspace).toContain("@media (max-width: 1099px)");
    expect(workspace).toContain("@media (max-width: 799px)");
    expect(workspace).toContain("grid-column: 1 / -1");
  });

  it("wraps H&P section navigation instead of a nowrap min-content strip", () => {
    expect(panel).toContain('data-testid="provider-hp-section-nav"');
    expect(panel).toContain('flexWrap: "wrap"');
    expect(panel).not.toMatch(/provider-hp-section-nav[\s\S]{0,200}flexWrap:\s*"nowrap"/);
    expect(panel).not.toMatch(/provider-hp-section-nav[\s\S]{0,250}flex:\s*"0 0 auto"/);
  });

  it("keeps ROS/Exam system rows width-contained with wrapping clinical text", () => {
    expect(systemsEditor).toContain("maxWidth: \"100%\"");
    expect(systemsEditor).toContain("minWidth: 0");
    expect(systemsEditor).toContain("overflowWrap: \"anywhere\"");
    expect(systemsEditor).toContain('gridTemplateColumns: "minmax(0, 7.5rem)');
  });

  it("does not show disabled Sign/Save as primary actions for signed H&P", () => {
    expect(workspace).toContain("viewingFinalDocument");
    expect(workspace).toContain('data-testid="inp-prov-1b-signed-status"');
    expect(workspace).toContain("viewingSignedHp");
  });

  it("contains Encounter Orders with auto-fit grid (no fixed minWidth strip)", () => {
    expect(workspace).toContain("repeat(auto-fit, minmax(min(100%, 180px), 1fr))");
    expect(workspace).not.toMatch(/inp-prov-1b-order-card[\s\S]{0,120}minWidth:\s*150/);
  });

  it("does not alter clinical 1C persistence symbols", () => {
    expect(panel).toContain("serializeInpatientHpSystemsDocument");
    expect(panel).toContain("applyAllSystemsNegative");
    expect(panel).toContain("applyNormalExam");
    expect(workspace).toContain("canInsertSmartAssistIntoHpSection");
  });
});
