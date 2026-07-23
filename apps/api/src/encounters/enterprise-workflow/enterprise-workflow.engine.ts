/**
 * D4A.2.8 — Enterprise Workflow Engine (definition/template driven).
 */

import { Injectable } from "@nestjs/common";
import {
  BUILTIN_WORKFLOW_DEFINITIONS,
  createWorkflowFromDefinition,
  getWorkflowDefinition,
  type EnterpriseWorkflowOrchestrationDocV1,
  type WorkflowDefinitionV1,
} from "@medora/shared";
import { randomUUID } from "crypto";

@Injectable()
export class EnterpriseWorkflowEngine {
  listDefinitions(): WorkflowDefinitionV1[] {
    return BUILTIN_WORKFLOW_DEFINITIONS;
  }

  createFromTemplate(
    doc: EnterpriseWorkflowOrchestrationDocV1,
    definitionCode: string,
    ctx: {
      facilityId: string;
      patientId: string;
      hospitalEpisodeId: string | null;
      encounterId: string;
      actorUserId: string;
      clientExpectedVersion: number;
      nowIso: string;
      clientRequestId?: string | null;
    }
  ) {
    const definition = getWorkflowDefinition(definitionCode);
    if (!definition) {
      return { ok: false as const, code: "UNKNOWN_DEFINITION" as const };
    }
    const workflowInstanceId = randomUUID();
    return createWorkflowFromDefinition({
      doc,
      definition,
      facilityId: ctx.facilityId,
      patientId: ctx.patientId,
      hospitalEpisodeId: ctx.hospitalEpisodeId,
      encounterId: ctx.encounterId,
      workflowInstanceId,
      taskIdFactory: () => randomUUID(),
      nowIso: ctx.nowIso,
      actorUserId: ctx.actorUserId,
      clientRequestId: ctx.clientRequestId ?? null,
      clientExpectedVersion: ctx.clientExpectedVersion,
    });
  }
}
