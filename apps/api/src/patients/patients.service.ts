import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { AuditAction, Prisma, SexAtBirth } from "@prisma/client";
import { generateUniqueMrn } from "../utils/mrn";
import {
  REGISTRATION_SEX_TO_PATIENT_SEX,
  REGISTRATION_SEX_TO_SEX_AT_BIRTH,
  sexAtBirthToPatientSex,
} from "../utils/patient-sex-map";
import type { PatientCreateDto, PatientUpdateDto } from "@medora/shared";
import { logBreakGlassAccessIfApplicable } from "../common/break-glass/break-glass-audit.helper";

function deriveLegacyAddressFromStructured(
  explicit: string | undefined | null,
  line1?: string | null,
  line2?: string | null
): string | undefined {
  const trimmed = explicit?.trim();
  if (trimmed) return trimmed;
  const parts = [line1?.trim(), line2?.trim()].filter(Boolean) as string[];
  if (parts.length === 0) return undefined;
  return parts.join(", ");
}

/** Columns added in registration phase-1 migration — omit if DB not migrated yet (P2022). */
const PATIENT_CREATE_PHASE1_OPTIONAL_KEYS = [
  "middleName",
  "addressLine1",
  "addressLine2",
  "stateProvince",
  "postalCode",
  "emergencyContactName",
  "emergencyContactRelationship",
  "emergencyContactPhone",
  "adminNotes",
] as const;

function stripPhase1PatientCreateFields(data: Record<string, unknown>): void {
  for (const k of PATIENT_CREATE_PHASE1_OPTIONAL_KEYS) {
    delete data[k];
  }
}

@Injectable()
export class PatientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async search(facilityId: string, query: {
    q?: string;
    mrn?: string;
    phone?: string;
    dob?: string;
    limit?: number;
  }, userId?: string, ip?: string, userAgent?: string) {
    const limit = Math.min(query.limit || 25, 100);
    const where: any = { facilityId };

    if (query.mrn) {
      where.mrn = query.mrn;
    }
    if (query.phone) {
      where.phone = { contains: query.phone };
    }
    if (query.dob) {
      where.dob = new Date(query.dob);
    }
    if (query.q) {
      // Do not filter on addressLine1: older DBs without the phase-1 migration will error (P2022).
      where.OR = [
        { firstName: { contains: query.q, mode: "insensitive" } },
        { lastName: { contains: query.q, mode: "insensitive" } },
        { mrn: { contains: query.q, mode: "insensitive" } },
        { phone: { contains: query.q } },
      ];
    }

    const patients = await this.prisma.patient.findMany({
      where,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        mrn: true,
        globalMrn: true,
        firstName: true,
        lastName: true,
        dob: true,
        phone: true,
        email: true,
        sexAtBirth: true,
        sex: true,
        createdAt: true,
      },
    });

    // Audit view
    await this.audit.log(AuditAction.PATIENT_VIEW, "PATIENT", {
      userId,
      facilityId,
      ip,
      userAgent,
      metadata: { searchQuery: query },
    });

    return patients;
  }

  async create(facilityId: string, data: PatientCreateDto, userId?: string, ip?: string, userAgent?: string) {
    const { dateOfBirth, sex, ...rest } = data;
    const dob = new Date(dateOfBirth.trim());
    if (Number.isNaN(dob.getTime())) {
      throw new BadRequestException("dateOfBirth invalide");
    }
    const sexAtBirth = REGISTRATION_SEX_TO_SEX_AT_BIRTH[sex];
    const patientSex = REGISTRATION_SEX_TO_PATIENT_SEX[sex];
    if (!sexAtBirth || !patientSex) {
      throw new BadRequestException("sex invalide");
    }

    const createData: any = {
      ...rest,
      dob,
      sexAtBirth,
      sex: patientSex,
      facilityId,
      registeredAtFacilityId: facilityId,
    };

    const derivedAddress = deriveLegacyAddressFromStructured(
      createData.address,
      createData.addressLine1,
      createData.addressLine2
    );
    if (derivedAddress !== undefined) {
      createData.address = derivedAddress;
    }

    // Generate MRN if missing
    if (!createData.mrn) {
      createData.mrn = await generateUniqueMrn(this.prisma);
    }

    // Generate global MRN
    createData.globalMrn = await generateUniqueMrn(this.prisma);

    let patient;
    try {
      patient = await this.prisma.patient.create({
        data: createData,
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2022") {
        stripPhase1PatientCreateFields(createData);
        const derivedRetry = deriveLegacyAddressFromStructured(
          createData.address,
          createData.addressLine1 as string | undefined,
          createData.addressLine2 as string | undefined
        );
        if (derivedRetry !== undefined) {
          createData.address = derivedRetry;
        }
        patient = await this.prisma.patient.create({
          data: createData,
        });
      } else {
        throw e;
      }
    }

    // Audit create
    await this.audit.log(AuditAction.PATIENT_CREATE, "PATIENT", {
      userId,
      facilityId,
      patientId: patient.id,
      entityId: patient.id,
      ip,
      userAgent,
      metadata: { mrn: patient.mrn },
    });

    return patient;
  }

  async findOne(
    facilityId: string,
    id: string,
    userId?: string,
    ip?: string,
    userAgent?: string,
    breakGlassSessionId?: string
  ) {
    const patient = await this.prisma.patient.findFirst({
      where: { id, facilityId },
    });

    if (!patient) {
      throw new NotFoundException("Patient not found");
    }

    await logBreakGlassAccessIfApplicable(this.audit, {
      breakGlassSessionId,
      userId,
      facilityId,
      patientId: patient.id,
      ip,
      userAgent,
      context: "patient_get",
    });

    // Audit chart open
    await this.audit.log(AuditAction.CHART_OPEN, "PATIENT", {
      userId,
      facilityId,
      patientId: patient.id,
      entityId: patient.id,
      ip,
      userAgent,
    });

    return patient;
  }

  async update(facilityId: string, id: string, data: PatientUpdateDto, userId?: string, ip?: string, userAgent?: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id, facilityId },
    });

    if (!patient) {
      throw new NotFoundException("Patient not found");
    }

    const updateData: any = {};
    Object.keys(data).forEach((key) => {
      if (data[key as keyof PatientUpdateDto] !== undefined) {
        updateData[key] = data[key as keyof PatientUpdateDto];
      }
    });

    if (Object.prototype.hasOwnProperty.call(updateData, "sexAtBirth")) {
      updateData.sex = sexAtBirthToPatientSex(updateData.sexAtBirth as SexAtBirth | null);
    }

    const nextAddressLine1 = Object.prototype.hasOwnProperty.call(updateData, "addressLine1")
      ? (updateData.addressLine1 as string | null)
      : patient.addressLine1;
    const nextAddressLine2 = Object.prototype.hasOwnProperty.call(updateData, "addressLine2")
      ? (updateData.addressLine2 as string | null)
      : patient.addressLine2;
    const nextExplicitAddress = Object.prototype.hasOwnProperty.call(updateData, "address")
      ? (updateData.address as string | null)
      : patient.address;
    if (
      Object.prototype.hasOwnProperty.call(updateData, "addressLine1") ||
      Object.prototype.hasOwnProperty.call(updateData, "addressLine2") ||
      Object.prototype.hasOwnProperty.call(updateData, "address")
    ) {
      const derived = deriveLegacyAddressFromStructured(nextExplicitAddress, nextAddressLine1, nextAddressLine2);
      if (derived !== undefined) {
        updateData.address = derived;
      }
    }

    const updateResult = await this.prisma.patient.updateMany({
      where: { id, facilityId },
      data: updateData,
    });
    if (updateResult.count === 0) {
      throw new NotFoundException("Patient not found");
    }
    const updated = await this.prisma.patient.findUniqueOrThrow({
      where: { id },
    });

    // Audit update
    await this.audit.log(AuditAction.PATIENT_UPDATE, "PATIENT", {
      userId,
      facilityId,
      patientId: patient.id,
      entityId: patient.id,
      ip,
      userAgent,
      metadata: { changes: Object.keys(updateData) },
    });

    return updated;
  }
}

