/** MEDUI.ED.MAR.H9D — structured administration variance reconstruction from MAR notes. */

import {
  MAR_SCHEDULE_TIMING_NOTE_PREFIX,
  parseMarScheduleTimingReasonFromNotes,
} from "./marAdministrationSafetyGovernance.js";
import { normalizeMarMedicationTimingOverrideReasonCode } from "./marMedicationTimingOverrideGovernance.js";

export type MarScheduleTimingDocumentationParsed = {
  kind: "early" | "late" | null;
  minutesDelta: number | null;
  reasonCode: string | null;
  reasonDetail: string | null;
};

export type MarAdministrationVarianceReconstruction = {
  reasonCode: string | null;
  reasonDetail: string | null;
  documentedMinutesDelta: number | null;
  documentedKind: "early" | "late" | null;
};

/** Parses MAR_SCHEDULE_TIMING notes into structured variance justification fields. */
export function parseMarScheduleTimingDocumentationFromNotes(
  notes: string | null | undefined
): MarScheduleTimingDocumentationParsed | null {
  const trimmed = notes?.trim();
  if (!trimmed?.startsWith(MAR_SCHEDULE_TIMING_NOTE_PREFIX)) return null;

  const afterPrefix = trimmed.slice(MAR_SCHEDULE_TIMING_NOTE_PREFIX.length).trim();
  const match = afterPrefix.match(/^(EARLY|LATE)\s+(\d+)m\s+—\s+(.+)$/i);
  if (match) {
    const kind = match[1].toLowerCase() as "early" | "late";
    const minutesDelta = Number.parseInt(match[2], 10);
    const suffix = match[3].trim();
    if (suffix.startsWith("OTHER — ")) {
      return {
        kind,
        minutesDelta: Number.isFinite(minutesDelta) ? minutesDelta : null,
        reasonCode: "OTHER",
        reasonDetail: suffix.slice("OTHER — ".length).trim() || null,
      };
    }
    if (suffix.startsWith("OTHER - ")) {
      return {
        kind,
        minutesDelta: Number.isFinite(minutesDelta) ? minutesDelta : null,
        reasonCode: "OTHER",
        reasonDetail: suffix.slice("OTHER - ".length).trim() || null,
      };
    }
    const canonical = normalizeMarMedicationTimingOverrideReasonCode(suffix);
    return {
      kind,
      minutesDelta: Number.isFinite(minutesDelta) ? minutesDelta : null,
      reasonCode: canonical ?? suffix.toUpperCase(),
      reasonDetail: null,
    };
  }

  const legacy = parseMarScheduleTimingReasonFromNotes(notes);
  if (!legacy?.reasonCode) return null;
  const canonical = normalizeMarMedicationTimingOverrideReasonCode(legacy.reasonCode);
  return {
    kind: null,
    minutesDelta: null,
    reasonCode: canonical ?? legacy.reasonCode,
    reasonDetail: legacy.otherText,
  };
}

export function reconstructMarAdministrationVarianceFromNotes(
  notes: string | null | undefined
): MarAdministrationVarianceReconstruction | null {
  const parsed = parseMarScheduleTimingDocumentationFromNotes(notes);
  if (!parsed?.reasonCode) return null;
  return {
    reasonCode: parsed.reasonCode,
    reasonDetail: parsed.reasonDetail,
    documentedMinutesDelta: parsed.minutesDelta,
    documentedKind: parsed.kind,
  };
}
