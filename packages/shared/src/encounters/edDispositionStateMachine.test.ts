import { describe, expect, it } from "vitest";
import {
  EdDispositionBoardId,
  EdDispositionWorkflowState,
  edDispositionPathToBoardId,
  projectEdDispositionState,
} from "./edDispositionStateMachine.js";
import { EdDispositionDocumentationStatus } from "./edDispositionDecisionV1.js";

describe("edDispositionStateMachine (D1)", () => {
  it("maps paths to dedicated board ids", () => {
    expect(edDispositionPathToBoardId("HOME")).toBe(EdDispositionBoardId.HOME_DISCHARGE);
    expect(edDispositionPathToBoardId("ADMISSION")).toBe(EdDispositionBoardId.ADMISSION_OBSERVATION);
    expect(edDispositionPathToBoardId("TRANSFER")).toBe(EdDispositionBoardId.EXTERNAL_TRANSFER);
    expect(edDispositionPathToBoardId("LWBS")).toBe(EdDispositionBoardId.LWBS_ELOPEMENT);
  });

  it("separates decision, departure, and closure — decision alone never closes", () => {
    const signed = projectEdDispositionState({
      status: "OPEN",
      dischargeSummaryJson: { dischargeMode: "Domicile" },
      nursingAssessment: {
        erDispositionV1: {
          documentationStatus: EdDispositionDocumentationStatus.SIGNED,
          signedAt: "2026-07-20T12:00:00.000Z",
          signedByDisplayName: "Dr Test",
          revision: 0,
        },
      },
      dispositionSafetyCanClose: false,
    });
    expect(signed.decisionSigned).toBe(true);
    expect(signed.encounterClosed).toBe(false);
    expect(signed.prematureClosureFromDecision).toBe(false);
    expect(signed.summaryRouteMode).toBe("ACTIVE_SUMMARY");
    expect(signed.workflowState).toBe(EdDispositionWorkflowState.WORKFLOW_IN_PROGRESS);
    expect(signed.requiresCorrectionToChangePathway).toBe(true);
  });

  it("routes closed encounters to CLOSED_READ_ONLY summary mode", () => {
    const closed = projectEdDispositionState({
      status: "CLOSED",
      dischargeSummaryJson: { dischargeMode: "Domicile" },
      nursingAssessment: {
        erDispositionV1: {
          documentationStatus: EdDispositionDocumentationStatus.SIGNED,
          revision: 1,
        },
      },
    });
    expect(closed.workflowState).toBe(EdDispositionWorkflowState.ED_ENCOUNTER_CLOSED);
    expect(closed.summaryRouteMode).toBe("CLOSED_READ_ONLY");
    expect(closed.boardId).toBe(EdDispositionBoardId.HOME_DISCHARGE);
  });

  it("treats unsigned selected path as draft", () => {
    const draft = projectEdDispositionState({
      status: "OPEN",
      dischargeSummaryJson: { dischargeMode: "Domicile" },
      nursingAssessment: {
        erDispositionV1: {
          documentationStatus: EdDispositionDocumentationStatus.DRAFT,
          revision: 0,
        },
      },
    });
    expect(draft.decisionStatus).toBe("DRAFT");
    expect(draft.workflowState).toBe(EdDispositionWorkflowState.DECISION_DRAFT);
  });
});
