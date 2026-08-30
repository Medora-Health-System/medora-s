/**
 * INP.DIS.1F — Enterprise discharge board source/regression tests.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const boardPath = join(__dirname, "InpatientDischargeBoard.tsx");
const panelPath = join(__dirname, "InpatientWorkspacePanel.tsx");
const enPath = join(__dirname, "../../i18n/messages/inpatientDischargeBoardInpDis1f.en.ts");
const frPath = join(__dirname, "../../i18n/messages/inpatientDischargeBoardInpDis1f.fr.ts");

describe("INP.DIS.1F inpatient discharge board", () => {
  it("board file contains reference section testids", () => {
    const board = readFileSync(boardPath, "utf8");
    const nursing = readFileSync(join(__dirname, "InpatientDischargeBoardNursing.tsx"), "utf8");
    expect(board).toContain('data-testid="inp-dis-1f-board"');
    expect(board).toContain('data-testid="inp-dis-1f-readiness"');
    expect(board).toContain('data-testid="inp-dis-1f-card-provider"');
    expect(board).toContain('data-testid="inp-dis-1f-card-nursing"');
    expect(board).toContain('data-testid="inp-dis-1f-card-planning"');
    expect(board).toContain('data-testid="inp-dis-1f-card-final"');
    expect(board).toContain('data-testid="inp-dis-1f-clinical-summary"');
    expect(board).toContain('data-testid="inp-dis-1f-pending-studies"');
    expect(board).toContain('data-testid="inp-dis-1f-hospital-course"');
    expect(board).toContain('data-testid="inp-dis-1f-disposition"');
    expect(board).toContain('data-testid="inp-dis-1f-follow-up"');
    expect(nursing).toContain('testId="inp-dis-1f-nursing-education"');
    expect(nursing).toContain('testId="inp-dis-1f-nursing-iv"');
    expect(nursing).toContain('testId="inp-dis-1f-nursing-belongings"');
    expect(nursing).toContain('testId="inp-dis-1f-nursing-transport"');
    expect(nursing).toContain('testId="inp-dis-1f-nursing-departure"');
    expect(board).toContain('data-testid="inp-dis-1f-bottom-bar"');
    expect(board).toContain('data-testid="inp-dis-1f-discharge-patient"');
    expect(board).toContain('data-testid="inp-dis-1f-print"');
    expect(board).toContain('data-testid="inp-dis-1f-refresh"');
  });

  it("board has no legacy D4B.7 / ops prose labels", () => {
    const board = readFileSync(boardPath, "utf8");
    expect(board).not.toContain("Open a coordination episode");
    expect(board).not.toContain("Readiness is not discharge authorization");
    expect(board).not.toContain("Mark ready");
    expect(board).not.toContain("Start discharge planning");
    expect(board).not.toContain("EnterpriseCaseManagementDischargePlanningD4b7");
    expect(board).not.toContain('mode="discharge"');
    expect(board).not.toContain("ClinicalOpsPanel");
  });

  it("WorkspacePanel mounts InpatientDischargeBoard and drops legacy discharge stack", () => {
    const panel = readFileSync(panelPath, "utf8");
    expect(panel).toContain("InpatientDischargeBoard");
    expect(panel).not.toContain("EnterpriseCaseManagementDischargePlanningD4b7");
    expect(panel).not.toContain('mode="discharge"');
    // discharge case must not mount ClinicalOpsPanel in discharge mode
    const dischargeCase = panel.slice(
      panel.indexOf('case "dischargePlanning"'),
      panel.indexOf('case "timeline"')
    );
    expect(dischargeCase).toContain("InpatientDischargeBoard");
    expect(dischargeCase).not.toContain("ClinicalOpsPanel");
    expect(dischargeCase).not.toContain("InpatientProviderDischargeSection");
    expect(dischargeCase).not.toContain("InpatientNursingDischargeSection");
    expect(dischargeCase).not.toContain("InpatientFinalDischargeSection");
  });

  it("EN/FR i18n have Discharge Patient / Sortir le patient", () => {
    const en = readFileSync(enPath, "utf8");
    const fr = readFileSync(frPath, "utf8");
    expect(en).toContain("Discharge Patient");
    expect(fr).toContain("Sortir le patient");
  });

  it("board posts expectedProviderRevision / expectedNursingRevision", () => {
    const board = readFileSync(boardPath, "utf8");
    expect(board).toContain("expectedProviderRevision: finalReadiness.providerRevision");
    expect(board).toContain("expectedNursingRevision: finalReadiness.nursingRevision");
  });

  it("INP.DIS.1F.3 — board uses executeInpatientFinalDischarge only (no lifecycle bypass helper)", () => {
    const board = readFileSync(boardPath, "utf8");
    const api = readFileSync(
      join(__dirname, "../hospital-care/inpatientOperationsApi.ts"),
      "utf8"
    );
    const menu = readFileSync(join(__dirname, "InpatientLifecycleActionsMenu.tsx"), "utf8");
    expect(board).toContain("executeInpatientFinalDischarge");
    expect(board).not.toContain("dischargeInpatientEncounter");
    expect(api).toContain("executeInpatientFinalDischarge");
    expect(api).toContain("inpatient-final-discharge");
    expect(api).not.toContain("dischargeInpatientEncounter");
    expect(api).not.toContain("lifecycle/discharge");
    expect(menu).not.toContain("dischargeInpatientEncounter");
    expect(menu).not.toContain("lifecycle-discharge-form");
    expect(menu).not.toContain('setMode("discharge")');
  });

  it("board has finalizeInpatientMedRecon", () => {
    const board = readFileSync(boardPath, "utf8");
    expect(board).toContain("finalizeInpatientMedRecon");
  });

  it("board includes disposition-specific detail sections and reference CTAs", () => {
    const board = readFileSync(boardPath, "utf8");
    expect(board).toContain('data-testid="inp-dis-1f-transfer-details"');
    expect(board).toContain('data-testid="inp-dis-1f-snf-details"');
    expect(board).toContain('data-testid="inp-dis-1f-eloped-details"');
    expect(board).toContain('data-testid="inp-dis-1f-deceased-details"');
    expect(board).toContain('data-testid="inp-dis-1f-ama-details"');
    expect(board).toContain("cards.providerCta");
    expect(board).toContain("cards.reviewBefore");
    expect(board).toContain("Icd10DiagnosisSearchAutocomplete");
  });
});
