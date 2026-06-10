import type { MedicationDoseStatus } from "./medicationDoseStatus.js";
import {
  isTerminalMedicationDoseStatus,
  parseMedicationDoseStatus,
} from "./medicationDoseStatus.js";
import type { IvpbDoseSessionAction } from "./ivpbDoseSessionEligibility.js";

export const IVPB_DOSE_STATUS_TRANSITION_REASONS = [
  "TRANSITION_ALLOWED",
  "INVALID_CURRENT_STATUS",
  "INVALID_TRANSITION",
  "DOSE_ALREADY_TERMINAL",
  "HELD_DOES_NOT_COMPLETE",
  "MISSED_DOES_NOT_RESTART",
] as const;

export type IvpbDoseStatusTransitionReason =
  (typeof IVPB_DOSE_STATUS_TRANSITION_REASONS)[number];

export type ResolveIvpbDoseStatusTransitionInput = {
  currentStatus: MedicationDoseStatus | string;
  action: IvpbDoseSessionAction;
};

export type ResolveIvpbDoseStatusTransitionResult =
  | { ok: true; nextStatus: MedicationDoseStatus; reason: "TRANSITION_ALLOWED" }
  | { ok: false; reason: IvpbDoseStatusTransitionReason; message: string };

const START_FROM: ReadonlySet<MedicationDoseStatus> = new Set(["DUE", "OVERDUE"]);
const MISS_FROM: ReadonlySet<MedicationDoseStatus> = new Set(["DUE", "OVERDUE"]);
const HOLD_FROM: ReadonlySet<MedicationDoseStatus> = new Set(["DUE", "OVERDUE"]);

/**
 * Resolves IVPB_SESSION dose status after nurse/clinical action (M1.8B.7J.1).
 *
 * Time-based PLANNED → DUE / DUE → OVERDUE remains in medicationDoseStatusPromotion.
 */
export function resolveIvpbDoseStatusTransition(
  input: ResolveIvpbDoseStatusTransitionInput
): ResolveIvpbDoseStatusTransitionResult {
  const current = parseMedicationDoseStatus(input.currentStatus);
  if (!current) {
    return {
      ok: false,
      reason: "INVALID_CURRENT_STATUS",
      message: `Invalid dose status: ${String(input.currentStatus)}`,
    };
  }

  if (isTerminalMedicationDoseStatus(current)) {
    return {
      ok: false,
      reason: "DOSE_ALREADY_TERMINAL",
      message: `Dose is already terminal (${current})`,
    };
  }

  switch (input.action) {
    case "START": {
      if (!START_FROM.has(current)) {
        if (current === "MISSED") {
          return {
            ok: false,
            reason: "MISSED_DOES_NOT_RESTART",
            message: "Missed IVPB dose cannot restart via START",
          };
        }
        return {
          ok: false,
          reason: "INVALID_TRANSITION",
          message: `START not allowed from ${current}`,
        };
      }
      return { ok: true, nextStatus: "IN_PROGRESS", reason: "TRANSITION_ALLOWED" };
    }
    case "STOP": {
      if (current !== "IN_PROGRESS") {
        return {
          ok: false,
          reason: "INVALID_TRANSITION",
          message: `STOP not allowed from ${current}`,
        };
      }
      return { ok: true, nextStatus: "COMPLETED", reason: "TRANSITION_ALLOWED" };
    }
    case "MISS": {
      if (!MISS_FROM.has(current)) {
        return {
          ok: false,
          reason: "INVALID_TRANSITION",
          message: `MISS not allowed from ${current}`,
        };
      }
      return { ok: true, nextStatus: "MISSED", reason: "TRANSITION_ALLOWED" };
    }
    case "HOLD": {
      if (!HOLD_FROM.has(current)) {
        return {
          ok: false,
          reason: "INVALID_TRANSITION",
          message: `HOLD not allowed from ${current}`,
        };
      }
      return { ok: true, nextStatus: "HELD", reason: "TRANSITION_ALLOWED" };
    }
    default: {
      const _exhaustive: never = input.action;
      return {
        ok: false,
        reason: "INVALID_TRANSITION",
        message: `Unsupported action: ${String(_exhaustive)}`,
      };
    }
  }
}

/** Guards forbidden transitions called out in M1.8B.7J audit. */
export function isForbiddenIvpbDoseStatusTransition(
  from: MedicationDoseStatus | string,
  to: MedicationDoseStatus | string
): boolean {
  const fromStatus = parseMedicationDoseStatus(from);
  const toStatus = parseMedicationDoseStatus(to);
  if (!fromStatus || !toStatus) return true;
  if (fromStatus === "COMPLETED" && toStatus === "IN_PROGRESS") return true;
  if (fromStatus === "MISSED" && toStatus === "IN_PROGRESS") return true;
  if (fromStatus === "HELD" && toStatus === "COMPLETED") return true;
  return false;
}
