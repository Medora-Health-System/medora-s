/**
 * D4A.2.7A — Operational Governance Service.
 * Consumes EnterpriseCommandService (+ Clinical Synthesis indirectly).
 * Read-only MAR / documentation / audit aggregation.
 * Never enables Placement / bed assignment / D3B. Never modifies MAR.
 * Never merges ED operational logic into inpatient dashboards.
 */

import { BadRequestException, Injectable } from "@nestjs/common";
import { AuditAction, MedicationMarAction, Prisma } from "@prisma/client";
import {
  OPERATIONAL_HARDENING_CERTIFICATION_ID,
  CHART_ACCESS_KINDS,
  GOVERNANCE_DASHBOARD_KINDS,
  GOVERNANCE_AUDIT_SEARCH_FACETS,
  auditFacetFilters,
  buildDocumentationComplianceSlice,
  buildEnterpriseOperationsPlatformManifest,
  buildMedicationComplianceSlice,
  buildOperationalKpis,
  buildPlacementReadinessStub,
  classifyChartAccessKind,
  isChartAccessAction,
  type ChartAccessKind,
  type ChartAccessAuditRowV1,
  type GovernanceAuditSearchFacet,
  type GovernanceDashboardKind,
  type InpatientOperationalDashboardV1,
  type StaffOperationalMetricsV1,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { EnterpriseCommandService } from "./enterprise-command.service";
import { HospitalUnitRegistryService } from "./hospital-unit-registry.service";

const WINDOW_MS = 7 * 24 * 3600_000;
const AUDIT_PAGE_LIMIT = 50;
const STAFF_LIMIT = 40;

function asMeta(m: unknown): Record<string, unknown> {
  if (m && typeof m === "object" && !Array.isArray(m)) return m as Record<string, unknown>;
  return {};
}

@Injectable()
export class OperationalGovernanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly enterpriseCommand: EnterpriseCommandService,
    private readonly unitRegistry: HospitalUnitRegistryService
  ) {}

  getPlatformManifest() {
    return buildEnterpriseOperationsPlatformManifest();
  }

  /** Inpatient-only operational dashboard — excludes ED-specific logic. */
  async getInpatientOperationalDashboard(
    facilityId: string,
    actorUserId: string
  ): Promise<InpatientOperationalDashboardV1> {
    const [dash, alerts, tasks, med, docs] = await Promise.all([
      this.enterpriseCommand.getCommandCenterDashboard(facilityId, actorUserId),
      this.enterpriseCommand.getAlerts(facilityId, actorUserId),
      this.enterpriseCommand.getTasks(facilityId, actorUserId),
      this.getMedicationCompliance(facilityId),
      this.getDocumentationCompliance(facilityId),
    ]);

    const rows = dash.rowsPreview ?? [];
    const losHours = rows.map((r) => r.losHours ?? 0).filter((n) => n > 0);
    const completedTasks = tasks.tasks.filter((t) => t.status === "COMPLETED").length;
    const openTasks = tasks.tasks.length;

    const alertList = alerts.alerts ?? [];
    const countType = (t: string) => alertList.filter((a) => a.alertType === t).length;

    const kpis = buildOperationalKpis({
      admissionsToday: dash.capacity.admissionsToday,
      dischargesToday: dash.capacity.dischargesToday,
      transfersReady: dash.capacity.readyForTransfer,
      losHours,
      bedsAvailable: dash.capacity.bedsAvailable,
      bedsOccupied: dash.capacity.bedsOccupied,
      bedsTotal: dash.capacity.bedsTotal,
      bedsCleaning: dash.capacity.bedsCleaning,
      observationCount: dash.capacity.activeObservation,
      inpatientCount: dash.capacity.activeInpatient,
      pendingPlacementVisibility: dash.capacity.pendingPlacement,
      tasksCompleted: completedTasks,
      tasksTotal: Math.max(openTasks, completedTasks),
      medicationCompliancePct: med.onTimePct,
      documentationSignaturesPct: docs.signaturesPct,
      criticalAlerts: dash.criticalAlerts,
    });

    const warnings: string[] = [];
    if (dash.capacity.pendingPlacement > 0) {
      warnings.push("PENDING_PLACEMENT_VISIBILITY");
    }
    if (dash.criticalAlerts > 0) warnings.push("CRITICAL_ALERTS");
    if ((docs.unsignedPct ?? 0) > 25) warnings.push("UNSIGNED_DOCUMENTATION");

    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, "OperationalGovernance", {
      userId: actorUserId,
      facilityId,
      metadata: {
        event: "INPATIENT_OPERATIONAL_DASHBOARD_VIEWED",
        domain: "INPATIENT",
        excludesEd: true,
      },
    });

    return {
      certification: OPERATIONAL_HARDENING_CERTIFICATION_ID,
      domain: "INPATIENT",
      generatedAt: new Date().toISOString(),
      facilityId,
      kpis,
      pending: {
        placementVisibility: dash.capacity.pendingPlacement,
        consult: dash.pendingConsults,
        imaging: dash.pendingImaging,
        pt: rows.filter((r) => r.pendingPt).length,
        ot: rows.filter((r) => r.pendingOt).length,
        pharmacy: rows.filter((r) => r.pendingPharmacy).length,
        caseManagement: rows.filter((r) => r.pendingCaseManagement).length,
      },
      alerts: {
        critical: dash.criticalAlerts,
        rapidResponse: countType("RAPID_RESPONSE"),
        codeBlue: countType("CODE_BLUE"),
        stroke: countType("STROKE"),
        stemi: countType("STEMI"),
        sepsis: countType("SEPSIS"),
        behavioral: countType("BEHAVIORAL"),
        openEscalations: dash.openEscalations,
      },
      medicationCompliance: med,
      documentationCompliance: docs,
      trackBoardPreviewCount: dash.trackBoardCount,
      warnings,
      consumesEnterpriseCommand: true,
      consumesClinicalSynthesis: true,
      neverEditProviderNotes: true,
      neverEditNursingDocumentation: true,
      excludesEmergencyDepartmentLogic: true,
      placementLogicEnabled: false,
    };
  }

  async getAdministrationDashboard(facilityId: string, actorUserId: string) {
    const inpatient = await this.getInpatientOperationalDashboard(facilityId, actorUserId);
    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, "OperationalGovernance", {
      userId: actorUserId,
      facilityId,
      metadata: { event: "ADMINISTRATION_DASHBOARD_VIEWED" },
    });
    return {
      certification: OPERATIONAL_HARDENING_CERTIFICATION_ID,
      generatedAt: inpatient.generatedAt,
      facilityId,
      kpis: inpatient.kpis,
      criticalAlerts: inpatient.alerts.critical,
      rapidResponses: inpatient.alerts.rapidResponse,
      codes: inpatient.alerts.codeBlue,
      stroke: inpatient.alerts.stroke,
      stemi: inpatient.alerts.stemi,
      sepsis: inpatient.alerts.sepsis,
      behavioral: inpatient.alerts.behavioral,
      phiMinimized: true as const,
      readOnly: true as const,
      consumesEnterpriseCommand: true as const,
      neverLegalRecord: true as const,
      excludesEmergencyDepartmentLogic: true as const,
    };
  }

  async getQualityDashboard(facilityId: string, actorUserId: string) {
    const inpatient = await this.getInpatientOperationalDashboard(facilityId, actorUserId);
    const since = new Date(Date.now() - WINDOW_MS);
    const medicationVarianceSignals = await this.prisma.auditLog.count({
      where: {
        facilityId,
        createdAt: { gte: since },
        OR: [
          { action: AuditAction.CONTROLLED_SUBSTANCE_OVERRIDE },
          { action: AuditAction.MEDICATION_ADMIN_TIME_ADJUSTED },
          { entityType: { in: ["MedicationAdministrationOverride", "MEDICATION_ADMINISTRATION"] } },
        ],
      },
    });
    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, "OperationalGovernance", {
      userId: actorUserId,
      facilityId,
      metadata: { event: "QUALITY_DASHBOARD_VIEWED" },
    });
    return {
      certification: OPERATIONAL_HARDENING_CERTIFICATION_ID,
      generatedAt: new Date().toISOString(),
      facilityId,
      rapidResponses: inpatient.alerts.rapidResponse,
      codeBlue: inpatient.alerts.codeBlue,
      stroke: inpatient.alerts.stroke,
      stemi: inpatient.alerts.stemi,
      sepsis: inpatient.alerts.sepsis,
      behavioral: inpatient.alerts.behavioral,
      medicationVarianceSignals,
      documentationCompliance: inpatient.documentationCompliance,
      medicationCompliance: inpatient.medicationCompliance,
      neverInferOutcomes: true as const,
      consumesEnterpriseCommand: true as const,
      note: "Operational quality signals only — clinical outcomes are never inferred.",
    };
  }

  async getComplianceDashboard(facilityId: string, actorUserId: string) {
    const [docs, med, chartWithoutAssignment, exports, prints] = await Promise.all([
      this.getDocumentationCompliance(facilityId),
      this.getMedicationCompliance(facilityId),
      this.countChartAccessKind(facilityId, "VIEW_WITHOUT_ASSIGNMENT"),
      this.prisma.auditLog.count({
        where: {
          facilityId,
          createdAt: { gte: new Date(Date.now() - WINDOW_MS) },
          action: { in: [AuditAction.RECORD_EXPORT, AuditAction.RECORD_EXPORT_VIEW] },
        },
      }),
      this.countChartAccessKind(facilityId, "PRINT"),
    ]);
    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, "OperationalGovernance", {
      userId: actorUserId,
      facilityId,
      metadata: { event: "COMPLIANCE_DASHBOARD_VIEWED" },
    });
    const surveyReadinessHints: string[] = [];
    if (docs.unsignedNotes > 0) surveyReadinessHints.push("UNSIGNED_NOTES");
    if ((med.latePct ?? 0) > 10) surveyReadinessHints.push("MEDICATION_DELAYS");
    if (chartWithoutAssignment > 0) surveyReadinessHints.push("CHART_ACCESS_WITHOUT_ASSIGNMENT");
    return {
      certification: OPERATIONAL_HARDENING_CERTIFICATION_ID,
      generatedAt: new Date().toISOString(),
      facilityId,
      unsignedNotes: docs.unsignedNotes,
      documentationCreated: docs.documentationCreated,
      documentationSigned: docs.signedNotes,
      medicationDelaysSignals: Math.round(((med.latePct ?? 0) / 100) * med.total),
      chartAccessWithoutAssignment: chartWithoutAssignment,
      exports,
      prints,
      surveyReadinessHints,
      neverEditableAudit: true as const,
      neverInferOutcomes: true as const,
      consumesEnterpriseCommand: true as const,
    };
  }

  async getMedicalDirectorDashboard(facilityId: string, actorUserId: string) {
    const [inpatient, docs, staff] = await Promise.all([
      this.getInpatientOperationalDashboard(facilityId, actorUserId),
      this.getDocumentationCompliance(facilityId),
      this.getStaffAnalytics(facilityId, "PROVIDER"),
    ]);
    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, "OperationalGovernance", {
      userId: actorUserId,
      facilityId,
      metadata: { event: "MEDICAL_DIRECTOR_DASHBOARD_VIEWED" },
    });
    return {
      certification: OPERATIONAL_HARDENING_CERTIFICATION_ID,
      generatedAt: new Date().toISOString(),
      facilityId,
      unsignedNotes: docs.unsignedNotes,
      lateDocumentationSignals: docs.lateDocumentationSignals,
      documentationSignaturesPct: docs.signaturesPct,
      criticalResultAckSignals: staff.reduce((a, s) => a + s.criticalResultAcks, 0),
      averageLosHours: inpatient.kpis.averageLosHours,
      dischargeReady: inpatient.kpis.pendingPlacementVisibility,
      pendingConsult: inpatient.pending.consult,
      providerStaffPreview: staff.slice(0, 15),
      clinicalQualityScored: false as const,
      consumesEnterpriseCommand: true as const,
    };
  }

  async getNursingDirectorDashboard(facilityId: string, actorUserId: string) {
    const [inpatient, med, docs, staff] = await Promise.all([
      this.getInpatientOperationalDashboard(facilityId, actorUserId),
      this.getMedicationCompliance(facilityId),
      this.getDocumentationCompliance(facilityId),
      this.getStaffAnalytics(facilityId, "RN"),
    ]);
    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, "OperationalGovernance", {
      userId: actorUserId,
      facilityId,
      metadata: { event: "NURSING_DIRECTOR_DASHBOARD_VIEWED" },
    });
    return {
      certification: OPERATIONAL_HARDENING_CERTIFICATION_ID,
      generatedAt: new Date().toISOString(),
      facilityId,
      medicationCompliance: med,
      documentationSignaturesPct: docs.signaturesPct,
      lateMarPct: med.latePct,
      lateDocumentationSignals: docs.lateDocumentationSignals,
      staffWorkloadPreview: staff.slice(0, 15),
      openEscalations: inpatient.alerts.openEscalations,
      neverModifyMar: true as const,
      clinicalQualityScored: false as const,
      consumesEnterpriseCommand: true as const,
    };
  }

  async getDashboardByKind(
    facilityId: string,
    actorUserId: string,
    kindRaw: string
  ) {
    const kind = String(kindRaw ?? "").trim().toUpperCase() as GovernanceDashboardKind;
    if (!(GOVERNANCE_DASHBOARD_KINDS as readonly string[]).includes(kind)) {
      throw new BadRequestException("Invalid governance dashboard kind");
    }
    switch (kind) {
      case "ADMINISTRATION":
      case "EXECUTIVE":
      case "REGIONAL":
        return this.getAdministrationDashboard(facilityId, actorUserId);
      case "QUALITY":
        return this.getQualityDashboard(facilityId, actorUserId);
      case "COMPLIANCE":
        return this.getComplianceDashboard(facilityId, actorUserId);
      case "MEDICAL_DIRECTOR":
        return this.getMedicalDirectorDashboard(facilityId, actorUserId);
      case "NURSING_DIRECTOR":
        return this.getNursingDirectorDashboard(facilityId, actorUserId);
      default:
        throw new BadRequestException("Invalid governance dashboard kind");
    }
  }

  /** Record chart access — append-only AuditLog (immutable). */
  async recordChartAccess(
    facilityId: string,
    actorUserId: string,
    body: {
      encounterId: string;
      patientId?: string | null;
      accessKind: ChartAccessKind;
      reason?: string | null;
      workstation?: string | null;
      sessionId?: string | null;
      openTime?: string | null;
      closeTime?: string | null;
      durationMs?: number | null;
      department?: string | null;
      role?: string | null;
      ip?: string | null;
      userAgent?: string | null;
    }
  ) {
    if (!(CHART_ACCESS_KINDS as readonly string[]).includes(body.accessKind)) {
      throw new BadRequestException("Invalid chart access kind");
    }
    const enc = await this.prisma.encounter.findFirst({
      where: { id: body.encounterId, facilityId },
      select: { id: true, patientId: true, status: true },
    });
    if (!enc) throw new BadRequestException("Encounter not found in facility");

    const action =
      body.accessKind === "OPEN"
        ? AuditAction.CHART_OPEN
        : body.accessKind === "EXPORT"
          ? AuditAction.RECORD_EXPORT_VIEW
          : AuditAction.CHART_ACCESS;

    await this.audit.log(action, "CHART_ACCESS", {
      userId: actorUserId,
      facilityId,
      patientId: body.patientId ?? enc.patientId,
      encounterId: enc.id,
      entityId: enc.id,
      ip: body.ip ?? undefined,
      userAgent: body.userAgent ?? undefined,
      metadata: {
        accessKind: body.accessKind,
        reason: body.reason ?? null,
        workstation: body.workstation ?? null,
        sessionId: body.sessionId ?? null,
        openTime: body.openTime ?? null,
        closeTime: body.closeTime ?? null,
        durationMs: body.durationMs ?? null,
        department: body.department ?? null,
        actorRole: body.role ?? undefined,
        encounterStatus: enc.status,
        immutable: true,
        neverDelete: true,
      },
    });
    return { recorded: true as const, immutable: true as const };
  }

  async listChartAccess(
    facilityId: string,
    query: {
      encounterId?: string;
      patientId?: string;
      userId?: string;
      limit?: number;
    }
  ) {
    const take = Math.min(Math.max(query.limit ?? AUDIT_PAGE_LIMIT, 1), 100);
    const rows = await this.prisma.auditLog.findMany({
      where: {
        facilityId,
        ...(query.encounterId ? { encounterId: query.encounterId } : {}),
        ...(query.patientId ? { patientId: query.patientId } : {}),
        ...(query.userId ? { userId: query.userId } : {}),
        OR: [
          { action: { in: [AuditAction.CHART_ACCESS, AuditAction.CHART_OPEN, AuditAction.ENCOUNTER_VIEW, AuditAction.PATIENT_VIEW, AuditAction.VIEW, AuditAction.RECORD_EXPORT, AuditAction.RECORD_EXPORT_VIEW] } },
          { entityType: "CHART_ACCESS" },
        ],
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take,
      select: {
        id: true,
        createdAt: true,
        userId: true,
        facilityId: true,
        encounterId: true,
        patientId: true,
        ip: true,
        action: true,
        metadata: true,
      },
    });
    const mapped: ChartAccessAuditRowV1[] = rows.map((r) => {
      const meta = asMeta(r.metadata);
      return {
        auditId: r.id,
        at: r.createdAt.toISOString(),
        userId: r.userId,
        role: (meta.actorRole as string) ?? null,
        department: (meta.department as string) ?? null,
        facilityId: r.facilityId,
        encounterId: r.encounterId,
        patientId: r.patientId,
        accessKind: classifyChartAccessKind(meta, r.action),
        reason: (meta.reason as string) ?? null,
        workstation: (meta.workstation as string) ?? null,
        ip: r.ip,
        sessionId: (meta.sessionId as string) ?? null,
        openTime: (meta.openTime as string) ?? null,
        closeTime: (meta.closeTime as string) ?? null,
        durationMs:
          typeof meta.durationMs === "number" ? meta.durationMs : null,
        immutable: true,
      };
    });
    return {
      certification: OPERATIONAL_HARDENING_CERTIFICATION_ID,
      rows: mapped,
      neverDelete: true as const,
      editable: false as const,
    };
  }

  async getMedicationCompliance(facilityId: string) {
    const since = new Date(Date.now() - WINDOW_MS);
    const groups = await this.prisma.medicationAdministration.groupBy({
      by: ["marAction"],
      where: { facilityId, administeredAt: { gte: since } },
      _count: { _all: true },
    });
    let administered = 0;
    let refused = 0;
    let heldOrUnavailable = 0;
    let other = 0;
    for (const g of groups) {
      const n = g._count._all;
      if (g.marAction === MedicationMarAction.administered || g.marAction == null) {
        administered += n;
      } else if (g.marAction === MedicationMarAction.refused) {
        refused += n;
      } else if (g.marAction === MedicationMarAction.not_available) {
        heldOrUnavailable += n;
      } else {
        other += n;
      }
    }
    const lateCount = await this.prisma.auditLog.count({
      where: {
        facilityId,
        createdAt: { gte: since },
        action: AuditAction.MEDICATION_ADMIN_TIME_ADJUSTED,
      },
    });
    const total = administered + refused + heldOrUnavailable + other;
    return buildMedicationComplianceSlice({
      total,
      administered,
      refused,
      heldOrUnavailable,
      other,
      lateCount,
      missedCount: heldOrUnavailable,
    });
  }

  async getDocumentationCompliance(facilityId: string) {
    const since = new Date(Date.now() - WINDOW_MS);
    const [unsignedNotes, signedNotes, amendedNotes, documentationCreated, lateSignals] =
      await Promise.all([
        this.prisma.encounterNote.count({
          where: {
            facilityId,
            createdAt: { gte: since },
            voidedAt: null,
            requiresCosign: true,
            cosignedAt: null,
          },
        }),
        this.prisma.auditLog.count({
          where: {
            facilityId,
            createdAt: { gte: since },
            action: {
              in: [
                AuditAction.PROVIDER_DOCUMENTATION_SIGN,
                AuditAction.ENCOUNTER_NOTE_COSIGNED,
              ],
            },
          },
        }),
        this.prisma.auditLog.count({
          where: {
            facilityId,
            createdAt: { gte: since },
            action: {
              in: [
                AuditAction.PROVIDER_DOCUMENTATION_ADDENDUM,
                AuditAction.ENCOUNTER_NOTE_AMENDED,
              ],
            },
          },
        }),
        this.prisma.auditLog.count({
          where: {
            facilityId,
            createdAt: { gte: since },
            action: AuditAction.ENCOUNTER_CLINICAL_DOCUMENTATION_CREATED,
          },
        }),
        this.prisma.encounterNote.count({
          where: {
            facilityId,
            createdAt: { gte: since },
            requiresCosign: true,
            cosignedAt: null,
            voidedAt: null,
          },
        }),
      ]);
    return buildDocumentationComplianceSlice({
      unsignedNotes,
      signedNotes,
      amendedNotes,
      documentationCreated,
      lateDocumentationSignals: lateSignals,
    });
  }

  async getStaffAnalytics(facilityId: string, roleHint?: string | null) {
    const since = new Date(Date.now() - WINDOW_MS);
    const rows = await this.prisma.auditLog.findMany({
      where: {
        facilityId,
        createdAt: { gte: since },
        userId: { not: null },
      },
      select: { userId: true, action: true, entityType: true, metadata: true },
      take: 2000,
      orderBy: { createdAt: "desc" },
    });
    const byUser = new Map<string, StaffOperationalMetricsV1>();
    for (const r of rows) {
      const uid = r.userId!;
      const meta = asMeta(r.metadata);
      const role = String(meta.actorRole ?? "").toUpperCase() || null;
      if (roleHint && role && role !== roleHint.toUpperCase()) continue;
      let row = byUser.get(uid);
      if (!row) {
        row = {
          actorUserId: uid,
          roleHint: role,
          documentationActions: 0,
          chartAccesses: 0,
          medicationAdministrations: 0,
          criticalResultAcks: 0,
          taskSignals: 0,
          escalationSignals: 0,
          exportsOrPrints: 0,
          clinicalQualityScored: false,
        };
        byUser.set(uid, row);
      }
      const a = String(r.action);
      if (isChartAccessAction(a, r.entityType)) row.chartAccesses += 1;
      if (
        a.includes("DOCUMENTATION") ||
        a.includes("NOTE") ||
        a === "PROVIDER_DOCUMENTATION_SIGN"
      ) {
        row.documentationActions += 1;
      }
      if (
        r.entityType?.toUpperCase().includes("MEDICATION") ||
        a.includes("MEDICATION")
      ) {
        row.medicationAdministrations += 1;
      }
      if (a.includes("EXPORT") || classifyChartAccessKind(meta, a) === "PRINT") {
        row.exportsOrPrints += 1;
      }
      if (String(meta.event ?? "").includes("TASK")) row.taskSignals += 1;
      if (String(meta.event ?? "").includes("ESCALATION") || String(meta.event ?? "").includes("ALERT")) {
        row.escalationSignals += 1;
      }
      if (a.includes("ACK") || String(meta.event ?? "").includes("CRITICAL")) {
        row.criticalResultAcks += 1;
      }
    }
    return [...byUser.values()]
      .sort((a, b) => b.chartAccesses + b.documentationActions - (a.chartAccesses + a.documentationActions))
      .slice(0, STAFF_LIMIT);
  }

  async searchAuditCenter(
    facilityId: string,
    query: {
      facet?: string;
      encounterId?: string;
      patientId?: string;
      userId?: string;
      q?: string;
      limit?: number;
    }
  ) {
    const take = Math.min(Math.max(query.limit ?? AUDIT_PAGE_LIMIT, 1), 100);
    const facetRaw = String(query.facet ?? "").trim().toUpperCase();
    const facet = (GOVERNANCE_AUDIT_SEARCH_FACETS as readonly string[]).includes(facetRaw)
      ? (facetRaw as GovernanceAuditSearchFacet)
      : null;
    const filters = facet ? auditFacetFilters(facet) : {};
    const where: Prisma.AuditLogWhereInput = {
      facilityId,
      ...(query.encounterId ? { encounterId: query.encounterId } : {}),
      ...(query.patientId ? { patientId: query.patientId } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(filters.actions?.length
        ? { action: { in: filters.actions as AuditAction[] } }
        : {}),
      ...(filters.entityTypes?.length
        ? { entityType: { in: filters.entityTypes } }
        : {}),
    };
    const rows = await this.prisma.auditLog.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: take * 2,
      select: {
        id: true,
        createdAt: true,
        action: true,
        entityType: true,
        entityId: true,
        userId: true,
        encounterId: true,
        patientId: true,
        metadata: true,
      },
    });
    let filtered = rows;
    if (filters.metadataAccessKinds?.length) {
      filtered = rows.filter((r) => {
        const meta = asMeta(r.metadata);
        const kind = classifyChartAccessKind(meta, r.action);
        const event = String(meta.event ?? "").toUpperCase();
        return filters.metadataAccessKinds!.some(
          (k) => kind === k || event.includes(k)
        );
      });
    }
    if (query.q?.trim()) {
      const q = query.q.trim().toLowerCase();
      filtered = filtered.filter((r) =>
        `${r.action} ${r.entityType} ${r.entityId ?? ""} ${r.userId ?? ""}`
          .toLowerCase()
          .includes(q)
      );
    }
    const page = filtered.slice(0, take);
    return {
      certification: OPERATIONAL_HARDENING_CERTIFICATION_ID,
      editable: false as const,
      neverDelete: true as const,
      events: page.map((r) => ({
        id: r.id,
        at: r.createdAt.toISOString(),
        action: r.action,
        entityType: r.entityType,
        entityId: r.entityId,
        userId: r.userId,
        encounterId: r.encounterId,
        patientId: r.patientId,
        accessKind: classifyChartAccessKind(asMeta(r.metadata), r.action),
      })),
    };
  }

  async getRoleActivityTimeline(
    facilityId: string,
    actorUserIdFilter: string | undefined,
    limit = 50
  ) {
    const take = Math.min(Math.max(limit, 1), 100);
    const rows = await this.prisma.auditLog.findMany({
      where: {
        facilityId,
        ...(actorUserIdFilter ? { userId: actorUserIdFilter } : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take,
      select: {
        id: true,
        createdAt: true,
        action: true,
        entityType: true,
        userId: true,
        encounterId: true,
        metadata: true,
      },
    });
    return {
      certification: OPERATIONAL_HARDENING_CERTIFICATION_ID,
      events: rows.map((r) => {
        const meta = asMeta(r.metadata);
        return {
          id: r.id,
          at: r.createdAt.toISOString(),
          userId: r.userId,
          role: (meta.actorRole as string) ?? null,
          encounterId: r.encounterId,
          action: r.action,
          entityType: r.entityType,
          kind: classifyChartAccessKind(meta, r.action),
          event: (meta.event as string) ?? null,
        };
      }),
    };
  }

  async getPlacementReadiness(facilityId: string, actorUserId: string) {
    const [capacity, registry] = await Promise.all([
      this.enterpriseCommand.getCapacity(facilityId, actorUserId),
      this.unitRegistry.getUnitRegistry(facilityId).catch(() => null),
    ]);
    const units =
      registry?.units?.map((u) => ({
        unitId: u.id,
        unitLabel: u.name ?? u.code,
        levelOfCare: String(u.levelOfCare ?? u.unitType ?? ""),
        isolationCapable: null as boolean | null,
        telemetryCapable: String(u.unitType ?? "").includes("TELE") ? true : null,
        icuCapable: String(u.unitType ?? "").toUpperCase().includes("ICU"),
        observationCapable: !!u.acceptsObservation,
      })) ?? [];
    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, "OperationalGovernance", {
      userId: actorUserId,
      facilityId,
      metadata: { event: "PLACEMENT_READINESS_VIEWED", placementLogicEnabled: false },
    });
    return buildPlacementReadinessStub({
      facilityId,
      bedsTotal: capacity.capacity.bedsTotal,
      bedsAvailable: capacity.capacity.bedsAvailable,
      bedsOccupied: capacity.capacity.bedsOccupied,
      bedsCleaning: capacity.capacity.bedsCleaning,
      bedsBlocked: capacity.capacity.bedsBlocked,
      pendingPlacementVisibility: capacity.capacity.pendingPlacement,
      transportReadyVisibility: capacity.capacity.readyForTransfer,
      units,
    });
  }

  private async countChartAccessKind(facilityId: string, kind: ChartAccessKind) {
    const since = new Date(Date.now() - WINDOW_MS);
    const rows = await this.prisma.auditLog.findMany({
      where: {
        facilityId,
        createdAt: { gte: since },
        OR: [
          { action: { in: [AuditAction.CHART_ACCESS, AuditAction.CHART_OPEN] } },
          { entityType: "CHART_ACCESS" },
        ],
      },
      select: { action: true, metadata: true },
      take: 500,
    });
    return rows.filter((r) => classifyChartAccessKind(asMeta(r.metadata), r.action) === kind)
      .length;
  }
}
