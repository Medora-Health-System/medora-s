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
    expect(dispositionNursingFlags("HOSPICE").isTransferFamily).toBe(true);
  });

  it("nursing component exposes AMA transfer eloped deceased correctional cards", () => {
    const nursing = readFileSync(nursingPath, "utf8");
    expect(nursing).toContain('testId="inp-dis-1f-nursing-handoff"');
    expect(nursing).toContain('testId="inp-dis-1f-nursing-eloped"');
    expect(nursing).toContain('testId="inp-dis-1f-nursing-deceased"');
    expect(nursing).toContain('testId="inp-dis-1f-nursing-correctional"');
    expect(nursing).toContain("patientDeclinedInstructions");
    expect(nursing).toContain("ivLeftInPlaceForTransfer");
    expect(nursing).toContain("documentsSent");
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
