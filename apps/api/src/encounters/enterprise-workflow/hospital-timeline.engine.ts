/**
 * D4A.2.8 — Enterprise Hospital Timeline Engine.
 */

import { Injectable } from "@nestjs/common";
import {
  appendTimelineEntry,
  filterTimeline,
  type EnterpriseTaskTypeV1,
  type EnterpriseWorkflowDepartment,
  type EnterpriseWorkflowOrchestrationDocV1,
  type HospitalTimelineEntryV1,
} from "@medora/shared";

@Injectable()
export class HospitalTimelineEngine {
  list(
    doc: EnterpriseWorkflowOrchestrationDocV1,
    filters: {
      department?: EnterpriseWorkflowDepartment | null;
      roleHint?: string | null;
      workflowInstanceId?: string | null;
      taskType?: EnterpriseTaskTypeV1 | null;
    }
  ): HospitalTimelineEntryV1[] {
    return filterTimeline(doc.timeline, filters);
  }

  append(
    doc: EnterpriseWorkflowOrchestrationDocV1,
    entry: HospitalTimelineEntryV1
  ): EnterpriseWorkflowOrchestrationDocV1 {
    return appendTimelineEntry(doc, entry);
  }
}
