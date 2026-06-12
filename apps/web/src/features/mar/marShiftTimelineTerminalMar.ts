import {
  buildMarShiftTimelineHoldNotes,
  buildMarShiftTimelineMissedNotes,
  buildMarShiftTimelineRefuseNotes,
  marShiftTimelineTerminalMarActionForDrawerAction,
  type MarShiftTimelineHoldReasonCode,
  type MarShiftTimelineMissedReasonCode,
  type MarShiftTimelineRefuseReasonCode,
} from "@medora/shared";
import { apiFetch } from "@/lib/apiClient";
import type { MarShiftTimelineCellItem } from "@/lib/marShiftTimelineApi";

export type MarShiftTimelineTerminalMarInput = {
  reasonCode: string;
  otherText?: string;
  administeredAtIso: string;
};

/**
 * Submit REFUSE/HOLD/MARK_MISSED from MAR shift timeline drawer.
 * `apiFetch` returns parsed JSON (or null) and throws on HTTP errors — never a Response (K.10B.4).
 */
export async function submitMarShiftTimelineTerminalMar(
  encounterId: string,
  facilityId: string,
  item: MarShiftTimelineCellItem,
  action: "REFUSE" | "HOLD" | "MARK_MISSED",
  input: MarShiftTimelineTerminalMarInput
): Promise<void> {
  const marAction = marShiftTimelineTerminalMarActionForDrawerAction(action);
  const notes =
    action === "REFUSE"
      ? buildMarShiftTimelineRefuseNotes(
          input.reasonCode as MarShiftTimelineRefuseReasonCode,
          input.otherText
        )
      : action === "MARK_MISSED"
        ? buildMarShiftTimelineMissedNotes(
            input.reasonCode as MarShiftTimelineMissedReasonCode,
            input.otherText
          )
        : buildMarShiftTimelineHoldNotes(
            input.reasonCode as MarShiftTimelineHoldReasonCode,
            input.otherText
          );

  await apiFetch(`/encounters/${encounterId}/medication-administrations`, {
    facilityId,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderItemId: item.orderItemId,
      marAction,
      notes,
      administeredAt: input.administeredAtIso,
      ...(item.medicationDoseInstanceId?.trim()
        ? { medicationDoseInstanceId: item.medicationDoseInstanceId }
        : {}),
    }),
  });
}
