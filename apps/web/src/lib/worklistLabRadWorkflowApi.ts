import { apiFetch } from "@/lib/apiClient";
import {
  resolveWorklistItemWorkflowAction,
  worklistItemNeedsAcknowledge,
  worklistItemWorkflowActionPath,
  type WorklistItemWorkflowAction,
} from "@/lib/worklistLabRadUi";

export type WorklistWorkflowActionResult = {
  queued: boolean;
};

export function assertWorklistItemAllowsWorkflowAction(
  action: WorklistItemWorkflowAction,
  itemStatus: string | null | undefined
): void {
  const expected = resolveWorklistItemWorkflowAction(itemStatus);
  if (expected !== action) {
    throw new Error(`Workflow action ${action} blocked for status ${String(itemStatus ?? "")}`);
  }
  if (action === "acknowledge" && !worklistItemNeedsAcknowledge(itemStatus)) {
    throw new Error(`Acknowledge blocked for status ${String(itemStatus ?? "")}`);
  }
}

export async function postWorklistItemWorkflowAction(
  action: WorklistItemWorkflowAction,
  itemId: string,
  facilityId: string,
  itemStatus?: string | null
): Promise<WorklistWorkflowActionResult> {
  if (itemStatus != null) {
    assertWorklistItemAllowsWorkflowAction(action, itemStatus);
  }
  const res = await apiFetch(worklistItemWorkflowActionPath(action, itemId), {
    method: "POST",
    facilityId,
  });
  const queued =
    res && typeof res === "object" && !Array.isArray(res) && (res as { queued?: boolean }).queued === true;
  return { queued };
}
