import { isIvpbSessionDoseKind, parseMedicationDoseKind } from "./medicationDoseKind.js";
import {
  isTerminalMedicationDoseStatus,
  parseMedicationDoseStatus,
  type MedicationDoseStatus,
} from "./medicationDoseStatus.js";
import { isRecurringIvpbScheduleClassification } from "./medicationScheduleClassification.js";

export const IVPB_DOSE_SESSION_ACTIONS = ["START", "STOP", "MISS", "HOLD"] as const;

export type IvpbDoseSessionAction = (typeof IVPB_DOSE_SESSION_ACTIONS)[number];

export const IVPB_DOSE_SESSION_ELIGIBILITY_REASONS = [
  "IVPB_DOSE_SESSION_ELIGIBLE",
  "NOT_IVPB_SESSION_DOSE_KIND",
  "NOT_RECURRING_IVPB_SCHEDULE",
  "INVALID_DOSE_STATUS",
  "DOSE_ALREADY_TERMINAL",
  "DOSE_NOT_IN_PROGRESS",
  "DOSE_NOT_STARTABLE",
  "DOSE_ALREADY_IN_PROGRESS",
  "INFUSION_SESSION_REQUIRED_FOR_STOP",
  "ACTION_NOT_APPLICABLE",
] as const;

export type IvpbDoseSessionEligibilityReason =
  (typeof IVPB_DOSE_SESSION_ELIGIBILITY_REASONS)[number];

export type EvaluateIvpbDoseSessionEligibilityInput = {
  doseKind: string | null | undefined;
  doseStatus: MedicationDoseStatus | string | null | undefined;
  scheduleClassification: string | null | undefined;
  infusionSessionId?: string | null;
  /** When set, evaluates a single action; otherwise returns metadata for all actions. */
  action?: IvpbDoseSessionAction;
};

export type IvpbDoseSessionActionEligibility = {
  eligible: boolean;
  reason: IvpbDoseSessionEligibilityReason;
};

export type IvpbDoseSessionEligibilityMetadata = {
  doseStatus: MedicationDoseStatus | null;
  start: IvpbDoseSessionActionEligibility;
  stop: IvpbDoseSessionActionEligibility;
  miss: IvpbDoseSessionActionEligibility;
  hold: IvpbDoseSessionActionEligibility;
};

function ineligibleAction(
  reason: IvpbDoseSessionEligibilityReason
): IvpbDoseSessionActionEligibility {
  return { eligible: false, reason };
}

function eligibleAction(): IvpbDoseSessionActionEligibility {
  return { eligible: true, reason: "IVPB_DOSE_SESSION_ELIGIBLE" };
}

function evaluateStartEligibility(
  status: MedicationDoseStatus,
  infusionSessionId?: string | null
): IvpbDoseSessionActionEligibility {
  if (isTerminalMedicationDoseStatus(status)) {
    return ineligibleAction("DOSE_ALREADY_TERMINAL");
  }
  if (status === "IN_PROGRESS") {
    return ineligibleAction("DOSE_ALREADY_IN_PROGRESS");
  }
  if (status === "HELD") {
    return ineligibleAction("DOSE_NOT_STARTABLE");
  }
  if (status === "PLANNED" || status === "DUE" || status === "OVERDUE") {
    if (infusionSessionId?.trim()) {
      return ineligibleAction("DOSE_ALREADY_IN_PROGRESS");
    }
    return eligibleAction();
  }
  return ineligibleAction("DOSE_NOT_STARTABLE");
}

function evaluateStopEligibility(
  status: MedicationDoseStatus,
  infusionSessionId?: string | null
): IvpbDoseSessionActionEligibility {
  if (isTerminalMedicationDoseStatus(status)) {
    return ineligibleAction("DOSE_ALREADY_TERMINAL");
  }
  if (status !== "IN_PROGRESS") {
    return ineligibleAction("DOSE_NOT_IN_PROGRESS");
  }
  if (!infusionSessionId?.trim()) {
    return ineligibleAction("INFUSION_SESSION_REQUIRED_FOR_STOP");
  }
  return eligibleAction();
}

function evaluateMissEligibility(status: MedicationDoseStatus): IvpbDoseSessionActionEligibility {
  if (isTerminalMedicationDoseStatus(status)) {
    return ineligibleAction("DOSE_ALREADY_TERMINAL");
  }
  if (status === "IN_PROGRESS" || status === "HELD") {
    return ineligibleAction("ACTION_NOT_APPLICABLE");
  }
  if (status === "PLANNED" || status === "DUE" || status === "OVERDUE") {
    return eligibleAction();
  }
  return ineligibleAction("ACTION_NOT_APPLICABLE");
}

function evaluateHoldEligibility(status: MedicationDoseStatus): IvpbDoseSessionActionEligibility {
  if (isTerminalMedicationDoseStatus(status)) {
    return ineligibleAction("DOSE_ALREADY_TERMINAL");
  }
  if (status === "IN_PROGRESS") {
    return ineligibleAction("ACTION_NOT_APPLICABLE");
  }
  if (status === "PLANNED" || status === "DUE" || status === "OVERDUE") {
    return eligibleAction();
  }
  return ineligibleAction("ACTION_NOT_APPLICABLE");
}

/**
 * Pure contract for IVPB_SESSION dose START/STOP/MISS/HOLD eligibility (M1.8B.7J.1).
 * No service calls — future wiring in M1.8B.7J.3+.
 */
export function evaluateIvpbDoseSessionEligibility(
  input: EvaluateIvpbDoseSessionEligibilityInput
): IvpbDoseSessionEligibilityMetadata | IvpbDoseSessionActionEligibility {
  if (!isIvpbSessionDoseKind(input.doseKind)) {
    const blocked = ineligibleAction("NOT_IVPB_SESSION_DOSE_KIND");
    if (input.action) return blocked;
    return {
      doseStatus: null,
      start: blocked,
      stop: blocked,
      miss: blocked,
      hold: blocked,
    };
  }

  if (!isRecurringIvpbScheduleClassification(input.scheduleClassification)) {
    const blocked = ineligibleAction("NOT_RECURRING_IVPB_SCHEDULE");
    if (input.action) return blocked;
    return {
      doseStatus: null,
      start: blocked,
      stop: blocked,
      miss: blocked,
      hold: blocked,
    };
  }

  const status = parseMedicationDoseStatus(input.doseStatus);
  if (!status) {
    const blocked = ineligibleAction("INVALID_DOSE_STATUS");
    if (input.action) return blocked;
    return {
      doseStatus: null,
      start: blocked,
      stop: blocked,
      miss: blocked,
      hold: blocked,
    };
  }

  const metadata: IvpbDoseSessionEligibilityMetadata = {
    doseStatus: status,
    start: evaluateStartEligibility(status, input.infusionSessionId),
    stop: evaluateStopEligibility(status, input.infusionSessionId),
    miss: evaluateMissEligibility(status),
    hold: evaluateHoldEligibility(status),
  };

  if (input.action) {
    switch (input.action) {
      case "START":
        return metadata.start;
      case "STOP":
        return metadata.stop;
      case "MISS":
        return metadata.miss;
      case "HOLD":
        return metadata.hold;
      default: {
        const _exhaustive: never = input.action;
        return ineligibleAction("ACTION_NOT_APPLICABLE");
      }
    }
  }

  return metadata;
}

export function isIvpbDoseSessionActionEligible(
  input: EvaluateIvpbDoseSessionEligibilityInput & { action: IvpbDoseSessionAction }
): boolean {
  const result = evaluateIvpbDoseSessionEligibility(input);
  return "eligible" in result && result.eligible;
}
