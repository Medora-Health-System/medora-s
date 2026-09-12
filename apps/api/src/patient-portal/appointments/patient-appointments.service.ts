import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { PatientPortalAccessContext } from "../auth/patient-portal.types";
import { PatientPortalAuditService } from "../patient-portal-audit.service";

const PATIENT_APPOINTMENT_SELECT = {
  id: true,
  facilityId: true,
  patientId: true,
  status: true,
  scheduledStartAt: true,
  scheduledEndAt: true,
  arrivedAt: true,
  checkedInAt: true,
  completedAt: true,
  cancelledAt: true,
  encounterId: true,
  reason: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class PatientAppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: PatientPortalAuditService
  ) {}

  async list(
    access: PatientPortalAccessContext,
    context: { ip?: string | null; userAgent?: string | null }
  ) {
    const rows = await this.prisma.appointment.findMany({
      where: {
        facilityId: access.facilityId,
        patientId: access.patientId,
      },
      select: PATIENT_APPOINTMENT_SELECT,
      orderBy: { scheduledStartAt: "desc" },
      take: 100,
    });

    await this.audit.record("PATIENT_PORTAL_APPOINTMENT_LIST_VIEW", "APPOINTMENT_LIST", {
      portalAccountId: access.portalAccountId,
      sessionId: access.sessionId,
      facilityId: access.facilityId,
      patientId: access.patientId,
      ip: context.ip,
      userAgent: context.userAgent,
      metadata: { count: rows.length },
    });

    return {
      appointments: rows.map((row) => ({
        id: row.id,
        status: row.status,
        scheduledStartAt: row.scheduledStartAt.toISOString(),
        scheduledEndAt: row.scheduledEndAt?.toISOString() ?? null,
        arrivedAt: row.arrivedAt?.toISOString() ?? null,
        checkedInAt: row.checkedInAt?.toISOString() ?? null,
        completedAt: row.completedAt?.toISOString() ?? null,
        cancelledAt: row.cancelledAt?.toISOString() ?? null,
        encounterId: row.encounterId,
        reason: row.reason,
      })),
    };
  }

  async get(
    access: PatientPortalAccessContext,
    appointmentId: string,
    context: { ip?: string | null; userAgent?: string | null }
  ) {
    const row = await this.prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        facilityId: access.facilityId,
        patientId: access.patientId,
      },
      select: PATIENT_APPOINTMENT_SELECT,
    });
    if (!row) throw new NotFoundException("Appointment not found");

    await this.audit.record("PATIENT_PORTAL_APPOINTMENT_VIEW", "APPOINTMENT", {
      portalAccountId: access.portalAccountId,
      sessionId: access.sessionId,
      facilityId: access.facilityId,
      patientId: access.patientId,
      entityId: row.id,
      ip: context.ip,
      userAgent: context.userAgent,
    });

    return {
      id: row.id,
      status: row.status,
      scheduledStartAt: row.scheduledStartAt.toISOString(),
      scheduledEndAt: row.scheduledEndAt?.toISOString() ?? null,
      arrivedAt: row.arrivedAt?.toISOString() ?? null,
      checkedInAt: row.checkedInAt?.toISOString() ?? null,
      completedAt: row.completedAt?.toISOString() ?? null,
      cancelledAt: row.cancelledAt?.toISOString() ?? null,
      encounterId: row.encounterId,
      reason: row.reason,
    };
  }
}
