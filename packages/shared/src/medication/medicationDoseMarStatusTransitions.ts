import type { MarClinicalAction } from "../mar/marClinicalAction.js";
import { marClinicalActionValues } from "../mar/marClinicalAction.js";
import type { MedicationDoseStatus } from "./medicationDoseStatus.js";
import {
  isTerminalMedicationDoseStatus,
  parseMedicationDoseStatus,
} from "./medicationDoseStatus.js";

export const MEDICATION_DOSE_MAR_TERMINAL_ACTIONS = [
  "administered",
  "refused",
  "not_available",
  "md_changed",
] as const satisfies readonly MarClinicalAction[];

export type MedicationDoseMarTerminalAction = (typeof MEDICATION_DOSE_MAR_TERMINAL_ACTIONS)[number];

export class MedicationDoseMarStatusTransitionError extends Error {
  constructor(
    public readonly code: MedicationDoseMarStatusTransitionErrorCode,
    message: string
  ) {
    super(message);
    this.name = "MedicationDoseMarStatusTransitionError";
  }
}

export const MEDICATION_DOSE_MAR_STATUS_TRANSITION_ERROR_CODES = [
  "DOSE_ALREADY_TERMINAL",
  "DOSE_STATUS_HELD",
  "UNSUPPORTED_MAR_ACTION",
  "INVALID_DOSE_STATUS",
] as const;

export type MedicationDoseMarStatusTransitionErrorCode =
  (typeof MEDICATION_DOSE_MAR_STATUS_TRANSITION_ERROR_CODES)[number];

export type ResolveDoseStatusAfterTerminalMarResult =
  | { ok: true; nextStatus: "COMPLETED" }
  | { ok: false; code: MedicationDoseMarStatusTransitionErrorCode; message: string };

const TERMINAL_MAR_ACTION_SET = new Set<string>(MEDICATION_DOSE_MAR_TERMINAL_ACTIONS);

/**
 * Maps a terminal MAR action to the post-administration dose status (M1.8B.7I audit).
 *
 * All terminal MAR actions resolve the dose occurrence to COMPLETED (order line stays active).
 */
export function resolveDoseStatusAfterTerminalMar(input: {
  marAction: MarClinicalAction | string;
  currentDoseStatus: MedicationDoseStatus | string;
}): ResolveDoseStatusAfterTerminalMarResult {
  const currentStatus = parseMedicationDoseStatus(input.currentDoseStatus);
  if (!currentStatus) {
    return {
      ok: false,
      code: "INVALID_DOSE_STATUS",
      message: `Invalid dose status: ${String(input.currentDoseStatus)}`,
    };
  }

  if (isTerminalMedicationDoseStatus(currentStatus)) {
    return {
      ok: false,
      code: "DOSE_ALREADY_TERMINAL",
      message: `Dose is already terminal (${currentStatus})`,
    };
  }

  if (currentStatus === "HELD") {
    return {
      ok: false,
      code: "DOSE_STATUS_HELD",
      message: "Dose is held and cannot receive MAR until released",
    };
  }

  const marAction = String(input.marAction).trim().toLowerCase();
  if (!TERMINAL_MAR_ACTION_SET.has(marAction)) {
    return {
      ok: false,
      code: "UNSUPPORTED_MAR_ACTION",
      message: `Unsupported MAR action for dose terminal transition: ${marAction}`,
    };
  }

  if (!(marClinicalActionValues as readonly string[]).includes(marAction)) {
    return {
      ok: false,
      code: "UNSUPPORTED_MAR_ACTION",
      message: `Unknown MAR action: ${marAction}`,
    };
  }

  return { ok: true, nextStatus: "COMPLETED" };
}

export function assertDoseStatusAfterTerminalMar(input: {
  marAction: MarClinicalAction | string;
  currentDoseStatus: MedicationDoseStatus | string;
}): "COMPLETED" {
  const result = resolveDoseStatusAfterTerminalMar(input);
  if (!result.ok) {
    throw new MedicationDoseMarStatusTransitionError(result.code, result.message);
  }
  return result.nextStatus;
}
