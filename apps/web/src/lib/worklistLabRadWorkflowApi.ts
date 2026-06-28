import {
  mutateOrderItemLifecycleAction,
  type MutateOrderItemLifecycleOptions,
  type MutateOrderItemLifecycleResult,
} from "@/lib/mutateOrderItemLifecycleAction";
import type { WorklistItemWorkflowAction } from "@/lib/worklistLabRadUi";
import { worklistItemWorkflowActionPath } from "@/lib/worklistLabRadUi";

export type WorklistWorkflowActionResult = MutateOrderItemLifecycleResult;

export { worklistItemWorkflowActionPath };

/**
 * @deprecated Client-side pre-check removed — backend idempotent lifecycle handles stale clicks.
 */
export function assertWorklistItemAllowsWorkflowAction(
  _action: WorklistItemWorkflowAction,
  _itemStatus: string | null | undefined
): void {
  /* Intentionally no-op: MEDUI.ORDERS.UNIFIED_ORDER_ACTION_LIFECYCLE_FIX.1 */
}

export async function postWorklistItemWorkflowAction(
  action: WorklistItemWorkflowAction,
  itemId: string,
  facilityId: string,
  _itemStatus?: string | null,
  options?: MutateOrderItemLifecycleOptions
): Promise<WorklistWorkflowActionResult> {
  return mutateOrderItemLifecycleAction(action, itemId, facilityId, options);
}
