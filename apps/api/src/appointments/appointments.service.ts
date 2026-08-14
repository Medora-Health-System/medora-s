import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AppointmentStatus,
  AuditAction,
  EncounterType,
  EncounterVisitOrigin,
} from "@prisma/client";
import {
  canCheckInAppointment,
  canMarkAppointmentArrived,
  isHaitiPublicHealthJurisdiction,
  parseStoredFacilityServiceLines,
  projectRegistrationCompleteness,
  resolveDefaultBillingClassification,
  resolveEffectiveFacilityBillingWorkflow,
  resolveFacilityModuleCapabilitiesD4c1,
  type AmbulatoryWalkInCreateDto,
  type AppointmentCheckInDto,
  type AppointmentCreateDto,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";

const APPOINTMENT_SELECT = {
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
  providerId: true,
  departmentId: true,
  reason: true,
  createdByUserId: true,
  createdAt: true,
  updatedAt: true,
  patient: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      mrn: true,
      dob: true,
      phone: true,
      sexAtBirth: true,
      sex: true,
      emergencyContactName: true,
      emergencyContactPhone: true,
    },
  },
  encounter: {
    select: {
      id: true,
      type: true,
      status: true,
      workflowState: true,
      visitOrigin: true,
      createdAt: true,
      chiefComplaint: true,
    },
  },
} as const;

function toAppointmentDto(row: {
  id: string;
  facilityId: string;
  patientId: string;
  status: AppointmentStatus;
  scheduledStartAt: Date;
  scheduledEndAt: Date | null;
  arrivedAt: Date | null;
  checkedInAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  encounterId: string | null;
  providerId: string | null;
  departmentId: string | null;
  reason: string | null;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
    mrn: string | null;
  } | null;
  encounter?: {
    id: string;
    type: string;
    status: string;
    workflowState: string | null;
    visitOrigin: string | null;
    createdAt: Date;
    chiefComplaint: string | null;
  } | null;
}) {
  return {
    id: row.id,
    facilityId: row.facilityId,
    patientId: row.patientId,
    status: row.status,
    scheduledStartAt: row.scheduledStartAt.toISOString(),
    scheduledEndAt: row.scheduledEndAt?.toISOString() ?? null,
    arrivedAt: row.arrivedAt?.toISOString() ?? null,
    checkedInAt: row.checkedInAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    encounterId: row.encounterId,
    providerId: row.providerId,
    departmentId: row.departmentId,
    reason: row.reason,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    patientName: row.patient
      ? `${row.patient.firstName} ${row.patient.lastName}`.trim()
      : null,
    mrn: row.patient?.mrn ?? null,
    encounter: row.encounter
      ? {
          id: row.encounter.id,
          type: row.encounter.type,
          status: row.encounter.status,
          workflowState: row.encounter.workflowState,
          visitOrigin: row.encounter.visitOrigin,
          createdAt: row.encounter.createdAt.toISOString(),
          chiefComplaint: row.encounter.chiefComplaint,
        }
      : null,
  };
}

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  private async assertClinicCareEnabled(facilityId: string) {
    const facility = await this.prisma.facility.findFirst({
      where: { id: facilityId },
      select: {
        id: true,
        country: true,
        facilityType: true,
        serviceLinesJson: true,
        facilityCareProfileJson: true,
        billingSiteType: true,
        billingClassificationMode: true,
      },
    });
    if (!facility) throw new NotFoundException("Facility not found");
    const serviceLines = parseStoredFacilityServiceLines(facility.serviceLinesJson) ?? [];
    const caps = resolveFacilityModuleCapabilitiesD4c1({
      facilityType: facility.facilityType,
      careProfileJson: facility.facilityCareProfileJson,
      serviceLines,
      facilityCountry: facility.country,
    });
    // Registration is enabled for ambulatory + many facility profiles; Clinic Care preferred when available.
    if (!caps.registrationEnabled && !caps.clinicCareEnabled && !caps.urgentCareEnabled) {
      throw new BadRequestException("Clinic Care / registration is not enabled for this facility");
    }
    return facility;
  }

  private resolveFacilityBillingSiteType(facility: {
    billingClassificationMode: string | null;
    billingSiteType: string | null;
  }) {
    return resolveEffectiveFacilityBillingWorkflow({
      billingClassificationMode: facility.billingClassificationMode as never,
      billingSiteType: facility.billingSiteType as never,
    }).config.billingSiteType;
  }

  async create(
    facilityId: string,
    data: AppointmentCreateDto,
    userId?: string,
    ip?: string,
    userAgent?: string
  ) {
    await this.assertClinicCareEnabled(facilityId);
    const patient = await this.prisma.patient.findFirst({
      where: { id: data.patientId, facilityId },
      select: { id: true },
    });
    if (!patient) throw new NotFoundException("Patient not found");

    if (data.scheduledEndAt && data.scheduledEndAt <= data.scheduledStartAt) {
      throw new BadRequestException("scheduledEndAt must be after scheduledStartAt");
    }

    if (data.providerId) {
      const provider = await this.prisma.user.findFirst({
        where: { id: data.providerId, isActive: true },
        select: { id: true },
      });
      if (!provider) throw new BadRequestException("Provider not found");
    }
    if (data.departmentId) {
      const dept = await this.prisma.department.findFirst({
        where: { id: data.departmentId, facilityId, isActive: true },
        select: { id: true },
      });
      if (!dept) throw new BadRequestException("Department not found at this facility");
    }

    const row = await this.prisma.appointment.create({
      data: {
        facilityId,
        patientId: data.patientId,
        status: AppointmentStatus.SCHEDULED,
        scheduledStartAt: data.scheduledStartAt,
        scheduledEndAt: data.scheduledEndAt ?? null,
        providerId: data.providerId ?? null,
        departmentId: data.departmentId ?? null,
        reason: data.reason?.trim() || null,
        createdByUserId: userId ?? null,
      },
      select: APPOINTMENT_SELECT,
    });

    await this.audit.log(AuditAction.APPOINTMENT_CREATE, "APPOINTMENT", {
      userId,
      facilityId,
      patientId: data.patientId,
      entityId: row.id,
      ip,
      userAgent,
      metadata: { status: row.status, isFollowUp: data.isFollowUp === true },
    });

    return toAppointmentDto(row);
  }

  async listToday(facilityId: string, now = new Date()) {
    await this.assertClinicCareEnabled(facilityId);
    const facility = await this.prisma.facility.findFirst({
      where: { id: facilityId },
      select: { timezone: true },
    });
    const { facilityLocalDayUtcBounds } = await import("@medora/shared");
    const day = facilityLocalDayUtcBounds(now, facility?.timezone);
    const rows = await this.prisma.appointment.findMany({
      where: {
        facilityId,
        scheduledStartAt: { gte: day.startUtc, lt: day.endExclusiveUtc },
        status: { notIn: [AppointmentStatus.CANCELLED] },
      },
      select: APPOINTMENT_SELECT,
      orderBy: { scheduledStartAt: "asc" },
      take: 250,
    });
    return rows.map(toAppointmentDto);
  }

  async markArrived(
    appointmentId: string,
    facilityId: string,
    userId?: string,
    ip?: string,
    userAgent?: string
  ) {
    await this.assertClinicCareEnabled(facilityId);
    const existing = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, facilityId },
      select: APPOINTMENT_SELECT,
    });
    if (!existing) throw new NotFoundException("Appointment not found");
    if (existing.status === AppointmentStatus.ARRIVED) {
      return toAppointmentDto(existing);
    }
    if (existing.status === AppointmentStatus.CHECKED_IN) {
      return toAppointmentDto(existing);
    }
    if (!canMarkAppointmentArrived(existing.status)) {
      throw new BadRequestException(`Cannot mark arrival from status ${existing.status}`);
    }

    const now = new Date();
    const row = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: AppointmentStatus.ARRIVED,
        arrivedAt: existing.arrivedAt ?? now,
      },
      select: APPOINTMENT_SELECT,
    });

    await this.audit.log(AuditAction.APPOINTMENT_ARRIVE, "APPOINTMENT", {
      userId,
      facilityId,
      patientId: row.patientId,
      entityId: row.id,
      encounterId: row.encounterId ?? undefined,
      ip,
      userAgent,
    });

    return toAppointmentDto(row);
  }

  async checkIn(
    appointmentId: string,
    facilityId: string,
    data: AppointmentCheckInDto,
    userId?: string,
    ip?: string,
    userAgent?: string
  ) {
    const facility = await this.assertClinicCareEnabled(facilityId);
    const encounterType =
      data.encounterType === "URGENT_CARE" ? EncounterType.URGENT_CARE : EncounterType.OUTPATIENT;

    const result = await this.prisma.$transaction(async (tx) => {
      const appt = await tx.appointment.findFirst({
        where: { id: appointmentId, facilityId },
        select: {
          id: true,
          facilityId: true,
          patientId: true,
          status: true,
          encounterId: true,
          arrivedAt: true,
          checkedInAt: true,
          reason: true,
          providerId: true,
          scheduledStartAt: true,
        },
      });
      if (!appt) throw new NotFoundException("Appointment not found");

      if (appt.encounterId) {
        const linked = await tx.appointment.findFirst({
          where: { id: appointmentId },
          select: APPOINTMENT_SELECT,
        });
        return { kind: "idempotent" as const, row: linked! };
      }

      if (!canCheckInAppointment(appt.status)) {
        throw new BadRequestException(`Cannot check in from status ${appt.status}`);
      }

      const open = await tx.encounter.findFirst({
        where: {
          patientId: appt.patientId,
          facilityId,
          status: "OPEN",
        },
        select: { id: true },
      });
      if (open) {
        throw new ConflictException({
          code: "OPEN_ENCOUNTER_EXISTS",
          message: "Patient already has an open encounter",
          existingEncounterId: open.id,
        });
      }

      const billingClassification = resolveDefaultBillingClassification({
        facilityBillingSiteType: this.resolveFacilityBillingSiteType(facility),
        encounterType,
      });
      const chief =
        data.visitReason?.trim() || appt.reason?.trim() || undefined;
      const now = new Date();

      const encounter = await tx.encounter.create({
        data: {
          patientId: appt.patientId,
          facilityId,
          type: encounterType,
          billingClassification,
          status: "OPEN",
          workflowState: "ARRIVED",
          visitOrigin: EncounterVisitOrigin.SCHEDULED,
          chiefComplaint: chief,
          roomLabel: data.roomLabel?.trim() || undefined,
          providerId: appt.providerId ?? userId ?? undefined,
          physicianAssignedUserId: appt.providerId ?? undefined,
        },
        select: { id: true },
      });

      const updated = await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          status: AppointmentStatus.CHECKED_IN,
          encounterId: encounter.id,
          checkedInAt: now,
          arrivedAt: appt.arrivedAt ?? now,
        },
        select: APPOINTMENT_SELECT,
      });

      return { kind: "created" as const, row: updated, encounterId: encounter.id };
    });

    if (result.kind === "created") {
      await this.audit.log(AuditAction.APPOINTMENT_CHECK_IN, "APPOINTMENT", {
        userId,
        facilityId,
        patientId: result.row.patientId,
        entityId: result.row.id,
        encounterId: result.encounterId,
        ip,
        userAgent,
        metadata: { visitOrigin: EncounterVisitOrigin.SCHEDULED },
      });
      await this.audit.log(AuditAction.ENCOUNTER_CREATE, "ENCOUNTER", {
        userId,
        facilityId,
        patientId: result.row.patientId,
        entityId: result.encounterId,
        encounterId: result.encounterId,
        ip,
        userAgent,
        metadata: { visitOrigin: EncounterVisitOrigin.SCHEDULED, via: "appointment_check_in" },
      });
    }

    return toAppointmentDto(result.row);
  }

  async createWalkIn(
    facilityId: string,
    data: AmbulatoryWalkInCreateDto,
    userId?: string,
    ip?: string,
    userAgent?: string
  ) {
    const facility = await this.assertClinicCareEnabled(facilityId);
    const patient = await this.prisma.patient.findFirst({
      where: { id: data.patientId, facilityId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dob: true,
        phone: true,
        sexAtBirth: true,
        sex: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
      },
    });
    if (!patient) throw new NotFoundException("Patient not found");

    const encounterType =
      data.encounterType === "URGENT_CARE" ? EncounterType.URGENT_CARE : EncounterType.OUTPATIENT;

    const open = await this.prisma.encounter.findFirst({
      where: { patientId: data.patientId, facilityId, status: "OPEN" },
      select: { id: true },
    });
    if (open) {
      throw new ConflictException({
        code: "OPEN_ENCOUNTER_EXISTS",
        message: "Patient already has an open encounter",
        existingEncounterId: open.id,
      });
    }

    const billingClassification = resolveDefaultBillingClassification({
      facilityBillingSiteType: this.resolveFacilityBillingSiteType(facility),
      encounterType,
    });
    const chief =
      data.visitReason?.trim() || data.chiefComplaint?.trim() || undefined;
    const physician =
      data.physicianAssignedUserId ?? data.providerId ?? null;

    const encounter = await this.prisma.encounter.create({
      data: {
        patientId: data.patientId,
        facilityId,
        type: encounterType,
        billingClassification,
        status: "OPEN",
        workflowState: "ARRIVED",
        visitOrigin: EncounterVisitOrigin.WALK_IN,
        chiefComplaint: chief,
        roomLabel: data.roomLabel?.trim() || undefined,
        providerId: data.providerId ?? userId ?? undefined,
        physicianAssignedUserId: physician,
      },
      select: {
        id: true,
        type: true,
        status: true,
        workflowState: true,
        visitOrigin: true,
        createdAt: true,
        chiefComplaint: true,
        patientId: true,
        facilityId: true,
      },
    });

    await this.audit.log(AuditAction.AMBULATORY_WALK_IN_CREATE, "ENCOUNTER", {
      userId,
      facilityId,
      patientId: data.patientId,
      entityId: encounter.id,
      encounterId: encounter.id,
      ip,
      userAgent,
      metadata: { visitOrigin: EncounterVisitOrigin.WALK_IN },
    });
    await this.audit.log(AuditAction.ENCOUNTER_CREATE, "ENCOUNTER", {
      userId,
      facilityId,
      patientId: data.patientId,
      entityId: encounter.id,
      encounterId: encounter.id,
      ip,
      userAgent,
      metadata: { visitOrigin: EncounterVisitOrigin.WALK_IN, via: "walk_in" },
    });

    const completeness = projectRegistrationCompleteness({
      patient: {
        ...patient,
        dob: patient.dob?.toISOString() ?? null,
      },
      insuranceRequired: !isHaitiPublicHealthJurisdiction(facility.country),
      visitOrigin: EncounterVisitOrigin.WALK_IN,
      hasAppointmentLink: false,
    });

    return {
      encounter: {
        id: encounter.id,
        patientId: encounter.patientId,
        facilityId: encounter.facilityId,
        type: encounter.type,
        status: encounter.status,
        workflowState: encounter.workflowState,
        visitOrigin: encounter.visitOrigin,
        createdAt: encounter.createdAt.toISOString(),
        chiefComplaint: encounter.chiefComplaint,
      },
      appointment: null,
      registrationCompleteness: completeness,
    };
  }

  async registrationCompleteness(
    facilityId: string,
    patientId: string,
    opts?: { encounterId?: string; appointmentId?: string }
  ) {
    const facility = await this.assertClinicCareEnabled(facilityId);
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, facilityId },
      select: {
        firstName: true,
        lastName: true,
        dob: true,
        phone: true,
        sexAtBirth: true,
        sex: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
      },
    });
    if (!patient) throw new NotFoundException("Patient not found");

    const primary = await this.prisma.patientInsuranceCoverage.findFirst({
      where: {
        patientId,
        facilityId,
        rank: "PRIMARY",
        isActive: true,
      },
      select: { id: true },
    });

    let visitOrigin: string | null = null;
    let hasAppointmentLink = false;
    if (opts?.encounterId) {
      const enc = await this.prisma.encounter.findFirst({
        where: { id: opts.encounterId, facilityId, patientId },
        select: { visitOrigin: true, appointment: { select: { id: true } } },
      });
      visitOrigin = enc?.visitOrigin ?? null;
      hasAppointmentLink = Boolean(enc?.appointment?.id);
    } else if (opts?.appointmentId) {
      const appt = await this.prisma.appointment.findFirst({
        where: { id: opts.appointmentId, facilityId, patientId },
        select: { id: true, encounter: { select: { visitOrigin: true } } },
      });
      hasAppointmentLink = Boolean(appt);
      visitOrigin = appt?.encounter?.visitOrigin ?? "SCHEDULED";
    }

    return projectRegistrationCompleteness({
      patient: {
        ...patient,
        dob: patient.dob?.toISOString() ?? null,
      },
      hasPrimaryInsurance: Boolean(primary),
      insuranceRequired: !isHaitiPublicHealthJurisdiction(facility.country),
      visitOrigin,
      hasAppointmentLink,
    });
  }
}
