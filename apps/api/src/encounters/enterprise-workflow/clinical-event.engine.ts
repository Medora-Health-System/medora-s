/**
 * D4A.2.8 — Clinical Event Engine.
 * Ingests clinical orchestration events and emits definition-driven workflow/task intents.
 * Does NOT hard-code hospital policy (reserved for D4A.2.8A Rules Engine).
 */

import { Injectable } from "@nestjs/common";
import {
  BUILTIN_WORKFLOW_DEFINITIONS,
  ingestClinicalOrchestrationEvent,
  type ClinicalOrchestrationEventType,
  type EnterpriseWorkflowOrchestrationDocV1,
} from "@medora/shared";
import { randomUUID } from "crypto";

@Injectable()
export class ClinicalEventEngine {
  ingest(
    doc: EnterpriseWorkflowOrchestrationDocV1,
    body: {
      eventId?: string;
      idempotencyKey: string;
      type: ClinicalOrchestrationEventType;
      facilityId: string;
      patientId: string;
      hospitalEpisodeId: string | null;
      encounterId: string;
      occurredAt?: string;
      payload?: Record<string, unknown> | null;
    },
    clientExpectedVersion: number,
    actorUserId: string,
    nowIso: string
  ) {
    return ingestClinicalOrchestrationEvent({
      doc,
      event: {
        eventId: body.eventId?.trim() || randomUUID(),
        idempotencyKey: body.idempotencyKey,
        type: body.type,
        facilityId: body.facilityId,
        patientId: body.patientId,
        hospitalEpisodeId: body.hospitalEpisodeId,
        encounterId: body.encounterId,
        occurredAt: body.occurredAt ?? nowIso,
        payload: body.payload ?? null,
        createdByUserId: actorUserId,
      },
      definitions: BUILTIN_WORKFLOW_DEFINITIONS,
      clientExpectedVersion,
      actorUserId,
      nowIso,
      idFactory: {
        workflowInstanceId: () => randomUUID(),
        taskId: () => randomUUID(),
      },
    });
  }
}
