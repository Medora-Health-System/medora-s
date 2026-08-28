/**
 * INP.DIS.1F — Disposition-specific nursing / AMA parity regressions.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { dispositionNursingFlags } from "./InpatientDischargeBoardNursing";

const boardPath = join(__dirname, "InpatientDischargeBoard.tsx");
const nursingPath = join(__dirname, "InpatientDischargeBoardNursing.tsx");
const panelPath = join(__dirname, "InpatientWorkspacePanel.tsx");

describe("INP.DIS.1F disposition nursing parity", () => {
  it("flags hide routine education/transport for ELOPED and DECEASED", () => {
    expect(dispositionNursingFlags("ELOPED")).toMatchObject({
      isEloped: true,
      showEducation: false,
      showTransportDeparture: false,
      showBelongings: false,
    });
    expect(dispositionNursingFlags("DECEASED")).toMatchObject({
      isDeceased: true,
      showEducation: false,
      showTransportDeparture: false,
    });
    expect(dispositionNursingFlags("HOME")).toMatchObject({
      showEducation: true,
      showTransportDeparture: true,
    });
    expect(dispositionNursingFlags("AGAINST_MEDICAL_ADVICE").isAma).toBe(true);
    expect(dispositionNursingFlags("HOSPICE").isTransferFamily).toBe(false);
    expect(dispositionNursingFlags("HOSPICE").isHospice).toBe(true);
    expect(dispositionNursingFlags("SKILLED_NURSING_FACILITY").isTransferFamily).toBe(true);
  });

  it("nursing component exposes AMA transfer eloped deceased correctional cards", () => {
    const nursing = readFileSync(nursingPath, "utf8");
    expect(nursing).toContain('testId="inp-dis-1f-nursing-handoff"');
    expect(nursing).toContain('testId="inp-dis-1f-nursing-eloped"');
    expect(nursing).toContain('testId="inp-dis-1f-nursing-deceased"');
    expect(nursing).toContain('testId="inp-dis-1f-nursing-correctional"');
    expect(nursing).toContain("patientDeclinedInstructions");
    expect(nursing).toContain("leftBeforeInstructionsComplete");
    expect(nursing).toContain("ivLeftInPlaceForTransfer");
    expect(nursing).toContain("medicationReconciliation");
    expect(nursing).toContain("relevantResults");
    expect(nursing).toContain("imaging");
    expect(nursing).toContain("documentsSent");
    expect(nursing).toContain("accompaniedBy");
    expect(nursing).toContain("interpreterUsed");
    expect(nursing).toContain("chargeNurseNotified");
    expect(nursing).toContain("bodyDestination");
    expect(nursing).toContain("custodyTransferredAt");
  });

  it("board exposes full AMA provider fields and does not force HOME-only details", () => {
    const board = readFileSync(boardPath, "utf8");
    expect(board).toContain('data-testid="inp-dis-1f-ama-details"');
    expect(board).toContain("capacityDocumented");
    expect(board).toContain("risksDiscussed");
    expect(board).toContain("alternativesDiscussed");
    expect(board).toContain("treatmentOffered");
    expect(board).toContain("returnPrecautionsReviewed");
    expect(board).toContain("InpatientDischargeBoardNursing");
    expect(board).toContain('data-testid="inp-dis-1f-eloped-details"');
    expect(board).toContain("nursingSupervisorNotified");
    expect(board).toContain("medicalExaminerStatus");
    expect(board).toContain("organDonationReferralStatus");
    expect(board).toContain("reasonCode");
    expect(board).toContain("conditionAtTransfer");
    expect(board).toContain("pendingResultsCommunicated");
    expect(board).toContain("transferAt");
    expect(board).toContain("INPATIENT_HOME_HEALTH_SERVICES");
    expect(board).toContain("preliminaryContext");
    expect(board).toContain("bodyDispositionOther");
    expect(board).toContain("startOfCareNotes");
  });

  it("covers all disposition card test ids for parity matrix", () => {
    const board = readFileSync(boardPath, "utf8");
    const nursing = readFileSync(nursingPath, "utf8");
    for (const id of [
      "inp-dis-1f-transfer-details",
      "inp-dis-1f-snf-details",
      "inp-dis-1f-home-health-details",
      "inp-dis-1f-correctional-details",
      "inp-dis-1f-ama-details",
      "inp-dis-1f-eloped-details",
      "inp-dis-1f-deceased-details",
    ]) {
      expect(board).toContain(`data-testid="${id}"`);
    }
    for (const id of [
      "inp-dis-1f-nursing-handoff",
      "inp-dis-1f-nursing-home-health",
      "inp-dis-1f-nursing-correctional",
      "inp-dis-1f-nursing-eloped",
      "inp-dis-1f-nursing-deceased",
      "inp-dis-1f-nursing-education",
    ]) {
      expect(nursing).toContain(`testId="${id}"`);
    }
  });

  it("print layout surfaces disposition print facts helper", () => {
    const printPath = join(
      __dirname,
      "../../components/encounters/DischargePrintLayout.tsx"
    );
    const printSrc = readFileSync(printPath, "utf8");
    expect(printSrc).toContain("collectInpatientDispositionPrintFacts");
    expect(printSrc).toContain("printOutput.inpatientDisposition.sectionTitle");
  });

  it("single mounted board — old sections remain unmounted", () => {
    const panel = readFileSync(panelPath, "utf8");
    const dischargeCase = panel.slice(
      panel.indexOf('case "dischargePlanning"'),
      panel.indexOf('case "timeline"')
    );
    expect(dischargeCase).toContain("InpatientDischargeBoard");
    expect(dischargeCase).not.toContain("InpatientProviderDischargeSection");
    expect(dischargeCase).not.toContain("InpatientNursingDischargeSection");
    expect(dischargeCase).not.toContain("InpatientFinalDischargeSection");
  });
});
