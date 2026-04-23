import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { DiagnosisCodeSource, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { logBreakGlassAccessIfApplicable } from "../common/break-glass/break-glass-audit.helper";
import { AuditService } from "../common/services/audit.service";
import { AuditAction } from "@prisma/client";
import { assertEncounterNotSigned } from "../encounters/encounter-sign-lock.util";
import { buildDiagnosisCandidate, type DiagnosisBillingCodeSource } from "@medora/shared";
import { appendBillingCaptureCandidate } from "../billing/billing-capture.append.util";
import type {
  CreateDiagnosisDto,
  UpdateDiagnosisDto,
  ListDiagnosesQuery,
} from "./dto";

const diagnosisInclude = {
  patient: {
    select: { id: true, firstName: true, lastName: true, mrn: true },
  },
  encounter: {
    select: { id: true, type: true, status: true, createdAt: true },
  },
  facility: { select: { id: true, code: true, name: true } },
  icd10Catalog: {
    select: {
      id: true,
      code: true,
      shortDescription: true,
      isBillable: true,
    },
  },
};

function toBillingCodeSource(s: DiagnosisCodeSource): DiagnosisBillingCodeSource {
  if (s === DiagnosisCodeSource.ICD10_CATALOG) return "ICD10_CATALOG";
  if (s === DiagnosisCodeSource.MANUAL_DECLARED) return "MANUAL_DECLARED";
  return "LEGACY";
}

@Injectable()
export class DiagnosesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  private async nextSortOrder(encounterId: string): Promise<number> {
    const agg = await this.prisma.diagnosis.aggregate({
      where: { encounterId },
      _max: { sortOrder: true },
    });
    return (agg._max.sortOrder ?? -1) + 1;
  }

  private async syncDiagnosisBillingCapture(params: {
    encounterId: string;
    facilityId: string;
    patientId: string;
    diagnosisId: string;
    code: string;
    description: string | null;
    codeSource: DiagnosisCodeSource;
    userId?: string | null;
    atIso: string;
  }): Promise<void> {
    await appendBillingCaptureCandidate(
      this.prisma,
      params.encounterId,
      params.facilityId,
      buildDiagnosisCandidate({
        diagnosisId: params.diagnosisId,
        encounterId: params.encounterId,
        patientId: params.patientId,
        facilityId: params.facilityId,
        code: params.code,
        description: params.description,
        createdAtIso: params.atIso,
        createdByUserId: params.userId ?? null,
        codeSource: toBillingCodeSource(params.codeSource),
      })
    );
  }

  async create(
    encounterId: string,
    facilityId: string,
    dto: CreateDiagnosisDto,
    userId?: string,
    ip?: string,
    userAgent?: string
  ) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      include: { patient: true },
    });
    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }

    assertEncounterNotSigned(encounter);

    let code = dto.code?.trim() ?? "";
    let description: string | null = dto.description?.trim() ? dto.description.trim() : null;
    let icd10CatalogId: string | null = null;
    let codeSource: DiagnosisCodeSource = DiagnosisCodeSource.LEGACY;

    if (dto.icd10CatalogId?.trim()) {
      const cat = await this.prisma.icd10DiagnosisCode.findFirst({
        where: { id: dto.icd10CatalogId.trim(), isActive: true },
      });
      if (!cat) {
        throw new BadRequestException("Unknown or inactive ICD-10 catalog entry");
      }
      code = cat.code;
      description = dto.description?.trim() ? dto.description.trim() : cat.shortDescription;
      icd10CatalogId = cat.id;
      codeSource = DiagnosisCodeSource.ICD10_CATALOG;
    } else if (dto.manualNonCatalog === true) {
      codeSource = DiagnosisCodeSource.MANUAL_DECLARED;
    }

    const sortOrder = dto.sortOrder ?? (await this.nextSortOrder(encounterId));

    const row = await this.prisma.diagnosis.create({
      data: {
        patientId: encounter.patientId,
        encounterId,
        facilityId,
        code,
        description: description ?? undefined,
        onsetDate: dto.onsetDate ?? undefined,
        notes: dto.notes?.trim() ? dto.notes.trim() : undefined,
        status: "ACTIVE",
        sortOrder,
        icd10CatalogId,
        codeSource,
      },
      include: diagnosisInclude,
    });

    await this.audit.log(AuditAction.CREATE, "DIAGNOSIS", {
      userId,
      facilityId,
      patientId: encounter.patientId,
      encounterId,
      entityId: row.id,
      ip,
      userAgent,
      metadata: { code, codeSource },
    });

    const createdAtIso =
      row.createdAt instanceof Date ? row.createdAt.toISOString() : new Date().toISOString();
    await this.syncDiagnosisBillingCapture({
      encounterId,
      facilityId,
      patientId: encounter.patientId,
      diagnosisId: row.id,
      code: row.code,
      description: row.description ?? null,
      codeSource: row.codeSource,
      userId: userId ?? null,
      atIso: createdAtIso,
    });

    return row;
  }

  async findByPatient(
    patientId: string,
    facilityId: string,
    query: ListDiagnosesQuery,
    userId?: string,
    ip?: string,
    userAgent?: string,
    breakGlassSessionId?: string
  ) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, facilityId },
    });
    if (!patient) {
      throw new NotFoundException("Patient not found");
    }

    const where: Prisma.DiagnosisWhereInput = { patientId, facilityId };
    if (query.status) where.status = query.status;

    const take = query.limit ?? 100;
    const skip = query.offset ?? 0;

    const [items, total] = await Promise.all([
      this.prisma.diagnosis.findMany({
        where,
        take,
        skip,
        orderBy: [{ encounterId: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
        include: diagnosisInclude,
      }),
      this.prisma.diagnosis.count({ where }),
    ]);

    await logBreakGlassAccessIfApplicable(this.audit, {
      breakGlassSessionId,
      userId,
      facilityId,
      patientId,
      ip,
      userAgent,
      context: "patient_diagnoses_list",
    });

    await this.audit.log(AuditAction.VIEW, "DIAGNOSIS", {
      userId,
      facilityId,
      patientId,
      ip,
      userAgent,
      metadata: { listByPatient: true },
    });

    return { items, total };
  }

  async update(
    id: string,
    facilityId: string,
    dto: UpdateDiagnosisDto,
    userId?: string,
    ip?: string,
    userAgent?: string
  ) {
    const existing = await this.prisma.diagnosis.findFirst({
      where: { id, facilityId },
    });
    if (!existing) {
      throw new NotFoundException("Diagnosis not found");
    }
    if (existing.status === "RESOLVED") {
      throw new BadRequestException("Cannot update a resolved diagnosis");
    }

    const enc = await this.prisma.encounter.findFirst({
      where: { id: existing.encounterId, facilityId },
    });
    if (!enc) {
      throw new NotFoundException("Encounter not found");
    }
    assertEncounterNotSigned(enc);

    const data: Prisma.DiagnosisUpdateInput = {};

    if (dto.sortOrder !== undefined) {
      data.sortOrder = dto.sortOrder;
    }
    if (dto.onsetDate !== undefined) data.onsetDate = dto.onsetDate;
    if (dto.notes !== undefined) data.notes = dto.notes;

    if (dto.manualNonCatalog === true) {
      if (dto.code === undefined || !dto.code.trim()) {
        throw new BadRequestException("code is required when manualNonCatalog is true");
      }
      data.code = dto.code.trim();
      data.icd10Catalog = { disconnect: true };
      data.codeSource = DiagnosisCodeSource.MANUAL_DECLARED;
      if (dto.description !== undefined) {
        data.description = dto.description;
      }
    } else if (dto.icd10CatalogId !== undefined) {
      if (dto.icd10CatalogId === null) {
        data.icd10Catalog = { disconnect: true };
        if (dto.code !== undefined) {
          data.code = dto.code.trim();
        }
        data.codeSource = DiagnosisCodeSource.LEGACY;
        if (dto.description !== undefined) {
          data.description = dto.description;
        }
      } else {
        const cat = await this.prisma.icd10DiagnosisCode.findFirst({
          where: { id: dto.icd10CatalogId.trim(), isActive: true },
        });
        if (!cat) {
          throw new BadRequestException("Unknown or inactive ICD-10 catalog entry");
        }
        const desc = dto.description?.trim() ? dto.description.trim() : cat.shortDescription;
        data.code = cat.code;
        data.description = desc;
        data.icd10Catalog = { connect: { id: cat.id } };
        data.codeSource = DiagnosisCodeSource.ICD10_CATALOG;
      }
    } else {
      if (dto.code !== undefined) {
        data.code = dto.code.trim();
        if (existing.icd10CatalogId) {
          const stillMatches = await this.prisma.icd10DiagnosisCode.findFirst({
            where: { id: existing.icd10CatalogId, code: dto.code.trim() },
          });
          if (!stillMatches) {
            data.icd10Catalog = { disconnect: true };
            data.codeSource = DiagnosisCodeSource.LEGACY;
          }
        }
      }
      if (dto.description !== undefined) {
        data.description = dto.description;
      }
    }

    const row = await this.prisma.diagnosis.update({
      where: { id },
      data,
      include: diagnosisInclude,
    });

    await this.audit.log(AuditAction.UPDATE, "DIAGNOSIS", {
      userId,
      facilityId,
      patientId: existing.patientId,
      encounterId: existing.encounterId,
      entityId: id,
      ip,
      userAgent,
      metadata: { fields: Object.keys(dto) },
    });

    const billingRelevant =
      dto.code !== undefined ||
      dto.description !== undefined ||
      dto.icd10CatalogId !== undefined ||
      dto.manualNonCatalog === true;

    if (billingRelevant) {
      const atIso = row.updatedAt instanceof Date ? row.updatedAt.toISOString() : new Date().toISOString();
      await this.syncDiagnosisBillingCapture({
        encounterId: existing.encounterId,
        facilityId,
        patientId: existing.patientId,
        diagnosisId: row.id,
        code: row.code,
        description: row.description ?? null,
        codeSource: row.codeSource,
        userId: userId ?? null,
        atIso,
      });
    }

    return row;
  }

  async reorderEncounterDiagnoses(
    encounterId: string,
    facilityId: string,
    orderedIds: string[],
    userId?: string,
    ip?: string,
    userAgent?: string
  ) {
    const enc = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
    });
    if (!enc) {
      throw new NotFoundException("Encounter not found");
    }
    assertEncounterNotSigned(enc);

    const rows = await this.prisma.diagnosis.findMany({
      where: { encounterId, facilityId, id: { in: orderedIds } },
      select: { id: true },
    });
    if (rows.length !== orderedIds.length) {
      throw new BadRequestException("One or more diagnosis ids are invalid for this encounter");
    }

    await this.prisma.$transaction(
      orderedIds.map((dxId, idx) =>
        this.prisma.diagnosis.update({
          where: { id: dxId },
          data: { sortOrder: idx },
        })
      )
    );

    await this.audit.log(AuditAction.UPDATE, "DIAGNOSIS", {
      userId,
      facilityId,
      patientId: enc.patientId,
      encounterId,
      entityId: encounterId,
      ip,
      userAgent,
      metadata: { action: "reorder", orderedIds },
    });

    return this.prisma.diagnosis.findMany({
      where: { encounterId, facilityId, status: "ACTIVE" },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: diagnosisInclude,
    });
  }

  async resolve(
    id: string,
    facilityId: string,
    userId?: string,
    ip?: string,
    userAgent?: string
  ) {
    const existing = await this.prisma.diagnosis.findFirst({
      where: { id, facilityId },
    });
    if (!existing) {
      throw new NotFoundException("Diagnosis not found");
    }
    if (existing.status === "RESOLVED") {
      throw new BadRequestException("Diagnosis is already resolved");
    }

    const enc = await this.prisma.encounter.findFirst({
      where: { id: existing.encounterId, facilityId },
    });
    if (!enc) {
      throw new NotFoundException("Encounter not found");
    }
    assertEncounterNotSigned(enc);

    const resolvedDate = new Date();

    const row = await this.prisma.diagnosis.update({
      where: { id },
      data: { status: "RESOLVED", resolvedDate },
      include: diagnosisInclude,
    });

    await this.audit.log(AuditAction.UPDATE, "DIAGNOSIS", {
      userId,
      facilityId,
      patientId: existing.patientId,
      encounterId: existing.encounterId,
      entityId: id,
      ip,
      userAgent,
      metadata: { action: "resolve", resolvedDate: resolvedDate.toISOString() },
    });

    return row;
  }
}
