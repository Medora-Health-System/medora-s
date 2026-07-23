/**
 * D4A.2.8A — Enterprise Clinical Rules catalog + evaluation facade.
 * Facility catalog: zero-migration file-backed JSON (clinic MVP).
 * Encounter execution audit: sibling JSON bag key (does not mutate orchestration V1).
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
  CLINICAL_RULES_BUILDER_CATALOGS,
  ENTERPRISE_CLINICAL_RULES_ENGINE_CERTIFICATION_ID,
  ENTERPRISE_CLINICAL_RULES_V1_KEY,
  appendRuleExecutions,
  buildRuleContextFromOrchestrationEvent,
  emptyEnterpriseClinicalRulesCatalog,
  mergeEnterpriseClinicalRulesExecutionIntoSummary,
  mergeEnterpriseWorkflowOrchestrationIntoSummary,
  readEnterpriseClinicalRulesExecutionDoc,
  readEnterpriseWorkflowOrchestrationDoc,
  seedFacilityClinicalRulesCatalog,
  type ClinicalRuleDefinitionV1,
  type ClinicalRuleEvaluationContextV1,
  type ClinicalRuleEventType,
  type ClinicalRuleStatus,
  type ClinicalOrchestrationEventType,
  type EnterpriseClinicalRulesCatalogV1,
} from "@medora/shared";
import { mkdir, readFile, writeFile } from "fs/promises";
import * as path from "path";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../../common/services/audit.service";
import { ClinicalRulesEngine } from "./clinical-rules.engine";
import { ClinicalRulesActionAdapter } from "./clinical-rules-action.adapter";

@Injectable()
export class ClinicalRulesOrchestrationService {
  private readonly logger = new Logger(ClinicalRulesOrchestrationService.name);
  private readonly memory = new Map<string, EnterpriseClinicalRulesCatalogV1>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly rulesEngine: ClinicalRulesEngine,
    private readonly actionAdapter: ClinicalRulesActionAdapter
  ) {}

  private catalogDir(): string {
    return path.join(process.cwd(), "var", "enterprise-clinical-rules-v1");
  }

  private catalogPath(facilityId: string): string {
    return path.join(this.catalogDir(), `${facilityId}.json`);
  }

  private async loadCatalog(facilityId: string): Promise<EnterpriseClinicalRulesCatalogV1> {
    const cached = this.memory.get(facilityId);
    if (cached) return cached;

    try {
      const raw = await readFile(this.catalogPath(facilityId), "utf8");
      const parsed = JSON.parse(raw) as EnterpriseClinicalRulesCatalogV1;
      if (parsed?.version === 1 && Array.isArray(parsed.rules)) {
        this.memory.set(facilityId, parsed);
        return parsed;
      }
    } catch {
      // seed below
    }

    const seeded = seedFacilityClinicalRulesCatalog(
      facilityId,
      new Date().toISOString()
    );
    this.memory.set(facilityId, seeded);
    await this.persistCatalog(seeded);
    return seeded;
  }

  private async persistCatalog(catalog: EnterpriseClinicalRulesCatalogV1): Promise<void> {
    this.memory.set(catalog.facilityId, catalog);
    try {
      await mkdir(this.catalogDir(), { recursive: true });
      await writeFile(
        this.catalogPath(catalog.facilityId),
        JSON.stringify(catalog, null, 2),
        "utf8"
      );
    } catch (err) {
      this.logger.warn(
        `clinical_rules_catalog_persist_failed facility=${catalog.facilityId} err=${String(err)}`
      );
    }
  }

  private throwOnFail(result: { ok: false; code: string }): never {
    if (result.code === "CLINICAL_RULES_STALE") {
      throw new ConflictException(result.code);
    }
    throw new BadRequestException(result.code);
  }

  catalogsMeta() {
    return {
      certification: ENTERPRISE_CLINICAL_RULES_ENGINE_CERTIFICATION_ID,
      catalogs: CLINICAL_RULES_BUILDER_CATALOGS,
      rulesEngineEnabled: true as const,
      placementEnabled: false as const,
      bagKey: ENTERPRISE_CLINICAL_RULES_V1_KEY,
    };
  }

  async getCatalog(facilityId: string) {
    const catalog = await this.loadCatalog(facilityId);
    return {
      certification: ENTERPRISE_CLINICAL_RULES_ENGINE_CERTIFICATION_ID,
      catalog,
      conflicts: this.rulesEngine.analyzeConflicts(catalog),
      rulesEngineEnabled: true as const,
      placementEnabled: false as const,
    };
  }

  async upsertRule(
    facilityId: string,
    actorUserId: string,
    body: { rule: ClinicalRuleDefinitionV1; expectedVersion: number }
  ) {
    const catalog = await this.loadCatalog(facilityId);
    const nowIso = new Date().toISOString();
    const rule: ClinicalRuleDefinitionV1 = {
      ...body.rule,
      scope: { ...body.rule.scope, facilityId },
    };
    const result = this.rulesEngine.upsert(
      catalog,
      rule,
      Number(body.expectedVersion),
      actorUserId,
      nowIso,
      true
    );
    if (!result.ok) this.throwOnFail(result);
    await this.persistCatalog(result.catalog);
    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, "EnterpriseClinicalRule", {
      userId: actorUserId,
      facilityId,
      entityId: result.rule.ruleId,
      critical: true,
      metadata: {
        event: "ENTERPRISE_CLINICAL_RULE_UPSERT",
        ruleId: result.rule.ruleId,
        version: result.rule.version,
        status: result.rule.status,
      },
    });
    return {
      certification: ENTERPRISE_CLINICAL_RULES_ENGINE_CERTIFICATION_ID,
      rule: result.rule,
      catalog: result.catalog,
      conflicts: this.rulesEngine.analyzeConflicts(result.catalog),
    };
  }

  async activateRule(
    facilityId: string,
    ruleId: string,
    actorUserId: string,
    body: { expectedVersion: number }
  ) {
    const catalog = await this.loadCatalog(facilityId);
    const nowIso = new Date().toISOString();
    const result = this.rulesEngine.activate(
      catalog,
      ruleId,
      Number(body.expectedVersion),
      actorUserId,
      nowIso
    );
    if (!result.ok) this.throwOnFail(result);
    await this.persistCatalog(result.catalog);
    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, "EnterpriseClinicalRule", {
      userId: actorUserId,
      facilityId,
      entityId: ruleId,
      critical: true,
      metadata: { event: "ENTERPRISE_CLINICAL_RULE_ACTIVATED", ruleId },
    });
    return {
      certification: ENTERPRISE_CLINICAL_RULES_ENGINE_CERTIFICATION_ID,
      rule: result.rule,
      catalog: result.catalog,
    };
  }

  async setRuleStatus(
    facilityId: string,
    ruleId: string,
    actorUserId: string,
    body: { status: ClinicalRuleStatus; expectedVersion: number }
  ) {
    const catalog = await this.loadCatalog(facilityId);
    const nowIso = new Date().toISOString();
    const result = this.rulesEngine.setStatus(
      catalog,
      ruleId,
      body.status,
      Number(body.expectedVersion),
      actorUserId,
      nowIso
    );
    if (!result.ok) this.throwOnFail(result);
    await this.persistCatalog(result.catalog);
    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, "EnterpriseClinicalRule", {
      userId: actorUserId,
      facilityId,
      entityId: ruleId,
      critical: true,
      metadata: {
        event: "ENTERPRISE_CLINICAL_RULE_STATUS",
        ruleId,
        status: body.status,
      },
    });
    return {
      certification: ENTERPRISE_CLINICAL_RULES_ENGINE_CERTIFICATION_ID,
      rule: result.rule,
      catalog: result.catalog,
    };
  }

  async rollbackRule(
    facilityId: string,
    ruleId: string,
    actorUserId: string,
    body: { toVersion: number; expectedVersion: number }
  ) {
    const catalog = await this.loadCatalog(facilityId);
    const nowIso = new Date().toISOString();
    const result = this.rulesEngine.rollback(
      catalog,
      ruleId,
      Number(body.toVersion),
      Number(body.expectedVersion),
      actorUserId,
      nowIso
    );
    if (!result.ok) this.throwOnFail(result);
    await this.persistCatalog(result.catalog);
    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, "EnterpriseClinicalRule", {
      userId: actorUserId,
      facilityId,
      entityId: ruleId,
      critical: true,
      metadata: {
        event: "ENTERPRISE_CLINICAL_RULE_ROLLBACK",
        ruleId,
        toVersion: body.toVersion,
      },
    });
    return {
      certification: ENTERPRISE_CLINICAL_RULES_ENGINE_CERTIFICATION_ID,
      rule: result.rule,
      catalog: result.catalog,
    };
  }

  async getConflicts(facilityId: string) {
    const catalog = await this.loadCatalog(facilityId);
    return {
      certification: ENTERPRISE_CLINICAL_RULES_ENGINE_CERTIFICATION_ID,
      conflicts: this.rulesEngine.analyzeConflicts(catalog),
      expectedVersion: catalog.expectedVersion,
    };
  }

  async simulate(
    facilityId: string,
    actorUserId: string,
    body: { context: ClinicalRuleEvaluationContextV1 }
  ) {
    const catalog = await this.loadCatalog(facilityId);
    const nowIso = new Date().toISOString();
    const context: ClinicalRuleEvaluationContextV1 = {
      ...body.context,
      facilityId,
    };
    const result = this.rulesEngine.simulate(catalog, context, actorUserId, nowIso);
    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, "EnterpriseClinicalRule", {
      userId: actorUserId,
      facilityId,
      metadata: {
        event: "ENTERPRISE_CLINICAL_RULE_SIMULATED",
        eventType: context.eventType,
        matched: result.matchedRuleIds,
      },
    });
    return {
      certification: ENTERPRISE_CLINICAL_RULES_ENGINE_CERTIFICATION_ID,
      result,
      sideEffectsApplied: false as const,
    };
  }

  async getExecutionAudit(facilityId: string, encounterId: string) {
    const enc = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: { id: true, patientId: true, admissionSummaryJson: true },
    });
    if (!enc) throw new NotFoundException("Encounter not found");
    const doc = readEnterpriseClinicalRulesExecutionDoc(enc.admissionSummaryJson);
    return {
      certification: ENTERPRISE_CLINICAL_RULES_ENGINE_CERTIFICATION_ID,
      encounterId: enc.id,
      patientId: enc.patientId,
      doc,
    };
  }

  /**
   * Called from D4A.2.8 clinical event ingest after definition-driven generation.
   * Evaluates rules and applies actions via existing orchestration engines.
   */
  async evaluateAndApplyForOrchestrationEvent(input: {
    facilityId: string;
    encounterId: string;
    patientId: string;
    hospitalEpisodeId: string | null;
    actorUserId: string;
    eventType: ClinicalOrchestrationEventType;
    eventId: string;
    occurredAt: string;
    payload?: Record<string, unknown> | null;
    orchestrationDoc: ReturnType<typeof readEnterpriseWorkflowOrchestrationDoc>;
    admissionSummaryJson: unknown;
  }) {
    const catalog = await this.loadCatalog(input.facilityId);
    const nowIso = new Date().toISOString();
    const context = buildRuleContextFromOrchestrationEvent({
      type: input.eventType,
      facilityId: input.facilityId,
      patientId: input.patientId,
      encounterId: input.encounterId,
      hospitalEpisodeId: input.hospitalEpisodeId,
      occurredAt: input.occurredAt,
      payload: input.payload,
    });
    const evaluation = this.rulesEngine.evaluate(
      catalog,
      context,
      input.actorUserId,
      nowIso,
      false
    );

    const applied = this.actionAdapter.applyActions({
      doc: input.orchestrationDoc,
      actions: evaluation.actions,
      evaluation,
      facilityId: input.facilityId,
      patientId: input.patientId,
      hospitalEpisodeId: input.hospitalEpisodeId,
      encounterId: input.encounterId,
      actorUserId: input.actorUserId,
      nowIso,
      sourceEventId: input.eventId,
      dryRun: false,
    });

    let execDoc = readEnterpriseClinicalRulesExecutionDoc(input.admissionSummaryJson);
    execDoc = appendRuleExecutions(execDoc, evaluation.executions, nowIso);

    const summaryWithOrch = mergeEnterpriseWorkflowOrchestrationIntoSummary(
      input.admissionSummaryJson,
      applied.doc
    );
    const summaryMerged = mergeEnterpriseClinicalRulesExecutionIntoSummary(
      summaryWithOrch,
      execDoc
    );

    return {
      evaluation,
      orchestrationDoc: applied.doc,
      admissionSummaryJson: summaryMerged,
      appliedActionTypes: applied.appliedActionTypes,
      skipped: applied.skipped,
    };
  }

  /** Direct evaluate endpoint for non-orchestration rule events (e.g. STEMI_ALERT). */
  async evaluateOnEncounter(
    facilityId: string,
    encounterId: string,
    actorUserId: string,
    body: {
      eventType: ClinicalRuleEventType;
      expectedVersion: number;
      payload?: Record<string, unknown> | null;
      simulated?: boolean;
    }
  ) {
    const enc = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: {
        id: true,
        patientId: true,
        hospitalEpisodeId: true,
        admissionSummaryJson: true,
      },
    });
    if (!enc) throw new NotFoundException("Encounter not found");

    const catalog = await this.loadCatalog(facilityId);
    const nowIso = new Date().toISOString();
    const orchDoc = readEnterpriseWorkflowOrchestrationDoc(enc.admissionSummaryJson);
    if (Number(body.expectedVersion) !== orchDoc.expectedVersion) {
      throw new ConflictException("ENTERPRISE_WORKFLOW_STALE");
    }

    const context: ClinicalRuleEvaluationContextV1 = {
      ...buildRuleContextFromOrchestrationEvent({
        type: "WORKFLOW_STARTED",
        facilityId,
        patientId: enc.patientId,
        encounterId: enc.id,
        hospitalEpisodeId: enc.hospitalEpisodeId,
        occurredAt: nowIso,
        payload: body.payload,
      }),
      eventType: body.eventType,
    };

    if (body.simulated) {
      const result = this.rulesEngine.simulate(catalog, context, actorUserId, nowIso);
      return {
        certification: ENTERPRISE_CLINICAL_RULES_ENGINE_CERTIFICATION_ID,
        result,
        sideEffectsApplied: false as const,
        doc: orchDoc,
      };
    }

    const evaluation = this.rulesEngine.evaluate(
      catalog,
      context,
      actorUserId,
      nowIso,
      false
    );
    const applied = this.actionAdapter.applyActions({
      doc: orchDoc,
      actions: evaluation.actions,
      evaluation,
      facilityId,
      patientId: enc.patientId,
      hospitalEpisodeId: enc.hospitalEpisodeId,
      encounterId: enc.id,
      actorUserId,
      nowIso,
      sourceEventId: `rule-eval-${nowIso}`,
    });

    let execDoc = readEnterpriseClinicalRulesExecutionDoc(enc.admissionSummaryJson);
    execDoc = appendRuleExecutions(execDoc, evaluation.executions, nowIso);
    const summaryWithOrch = mergeEnterpriseWorkflowOrchestrationIntoSummary(
      enc.admissionSummaryJson,
      applied.doc
    );
    const summaryMerged = mergeEnterpriseClinicalRulesExecutionIntoSummary(
      summaryWithOrch,
      execDoc
    );

    await this.prisma.encounter.update({
      where: { id: enc.id },
      data: {
        admissionSummaryJson: summaryMerged as Prisma.InputJsonValue,
        version: { increment: 1 },
      },
      select: { id: true },
    });

    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, "EnterpriseClinicalRule", {
      userId: actorUserId,
      facilityId,
      patientId: enc.patientId,
      encounterId: enc.id,
      critical: true,
      metadata: {
        event: "ENTERPRISE_CLINICAL_RULE_EVALUATED",
        eventType: body.eventType,
        matched: evaluation.matchedRuleIds,
        appliedActionTypes: applied.appliedActionTypes,
      },
    });

    return {
      certification: ENTERPRISE_CLINICAL_RULES_ENGINE_CERTIFICATION_ID,
      result: evaluation,
      sideEffectsApplied: true as const,
      doc: applied.doc,
      appliedActionTypes: applied.appliedActionTypes,
      skipped: applied.skipped,
    };
  }

  /** Test helper — reset memory catalog (does not delete file). */
  resetMemoryCatalog(facilityId: string) {
    this.memory.delete(facilityId);
  }

  emptyCatalogForTests(facilityId: string) {
    return emptyEnterpriseClinicalRulesCatalog(facilityId);
  }
}
