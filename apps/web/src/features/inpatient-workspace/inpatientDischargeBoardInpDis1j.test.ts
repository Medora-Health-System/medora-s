/**
 * INP.DIS.1J — Discharge board operational completion (source/regression).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  INPATIENT_CONDITION_AT_DISCHARGE_STATUSES,
  INPATIENT_DEPARTURE_ACCOMPANIED_BY,
} from "@medora/shared";

const boardPath = join(__dirname, "InpatientDischargeBoard.tsx");
const nursingPath = join(__dirname, "InpatientDischargeBoardNursing.tsx");
const panelPath = join(__dirname, "InpatientDischargeMedReconPanel.tsx");
const stylesPath = join(__dirname, "dischargeBoardStyles.ts");
const apiPath = join(__dirname, "../hospital-care/inpatientOperationsApi.ts");
const enPath = join(__dirname, "../../i18n/messages/inpatientDischargeBoardInpDis1f.en.ts");
const frPath = join(__dirname, "../../i18n/messages/inpatientDischargeBoardInpDis1f.fr.ts");
const opsSvcPath = join(
  __dirname,
  "../../../../api/src/encounters/inpatient-operations.service.ts"
);
const finalSvcPath = join(
  __dirname,
  "../../../../api/src/encounters/inpatient-final-discharge.service.ts"
);

describe("INP.DIS.1J planning completion UX", () => {
  it("saves planning through canonical setDischargePlanning and mark-ready action", () => {
    const board = readFileSync(boardPath, "utf8");
    expect(board).toContain("setDischargePlanning");
    expect(board).toContain("validateInpatientDischargePlanningReady");
    expect(board).toContain("demoteInpatientDischargePlanningWorkflowAfterEdit");
    expect(board).toContain("isInpatientDischargePlanningOperationallyReady");
    expect(board).toContain('data-testid="inp-dis-1j-save-planning"');
    expect(board).toContain('data-testid="inp-dis-1j-mark-planning-ready"');
    expect(board).toContain('tp("planning.markReady")');
    expect(board).toContain('id: "planning"');
    expect(board).toContain("planningDisplayReady");
    expect(board).not.toContain("INPATIENT_DISCHARGE_WORKFLOW_STATES.map");
  });

  it("does not infer READY from non-empty fields and does not auto-notify care team", () => {
    const board = readFileSync(boardPath, "utf8");
    expect(board).toContain("careTeamNotified: planning.careTeamNotified");
    expect(board).not.toMatch(/careTeamNotified:\s*true/);
    expect(board).toContain('savePlanning("READY")');
    expect(board).toContain("touchPlanning");
  });
});

describe("INP.DIS.1J medication reconciliation UI", () => {
  it("uses effective completion and keeps Continue/Stop/Edit when review is needed", () => {
    const board = readFileSync(boardPath, "utf8");
    const panel = readFileSync(panelPath, "utf8");
    expect(board).toContain("isInpatientMedReconEffectivelyComplete");
    expect(board).toContain("allRequiredMedReconDecisionsComplete");
    expect(panel).toContain("operationallyFinalized");
    expect(panel).toContain("!operationallyFinalized");
    expect(panel).toContain('testId="recon-continue"');
    expect(panel).toContain('testId="recon-stop"');
    expect(panel).toContain('testId="recon-edit"');
    expect(panel).toContain("setDecision(line.id, \"CONTINUE\")");
    expect(panel).toContain("setDecision(line.id, \"DISCONTINUE\")");
    expect(panel).toContain("setDecision(line.id, \"MODIFY\")");
    expect(panel).not.toContain("hintFast");
    expect(panel).not.toContain("reviewHomeMedsHint");
  });

  it("never renders One-click instructional prose", () => {
    const board = readFileSync(boardPath, "utf8");
    const panel = readFileSync(panelPath, "utf8");
    const en = readFileSync(enPath, "utf8");
    const fr = readFileSync(frPath, "utf8");
    for (const src of [board, panel, en, fr]) {
      expect(src).not.toMatch(/One-click reconcile/i);
      expect(src).not.toMatch(/en un clic/i);
      expect(src).not.toContain("hintFast");
      expect(src).not.toContain("reviewHomeMedsHint");
      expect(src).not.toContain("retryHint");
    }
    expect(en).not.toMatch(/Review home, prior, and provider/);
    expect(fr).not.toMatch(/Examinez les médicaments à domicile/);
  });
});

describe("INP.DIS.1J departure dropdowns", () => {
  it("condition dropdown uses canonical INPATIENT_CONDITION_AT_DISCHARGE_STATUSES", () => {
    const nursing = readFileSync(nursingPath, "utf8");
    expect(nursing).toContain("INPATIENT_CONDITION_AT_DISCHARGE_STATUSES");
    expect(nursing).toContain('data-testid="inp-dis-1j-condition-at-departure"');
    expect(nursing).toContain("tp(`condition.${code}`)");
    expect(INPATIENT_CONDITION_AT_DISCHARGE_STATUSES).toEqual([
      "STABLE",
      "IMPROVED",
      "UNCHANGED",
      "GUARDED",
      "UNKNOWN",
      "OTHER",
    ]);
  });

  it("accompanied-by dropdown persists canonical codes and Other details", () => {
    const nursing = readFileSync(nursingPath, "utf8");
    expect(nursing).toContain("INPATIENT_DEPARTURE_ACCOMPANIED_BY");
    expect(nursing).toContain('data-testid="inp-dis-1j-accompanied-by"');
    expect(nursing).toContain('data-testid="inp-dis-1j-accompanied-by-detail"');
    expect(nursing).toContain("accompaniedByDetail");
    expect(nursing).toContain("localDateTimeInputToIso");
    expect(nursing).toContain("instantToLocalDateTimeInput");
    expect(INPATIENT_DEPARTURE_ACCOMPANIED_BY).toEqual([
      "SELF",
      "FAMILY_CAREGIVER",
      "FACILITY_STAFF",
      "EMS",
      "LAW_ENFORCEMENT",
      "OTHER",
    ]);
    const en = readFileSync(enPath, "utf8");
    const fr = readFileSync(frPath, "utf8");
    expect(en).toContain('SELF: "Self"');
    expect(fr).toContain("Patient seul");
    expect(en).not.toMatch(/accompaniedBy:\s*\{\s*SELF:\s*"SELF"/);
  });
});

describe("INP.DIS.1J lower nursing card containment", () => {
  it("uses bounded auto-fit grid and full-width boxed controls", () => {
    const nursing = readFileSync(nursingPath, "utf8");
    const styles = readFileSync(stylesPath, "utf8");
    expect(nursing).toContain('repeat(auto-fit, minmax(min(100%, 190px), 1fr))');
    expect(nursing).toContain("minWidth: 0");
    expect(styles).toContain('width: "100%"');
    expect(styles).toContain('maxWidth: "100%"');
    expect(styles).toContain('minWidth: 0');
    expect(styles).toContain('boxSizing: "border-box"');
    expect(nursing).not.toContain("minmax(200px, 1fr)");
  });
});

describe("INP.DIS.1J lifecycle remains 1E", () => {
  it("board still executes only inpatient-final-discharge and does not reintroduce legacy discharge", () => {
    const board = readFileSync(boardPath, "utf8");
    const api = readFileSync(apiPath, "utf8");
    const finalSvc = readFileSync(finalSvcPath, "utf8");
    const opsSvc = readFileSync(opsSvcPath, "utf8");
    expect(board).toContain("executeInpatientFinalDischarge");
    expect(board).not.toContain("dischargeInpatientEncounter");
    expect(api).toContain("inpatient-final-discharge");
    expect(api).not.toContain("lifecycle/discharge");
    expect(finalSvc).toContain("this.lifecycle.dischargeEncounter");
    expect(finalSvc).not.toContain("setDischargePlanning");
    expect(opsSvc).toContain("isInpatientMedReconEffectivelyComplete");
    expect(opsSvc).toContain("validateInpatientDischargePlanningReady");
    expect(opsSvc).toContain("MEDICATION_RECONCILIATION_INCOMPLETE");
  });
});
