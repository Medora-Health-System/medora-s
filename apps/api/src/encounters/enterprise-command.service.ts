/**
 * D4A.2.7 — Enterprise Clinical Command Layer service.
 * Consumes ClinicalSynthesisService + HospitalCensusService only.
 * Never queries orders/results/MAR/diagnoses engines directly.
 * Never enables Placement / D3B. Operational dashboards are not legal records.
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
  ENTERPRISE_COMMAND_LAYER_CERTIFICATION_ID,
  ENTERPRISE_PATIENT_LIST_KINDS,
  ENTERPRISE_TASK_TYPES,
  ENTERPRISE_ALERT_TYPES,
  ENTERPRISE_ESCALATION_STATUSES,
  ENTERPRISE_NOTIFICATION_TARGETS,
  buildCapacityFromCensusSummary,
  buildTrackBoardRowFromCensusAndSynthesis,
  deriveAlertsFromTrackBoard,
  emptyEnterpriseCommandDocV1,
  filterEnterprisePatientList,
  mergeEnterpriseCommandIntoSummary,
  readEnterpriseCommandDoc,
  upsertEnterpriseEscalation,
  upsertEnterpriseTask,
  type EnterprisePatientListKind,
  type EnterpriseCommandTaskV1,
  type EnterpriseCommandEscalationV1,
  type EnterpriseCommandNotificationV1,
  type EnterpriseCommandDocV1,
  type EnterpriseTrackBoardRowV1,
  type HospitalCensusPatientRow,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { ClinicalSynthesisService } from "./clinical-synthesis.service";
import { HospitalCensusService } from "./hospital-census.service";

const SYNTHESIS_BATCH = 8;
const TRACK_BOARD_LIMIT = 80;

type BoardBundle = {
  rows: EnterpriseTrackBoardRowV1[];
  docsByEncounter: Map<string, EnterpriseCommandDocV1>;
  facets: ReturnType<ClinicalSynthesisService["describeCensusFacets"]>;
};

@Injectable()
export class EnterpriseCommandService {
  private readonly logger = new Logger(EnterpriseCommandService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly clinicalSynthesis: ClinicalSynthesisService,
    private readonly hospitalCensus: HospitalCensusService
  ) {}

  /** Parallel bounded enrichment via Clinical Synthesis only. */
  private async loadBoard(facilityId: string): Promise<BoardBundle> {
    const census = await this.hospitalCensus.getHospitalCensus(facilityId, {
      snapshotScope: "ALL_HOSPITAL_CARE",
    });
    const limited = (census.allHospitalPatients ?? []).slice(0, TRACK_BOARD_LIMIT);
    const rows: EnterpriseTrackBoardRowV1[] = [];
    const docsByEncounter = new Map<string, EnterpriseCommandDocV1>();

    for (let i = 0; i < limited.length; i += SYNTHESIS_BATCH) {
      const batch = limited.slice(i, i + SYNTHESIS_BATCH);
      const enriched = await Promise.all(
        batch.map(async (row: HospitalCensusPatientRow) => {
          let synthesis = null;
          let commandDoc = emptyEnterpriseCommandDocV1();
          try {
            synthesis = await this.clinicalSynthesis.buildCommandCenterProjection(
              facilityId,
              row.encounterId
            );
          } catch (err) {
            this.logger.debug(
              `command_layer_synthesis_partial encounter=${row.encounterId} err=${String(err)}`
            );
          }
          try {
            const enc = await this.prisma.encounter.findFirst({
              where: { id: row.encounterId, facilityId },
              select: { admissionSummaryJson: true },
            });
            commandDoc = readEnterpriseCommandDoc(enc?.admissionSummaryJson);
          } catch {
            /* keep empty */
          }
          docsByEncounter.set(row.encounterId, commandDoc);
          return buildTrackBoardRowFromCensusAndSynthesis({
            census: row,
            synthesis,
            commandDoc,
          });
        })
      );
      rows.push(...enriched);
    }

    return {
      rows,
      docsByEncounter,
      facets: this.clinicalSynthesis.describeCensusFacets(),
    };
  }

  private collectOpenTasks(docs: Map<string, EnterpriseCommandDocV1>) {
    const tasks: Array<{
      encounterId: string;
      taskId: string;
      title: string;
      priority: string;
      status: string;
    }> = [];
    for (const [encounterId, doc] of docs) {
      for (const t of doc.tasks) {
        if (t.status === "OPEN" || t.status === "IN_PROGRESS" || t.status === "ESCALATED") {
          tasks.push({
            encounterId,
            taskId: t.taskId,
            title: t.title,
            priority: t.priority,
            status: t.status,
          });
        }
      }
    }
    return tasks;
  }

  async getTrackBoard(facilityId: string, actorUserId: string) {
    const board = await this.loadBoard(facilityId);
    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, "EnterpriseCommand", {
      userId: actorUserId,
      facilityId,
      metadata: {
        event: "ENTERPRISE_TRACK_BOARD_VIEWED",
        rowCount: board.rows.length,
      },
    });
    return {
      certification: ENTERPRISE_COMMAND_LAYER_CERTIFICATION_ID,
      generatedAt: new Date().toISOString(),
      facilityId,
      rows: board.rows,
      facets: board.facets,
      consumesClinicalSynthesis: true as const,
      neverLegalRecord: true as const,
      placementLogicEnabled: false as const,
    };
  }

  async getCommandCenterDashboard(facilityId: string, actorUserId: string) {
    const census = await this.hospitalCensus.getHospitalCensus(facilityId, {
      snapshotScope: "ALL_HOSPITAL_CARE",
    });
    const board = await this.loadBoard(facilityId);
    const capacity = buildCapacityFromCensusSummary({
      summary: census.summary,
      operationalSnapshot: census.operationalSnapshot,
    });
    const openTasks = this.collectOpenTasks(board.docsByEncounter).length;
    const derived = deriveAlertsFromTrackBoard(board.rows);
    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, "EnterpriseCommand", {
      userId: actorUserId,
      facilityId,
      metadata: { event: "ENTERPRISE_COMMAND_CENTER_VIEWED", rowCount: board.rows.length },
    });
    return {
      certification: ENTERPRISE_COMMAND_LAYER_CERTIFICATION_ID,
      generatedAt: new Date().toISOString(),
      facilityId,
      capacity,
      trackBoardCount: board.rows.length,
      openTasks,
      openEscalations: derived.length,
      criticalAlerts: derived.filter((a) =>
        ["CRITICAL_LAB", "CRITICAL_IMAGING", "CODE_BLUE", "STROKE", "STEMI", "SEPSIS"].includes(
          a.alertType
        )
      ).length,
      pendingConsults: board.rows.reduce((a, r) => a + r.pendingConsult, 0),
      pendingImaging: board.rows.reduce((a, r) => a + r.pendingImaging, 0),
      dischargeReady: board.rows.filter((r) => r.dischargeReady).length,
      neverEditProviderNotes: true as const,
      neverEditNursingDocumentation: true as const,
      consumesClinicalSynthesis: true as const,
      rowsPreview: board.rows.slice(0, 20),
      aiBoundary: {
        structured: true as const,
        provenance: "CLINICAL_SYNTHESIS" as const,
        operationalState: true as const,
        warnings: true as const,
        availability: true as const,
        aiImplemented: false as const,
        noAiDocumentation: true as const,
      },
    };
  }

  async getPatientList(
    facilityId: string,
    actorUserId: string,
    kindRaw: string,
    query?: string | null
  ) {
    const kind = String(kindRaw ?? "").trim().toUpperCase() as EnterprisePatientListKind;
    if (!(ENTERPRISE_PATIENT_LIST_KINDS as readonly string[]).includes(kind)) {
      throw new BadRequestException("Invalid patient list kind");
    }
    const board = await this.loadBoard(facilityId);
    const rows = filterEnterprisePatientList(board.rows, kind, query);
    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, "EnterpriseCommand", {
      userId: actorUserId,
      facilityId,
      metadata: { event: "ENTERPRISE_PATIENT_LIST_VIEWED", kind, rowCount: rows.length },
    });
    return {
      certification: ENTERPRISE_COMMAND_LAYER_CERTIFICATION_ID,
      kind,
      rows,
      consumesClinicalSynthesis: true as const,
    };
  }

  async getCapacity(facilityId: string, actorUserId: string) {
    const census = await this.hospitalCensus.getHospitalCensus(facilityId, {
      snapshotScope: "ALL_HOSPITAL_CARE",
    });
    const capacity = buildCapacityFromCensusSummary({
      summary: census.summary,
      operationalSnapshot: census.operationalSnapshot,
    });
    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, "EnterpriseCommand", {
      userId: actorUserId,
      facilityId,
      metadata: { event: "ENTERPRISE_CAPACITY_VIEWED" },
    });
    return {
      certification: ENTERPRISE_COMMAND_LAYER_CERTIFICATION_ID,
      capacity,
      inferredCapacity: false as const,
      placementLogicEnabled: false as const,
    };
  }

  async getAlerts(facilityId: string, actorUserId: string) {
    const board = await this.loadBoard(facilityId);
    const alerts = deriveAlertsFromTrackBoard(board.rows);
    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, "EnterpriseCommand", {
      userId: actorUserId,
      facilityId,
      metadata: { event: "ENTERPRISE_ALERTS_VIEWED", alertCount: alerts.length },
    });
    return {
      certification: ENTERPRISE_COMMAND_LAYER_CERTIFICATION_ID,
      alerts,
      neverAutoAcknowledge: true as const,
      consumesClinicalSynthesis: true as const,
    };
  }

  async getEscalations(facilityId: string, actorUserId: string) {
    const board = await this.loadBoard(facilityId);
    const escalations: Array<EnterpriseCommandEscalationV1 & { encounterId: string }> = [];
    for (const [encounterId, doc] of board.docsByEncounter) {
      for (const e of doc.escalations) {
        escalations.push({ ...e, encounterId });
      }
    }
    return {
      certification: ENTERPRISE_COMMAND_LAYER_CERTIFICATION_ID,
      escalations,
      neverAutoAcknowledge: true as const,
    };
  }

  async getNotifications(facilityId: string, actorUserId: string) {
    const board = await this.loadBoard(facilityId);
    const notifications: Array<EnterpriseCommandNotificationV1 & { encounterId: string }> = [];
    for (const [encounterId, doc] of board.docsByEncounter) {
      for (const n of doc.notifications) {
        notifications.push({ ...n, encounterId });
      }
    }
    return {
      certification: ENTERPRISE_COMMAND_LAYER_CERTIFICATION_ID,
      notifications,
      operationalOnly: true as const,
      neverDocumentation: true as const,
    };
  }

  async getTasks(facilityId: string, actorUserId: string) {
    const board = await this.loadBoard(facilityId);
    return {
      certification: ENTERPRISE_COMMAND_LAYER_CERTIFICATION_ID,
      tasks: this.collectOpenTasks(board.docsByEncounter),
      operationalOnly: true as const,
      neverProviderDocumentation: true as const,
    };
  }

  async getEncounterCommandDetail(facilityId: string, encounterId: string) {
    const synthesis = await this.clinicalSynthesis.buildCommandCenterProjection(
      facilityId,
      encounterId
    );
    const enc = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: { admissionSummaryJson: true, patientId: true },
    });
    if (!enc) throw new NotFoundException("Encounter not found");
    const commandDoc = readEnterpriseCommandDoc(enc.admissionSummaryJson);
    return {
      certification: ENTERPRISE_COMMAND_LAYER_CERTIFICATION_ID,
      synthesis,
      commandDoc,
      timelineReuse: {
        endpoint: "unified-timeline",
        duplicated: false as const,
        widgets: ["TRACK_BOARD", "COMMAND_CENTER", "PATIENT_LISTS", "MOBILE", "EXECUTIVE"] as const,
      },
      neverLegalRecord: true as const,
    };
  }

  async upsertTask(
    facilityId: string,
    encounterId: string,
    actorUserId: string,
    body: {
      task: EnterpriseCommandTaskV1;
      expectedVersion: number;
    }
  ) {
    if (!(ENTERPRISE_TASK_TYPES as readonly string[]).includes(body.task.type)) {
      throw new BadRequestException("Invalid task type");
    }
    const enc = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: { id: true, patientId: true, admissionSummaryJson: true },
    });
    if (!enc) throw new NotFoundException("Encounter not found");
    const doc = readEnterpriseCommandDoc(enc.admissionSummaryJson);
    const result = upsertEnterpriseTask({
      doc,
      task: body.task,
      clientExpectedVersion: Number(body.expectedVersion),
      actorUserId,
    });
    if (!result.ok) throw new ConflictException(result.code);
    await this.prisma.encounter.update({
      where: { id: enc.id },
      data: {
        admissionSummaryJson: mergeEnterpriseCommandIntoSummary(
          enc.admissionSummaryJson,
          result.doc
        ) as Prisma.InputJsonValue,
        version: { increment: 1 },
      },
      select: { id: true },
    });
    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, "EnterpriseCommand", {
      userId: actorUserId,
      facilityId,
      patientId: enc.patientId,
      entityId: enc.id,
      metadata: {
        event: "ENTERPRISE_TASK_UPDATED",
        taskId: body.task.taskId,
        status: body.task.status,
      },
    });
    return { commandDoc: result.doc };
  }

  async upsertEscalation(
    facilityId: string,
    encounterId: string,
    actorUserId: string,
    body: {
      escalation: EnterpriseCommandEscalationV1;
      expectedVersion: number;
    }
  ) {
    if (!(ENTERPRISE_ALERT_TYPES as readonly string[]).includes(body.escalation.alertType)) {
      throw new BadRequestException("Invalid alert type");
    }
    if (
      !(ENTERPRISE_ESCALATION_STATUSES as readonly string[]).includes(body.escalation.status)
    ) {
      throw new BadRequestException("Invalid escalation status");
    }
    const enc = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: { id: true, patientId: true, admissionSummaryJson: true },
    });
    if (!enc) throw new NotFoundException("Encounter not found");
    const doc = readEnterpriseCommandDoc(enc.admissionSummaryJson);
    const result = upsertEnterpriseEscalation({
      doc,
      escalation: body.escalation,
      clientExpectedVersion: Number(body.expectedVersion),
      actorUserId,
    });
    if (!result.ok) throw new ConflictException(result.code);
    await this.prisma.encounter.update({
      where: { id: enc.id },
      data: {
        admissionSummaryJson: mergeEnterpriseCommandIntoSummary(
          enc.admissionSummaryJson,
          result.doc
        ) as Prisma.InputJsonValue,
        version: { increment: 1 },
      },
      select: { id: true },
    });
    const closed = body.escalation.status === "RESOLVED" || body.escalation.status === "CANCELLED";
    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, "EnterpriseCommand", {
      userId: actorUserId,
      facilityId,
      patientId: enc.patientId,
      entityId: enc.id,
      critical: true,
      metadata: {
        event: closed ? "ENTERPRISE_ESCALATION_CLOSED" : "ENTERPRISE_ALERT_ESCALATED",
        escalationId: body.escalation.escalationId,
        status: body.escalation.status,
      },
    });
    return { commandDoc: result.doc };
  }

  async postNotification(
    facilityId: string,
    encounterId: string,
    actorUserId: string,
    body: {
      notification: EnterpriseCommandNotificationV1;
      expectedVersion: number;
    }
  ) {
    if (
      !(ENTERPRISE_NOTIFICATION_TARGETS as readonly string[]).includes(body.notification.target)
    ) {
      throw new BadRequestException("Invalid notification target");
    }
    const enc = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: { id: true, patientId: true, admissionSummaryJson: true },
    });
    if (!enc) throw new NotFoundException("Encounter not found");
    const doc = readEnterpriseCommandDoc(enc.admissionSummaryJson);
    if (Number(body.expectedVersion) !== doc.expectedVersion) {
      throw new ConflictException("ENTERPRISE_COMMAND_STALE");
    }
    const at = new Date().toISOString();
    const next: EnterpriseCommandDocV1 = {
      ...doc,
      notifications: [
        ...doc.notifications,
        { ...body.notification, operationalOnly: true as const, deliveredAt: at },
      ],
      expectedVersion: doc.expectedVersion + 1,
      updatedAt: at,
      updatedByUserId: actorUserId,
    };
    await this.prisma.encounter.update({
      where: { id: enc.id },
      data: {
        admissionSummaryJson: mergeEnterpriseCommandIntoSummary(
          enc.admissionSummaryJson,
          next
        ) as Prisma.InputJsonValue,
        version: { increment: 1 },
      },
      select: { id: true },
    });
    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, "EnterpriseCommand", {
      userId: actorUserId,
      facilityId,
      patientId: enc.patientId,
      entityId: enc.id,
      metadata: {
        event: "ENTERPRISE_NOTIFICATION_DELIVERED",
        notificationId: body.notification.notificationId,
        target: body.notification.target,
      },
    });
    return { commandDoc: next };
  }

  async getExecutiveSummary(facilityId: string, actorUserId: string) {
    const dash = await this.getCommandCenterDashboard(facilityId, actorUserId);
    const occ =
      dash.capacity.bedsTotal && dash.capacity.bedsOccupied != null && dash.capacity.bedsTotal > 0
        ? Math.round((dash.capacity.bedsOccupied / dash.capacity.bedsTotal) * 100)
        : null;
    const avgLos =
      dash.rowsPreview.length > 0
        ? Math.round(
            dash.rowsPreview.reduce((a, r) => a + (r.losHours ?? 0), 0) / dash.rowsPreview.length
          )
        : null;
    return {
      certification: ENTERPRISE_COMMAND_LAYER_CERTIFICATION_ID,
      generatedAt: dash.generatedAt,
      facilityId,
      census: dash.capacity.activeHospitalPatients,
      admissionsToday: dash.capacity.admissionsToday,
      dischargesToday: dash.capacity.dischargesToday,
      averageLosHours: avgLos,
      capacityOccupancyPct: occ,
      criticalAlerts: dash.criticalAlerts,
      pendingConsult: dash.pendingConsults,
      pendingPlacement: dash.capacity.pendingPlacement,
      transfersReady: dash.capacity.readyForTransfer,
      phiMinimized: true as const,
      readOnly: true as const,
    };
  }

  async getMobileContract(facilityId: string, actorUserId: string) {
    const board = await this.loadBoard(facilityId);
    const alerts = deriveAlertsFromTrackBoard(board.rows).slice(0, 20);
    const tasks = this.collectOpenTasks(board.docsByEncounter).slice(0, 40);
    const notifications: Array<{ notificationId: string; title: string; target: string }> = [];
    for (const doc of board.docsByEncounter.values()) {
      for (const n of doc.notifications.slice(-5)) {
        notifications.push({
          notificationId: n.notificationId,
          title: n.title,
          target: n.target,
        });
      }
    }
    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, "EnterpriseCommand", {
      userId: actorUserId,
      facilityId,
      metadata: { event: "ENTERPRISE_MOBILE_CONTRACT_VIEWED", rowCount: board.rows.length },
    });
    return {
      certification: ENTERPRISE_COMMAND_LAYER_CERTIFICATION_ID,
      trackBoardLite: board.rows.slice(0, 40).map((r) => ({
        encounterId: r.encounterId,
        patientName: r.patientName,
        unitRoomBed: [r.unit, r.room, r.bed].filter(Boolean).join("-") || null,
        status: r.status,
        criticalUnacknowledged: r.criticalUnacknowledged,
        dischargeReady: r.dischargeReady,
      })),
      criticalAlerts: alerts.map((a, i) => ({
        escalationId: `derived-${a.encounterId}-${i}`,
        summary: a.summary,
        alertType: a.alertType,
      })),
      openTasks: tasks.map((t) => ({
        taskId: t.taskId,
        title: t.title,
        priority: t.priority,
      })),
      notifications: notifications.slice(0, 40),
      mobileUiImplemented: false as const,
    };
  }

  async getPatientFlow(facilityId: string, actorUserId: string) {
    const census = await this.hospitalCensus.getHospitalCensus(facilityId, {
      snapshotScope: "ALL_HOSPITAL_CARE",
    });
    const capacity = buildCapacityFromCensusSummary({
      summary: census.summary,
      operationalSnapshot: census.operationalSnapshot,
    });
    const board = await this.loadBoard(facilityId);
    return {
      certification: ENTERPRISE_COMMAND_LAYER_CERTIFICATION_ID,
      placementLogicEnabled: false as const,
      flow: {
        admissionsToday: capacity.admissionsToday,
        dischargesToday: capacity.dischargesToday,
        observation: capacity.activeObservation,
        inpatient: capacity.activeInpatient,
        awaitingBed: capacity.awaitingBed,
        cleaning: capacity.bedsCleaning,
        availableBeds: capacity.bedsAvailable,
        occupiedBeds: capacity.bedsOccupied,
        pendingPlacementVisibilityOnly: capacity.pendingPlacement,
        readyForTransfer: capacity.readyForTransfer,
        dischargeReadyPatients: board.rows.filter((r) => r.dischargeReady).length,
      },
      note: "Operational visibility only — Placement workflows are not enabled.",
    };
  }

  async getAiBoundaryContract() {
    return {
      certification: ENTERPRISE_COMMAND_LAYER_CERTIFICATION_ID,
      structured: true as const,
      provenance: true as const,
      operationalState: true as const,
      warnings: true as const,
      availability: true as const,
      aiImplemented: false as const,
      noAiDocumentation: true as const,
    };
  }
}
