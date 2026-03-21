import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { hasNonEmptyVitalsJson } from "../utils/patient-sex-map";
import { AuditService } from "../common/services/audit.service";
import { AuditAction, EncounterStatus, EncounterType, Prisma, RoleCode } from "@prisma/client";
import { isEncounterType } from "../common/utils/prisma-query-enum-guards";
import { assertCanTransitionEncounter } from "../common/workflow/encounter.transitions";
import {
  admissionSummaryFieldsSchema,
  type EncounterCloseDto,
  type EncounterCreateDto,
  type EncounterOperationalUpdateDto,
  type EncounterOutpatientCreateDto,
  type EncounterUpdateDto,
} from "@medora/shared";

/** Champs alignés sur encounterDischargeFieldsSchema — fusion à la clôture pour ne pas écraser un brouillon. */
const DISCHARGE_SUMMARY_KEYS = [
  "disposition",
  "exitCondition",
  "dischargeInstructions",
  "medicationsGiven",
  "followUp",
  "returnIfWorse",
  "patientDestination",
  "dischargeMode",
] as const;

function admissionSummaryHasContent(data: Record<string, unknown>): boolean {
  return Object.values(data).some((v) => typeof v === "string" && v.trim().length > 0);
}

function mergeDischargeSummaryJson(
  existing: unknown,
  incoming: EncounterCloseDto["discharge"]
): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  if (existing && typeof existing === "object" && !Array.isArray(existing)) {
    const o = existing as Record<string, unknown>;
    for (const k of DISCHARGE_SUMMARY_KEYS) {
      const v = o[k];
      if (typeof v === "string" && v.trim()) {
        out[k] = v.trim();
      }
    }
  }
  if (incoming) {
    const inc = incoming as Record<string, unknown>;
    for (const k of DISCHARGE_SUMMARY_KEYS) {
      const v = inc[k];
      if (v !== undefined && String(v).trim() !== "") {
        out[k] = String(v).trim();
      }
    }
  }
  return Object.keys(out).length ? out : undefined;
}
import type { ListPatientEncountersQuery } from "./dto";
import { toEncounterClinicResponse } from "./encounter-response.util";

/** Aligné sur GET /encounters/:id — évite d’écraser le dossier patient côté client après PATCH. */
const encounterDetailPatientSelect = {
  id: true,
  firstName: true,
  lastName: true,
  mrn: true,
  dob: true,
  sexAtBirth: true,
} as const;

@Injectable()
export class EncountersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async create(patientId: string, facilityId: string, data: EncounterCreateDto, userId?: string, ip?: string, userAgent?: string) {
    // Verify patient exists and belongs to facility
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, facilityId: facilityId },
    });

    if (!patient) {
      throw new NotFoundException("Patient not found");
    }

    // Check for existing OPEN encounter
    const existingOpen = await this.prisma.encounter.findFirst({
      where: {
        patientId,
        facilityId,
        status: "OPEN",
      },
    });

    if (existingOpen) {
      throw new BadRequestException("Patient already has an open encounter");
    }

    const chief =
      data.visitReason?.trim() ||
      data.chiefComplaint?.trim() ||
      undefined;

    const roomLabel =
      data.roomLabel != null && String(data.roomLabel).trim() !== ""
        ? String(data.roomLabel).trim().slice(0, 64)
        : "Salle d'attente";

    /** Médecin attribué (FK) — canonique pour dossier / trackboard ; providerId reste trace créateur / compat. */
    let physicianAssignedUserId: string | null = null;
    const physicianCandidate = data.physicianAssignedUserId ?? data.providerId ?? null;
    if (physicianCandidate) {
      await this.assertProviderAtFacility(facilityId, physicianCandidate);
      physicianAssignedUserId = physicianCandidate;
    }

    const encounter = await this.prisma.encounter.create({
      data: {
        patientId,
        facilityId,
        type: data.type,
        providerId: data.providerId ?? userId,
        chiefComplaint: chief,
        notes: data.notes?.trim() || undefined,
        roomLabel,
        physicianAssignedUserId,
        status: "OPEN",
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
      },
    });

    await this.audit.log(AuditAction.ENCOUNTER_CREATE, "ENCOUNTER", {
      userId,
      facilityId,
      patientId,
      encounterId: encounter.id,
      entityId: encounter.id,
      ip,
      userAgent,
    });

    return toEncounterClinicResponse(encounter);
  }

  async createOutpatientVisit(
    patientId: string,
    facilityId: string,
    data: EncounterOutpatientCreateDto,
    userId?: string,
    ip?: string,
    userAgent?: string
  ) {
    return this.create(
      patientId,
      facilityId,
      {
        type: "OUTPATIENT",
        visitReason: data.visitReason,
        notes: data.notes,
        roomLabel: data.roomLabel,
        physicianAssignedUserId: data.physicianAssignedUserId,
        providerId: data.providerId,
      },
      userId,
      ip,
      userAgent
    );
  }

  async findByPatient(
    patientId: string,
    facilityId: string,
    userId?: string,
    ip?: string,
    userAgent?: string,
    query?: ListPatientEncountersQuery
  ) {
    // Verify patient exists and belongs to facility
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, facilityId },
    });

    if (!patient) {
      throw new NotFoundException("Patient not found");
    }

    const where: Prisma.EncounterWhereInput = {
      patientId,
      facilityId,
    };
    if (query?.type !== undefined && isEncounterType(query.type)) {
      where.type = query.type;
    }

    const encounters = await this.prisma.encounter.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: query?.limit,
      include: {
        patient: { select: { firstName: true, lastName: true, mrn: true } },
        physicianAssigned: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await this.audit.log(AuditAction.ENCOUNTER_VIEW, "ENCOUNTER", {
      userId,
      facilityId,
      patientId,
      ip,
      userAgent,
      metadata: query?.type ? { filterType: query.type } : undefined,
    });

    return encounters.map((e) => toEncounterClinicResponse(e));
  }

  async findOne(facilityId: string, id: string, userId?: string, ip?: string, userAgent?: string) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id, facilityId },
      include: {
        patient: { select: encounterDetailPatientSelect },
        physicianAssigned: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }

    await this.audit.log(AuditAction.ENCOUNTER_VIEW, "ENCOUNTER", {
      userId,
      facilityId,
      patientId: encounter.patientId,
      encounterId: encounter.id,
      entityId: encounter.id,
      ip,
      userAgent,
    });

    return toEncounterClinicResponse(encounter);
  }

  async update(facilityId: string, id: string, data: EncounterUpdateDto, userId?: string, ip?: string, userAgent?: string) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id, facilityId },
    });

    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }

    const updateData: Record<string, unknown> = {};
    if (data.visitReason !== undefined || data.chiefComplaint !== undefined) {
      const v =
        data.visitReason !== undefined && data.visitReason !== null
          ? data.visitReason
          : data.chiefComplaint;
      updateData.chiefComplaint = v === null ? null : v?.toString().trim() || null;
    }
    if (data.triageAcuity !== undefined) updateData.triageAcuity = data.triageAcuity;
    if (data.vitals !== undefined) updateData.vitals = data.vitals;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.treatmentPlan !== undefined) {
      updateData.treatmentPlan =
        data.treatmentPlan === null ? null : data.treatmentPlan?.trim() || null;
    }
    if (data.followUpDate !== undefined) {
      updateData.followUpDate = data.followUpDate;
    }
    if (data.clinicianImpression !== undefined || data.providerNote !== undefined) {
      const imp =
        data.clinicianImpression !== undefined
          ? data.clinicianImpression
          : data.providerNote;
      updateData.providerNote =
        imp === null ? null : imp?.toString().trim() || null;
    }
    if (data.nursingAssessment !== undefined) {
      updateData.nursingAssessment = data.nursingAssessment;
    }
    if (data.dischargeSummaryJson !== undefined) {
      updateData.dischargeSummaryJson = data.dischargeSummaryJson;
    }
    if (data.admissionSummaryJson !== undefined) {
      if (encounter.status !== EncounterStatus.OPEN) {
        throw new BadRequestException(
          "L'admission ne peut être modifiée que sur une consultation ouverte."
        );
      }
      if (data.admissionSummaryJson === null) {
        updateData.admissionSummaryJson = null;
        updateData.admittedAt = null;
      } else {
        const parsedAdmission = admissionSummaryFieldsSchema.safeParse(data.admissionSummaryJson);
        if (!parsedAdmission.success) {
          throw new BadRequestException("Dossier d'admission invalide.");
        }
        const asRecord = parsedAdmission.data as Record<string, unknown>;
        if (!admissionSummaryHasContent(asRecord)) {
          throw new BadRequestException("Renseignez au moins un champ du dossier d'admission.");
        }
        updateData.admissionSummaryJson = parsedAdmission.data;
        if (!encounter.admittedAt) {
          updateData.admittedAt = new Date();
        }
        if (encounter.type !== EncounterType.INPATIENT) {
          updateData.type = EncounterType.INPATIENT;
        }
      }
    }
    if (data.roomLabel !== undefined) {
      updateData.roomLabel =
        data.roomLabel === null ? null : data.roomLabel?.toString().trim() || null;
    }
    if (data.physicianAssignedUserId !== undefined) {
      if (data.physicianAssignedUserId === null) {
        updateData.physicianAssignedUserId = null;
      } else {
        await this.assertProviderAtFacility(facilityId, data.physicianAssignedUserId);
        updateData.physicianAssignedUserId = data.physicianAssignedUserId;
      }
    }

    const updated = await this.prisma.encounter.update({
      where: { id },
      data: updateData,
      include: {
        patient: { select: encounterDetailPatientSelect },
        physicianAssigned: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (data.vitals !== undefined && hasNonEmptyVitalsJson(data.vitals)) {
      await this.prisma.patient.update({
        where: { id: encounter.patientId },
        data: {
          latestVitalsJson: data.vitals as object,
          latestVitalsAt: new Date(),
        },
      });
    }

    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, "ENCOUNTER", {
      userId,
      facilityId,
      patientId: encounter.patientId,
      encounterId: encounter.id,
      entityId: encounter.id,
      ip,
      userAgent,
    });

    return toEncounterClinicResponse(updated);
  }

  async updateOperational(
    facilityId: string,
    id: string,
    data: EncounterOperationalUpdateDto,
    userId?: string,
    ip?: string,
    userAgent?: string
  ) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id, facilityId },
    });
    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }
    const updateData: Record<string, unknown> = {};
    if (data.roomLabel !== undefined) {
      updateData.roomLabel =
        data.roomLabel === null ? null : data.roomLabel?.toString().trim() || null;
    }
    if (data.physicianAssignedUserId !== undefined) {
      if (data.physicianAssignedUserId === null) {
        updateData.physicianAssignedUserId = null;
      } else {
        await this.assertProviderAtFacility(facilityId, data.physicianAssignedUserId);
        updateData.physicianAssignedUserId = data.physicianAssignedUserId;
      }
    }
    if (Object.keys(updateData).length === 0) {
      const unchanged = await this.prisma.encounter.findFirst({
        where: { id, facilityId },
        include: {
          patient: { select: encounterDetailPatientSelect },
          physicianAssigned: { select: { id: true, firstName: true, lastName: true } },
        },
      });
      if (!unchanged) {
        throw new NotFoundException("Encounter not found");
      }
      return toEncounterClinicResponse(unchanged);
    }
    const updated = await this.prisma.encounter.update({
      where: { id },
      data: updateData,
      include: {
        patient: { select: encounterDetailPatientSelect },
        physicianAssigned: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, "ENCOUNTER", {
      userId,
      facilityId,
      patientId: encounter.patientId,
      encounterId: encounter.id,
      entityId: encounter.id,
      ip,
      userAgent,
      metadata: { operational: true },
    });
    return toEncounterClinicResponse(updated);
  }

  async listProviders(facilityId: string) {
    const rows = await this.prisma.userRole.findMany({
      where: {
        facilityId,
        isActive: true,
        role: { code: RoleCode.PROVIDER },
        user: { isActive: true },
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    const seen = new Set<string>();
    const out: { id: string; firstName: string; lastName: string }[] = [];
    for (const r of rows) {
      if (seen.has(r.userId)) continue;
      seen.add(r.userId);
      out.push({
        id: r.user.id,
        firstName: r.user.firstName,
        lastName: r.user.lastName,
      });
    }
    out.sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, "fr"));
    return out;
  }

  private async assertProviderAtFacility(facilityId: string, userId: string | null | undefined) {
    if (userId === undefined || userId === null) return;
    const ok = await this.prisma.userRole.findFirst({
      where: {
        facilityId,
        userId,
        isActive: true,
        role: { code: RoleCode.PROVIDER },
      },
    });
    if (!ok) {
      throw new BadRequestException("L'utilisateur sélectionné n'est pas un médecin de cet établissement.");
    }
  }

  async close(
    facilityId: string,
    id: string,
    data: EncounterCloseDto | undefined,
    userId?: string,
    ip?: string,
    userAgent?: string
  ) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id, facilityId },
    });

    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }

    // Validate status transition
    assertCanTransitionEncounter(encounter.status, "CLOSED");

    const closePayload: Record<string, unknown> = {
      status: "CLOSED",
      dischargedAt: new Date(),
    };
    const mergedDischarge = mergeDischargeSummaryJson(encounter.dischargeSummaryJson, data?.discharge);
    if (mergedDischarge) {
      closePayload.dischargeSummaryJson = mergedDischarge;
    }

    const updated = await this.prisma.encounter.update({
      where: { id },
      data: closePayload as Prisma.EncounterUpdateInput,
      include: {
        patient: { select: encounterDetailPatientSelect },
        physicianAssigned: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await this.audit.log(AuditAction.ENCOUNTER_CLOSE, "ENCOUNTER", {
      userId,
      facilityId,
      patientId: encounter.patientId,
      encounterId: encounter.id,
      entityId: encounter.id,
      ip,
      userAgent,
    });

    return toEncounterClinicResponse(updated);
  }
}

