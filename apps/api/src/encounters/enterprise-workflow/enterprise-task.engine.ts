/**
 * D4A.2.8 — Enterprise Task Engine (pure orchestration helpers over shared contracts).
 */

import { Injectable } from "@nestjs/common";
import {
  canCompleteTask,
  reassignEnterpriseWorkflowTask,
  upsertEnterpriseWorkflowTask,
  type EnterpriseTaskV1,
  type EnterpriseWorkflowOrchestrationDocV1,
} from "@medora/shared";

@Injectable()
export class EnterpriseTaskEngine {
  upsert(
    doc: EnterpriseWorkflowOrchestrationDocV1,
    task: EnterpriseTaskV1,
    clientExpectedVersion: number,
    actorUserId: string,
    nowIso: string
  ) {
    return upsertEnterpriseWorkflowTask({
      doc,
      task,
      clientExpectedVersion,
      actorUserId,
      nowIso,
      enforceDependencies: true,
    });
  }

  complete(
    doc: EnterpriseWorkflowOrchestrationDocV1,
    taskId: string,
    clientExpectedVersion: number,
    actorUserId: string,
    nowIso: string
  ) {
    const existing = doc.tasks.find((t) => t.taskId === taskId);
    if (!existing) return { ok: false as const, code: "TASK_NOT_FOUND" as const };
    const gate = canCompleteTask(existing, doc.tasks);
    if (!gate.ok) return gate;
    return upsertEnterpriseWorkflowTask({
      doc,
      task: {
        ...existing,
        status: "COMPLETED",
        completedAt: nowIso,
        startedAt: existing.startedAt ?? nowIso,
      },
      clientExpectedVersion,
      actorUserId,
      nowIso,
    });
  }

  reassign(
    doc: EnterpriseWorkflowOrchestrationDocV1,
    taskId: string,
    assignedToUserId: string | null,
    clientExpectedVersion: number,
    actorUserId: string,
    nowIso: string,
    assignedToRole?: string | null
  ) {
    return reassignEnterpriseWorkflowTask({
      doc,
      taskId,
      assignedToUserId,
      assignedToRole,
      clientExpectedVersion,
      actorUserId,
      nowIso,
    });
  }
}
