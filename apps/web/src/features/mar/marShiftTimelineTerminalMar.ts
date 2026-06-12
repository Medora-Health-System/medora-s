import {
  buildMarShiftTimelineHoldNotes,
  buildMarShiftTimelineRefuseNotes,
  marShiftTimelineTerminalMarActionForDrawerAction,
  type MarShiftTimelineHoldReasonCode,
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
 * Submit REFUSE/HOLD from MAR shift timeline drawer.
 * `apiFetch` returns parsed JSON (or null) and throws on HTTP errors — never a Response (K.10B.4).
 */
export async function submitMarShiftTimelineTerminalMar(
  encounterId: string,
  facilityId: string,
  item: MarShiftTimelineCellItem,
  action: "REFUSE" | "HOLD",
  input: MarShiftTimelineTerminalMarInput
): Promise<void> {
  const marAction = marShiftTimelineTerminalMarActionForDrawerAction(action);
  const notes =
    action === "REFUSE"
      ? buildMarShiftTimelineRefuseNotes(
          input.reasonCode as MarShiftTimelineRefuseReasonCode,
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
