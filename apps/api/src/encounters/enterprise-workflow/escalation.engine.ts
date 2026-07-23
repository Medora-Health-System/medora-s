/**
 * D4A.2.8 — Escalation Engine (configurable chain structure + timer placeholders).
 */

import { Injectable } from "@nestjs/common";
import {
  BUILTIN_ESCALATION_TEMPLATES,
  advanceEscalation,
  openEscalationFromTemplate,
  type EscalationChainTemplateCode,
  type EscalationInstanceStatusV1,
  type EnterpriseWorkflowOrchestrationDocV1,
} from "@medora/shared";
import { randomUUID } from "crypto";

@Injectable()
export class EscalationEngine {
  listTemplates() {
    return BUILTIN_ESCALATION_TEMPLATES;
  }

  open(
    doc: EnterpriseWorkflowOrchestrationDocV1,
    body: {
      templateCode: EscalationChainTemplateCode;
      facilityId: string;
      patientId: string;
      hospitalEpisodeId: string | null;
      encounterId: string;
      summary: string;
      relatedTaskId?: string | null;
      relatedWorkflowInstanceId?: string | null;
      relatedEventId?: string | null;
      escalationId?: string;
      clientRequestId?: string | null;
    },
    clientExpectedVersion: number,
    actorUserId: string,
    nowIso: string
  ) {
    return openEscalationFromTemplate({
      doc,
      templateCode: body.templateCode,
      facilityId: body.facilityId,
      patientId: body.patientId,
      hospitalEpisodeId: body.hospitalEpisodeId,
      encounterId: body.encounterId,
      escalationId: body.escalationId?.trim() || randomUUID(),
      summary: body.summary,
      relatedTaskId: body.relatedTaskId ?? null,
      relatedWorkflowInstanceId: body.relatedWorkflowInstanceId ?? null,
      relatedEventId: body.relatedEventId ?? null,
      clientExpectedVersion,
      actorUserId,
      nowIso,
      clientRequestId: body.clientRequestId ?? null,
    });
  }

  advance(
    doc: EnterpriseWorkflowOrchestrationDocV1,
    escalationId: string,
    nextStatus: EscalationInstanceStatusV1,
    clientExpectedVersion: number,
    actorUserId: string,
    nowIso: string,
    note?: string | null
  ) {
    return advanceEscalation(
      doc,
      escalationId,
      nextStatus,
      clientExpectedVersion,
      actorUserId,
      nowIso,
      note
    );
  }
}
