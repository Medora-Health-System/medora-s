/**
 * D4A.2.8 — Enterprise Workflow & Task Orchestration facade.
 * Persists JSON bag on Encounter.admissionSummaryJson (zero migration).
 * UI must call these APIs only — no workflow logic in React pages.
 */

import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { AuditAction, Prisma } from "@prisma/client";
import {
  ENTERPRISE_WORKFLOW_DEPARTMENTS,
  ENTERPRISE_WORKFLOW_ENGINE_CERTIFICATION_ID,
  aggregateAdminDashboard,
  buildDepartmentWorklist,
  hospitalEpisodeFoundationEnabledFromProcessEnv,
  mergeEnterpriseWorkflowOrchestrationIntoSummary,
  readEnterpriseWorkflowOrchestrationDoc,
  type EnterpriseTaskV1,
  type EnterpriseWorkflowDepartment,
  type EnterpriseWorkflowOrchestrationDocV1,
  type EscalationChainTemplateCode,
  type EscalationInstanceStatusV1,
  type ClinicalOrchestrationEventType,
} from "@medora/shared";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../../common/services/audit.service";
import { HospitalCensusService } from "../hospital-census.service";
import { EnterpriseTaskEngine } from "./enterprise-task.engine";
import { EnterpriseWorkflowEngine } from "./enterprise-workflow.engine";
import { ClinicalEventEngine } from "./clinical-event.engine";
import { EscalationEngine } from "./escalation.engine";
import { HospitalTimelineEngine } from "./hospital-timeline.engine";
import { ClinicalRulesOrchestrationService } from "./clinical-rules-orchestration.service";

const CENSUS_SCAN_LIMIT = 120;

@Injectable()
export class EnterpriseWorkflowOrchestrationService {
  private readonly logger = new Logger(EnterpriseWorkflowOrchestrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly hospitalCensus: HospitalCensusService,
    private readonly taskEngine: EnterpriseTaskEngine,
    private readonly workflowEngine: EnterpriseWorkflowEngine,
    private readonly eventEngine: ClinicalEventEngine,
    private readonly escalationEngine: EscalationEngine,
    private readonly timelineEngine: HospitalTimelineEngine,
    private readonly clinicalRules: ClinicalRulesOrchestrationService
  ) {}

  private async loadEncounterBag(facilityId: string, encounterId: string) {
    // D4A.2.8-HF1: never select Encounter.hospitalEpisodeId when foundation OFF (P2022).
    const foundationOn = hospitalEpisodeFoundationEnabledFromProcessEnv();
    const enc = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: foundationOn
        ? {
            id: true,
            patientId: true,
            facilityId: true,
            hospitalEpisodeId: true,
            admissionSummaryJson: true,
          }
        : {
            id: true,
            patientId: true,
            facilityId: true,
            admissionSummaryJson: true,
          },
    });
    if (!enc) throw new NotFoundException("Encounter not found");
    return {
      ...enc,
      hospitalEpisodeId:
        foundationOn && "hospitalEpisodeId" in enc
          ? ((enc as { hospitalEpisodeId?: string | null }).hospitalEpisodeId ?? null)
          : null,
    };
  }

  private async persistDoc(
    enc: {
      id: string;
      patientId: string;
      admissionSummaryJson: unknown;
    },
    doc: EnterpriseWorkflowOrchestrationDocV1
  ) {
    await this.prisma.encounter.update({
      where: { id: enc.id },
      data: {
        admissionSummaryJson: mergeEnterpriseWorkflowOrchestrationIntoSummary(
          enc.admissionSummaryJson,
          doc
        ) as Prisma.InputJsonValue,
        version: { increment: 1 },
      },
      select: { id: true },
    });
  }

  private throwOnFail(result: { ok: false; code: string }): never {
    if (result.code === "ENTERPRISE_WORKFLOW_STALE") {
      throw new ConflictException(result.code);
    }
    throw new BadRequestException(result.code);
  }

  private async scanFacilityDocs(facilityId: string): Promise<
    Array<{ encounterId: string; patientId: string; doc: EnterpriseWorkflowOrchestrationDocV1 }>
  > {
    try {
      const census = await this.hospitalCensus.getHospitalCensus(facilityId, {
        snapshotScope: "ALL_HOSPITAL_CARE",
      });
      const rows = (census.allHospitalPatients ?? []).slice(0, CENSUS_SCAN_LIMIT);
      const out: Array<{
        encounterId: string;
        patientId: string;
        doc: EnterpriseWorkflowOrchestrationDocV1;
      }> = [];
      for (const row of rows) {
        const enc = await this.prisma.encounter.findFirst({
          where: { id: row.encounterId, facilityId },
          select: {
            id: true,
            patientId: true,
            admissionSummaryJson: true,
          },
        });
        if (!enc) continue;
        out.push({
          encounterId: enc.id,
          patientId: enc.patientId,
          doc: readEnterpriseWorkflowOrchestrationDoc(enc.admissionSummaryJson),
        });
      }
      return out;
    } catch (err) {
      this.logger.warn(`workflow_scan_unavailable err=${String(err)}`);
      throw err;
    }
  }

  listDefinitions() {
    return {
      certification: ENTERPRISE_WORKFLOW_ENGINE_CERTIFICATION_ID,
      definitions: this.workflowEngine.listDefinitions(),
      escalationTemplates: this.escalationEngine.listTemplates(),
      rulesEngineEnabled: true as const,
      placementEnabled: false as const,
      autoGenerationMode: "DEFINITION_AND_RULES" as const,
    };
  }

  async getEncounterDoc(facilityId: string, encounterId: string) {
    const enc = await this.loadEncounterBag(facilityId, encounterId);
    return {
      certification: ENTERPRISE_WORKFLOW_ENGINE_CERTIFICATION_ID,
      encounterId: enc.id,
      patientId: enc.patientId,
      hospitalEpisodeId: enc.hospitalEpisodeId,
      doc: readEnterpriseWorkflowOrchestrationDoc(enc.admissionSummaryJson),
    };
  }

  async createWorkflow(
    facilityId: string,
    encounterId: string,
    actorUserId: string,
    body: {
      definitionCode: string;
      expectedVersion: number;
      clientRequestId?: string | null;
    }
  ) {
    const enc = await this.loadEncounterBag(facilityId, encounterId);
    const doc = readEnterpriseWorkflowOrchestrationDoc(enc.admissionSummaryJson);
    const nowIso = new Date().toISOString();
    const result = this.workflowEngine.createFromTemplate(doc, body.definitionCode, {
      facilityId,
      patientId: enc.patientId,
      hospitalEpisodeId: enc.hospitalEpisodeId,
      encounterId: enc.id,
      actorUserId,
      clientExpectedVersion: Number(body.expectedVersion),
      nowIso,
      clientRequestId: body.clientRequestId ?? null,
    });
    if (!result.ok) this.throwOnFail(result);
    await this.persistDoc(enc, result.doc);
    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, "EnterpriseWorkflow", {
      userId: actorUserId,
      facilityId,
      patientId: enc.patientId,
      encounterId: enc.id,
      entityId: result.workflow.workflowInstanceId,
      critical: true,
      metadata: {
        event: "ENTERPRISE_WORKFLOW_CREATED",
        definitionCode: body.definitionCode,
        workflowInstanceId: result.workflow.workflowInstanceId,
        taskCount: result.tasks.length,
      },
    });
    return {
      certification: ENTERPRISE_WORKFLOW_ENGINE_CERTIFICATION_ID,
      workflow: result.workflow,
      tasks: result.tasks,
      doc: result.doc,
    };
  }

  async upsertTask(
    facilityId: string,
    encounterId: string,
    actorUserId: string,
    body: { task: EnterpriseTaskV1; expectedVersion: number }
  ) {
    const enc = await this.loadEncounterBag(facilityId, encounterId);
    if (body.task.encounterId !== enc.id || body.task.facilityId !== facilityId) {
      throw new BadRequestException("TASK_FACILITY_ENCOUNTER_MISMATCH");
    }
    if (body.task.patientId && body.task.patientId !== enc.patientId) {
      throw new BadRequestException("TASK_PATIENT_MISMATCH");
    }
    const doc = readEnterpriseWorkflowOrchestrationDoc(enc.admissionSummaryJson);
    const nowIso = new Date().toISOString();
    const task: EnterpriseTaskV1 = {
      ...body.task,
      facilityId,
      patientId: enc.patientId,
      encounterId: enc.id,
      hospitalEpisodeId: body.task.hospitalEpisodeId ?? enc.hospitalEpisodeId,
    };
    const result = this.taskEngine.upsert(
      doc,
      task,
      Number(body.expectedVersion),
      actorUserId,
      nowIso
    );
    if (!result.ok) this.throwOnFail(result);
    await this.persistDoc(enc, result.doc);
    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, "EnterpriseTask", {
      userId: actorUserId,
      facilityId,
      patientId: enc.patientId,
      encounterId: enc.id,
      entityId: result.task.taskId,
      critical: true,
      metadata: {
        event: "ENTERPRISE_TASK_UPSERT",
        taskId: result.task.taskId,
        status: result.task.status,
        department: result.task.department,
      },
    });
    return {
      certification: ENTERPRISE_WORKFLOW_ENGINE_CERTIFICATION_ID,
      task: result.task,
      doc: result.doc,
    };
  }

  async completeTask(
    facilityId: string,
    encounterId: string,
    taskId: string,
    actorUserId: string,
    body: { expectedVersion: number }
  ) {
    const enc = await this.loadEncounterBag(facilityId, encounterId);
    const doc = readEnterpriseWorkflowOrchestrationDoc(enc.admissionSummaryJson);
    const nowIso = new Date().toISOString();
    const result = this.taskEngine.complete(
      doc,
      taskId,
      Number(body.expectedVersion),
      actorUserId,
      nowIso
    );
    if (!result.ok) this.throwOnFail(result);
    await this.persistDoc(enc, result.doc);
    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, "EnterpriseTask", {
      userId: actorUserId,
      facilityId,
      patientId: enc.patientId,
      encounterId: enc.id,
      entityId: taskId,
      critical: true,
      metadata: { event: "ENTERPRISE_TASK_COMPLETED", taskId },
    });
    return {
      certification: ENTERPRISE_WORKFLOW_ENGINE_CERTIFICATION_ID,
      task: result.task,
      doc: result.doc,
    };
  }

  async reassignTask(
    facilityId: string,
    encounterId: string,
    taskId: string,
    actorUserId: string,
    body: {
      assignedToUserId: string | null;
      assignedToRole?: string | null;
      expectedVersion: number;
    }
  ) {
    const enc = await this.loadEncounterBag(facilityId, encounterId);
    const doc = readEnterpriseWorkflowOrchestrationDoc(enc.admissionSummaryJson);
    const nowIso = new Date().toISOString();
    const result = this.taskEngine.reassign(
      doc,
      taskId,
      body.assignedToUserId,
      Number(body.expectedVersion),
      actorUserId,
      nowIso,
      body.assignedToRole
    );
    if (!result.ok) this.throwOnFail(result);
    await this.persistDoc(enc, result.doc);
    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, "EnterpriseTask", {
      userId: actorUserId,
      facilityId,
      patientId: enc.patientId,
      encounterId: enc.id,
      entityId: taskId,
      critical: true,
      metadata: {
        event: "ENTERPRISE_TASK_REASSIGNED",
        taskId,
        previousAssignee: result.previousAssignee,
        assignedToUserId: body.assignedToUserId,
      },
    });
    return {
      certification: ENTERPRISE_WORKFLOW_ENGINE_CERTIFICATION_ID,
      task: result.task,
      doc: result.doc,
    };
  }

  async ingestEvent(
    facilityId: string,
    encounterId: string,
    actorUserId: string,
    body: {
      idempotencyKey: string;
      type: ClinicalOrchestrationEventType;
      expectedVersion: number;
      eventId?: string;
      occurredAt?: string;
      payload?: Record<string, unknown> | null;
    }
  ) {
    if (!body.idempotencyKey?.trim()) {
      throw new BadRequestException("IDEMPOTENCY_KEY_REQUIRED");
    }
    const enc = await this.loadEncounterBag(facilityId, encounterId);
    const doc = readEnterpriseWorkflowOrchestrationDoc(enc.admissionSummaryJson);
    const nowIso = new Date().toISOString();
    const result = this.eventEngine.ingest(
      doc,
      {
        eventId: body.eventId,
        idempotencyKey: body.idempotencyKey.trim(),
        type: body.type,
        facilityId,
        patientId: enc.patientId,
        hospitalEpisodeId: enc.hospitalEpisodeId,
        encounterId: enc.id,
        occurredAt: body.occurredAt,
        payload: body.payload,
      },
      Number(body.expectedVersion),
      actorUserId,
      nowIso
    );
    if (!result.ok) this.throwOnFail(result);

    let finalDoc = result.doc;
    let rulesMeta: {
      matchedRuleIds: string[];
      appliedActionTypes: string[];
    } | null = null;

    if (!result.idempotentReplay) {
      // D4A.2.8A — policy hooks: evaluate clinical rules after definition-driven generation.
      try {
        const rulesResult = await this.clinicalRules.evaluateAndApplyForOrchestrationEvent({
          facilityId,
          encounterId: enc.id,
          patientId: enc.patientId,
          hospitalEpisodeId: enc.hospitalEpisodeId,
          actorUserId,
          eventType: result.event.type,
          eventId: result.event.eventId,
          occurredAt: result.event.occurredAt,
          payload: body.payload,
          orchestrationDoc: result.doc,
          admissionSummaryJson: enc.admissionSummaryJson,
        });
        finalDoc = rulesResult.orchestrationDoc;
        rulesMeta = {
          matchedRuleIds: rulesResult.evaluation.matchedRuleIds,
          appliedActionTypes: rulesResult.appliedActionTypes,
        };
        await this.prisma.encounter.update({
          where: { id: enc.id },
          data: {
            admissionSummaryJson: rulesResult.admissionSummaryJson as Prisma.InputJsonValue,
            version: { increment: 1 },
          },
          select: { id: true },
        });
      } catch (err) {
        this.logger.warn(
          `clinical_rules_eval_failed encounter=${enc.id} err=${String(err)}`
        );
        await this.persistDoc(enc, result.doc);
      }

      await this.audit.log(AuditAction.ENCOUNTER_UPDATE, "EnterpriseClinicalEvent", {
        userId: actorUserId,
        facilityId,
        patientId: enc.patientId,
        encounterId: enc.id,
        entityId: result.event.eventId,
        critical: true,
        metadata: {
          event: "ENTERPRISE_CLINICAL_EVENT_INGESTED",
          type: result.event.type,
          idempotencyKey: result.event.idempotencyKey,
          appliedDefinitionCodes: result.event.appliedDefinitionCodes,
          generatedTaskIds: result.event.generatedTaskIds,
          rulesMatched: rulesMeta?.matchedRuleIds ?? [],
          rulesActions: rulesMeta?.appliedActionTypes ?? [],
        },
      });
    }
    return {
      certification: ENTERPRISE_WORKFLOW_ENGINE_CERTIFICATION_ID,
      event: result.event,
      idempotentReplay: result.idempotentReplay,
      doc: finalDoc,
      autoGenerationMode: "DEFINITION_AND_RULES" as const,
      rulesEngineEnabled: true as const,
      rulesMatched: rulesMeta?.matchedRuleIds ?? [],
      rulesActions: rulesMeta?.appliedActionTypes ?? [],
    };
  }

  async openEscalation(
    facilityId: string,
    encounterId: string,
    actorUserId: string,
    body: {
      templateCode: EscalationChainTemplateCode;
      summary: string;
      expectedVersion: number;
      relatedTaskId?: string | null;
      relatedWorkflowInstanceId?: string | null;
      relatedEventId?: string | null;
      escalationId?: string;
      clientRequestId?: string | null;
    }
  ) {
    const enc = await this.loadEncounterBag(facilityId, encounterId);
    const doc = readEnterpriseWorkflowOrchestrationDoc(enc.admissionSummaryJson);
    const nowIso = new Date().toISOString();
    const result = this.escalationEngine.open(
      doc,
      {
        templateCode: body.templateCode,
        facilityId,
        patientId: enc.patientId,
        hospitalEpisodeId: enc.hospitalEpisodeId,
        encounterId: enc.id,
        summary: body.summary,
        relatedTaskId: body.relatedTaskId,
        relatedWorkflowInstanceId: body.relatedWorkflowInstanceId,
        relatedEventId: body.relatedEventId,
        escalationId: body.escalationId,
        clientRequestId: body.clientRequestId,
      },
      Number(body.expectedVersion),
      actorUserId,
      nowIso
    );
    if (!result.ok) this.throwOnFail(result);
    await this.persistDoc(enc, result.doc);
    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, "EnterpriseEscalation", {
      userId: actorUserId,
      facilityId,
      patientId: enc.patientId,
      encounterId: enc.id,
      entityId: result.escalation.escalationId,
      critical: true,
      metadata: {
        event: "ENTERPRISE_ESCALATION_OPENED",
        templateCode: body.templateCode,
        escalationId: result.escalation.escalationId,
      },
    });
    return {
      certification: ENTERPRISE_WORKFLOW_ENGINE_CERTIFICATION_ID,
      escalation: result.escalation,
      doc: result.doc,
    };
  }

  async advanceEscalation(
    facilityId: string,
    encounterId: string,
    escalationId: string,
    actorUserId: string,
    body: {
      status: EscalationInstanceStatusV1;
      expectedVersion: number;
      note?: string | null;
    }
  ) {
    const enc = await this.loadEncounterBag(facilityId, encounterId);
    const doc = readEnterpriseWorkflowOrchestrationDoc(enc.admissionSummaryJson);
    const nowIso = new Date().toISOString();
    const result = this.escalationEngine.advance(
      doc,
      escalationId,
      body.status,
      Number(body.expectedVersion),
      actorUserId,
      nowIso,
      body.note
    );
    if (!result.ok) this.throwOnFail(result);
    await this.persistDoc(enc, result.doc);
    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, "EnterpriseEscalation", {
      userId: actorUserId,
      facilityId,
      patientId: enc.patientId,
      encounterId: enc.id,
      entityId: escalationId,
      critical: true,
      metadata: {
        event: "ENTERPRISE_ESCALATION_ADVANCED",
        status: body.status,
        escalationId,
      },
    });
    return {
      certification: ENTERPRISE_WORKFLOW_ENGINE_CERTIFICATION_ID,
      escalation: result.escalation,
      doc: result.doc,
    };
  }

  async getTimeline(
    facilityId: string,
    encounterId: string,
    filters: {
      department?: string;
      roleHint?: string;
      workflowInstanceId?: string;
      taskType?: string;
    }
  ) {
    const enc = await this.loadEncounterBag(facilityId, encounterId);
    const doc = readEnterpriseWorkflowOrchestrationDoc(enc.admissionSummaryJson);
    const entries = this.timelineEngine.list(doc, {
      department: (filters.department as EnterpriseWorkflowDepartment) || null,
      roleHint: filters.roleHint || null,
      workflowInstanceId: filters.workflowInstanceId || null,
      taskType: filters.taskType as never,
    });
    return {
      certification: ENTERPRISE_WORKFLOW_ENGINE_CERTIFICATION_ID,
      encounterId: enc.id,
      patientId: enc.patientId,
      hospitalEpisodeId: enc.hospitalEpisodeId,
      facilityId,
      entries,
      expectedVersion: doc.expectedVersion,
    };
  }

  async getNotifications(facilityId: string, encounterId: string) {
    const enc = await this.loadEncounterBag(facilityId, encounterId);
    const doc = readEnterpriseWorkflowOrchestrationDoc(enc.admissionSummaryJson);
    return {
      certification: ENTERPRISE_WORKFLOW_ENGINE_CERTIFICATION_ID,
      notifications: doc.notifications,
      expectedVersion: doc.expectedVersion,
    };
  }

  async getDepartmentWorklist(
    facilityId: string,
    departmentRaw: string,
    opts: { limit?: number; offset?: number }
  ) {
    const department = departmentRaw.toUpperCase() as EnterpriseWorkflowDepartment;
    if (!(ENTERPRISE_WORKFLOW_DEPARTMENTS as readonly string[]).includes(department)) {
      throw new BadRequestException("INVALID_DEPARTMENT");
    }
    try {
      const scanned = await this.scanFacilityDocs(facilityId);
      return buildDepartmentWorklist(
        scanned.map((s) => ({ encounterId: s.encounterId, doc: s.doc })),
        department,
        facilityId,
        {
          limit: opts.limit ?? 50,
          offset: opts.offset ?? 0,
          nowIso: new Date().toISOString(),
        }
      );
    } catch {
      return buildDepartmentWorklist([], department, facilityId, {
        limit: opts.limit ?? 50,
        offset: opts.offset ?? 0,
        nowIso: new Date().toISOString(),
      });
    }
  }

  async getAdminDashboard(facilityId: string, actorUserId: string) {
    try {
      const scanned = await this.scanFacilityDocs(facilityId);
      const dash = aggregateAdminDashboard(
        scanned.map((s) => s.doc),
        facilityId,
        new Date().toISOString()
      );
      await this.audit.log(AuditAction.ENCOUNTER_UPDATE, "EnterpriseWorkflowDashboard", {
        userId: actorUserId,
        facilityId,
        metadata: { event: "ENTERPRISE_WORKFLOW_ADMIN_DASHBOARD_VIEWED" },
      });
      return dash;
    } catch {
      return aggregateAdminDashboard([], facilityId, new Date().toISOString(), {
        sourceUnavailable: true,
      });
    }
  }
}
