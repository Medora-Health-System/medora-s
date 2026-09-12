import { Injectable } from "@nestjs/common";
import { AppointmentStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import type { PatientPortalAccessContext } from "../auth/patient-portal.types";
import { PatientPortalAuditService } from "../patient-portal-audit.service";

@Injectable()
export class PatientDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: PatientPortalAuditService
  ) {}

  async get(
    access: PatientPortalAccessContext,
    context: { ip?: string | null; userAgent?: string | null }
  ) {
    const now = new Date();
    const [facility, nextAppointment, lastVisit, recentOrders] = await Promise.all([
      this.prisma.facility.findFirst({
        where: { id: access.facilityId, isActive: true },
        select: {
          id: true,
          name: true,
          country: true,
          timezone: true,
          defaultLanguage: true,
        },
      }),
      this.prisma.appointment.findFirst({
        where: {
          facilityId: access.facilityId,
          patientId: access.patientId,
          scheduledStartAt: { gte: now },
          status: {
            notIn: [
              AppointmentStatus.CANCELLED,
              AppointmentStatus.COMPLETED,
              AppointmentStatus.NO_SHOW,
            ],
          },
        },
        select: {
          id: true,
          status: true,
          scheduledStartAt: true,
          scheduledEndAt: true,
          reason: true,
        },
        orderBy: { scheduledStartAt: "asc" },
      }),
      this.prisma.encounter.findFirst({
        where: {
          facilityId: access.facilityId,
          patientId: access.patientId,
        },
        select: {
          id: true,
          type: true,
          status: true,
          createdAt: true,
          admittedAt: true,
          chiefComplaint: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.order.findMany({
        where: {
          facilityId: access.facilityId,
          patientId: access.patientId,
          cancelledAt: null,
        },
        select: {
          id: true,
          encounterId: true,
          createdAt: true,
          items: {
            select: {
              id: true,
              catalogItemType: true,
              manualLabel: true,
              result: {
                select: {
                  verifiedAt: true,
                  criticalValue: true,
                  effectiveResultedAt: true,
                  effectiveFinalizedAt: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 40,
      }),
    ]);

    const recentResults = recentOrders
      .flatMap((order) =>
        order.items.flatMap((item) => {
          if (
            (item.catalogItemType !== "LAB_TEST" && item.catalogItemType !== "IMAGING_STUDY") ||
            !item.result?.verifiedAt
          ) {
            return [];
          }
          const clinicalAt =
            item.catalogItemType === "LAB_TEST"
              ? item.result.effectiveResultedAt ?? item.result.verifiedAt
              : item.result.effectiveFinalizedAt ?? item.result.verifiedAt;
          return [
            {
              id: item.id,
              kind: item.catalogItemType === "LAB_TEST" ? "LAB" : "IMAGING",
              title:
                item.manualLabel?.trim() ||
                (item.catalogItemType === "LAB_TEST" ? "Laboratory result" : "Imaging result"),
              verifiedAt: item.result.verifiedAt.toISOString(),
              clinicalAt: clinicalAt.toISOString(),
              criticalValue: item.result.criticalValue,
            },
          ];
        })
      )
      .sort((a, b) => b.clinicalAt.localeCompare(a.clinicalAt))
      .slice(0, 5);

    await this.audit.record("PATIENT_PORTAL_DASHBOARD_VIEW", "PATIENT_PORTAL_DASHBOARD", {
      portalAccountId: access.portalAccountId,
      sessionId: access.sessionId,
      facilityId: access.facilityId,
      patientId: access.patientId,
      ip: context.ip,
      userAgent: context.userAgent,
      metadata: { recentResultCount: recentResults.length },
    });

    return {
      facility,
      nextAppointment: nextAppointment
        ? {
            id: nextAppointment.id,
            status: nextAppointment.status,
            scheduledStartAt: nextAppointment.scheduledStartAt.toISOString(),
            scheduledEndAt: nextAppointment.scheduledEndAt?.toISOString() ?? null,
            reason: nextAppointment.reason,
          }
        : null,
      lastVisit: lastVisit
        ? {
            id: lastVisit.id,
            visitDate: (lastVisit.admittedAt ?? lastVisit.createdAt).toISOString(),
            visitType: lastVisit.type,
            status: lastVisit.status,
            chiefComplaint: lastVisit.chiefComplaint,
          }
        : null,
      recentResults,
    };
  }
}
