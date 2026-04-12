import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AuditAction,
  MsppAlertInvestigationEventAction,
  MsppAlertInvestigationStatus,
  MsppAlertTriageStatus,
  MsppRoleCode,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import type { MsppAlertTriageVerifyDto } from "./dto/mspp-alert-triage.dto";
import type {
  MsppAlertInvestigationOpenInput,
  MsppAlertInvestigationStatusInput,
} from "./dto/mspp-alert-investigation.dto";

const ASSIGNEE_ROLES: MsppRoleCode[] = [
  MsppRoleCode.MSPP_MINISTRE,
  MsppRoleCode.MSPP_EPIDEMIOLOGIE,
  MsppRoleCode.MSPP_VALIDATOR_DEPT,
  MsppRoleCode.MSPP_VALIDATOR_CENTRAL,
];

@Injectable()
export class MsppAlertInvestigationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  private displayName(u: { firstName: string; lastName: string }): string {
    return `${u.firstName} ${u.lastName}`.trim();
  }

  private async assertAssignableMsppUser(userId: string | null): Promise<void> {
    if (!userId) return;
    const ok = await this.prisma.msppUserRoleAssignment.findFirst({
      where: {
        userId,
        isActive: true,
        role: { in: ASSIGNEE_ROLES },
      },
    });
    if (!ok) {
      throw new BadRequestException("Le responsable doit avoir un rôle MSPP opérationnel actif.");
    }
  }

  private async upsertTriageStub(
    dto: MsppAlertTriageVerifyDto
  ): Promise<{ id: string; alertKey: string }> {
    const wcs = new Date(dto.window.currentStart);
    const wce = new Date(dto.window.currentEnd);
    const row = await this.prisma.msppAlertTriage.upsert({
      where: { alertKey: dto.alertKey },
      create: {
        alertKey: dto.alertKey,
        windowCurrentStart: wcs,
        windowCurrentEnd: wce,
        scope: dto.scope,
        escalationLevel: dto.escalationLevel,
        diseaseCode: dto.diseaseCode,
        departmentId: dto.departmentId,
        geoCommuneId: dto.geoCommuneId,
        triageStatus: MsppAlertTriageStatus.NEW,
      },
      update: {},
    });
    return { id: row.id, alertKey: row.alertKey };
  }

  private investigationInclude() {
    return {
      assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
      openedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
    } as const;
  }

  private toCompactDto(inv: {
    id: string;
    alertKey: string;
    diseaseCode: string;
    escalationLevel: string;
    departmentId: string;
    geoCommuneId: string | null;
    investigationStatus: MsppAlertInvestigationStatus;
    openedAt: Date;
    summary: string | null;
    openedByUserId: string;
    assignedToUserId: string | null;
    updatedAt: Date;
    assignedTo: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    } | null;
    openedBy: { id: string; firstName: string; lastName: string; email: string };
  }) {
    return {
      id: inv.id,
      alertKey: inv.alertKey,
      diseaseCode: inv.diseaseCode,
      escalationLevel: inv.escalationLevel,
      departmentId: inv.departmentId,
      geoCommuneId: inv.geoCommuneId,
      investigationStatus: inv.investigationStatus,
      openedAt: inv.openedAt.toISOString(),
      summary: inv.summary,
      openedByUserId: inv.openedByUserId,
      openedByDisplayName: this.displayName(inv.openedBy),
      assignedToUserId: inv.assignedToUserId,
      assignedToDisplayName: inv.assignedTo ? this.displayName(inv.assignedTo) : null,
      updatedAt: inv.updatedAt.toISOString(),
    };
  }

  async listInvestigations(options?: { limit?: number }) {
    const take = Math.min(Math.max(options?.limit ?? 100, 1), 200);
    const rows = await this.prisma.msppAlertInvestigation.findMany({
      orderBy: { updatedAt: "desc" },
      take,
      include: this.investigationInclude(),
    });
    return { investigations: rows.map((r) => this.toCompactDto(r)) };
  }

  async getInvestigationDetail(alertKey: string) {
    const k = alertKey?.trim();
    if (!k || k.length < 16) {
      throw new BadRequestException("Clé d'alerte invalide.");
    }
    const inv = await this.prisma.msppAlertInvestigation.findUnique({
      where: { alertKey: k },
      include: {
        ...this.investigationInclude(),
        events: {
          orderBy: { createdAt: "desc" },
          take: 200,
          include: {
            createdBy: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!inv) {
      throw new NotFoundException("Investigation introuvable pour cette clé d'alerte.");
    }
    return {
      investigation: this.toCompactDto(inv),
      events: inv.events.map((e) => ({
        id: e.id,
        action: e.action,
        note: e.note,
        statusBefore: e.statusBefore,
        statusAfter: e.statusAfter,
        assignedToUserId: e.assignedToUserId,
        createdByUserId: e.createdByUserId,
        createdByDisplayName: this.displayName(e.createdBy),
        createdAt: e.createdAt.toISOString(),
      })),
    };
  }

  async batchByAlertKeys(alertKeys: string[]) {
    if (alertKeys.length === 0) return { investigations: [] };
    const rows = await this.prisma.msppAlertInvestigation.findMany({
      where: { alertKey: { in: alertKeys } },
      include: this.investigationInclude(),
    });
    return { investigations: rows.map((r) => this.toCompactDto(r)) };
  }

  async openInvestigation(dto: MsppAlertInvestigationOpenInput, actorUserId: string) {
    const stub = await this.upsertTriageStub(dto);
    const existing = await this.prisma.msppAlertInvestigation.findUnique({
      where: { alertKey: dto.alertKey },
      include: this.investigationInclude(),
    });
    if (existing) {
      return {
        alreadyExists: true as const,
        investigation: this.toCompactDto(existing),
      };
    }

    const created = await this.prisma.msppAlertInvestigation.create({
      data: {
        alertKey: dto.alertKey,
        msppAlertTriageId: stub.id,
        diseaseCode: dto.diseaseCode,
        escalationLevel: dto.escalationLevel,
        departmentId: dto.departmentId,
        geoCommuneId: dto.geoCommuneId,
        investigationStatus: MsppAlertInvestigationStatus.OPEN,
        openedByUserId: actorUserId,
        summary: dto.summary?.trim() ? dto.summary.trim() : null,
      },
      include: this.investigationInclude(),
    });

    await this.prisma.msppAlertInvestigationEvent.create({
      data: {
        investigationId: created.id,
        action: MsppAlertInvestigationEventAction.OPENED,
        note: dto.summary?.trim() ? dto.summary.trim() : null,
        statusAfter: MsppAlertInvestigationStatus.OPEN,
        createdByUserId: actorUserId,
      },
    });

    await this.audit.log(AuditAction.CREATE, "MsppAlertInvestigation", {
      userId: actorUserId,
      entityId: created.id,
      metadata: { alertKey: dto.alertKey, action: "OPEN" },
    });

    return { alreadyExists: false as const, investigation: this.toCompactDto(created) };
  }

  async updateInvestigationStatus(dto: MsppAlertInvestigationStatusInput, actorUserId: string) {
    await this.upsertTriageStub(dto);
    const inv = await this.prisma.msppAlertInvestigation.findUnique({
      where: { alertKey: dto.alertKey },
    });
    if (!inv) {
      throw new NotFoundException("Aucune investigation pour cette alerte. Ouvrez d'abord une investigation.");
    }
    const before = inv.investigationStatus;
    const updated = await this.prisma.msppAlertInvestigation.update({
      where: { id: inv.id },
      data: { investigationStatus: dto.investigationStatus },
      include: this.investigationInclude(),
    });

    await this.prisma.msppAlertInvestigationEvent.create({
      data: {
        investigationId: inv.id,
        action: MsppAlertInvestigationEventAction.STATUS_CHANGED,
        statusBefore: before,
        statusAfter: dto.investigationStatus,
        createdByUserId: actorUserId,
      },
    });

    await this.audit.log(AuditAction.UPDATE, "MsppAlertInvestigation", {
      userId: actorUserId,
      entityId: inv.id,
      metadata: {
        alertKey: dto.alertKey,
        action: "STATUS",
        statusBefore: before,
        statusAfter: dto.investigationStatus,
      },
    });

    return { investigation: this.toCompactDto(updated) };
  }

  async addInvestigationNote(
    dto: MsppAlertTriageVerifyDto & { note: string },
    actorUserId: string
  ) {
    await this.upsertTriageStub(dto);
    const inv = await this.prisma.msppAlertInvestigation.findUnique({
      where: { alertKey: dto.alertKey },
    });
    if (!inv) {
      throw new NotFoundException("Aucune investigation pour cette alerte. Ouvrez d'abord une investigation.");
    }

    await this.prisma.msppAlertInvestigationEvent.create({
      data: {
        investigationId: inv.id,
        action: MsppAlertInvestigationEventAction.NOTE_ADDED,
        note: dto.note.trim(),
        createdByUserId: actorUserId,
      },
    });

    await this.prisma.msppAlertInvestigation.update({
      where: { id: inv.id },
      data: { updatedAt: new Date() },
    });

    await this.audit.log(AuditAction.UPDATE, "MsppAlertInvestigation", {
      userId: actorUserId,
      entityId: inv.id,
      metadata: { alertKey: dto.alertKey, action: "NOTE" },
    });

    return { ok: true as const };
  }

  async assignInvestigation(
    dto: MsppAlertTriageVerifyDto & { assignedToUserId: string | null },
    actorUserId: string
  ) {
    if (dto.assignedToUserId) {
      await this.assertAssignableMsppUser(dto.assignedToUserId);
    }
    await this.upsertTriageStub(dto);
    const inv = await this.prisma.msppAlertInvestigation.findUnique({
      where: { alertKey: dto.alertKey },
    });
    if (!inv) {
      throw new NotFoundException("Aucune investigation pour cette alerte. Ouvrez d'abord une investigation.");
    }

    const updated = await this.prisma.msppAlertInvestigation.update({
      where: { id: inv.id },
      data: { assignedToUserId: dto.assignedToUserId },
      include: this.investigationInclude(),
    });

    await this.prisma.msppAlertInvestigationEvent.create({
      data: {
        investigationId: inv.id,
        action: MsppAlertInvestigationEventAction.ASSIGNED,
        assignedToUserId: dto.assignedToUserId,
        createdByUserId: actorUserId,
      },
    });

    await this.audit.log(AuditAction.UPDATE, "MsppAlertInvestigation", {
      userId: actorUserId,
      entityId: inv.id,
      metadata: {
        alertKey: dto.alertKey,
        action: "ASSIGN",
        assignedToUserId: dto.assignedToUserId,
      },
    });

    return { investigation: this.toCompactDto(updated) };
  }
}
