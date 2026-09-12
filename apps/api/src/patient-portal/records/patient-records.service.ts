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

type RequestContext = { ip?: string | null; userAgent?: string | null };

type AllergyEntry = {
  id: string;
  substance: string;
  reaction: string | null;
  severity: string | null;
  verificationStatus: string | null;
  status: string;
  updatedAt: string | null;
};

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

  private object(value: unknown): Record<string, unknown> | null {
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  }

  private text(value: unknown, max = 1000): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, max) : null;
  }

  private allergyProjection(raw: unknown) {
    const profile = this.object(raw);
    const allergies = this.object(profile?.allergies);
    if (!allergies) {
      return {
        availability: "NOT_DOCUMENTED" as const,
        nkda: false,
        dataConflict: false,
        active: [] as AllergyEntry[],
        inactive: [] as AllergyEntry[],
        legacySummary: null,
      };
    }

    const selections = Array.isArray(allergies.allergyDetailSelections)
      ? allergies.allergyDetailSelections.filter((v): v is string => typeof v === "string")
      : [];
    const rawNkda = allergies.nkda === true || selections.includes("NKDA");

    const entries = Array.isArray(allergies.entries) ? allergies.entries : [];
    const projected = entries
      .slice(0, 80)
      .map((row): AllergyEntry | null => {
        const value = this.object(row);
        if (!value) return null;
        const substance = this.text(value.substance, 160);
        if (!substance) return null;
        const rawStatus = this.text(value.status, 16)?.toUpperCase();
        const status = rawStatus === "INACTIVE" ? "INACTIVE" : "ACTIVE";
        return {
          id: this.text(value.id, 64) ?? substance,
          substance,
          reaction: this.text(value.reaction, 240),
          severity: this.text(value.severity, 32)?.toUpperCase() ?? null,
          verificationStatus: this.text(value.verificationStatus, 32)?.toUpperCase() ?? null,
          status,
          updatedAt: this.text(value.updatedAt, 40),
        };
      })
      .filter((value): value is AllergyEntry => value !== null);

    const active = projected.filter((entry) => entry.status === "ACTIVE");
    const inactive = projected.filter((entry) => entry.status === "INACTIVE");
    const legacySummary =
      this.text(allergies.medicationAllergiesDetail, 1000) ??
      this.text(allergies.foodAllergiesDetail, 1000) ??
      this.text(allergies.allergyNote, 1000) ??
      this.text(allergies.additionalAllergyInfo, 1000);

    // Safety rule: contradictory NKDA + allergy content must never be projected as
    // "NOT_PRESENT". Prefer the positive allergy signal and explicitly surface the conflict.
    const dataConflict = rawNkda && Boolean(active.length || legacySummary);
    const nkda = rawNkda && !dataConflict;
    const availability = active.length || legacySummary
      ? ("PRESENT" as const)
      : nkda
        ? ("NOT_PRESENT" as const)
        : ("NOT_DOCUMENTED" as const);

    return {
      availability,
      nkda,
      dataConflict,
      active,
      inactive,
      legacySummary,
    };
  }

  async listVisits(access: PatientPortalAccessContext, context: RequestContext) {
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

  async getVisit(access: PatientPortalAccessContext, encounterId: string, context: RequestContext) {
    const row = await this.prisma.encounter.findFirst({
      where: {
        id: encounterId,
        facilityId: access.facilityId,
        patientId: access.patientId,
      },
      select: PATIENT_VISIT_LIST_SELECT,
    });
    if (!row) {
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

  async listAllergies(access: PatientPortalAccessContext, context: RequestContext) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: access.patientId, facilityId: access.facilityId },
      select: { id: true, clinicalHistoryProfileJson: true },
    });
    if (!patient) throw new NotFoundException("Patient record not found");

    const projection = this.allergyProjection(patient.clinicalHistoryProfileJson);
    await this.audit.record("PATIENT_PORTAL_ALLERGY_VIEW", "ALLERGY_LIST", {
      portalAccountId: access.portalAccountId,
      sessionId: access.sessionId,
      facilityId: access.facilityId,
      patientId: access.patientId,
      ip: context.ip,
      userAgent: context.userAgent,
      metadata: {
        availability: projection.availability,
        dataConflict: projection.dataConflict,
        activeCount: projection.active.length,
        inactiveCount: projection.inactive.length,
      },
    });

    return projection;
  }

  async listImmunizations(access: PatientPortalAccessContext, context: RequestContext) {
    const rows = await this.prisma.vaccineAdministration.findMany({
      where: {
        facilityId: access.facilityId,
        patientId: access.patientId,
      },
      select: {
        id: true,
        encounterId: true,
        doseNumber: true,
        lotNumber: true,
        administeredAt: true,
        nextDueAt: true,
        vaccineCatalog: {
          select: {
            code: true,
            name: true,
            description: true,
            manufacturer: true,
          },
        },
      },
      orderBy: { administeredAt: "desc" },
      take: 200,
    });

    await this.audit.record("PATIENT_PORTAL_IMMUNIZATION_LIST_VIEW", "VACCINE_ADMINISTRATION_LIST", {
      portalAccountId: access.portalAccountId,
      sessionId: access.sessionId,
      facilityId: access.facilityId,
      patientId: access.patientId,
      ip: context.ip,
      userAgent: context.userAgent,
      metadata: { count: rows.length },
    });

    return {
      immunizations: rows.map((row) => ({
        id: row.id,
        encounterId: row.encounterId,
        vaccineCode: row.vaccineCatalog.code,
        vaccineName: row.vaccineCatalog.name,
        description: row.vaccineCatalog.description,
        manufacturer: row.vaccineCatalog.manufacturer,
        doseNumber: row.doseNumber,
        lotNumber: row.lotNumber,
        administeredAt: row.administeredAt.toISOString(),
        nextDueAt: row.nextDueAt?.toISOString() ?? null,
      })),
    };
  }
}
