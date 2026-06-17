import { isMarShiftTimelineHoldNotes } from "../medication/marShiftTimelineTerminalActions.js";
import {
  isMarMissedDoseNotes,
  parseMarMissedDoseReasonFromNotes,
} from "./marAdministrationSafetyGovernance.js";
import { resolveMedicationMarActionFromStorage } from "./marClinicalAction.js";
import {
  medicationAdministrationRowIsInfusionStart,
  medicationAdministrationRowIsInfusionStop,
} from "./medicationAdministrationInfusionMar.js";
import { parseMedicationInfusionStopReasonFromNotes } from "../medication/medicationInfusionStopReasonGovernance.js";
import {
  buildMedicationAdministrationHistoryCorrectionId,
  parseMedicationAdministrationCorrectionReasonFields,
  resolveMedicationAdministrationCorrectionEffectiveChangeSummary,
  type MedicationAdministrationCorrectionSourceRow,
} from "./medicationAdministrationCorrectionGovernance.js";
import {
  isPrnMedicationOrder,
  parseMarPrnAdministrationFromNotes,
} from "./medicationAdministrationPrnGovernance.js";
import {
  buildMedicationAdministrationHistoryOrderCancelId,
  type MedicationAdministrationHistoryEntry,
  type MedicationAdministrationHistoryEventType,
  type MedicationAdministrationHistoryMarSourceRow,
  type MedicationAdministrationHistoryOrderCancelSourceRow,
} from "./medicationAdministrationHistory.js";

const REFUSED_NOTES_PREFIX = "Refused:";

export type ParsedMarTerminalReason = {
  reasonCode: string | null;
  reasonDetail: string | null;
};

function toIso(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

function formatPerformerDisplay(
  firstName: string | null | undefined,
  lastName: string | null | undefined
): string | null {
  const parts = [firstName?.trim(), lastName?.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}

function formatDoseDisplay(
  doseValue: string | number | null | undefined,
  doseUnit: string | null | undefined
): string | null {
  const value =
    doseValue == null
      ? null
      : typeof doseValue === "number"
        ? String(doseValue)
        : doseValue.trim();
  const unit = doseUnit?.trim() || null;
  if (value && unit) return `${value} ${unit}`;
  return value || unit || null;
}

function parseRefusedReasonFromNotes(notes: string | null | undefined): ParsedMarTerminalReason {
  const trimmed = notes?.trim();
  if (!trimmed?.toLowerCase().startsWith(REFUSED_NOTES_PREFIX.toLowerCase())) {
    return { reasonCode: null, reasonDetail: null };
  }
  const body = trimmed.slice(REFUSED_NOTES_PREFIX.length).trim();
  if (!body) return { reasonCode: null, reasonDetail: null };
  if (body.startsWith("OTHER — ")) {
    return { reasonCode: "OTHER", reasonDetail: body.slice("OTHER — ".length).trim() || null };
  }
  if (body.startsWith("OTHER - ")) {
    return { reasonCode: "OTHER", reasonDetail: body.slice("OTHER - ".length).trim() || null };
  }
  return { reasonCode: body.trim().toUpperCase(), reasonDetail: null };
}

function parseHeldReasonFromNotes(notes: string | null | undefined): ParsedMarTerminalReason {
  if (!isMarShiftTimelineHoldNotes(notes)) {
    return { reasonCode: null, reasonDetail: null };
  }
  const body = notes!.trim().slice("Held:".length).trim();
  if (!body) return { reasonCode: null, reasonDetail: null };
  if (body.startsWith("OTHER — ")) {
    return { reasonCode: "OTHER", reasonDetail: body.slice("OTHER — ".length).trim() || null };
  }
  if (body.startsWith("OTHER - ")) {
    return { reasonCode: "OTHER", reasonDetail: body.slice("OTHER - ".length).trim() || null };
  }
  return { reasonCode: body.trim().toUpperCase(), reasonDetail: null };
}

function rowHasPrnMetadata(input: {
  notes?: string | null;
  frequencyCode?: string | null;
  directionsSig?: string | null;
}): boolean {
  const parsed = parseMarPrnAdministrationFromNotes(input.notes);
  if (parsed.reasonCode || parsed.indication || parsed.reasonLabel) return true;
  return isPrnMedicationOrder({
    frequencyCode: input.frequencyCode ?? null,
    directionsSig: input.directionsSig ?? null,
  });
}

/** Map MAR persistence fields to normalized history event type (MEDUI.ED.MAR.H2B). */
export function resolveMedicationAdministrationHistoryEventType(input: {
  marAction?: string | null;
  notes?: string | null;
  infusionPhase?: string | null;
  frequencyCode?: string | null;
  directionsSig?: string | null;
}): MedicationAdministrationHistoryEventType {
  if (input.infusionPhase === "INFUSION_START" || medicationAdministrationRowIsInfusionStart(input.notes, input.infusionPhase)) {
    return "INFUSION_START";
  }
  if (input.infusionPhase === "INFUSION_STOP" || medicationAdministrationRowIsInfusionStop(input.notes, input.infusionPhase)) {
    return "INFUSION_STOP";
  }

  const marAction = resolveMedicationMarActionFromStorage({
    marAction: input.marAction ?? null,
    notes: input.notes,
  });

  if (marAction === "refused") return "REFUSED";
  if (marAction === "not_available") {
    return isMarMissedDoseNotes(input.notes) ? "MISSED" : "NOT_AVAILABLE";
  }
  if (marAction === "md_changed") {
    return isMarShiftTimelineHoldNotes(input.notes) ? "HELD" : "MD_CHANGED";
  }
  if (marAction === "administered") {
    return rowHasPrnMetadata(input) ? "PRN_ADMINISTERED" : "ADMINISTERED";
  }
  return "ADMINISTERED";
}

export function resolveMedicationAdministrationHistoryReasonFields(input: {
  eventType: MedicationAdministrationHistoryEventType;
  notes?: string | null;
  effectiveAdministeredAtReason?: string | null;
}): ParsedMarTerminalReason {
  if (input.eventType === "REFUSED") {
    return parseRefusedReasonFromNotes(input.notes);
  }
  if (input.eventType === "HELD") {
    return parseHeldReasonFromNotes(input.notes);
  }
  if (input.eventType === "MISSED") {
    const parsed = parseMarMissedDoseReasonFromNotes(input.notes);
    return parsed
      ? { reasonCode: parsed.reasonCode, reasonDetail: parsed.otherText }
      : { reasonCode: null, reasonDetail: null };
  }
  if (input.eventType === "PRN_ADMINISTERED") {
    const parsed = parseMarPrnAdministrationFromNotes(input.notes);
    return {
      reasonCode: parsed.reasonCode,
      reasonDetail: parsed.reasonLabel,
    };
  }
  if (input.eventType === "INFUSION_STOP") {
    return parseMedicationInfusionStopReasonFromNotes(input.notes);
  }
  if (input.effectiveAdministeredAtReason?.trim()) {
    const parsed = parseMedicationAdministrationCorrectionReasonFields(
      input.effectiveAdministeredAtReason
    );
    if (parsed.reasonCode) {
      return parsed;
    }
    return { reasonCode: "EFFECTIVE_TIME_ADJUSTMENT", reasonDetail: input.effectiveAdministeredAtReason.trim() };
  }
  return { reasonCode: null, reasonDetail: null };
}

export function resolveMedicationAdministrationHistoryEffectiveTimes(input: {
  administeredAt: Date | string;
  effectiveAdministeredAt?: Date | string | null;
}): { eventAt: string; documentedAt: string | null } {
  const administeredIso = toIso(input.administeredAt);
  const effectiveRaw = input.effectiveAdministeredAt;
  if (!effectiveRaw) {
    return { eventAt: administeredIso, documentedAt: null };
  }
  const effectiveIso = toIso(effectiveRaw);
  if (effectiveIso === administeredIso) {
    return { eventAt: administeredIso, documentedAt: null };
  }
  return { eventAt: effectiveIso, documentedAt: administeredIso };
}

export function normalizeMedicationAdministrationHistoryMarRow(
  row: MedicationAdministrationHistoryMarSourceRow & {
    effectiveAdministeredAtReason?: string | null;
  }
): MedicationAdministrationHistoryEntry {
  const eventType = resolveMedicationAdministrationHistoryEventType({
    marAction: row.marAction,
    notes: row.notes,
    infusionPhase: row.infusionPhase,
    frequencyCode: row.orderItemFrequencyCode,
    directionsSig: row.orderItemDirectionsSig,
  });
  const { eventAt, documentedAt } = resolveMedicationAdministrationHistoryEffectiveTimes({
    administeredAt: row.administeredAt,
    effectiveAdministeredAt: row.effectiveAdministeredAt,
  });
  const reason = resolveMedicationAdministrationHistoryReasonFields({
    eventType,
    notes: row.notes,
    effectiveAdministeredAtReason: row.effectiveAdministeredAtReason,
  });
  const prnParsed = parseMarPrnAdministrationFromNotes(row.notes);
  const isPrn = eventType === "PRN_ADMINISTERED";
  const infusionPhase =
    eventType === "INFUSION_START"
      ? "INFUSION_START"
      : eventType === "INFUSION_STOP"
        ? "INFUSION_STOP"
        : null;

  return {
    id: row.id,
    source: "MAR",
    encounterId: row.encounterId,
    orderItemId: row.orderItemId,
    medicationLabel: row.medicationLabelSnapshot?.trim() || "Medication",
    doseDisplay: formatDoseDisplay(row.doseValue, row.doseUnit),
    route: row.route?.trim() || null,
    eventType,
    eventAt,
    documentedAt,
    performedByDisplay: formatPerformerDisplay(row.performedByFirstName, row.performedByLastName),
    performedByRole: row.performedByRole?.trim() || null,
    reasonCode: reason.reasonCode,
    reasonDetail: reason.reasonDetail,
    isPrn,
    prnIndication: prnParsed.indication ?? prnParsed.reasonLabel,
    infusionPhase,
    medicationDoseInstanceId: row.medicationDoseInstanceId?.trim() || null,
    readOnly: true,
  };
}

export function normalizeMedicationAdministrationHistoryOrderCancelRow(
  row: MedicationAdministrationHistoryOrderCancelSourceRow
): MedicationAdministrationHistoryEntry {
  const isPrn = isPrnMedicationOrder({
    frequencyCode: row.frequencyCode ?? null,
    directionsSig: row.directionsSig ?? null,
  });

  return {
    id: buildMedicationAdministrationHistoryOrderCancelId(row.orderItemId, row.orderEventId),
    source: "ORDER_CANCEL",
    encounterId: row.encounterId,
    orderItemId: row.orderItemId,
    medicationLabel: row.medicationLabel,
    doseDisplay: row.doseDisplay,
    route: row.route,
    eventType: "ORDER_CANCELED",
    eventAt: toIso(row.cancelledAt),
    documentedAt: null,
    performedByDisplay: row.performedByDisplay,
    performedByRole: row.performedByRole?.trim() || null,
    reasonCode: row.cancellationReason?.trim() || null,
    reasonDetail: row.cancellationDetails?.trim() || null,
    isPrn,
    prnIndication: null,
    infusionPhase: null,
    medicationDoseInstanceId: null,
    readOnly: true,
  };
}

export function normalizeMedicationAdministrationHistoryCorrectionRow(
  row: MedicationAdministrationCorrectionSourceRow
): MedicationAdministrationHistoryEntry {
  const reason = parseMedicationAdministrationCorrectionReasonFields(row.correctionReason);
  const performer = formatPerformerDisplay(row.correctedByFirstName, row.correctedByLastName);

  return {
    id: buildMedicationAdministrationHistoryCorrectionId(row.id),
    source: "MAR_CORRECTION",
    encounterId: row.encounterId,
    orderItemId: row.orderItemId,
    medicationLabel: row.medicationLabel?.trim() || "Medication",
    doseDisplay: row.doseDisplay?.trim() || null,
    route: row.route?.trim() || null,
    eventType: "ADMINISTRATION_CORRECTION",
    eventAt: toIso(row.createdAt),
    documentedAt: null,
    performedByDisplay: performer,
    performedByRole: row.correctedByRole?.trim() || null,
    reasonCode: reason.reasonCode,
    reasonDetail: reason.reasonDetail,
    isPrn: false,
    prnIndication: null,
    infusionPhase: null,
    medicationDoseInstanceId: null,
    originalAdministrationId: row.medicationAdministrationId,
    effectiveChangeSummary: resolveMedicationAdministrationCorrectionEffectiveChangeSummary({
      previousValues: row.previousValues,
      correctedValues: row.correctedValues,
    }),
    readOnly: true,
  };
}
