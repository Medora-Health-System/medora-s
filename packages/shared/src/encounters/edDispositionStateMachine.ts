/**
 * Server-owned ED disposition state projection (D1).
 * Pure classification — does not mutate encounters or invent a second close engine.
 *
 * Separates:
 * - disposition decision (draft / signed / revised)
 * - readiness (established disposition-safety)
 * - physical departure
 * - encounter closure
 */

import {
  isEdPhysicalDepartureCompleted,
  resolveEdDispositionPath,
  type EdDispositionPath,
  type EdEncounterLifecycleEncounterSnapshot,
} from "./edEncounterLifecycle.js";
import {
  EdDispositionDocumentationStatus,
  isEdDispositionDecisionSigned,
  readEdDispositionDecisionFromNursingAssessment,
} from "./edDispositionDecisionV1.js";

/** High-level disposition workflow state (projection). */
export const EdDispositionWorkflowState = {
  NOT_SELECTED: "NOT_SELECTED",
  DECISION_DRAFT: "DECISION_DRAFT",
  DECISION_SIGNED: "DECISION_SIGNED",
  WORKFLOW_IN_PROGRESS: "WORKFLOW_IN_PROGRESS",
  READY_FOR_DEPARTURE: "READY_FOR_DEPARTURE",
  DEPARTED_ED: "DEPARTED_ED",
  ED_ENCOUNTER_CLOSED: "ED_ENCOUNTER_CLOSED",
  CANCELLED_OR_REVISED: "CANCELLED_OR_REVISED",
} as const;

export type EdDispositionWorkflowState =
  (typeof EdDispositionWorkflowState)[keyof typeof EdDispositionWorkflowState];

/** Panel board id — one visible pathway board at a time. */
export const EdDispositionBoardId = {
  NONE: "NONE",
  HOME_DISCHARGE: "HOME_DISCHARGE",
  ADMISSION_OBSERVATION: "ADMISSION_OBSERVATION",
  EXTERNAL_TRANSFER: "EXTERNAL_TRANSFER",
  AMA: "AMA",
  LWBS_ELOPEMENT: "LWBS_ELOPEMENT",
  DECEASED: "DECEASED",
  OTHER_GOVERNED: "OTHER_GOVERNED",
} as const;

export type EdDispositionBoardId =
  (typeof EdDispositionBoardId)[keyof typeof EdDispositionBoardId];

export type EdDispositionStateProjection = {
  path: EdDispositionPath;
  boardId: EdDispositionBoardId;
  workflowState: EdDispositionWorkflowState;
  decisionStatus: "NONE" | "DRAFT" | "SIGNED";
  decisionSigned: boolean;
  revision: number;
  previousPath: string | null;
  physicalDepartureComplete: boolean;
  encounterClosed: boolean;
  /** Established readiness may allow close; never inferred from decision alone. */
  readinessCanClose: boolean | null;
  /** Decision alone never closes the encounter. */
  prematureClosureFromDecision: false;
  /** Summary routing hint after closure. */
  summaryRouteMode: "ACTIVE_SUMMARY" | "CLOSED_READ_ONLY";
  /** Pathway change after sign requires correction confirmation. */
  requiresCorrectionToChangePathway: boolean;
};

export function edDispositionPathToBoardId(path: EdDispositionPath): EdDispositionBoardId {
  switch (path) {
    case "HOME":
      return EdDispositionBoardId.HOME_DISCHARGE;
    case "ADMISSION":
      return EdDispositionBoardId.ADMISSION_OBSERVATION;
    case "TRANSFER":
      return EdDispositionBoardId.EXTERNAL_TRANSFER;
    case "AMA":
      return EdDispositionBoardId.AMA;
    case "LWBS":
      return EdDispositionBoardId.LWBS_ELOPEMENT;
    case "DECEASED":
      return EdDispositionBoardId.DECEASED;
    case "OTHER":
      return EdDispositionBoardId.OTHER_GOVERNED;
    case "NONE":
    default:
      return EdDispositionBoardId.NONE;
  }
}

export type ProjectEdDispositionStateInput = EdEncounterLifecycleEncounterSnapshot & {
  /** From GET disposition-readiness when available. */
  dispositionSafetyCanClose?: boolean | null;
};

export function projectEdDispositionState(
  input: ProjectEdDispositionStateInput
): EdDispositionStateProjection {
  const path = resolveEdDispositionPath(input);
  const boardId = edDispositionPathToBoardId(path);
  const encounterClosed = (input.status ?? "").trim().toUpperCase() === "CLOSED";
  const physicalDepartureComplete = isEdPhysicalDepartureCompleted(input);
  const decision = readEdDispositionDecisionFromNursingAssessment(input.nursingAssessment);
  const pathSelected = path !== "NONE";
  const decisionSigned = isEdDispositionDecisionSigned(input.nursingAssessment, pathSelected);
  const decisionStatus: EdDispositionStateProjection["decisionStatus"] = !pathSelected
    ? "NONE"
    : decisionSigned
      ? "SIGNED"
      : decision.documentationStatus === EdDispositionDocumentationStatus.DRAFT || pathSelected
        ? "DRAFT"
        : "NONE";

  const readinessCanClose =
    typeof input.dispositionSafetyCanClose === "boolean"
      ? input.dispositionSafetyCanClose
      : input.dispositionSafetyReadiness?.canClose ?? null;

  let workflowState: EdDispositionWorkflowState;
  if (encounterClosed) {
    workflowState = EdDispositionWorkflowState.ED_ENCOUNTER_CLOSED;
  } else if (decision.previousPath && decision.revisionReason && !decisionSigned) {
    workflowState = EdDispositionWorkflowState.CANCELLED_OR_REVISED;
  } else if (!pathSelected) {
    workflowState = EdDispositionWorkflowState.NOT_SELECTED;
  } else if (physicalDepartureComplete) {
    workflowState = EdDispositionWorkflowState.DEPARTED_ED;
  } else if (decisionSigned && readinessCanClose === true) {
    workflowState = EdDispositionWorkflowState.READY_FOR_DEPARTURE;
  } else if (decisionSigned) {
    workflowState = EdDispositionWorkflowState.WORKFLOW_IN_PROGRESS;
  } else {
    workflowState = EdDispositionWorkflowState.DECISION_DRAFT;
  }

  return {
    path,
    boardId,
    workflowState,
    decisionStatus,
    decisionSigned,
    revision: decision.revision,
    previousPath: decision.previousPath,
    physicalDepartureComplete,
    encounterClosed,
    readinessCanClose,
    prematureClosureFromDecision: false,
    summaryRouteMode: encounterClosed ? "CLOSED_READ_ONLY" : "ACTIVE_SUMMARY",
    requiresCorrectionToChangePathway: decisionSigned && !encounterClosed,
  };
}
