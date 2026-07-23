/**
 * D4A.2.8A — Applies rule action intents through existing D4A.2.8 engines.
 * No parallel task/workflow store.
 */

import { Injectable } from "@nestjs/common";
import {
  appendTimelineEntry,
  bumpDoc,
  createWorkflowFromDefinition,
  getWorkflowDefinition,
  openEscalationFromTemplate,
  upsertEnterpriseWorkflowTask,
  type ClinicalRuleActionV1,
  type ClinicalRuleEvaluationResultV1,
  type EnterpriseTaskV1,
  type EnterpriseWorkflowOrchestrationDocV1,
  type EscalationChainTemplateCode,
  type WorkflowNotificationV1,
} from "@medora/shared";
import { randomUUID } from "crypto";
import { EnterpriseWorkflowEngine } from "./enterprise-workflow.engine";

@Injectable()
export class ClinicalRulesActionAdapter {
  constructor(private readonly workflowEngine: EnterpriseWorkflowEngine) {}

  /**
   * Apply rule actions onto an orchestration doc using existing engines/helpers.
   * Simulation must not call this (or call with dryRun=true).
   */
  applyActions(input: {
    doc: EnterpriseWorkflowOrchestrationDocV1;
    actions: ClinicalRuleActionV1[];
    evaluation: ClinicalRuleEvaluationResultV1;
    facilityId: string;
    patientId: string;
    hospitalEpisodeId: string | null;
    encounterId: string;
    actorUserId: string;
    nowIso: string;
    sourceEventId?: string | null;
    dryRun?: boolean;
  }): {
    doc: EnterpriseWorkflowOrchestrationDocV1;
    appliedActionTypes: string[];
    skipped: Array<{ type: string; reason: string }>;
  } {
    if (input.dryRun || input.evaluation.simulated) {
      return {
        doc: input.doc,
        appliedActionTypes: input.actions.map((a) => a.type),
        skipped: input.actions.map((a) => ({
          type: a.type,
          reason: "SIMULATED",
        })),
      };
    }

    let doc = input.doc;
    let versionCursor = doc.expectedVersion;
    const appliedActionTypes: string[] = [];
    const skipped: Array<{ type: string; reason: string }> = [];

    for (const action of input.actions) {
      switch (action.type) {
        case "CREATE_WORKFLOW": {
          const code = action.workflowDefinitionCode?.trim();
          if (!code) {
            skipped.push({ type: action.type, reason: "MISSING_DEFINITION" });
            break;
          }
          const already = doc.workflows.some(
            (w) =>
              w.definitionCode === code &&
              w.status === "ACTIVE" &&
              w.sourceEventId === input.sourceEventId
          );
          if (already) {
            skipped.push({ type: action.type, reason: "ALREADY_STARTED" });
            break;
          }
          const def =
            getWorkflowDefinition(code) ??
            this.workflowEngine.listDefinitions().find((d) => d.definitionCode === code) ??
            null;
          if (!def) {
            skipped.push({ type: action.type, reason: "UNKNOWN_DEFINITION" });
            break;
          }
          const created = createWorkflowFromDefinition({
            doc,
            definition: def,
            facilityId: input.facilityId,
            patientId: input.patientId,
            hospitalEpisodeId: input.hospitalEpisodeId,
            encounterId: input.encounterId,
            workflowInstanceId: randomUUID(),
            taskIdFactory: () => randomUUID(),
            nowIso: input.nowIso,
            actorUserId: input.actorUserId,
            sourceEventId: input.sourceEventId ?? null,
            clientExpectedVersion: versionCursor,
          });
          if (!created.ok) {
            skipped.push({ type: action.type, reason: created.code });
            break;
          }
          doc = created.doc;
          versionCursor = doc.expectedVersion;
          appliedActionTypes.push(action.type);
          break;
        }
        case "CREATE_TASK": {
          const task: EnterpriseTaskV1 = {
            taskId: randomUUID(),
            workflowInstanceId: null,
            facilityId: input.facilityId,
            patientId: input.patientId,
            hospitalEpisodeId: input.hospitalEpisodeId,
            encounterId: input.encounterId,
            type: action.taskType ?? "OTHER",
            title: action.taskTitle ?? action.message ?? "Rule task",
            department: action.department ?? "RN",
            priority: action.taskPriority ?? "ROUTINE",
            status: "PENDING",
            dependencies: [],
            sourceEventId: input.sourceEventId ?? null,
            sourceDefinitionCode: `RULE:${action.actionId}`,
            createdAt: input.nowIso,
            updatedAt: input.nowIso,
            createdByUserId: input.actorUserId,
            updatedByUserId: input.actorUserId,
            version: 1,
            dueAt:
              action.slaMinutes != null
                ? new Date(
                    new Date(input.nowIso).getTime() + action.slaMinutes * 60_000
                  ).toISOString()
                : null,
          };
          const upserted = upsertEnterpriseWorkflowTask({
            doc,
            task,
            clientExpectedVersion: versionCursor,
            actorUserId: input.actorUserId,
            nowIso: input.nowIso,
          });
          if (!upserted.ok) {
            skipped.push({ type: action.type, reason: upserted.code });
            break;
          }
          doc = upserted.doc;
          versionCursor = doc.expectedVersion;
          appliedActionTypes.push(action.type);
          break;
        }
        case "ASSIGN_TASK": {
          // Soft assign: create observer notification when no task id in action payload.
          skipped.push({ type: action.type, reason: "NO_TARGET_TASK_IN_MVP" });
          break;
        }
        case "NOTIFY": {
          const notification: WorkflowNotificationV1 = {
            notificationId: randomUUID(),
            channel: "WORKFLOW",
            targetDepartment: action.department ?? "PROVIDER",
            title: action.message ?? "Rule notification",
            summary: action.message ?? "Clinical rule notification",
            relatedTaskId: null,
            relatedWorkflowInstanceId: null,
            relatedEscalationId: null,
            createdAt: input.nowIso,
            facilityId: input.facilityId,
            encounterId: input.encounterId,
            patientId: input.patientId,
          };
          doc = bumpDoc(
            { ...doc, notifications: [...doc.notifications, notification] },
            input.actorUserId,
            input.nowIso
          );
          versionCursor = doc.expectedVersion;
          doc = appendTimelineEntry(doc, {
            entryId: `tl-rule-notify-${notification.notificationId}`,
            dedupeKey: `notification:rule:${notification.notificationId}`,
            kind: "NOTIFICATION",
            at: input.nowIso,
            facilityId: input.facilityId,
            patientId: input.patientId,
            hospitalEpisodeId: input.hospitalEpisodeId,
            encounterId: input.encounterId,
            department: notification.targetDepartment,
            relatedNotificationId: notification.notificationId,
            relatedEventId: input.sourceEventId ?? null,
            title: notification.title,
            summary: "Rule NOTIFY",
          });
          appliedActionTypes.push(action.type);
          break;
        }
        case "ESCALATE": {
          const templateCode = (action.escalationTemplateCode ??
            "CRITICAL_RESULT") as EscalationChainTemplateCode;
          const esc = openEscalationFromTemplate({
            doc,
            templateCode,
            facilityId: input.facilityId,
            patientId: input.patientId,
            hospitalEpisodeId: input.hospitalEpisodeId,
            encounterId: input.encounterId,
            escalationId: randomUUID(),
            summary: action.message ?? `Rule escalation (${templateCode})`,
            relatedEventId: input.sourceEventId ?? null,
            clientExpectedVersion: versionCursor,
            actorUserId: input.actorUserId,
            nowIso: input.nowIso,
          });
          if (!esc.ok) {
            skipped.push({ type: action.type, reason: esc.code });
            break;
          }
          doc = esc.doc;
          versionCursor = doc.expectedVersion;
          appliedActionTypes.push(action.type);
          break;
        }
        case "SLA_TIMER": {
          // Represented as dueAt on a follow-up documentation task when minutes provided.
          if (action.slaMinutes == null) {
            skipped.push({ type: action.type, reason: "MISSING_MINUTES" });
            break;
          }
          const task: EnterpriseTaskV1 = {
            taskId: randomUUID(),
            workflowInstanceId: null,
            facilityId: input.facilityId,
            patientId: input.patientId,
            hospitalEpisodeId: input.hospitalEpisodeId,
            encounterId: input.encounterId,
            type: "ESCALATION_FOLLOW_UP",
            title: action.message ?? `SLA ${action.slaMinutes} min`,
            department: action.department ?? "RN",
            priority: "URGENT",
            status: "PENDING",
            dependencies: [],
            sourceEventId: input.sourceEventId ?? null,
            sourceDefinitionCode: `RULE_SLA:${action.actionId}`,
            dueAt: new Date(
              new Date(input.nowIso).getTime() + action.slaMinutes * 60_000
            ).toISOString(),
            createdAt: input.nowIso,
            updatedAt: input.nowIso,
            createdByUserId: input.actorUserId,
            updatedByUserId: input.actorUserId,
            version: 1,
          };
          const upserted = upsertEnterpriseWorkflowTask({
            doc,
            task,
            clientExpectedVersion: versionCursor,
            actorUserId: input.actorUserId,
            nowIso: input.nowIso,
          });
          if (!upserted.ok) {
            skipped.push({ type: action.type, reason: upserted.code });
            break;
          }
          doc = upserted.doc;
          versionCursor = doc.expectedVersion;
          appliedActionTypes.push(action.type);
          break;
        }
        case "TIMELINE": {
          doc = appendTimelineEntry(doc, {
            entryId: `tl-rule-${action.actionId}-${randomUUID()}`,
            dedupeKey: `rule:timeline:${action.actionId}:${input.sourceEventId ?? input.nowIso}`,
            kind: "AUDIT_MIRROR",
            at: input.nowIso,
            facilityId: input.facilityId,
            patientId: input.patientId,
            hospitalEpisodeId: input.hospitalEpisodeId,
            encounterId: input.encounterId,
            relatedEventId: input.sourceEventId ?? null,
            title: action.timelineTitle ?? action.message ?? "Clinical rule",
            summary: `Rule action ${action.type}`,
          });
          // appendTimelineEntry does not bump expectedVersion — bump explicitly
          doc = bumpDoc(doc, input.actorUserId, input.nowIso);
          versionCursor = doc.expectedVersion;
          appliedActionTypes.push(action.type);
          break;
        }
        case "FLAG":
        case "REQUIRE_ACK":
        case "REQUIRE_SIGNATURE":
        case "REQUIRE_DOCS":
        case "QUALITY_MEASURE":
        case "AUDIT": {
          doc = appendTimelineEntry(doc, {
            entryId: `tl-rule-flag-${action.actionId}-${randomUUID()}`,
            dedupeKey: `rule:${action.type}:${action.actionId}:${input.sourceEventId ?? input.nowIso}`,
            kind: "AUDIT_MIRROR",
            at: input.nowIso,
            facilityId: input.facilityId,
            patientId: input.patientId,
            hospitalEpisodeId: input.hospitalEpisodeId,
            encounterId: input.encounterId,
            relatedEventId: input.sourceEventId ?? null,
            title: `${action.type}: ${action.flagCode ?? action.qualityMeasureCode ?? action.message ?? action.actionId}`,
            summary: action.requireDocCodes?.join(",") ?? action.message ?? null,
          });
          doc = bumpDoc(doc, input.actorUserId, input.nowIso);
          versionCursor = doc.expectedVersion;
          appliedActionTypes.push(action.type);
          break;
        }
        case "STOP":
          appliedActionTypes.push(action.type);
          break;
        default:
          skipped.push({ type: action.type, reason: "UNSUPPORTED" });
      }
    }

    return { doc, appliedActionTypes, skipped };
  }
}
