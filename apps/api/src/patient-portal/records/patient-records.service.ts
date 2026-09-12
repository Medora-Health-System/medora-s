import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { PatientPortalAccessContext } from "../auth/patient-portal.types";
import { PatientPortalAuditService } from "../patient-portal-audit.service";

const PATIENT_VISIT_LIST_SELECT = {
  id: true,
  facilityId: true,
  patientId: true,
  type: true,
  status: true,
  workflowState: true,
  createdAt: true,
  admittedAt: true,
  chiefComplaint: true,
  physicianAssigned: {
    select: {
      firstName: true,
      lastName: true,
    },
  },
} as const;

@Injectable()
export class PatientRecordsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: PatientPortalAuditService
  ) {}

  private providerName(provider: { firstName: string; lastName: string } | null): string | null {
    if (!provider) return null;
    const value = `${provider.firstName ?? ""} ${provider.lastName ?? ""}`.trim();
    return value || null;
  }

  async listVisits(
    access: PatientPortalAccessContext,
    context: { ip?: string | null; userAgent?: string | null }
  ) {
    const rows = await this.prisma.encounter.findMany({
      where: {
        facilityId: access.facilityId,
        patientId: access.patientId,
      },
      select: PATIENT_VISIT_LIST_SELECT,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    await this.audit.record("PATIENT_PORTAL_VISIT_LIST_VIEW", "ENCOUNTER_LIST", {
      portalAccountId: access.portalAccountId,
      sessionId: access.sessionId,
      facilityId: access.facilityId,
      patientId: access.patientId,
      ip: context.ip,
      userAgent: context.userAgent,
      metadata: { count: rows.length },
    });

    return {
      visits: rows.map((row) => ({
        id: row.id,
        visitDate: (row.admittedAt ?? row.createdAt).toISOString(),
        visitType: row.type,
        status: row.status,
        workflowState: row.workflowState,
        chiefComplaint: row.chiefComplaint,
        providerDisplayName: this.providerName(row.physicianAssigned),
      })),
    };
  }

  async getVisit(
    access: PatientPortalAccessContext,
    encounterId: string,
    context: { ip?: string | null; userAgent?: string | null }
  ) {
    const row = await this.prisma.encounter.findFirst({
      where: {
        id: encounterId,
        facilityId: access.facilityId,
        patientId: access.patientId,
      },
      select: PATIENT_VISIT_LIST_SELECT,
    });
    if (!row) {
      // 404 intentionally avoids confirming that a foreign encounter exists.
      throw new NotFoundException("Visit not found");
    }

    await this.audit.record("PATIENT_PORTAL_VISIT_VIEW", "ENCOUNTER", {
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
      visitDate: (row.admittedAt ?? row.createdAt).toISOString(),
      visitType: row.type,
      status: row.status,
      workflowState: row.workflowState,
      chiefComplaint: row.chiefComplaint,
      providerDisplayName: this.providerName(row.physicianAssigned),
    };
  }
}
