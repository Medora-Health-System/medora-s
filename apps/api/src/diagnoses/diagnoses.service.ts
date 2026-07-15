import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { DiagnosisCodeSource, DiagnosisOnsetPrecision, Prisma, RoleCode } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { logBreakGlassAccessIfApplicable } from "../common/break-glass/break-glass-audit.helper";
import { AuditService } from "../common/services/audit.service";
import { AuditAction } from "@prisma/client";
import {
  assertEncounterNotSigned,
  assertEncounterOpenForClinicalMutation,
} from "../encounters/encounter-sign-lock.util";
import {
  buildDiagnosisCandidate,
  type DiagnosisBillingCodeSource,
  DIAGNOSIS_INVALID_ICD_FORMAT,
  isIcd10CmLikeCodeFormat,
} from "@medora/shared";
import { appendBillingCaptureCandidate } from "../billing/billing-capture.append.util";
import type {
  CreateDiagnosisDto,
  UpdateDiagnosisDto,
  ListDiagnosesQuery,
  RemoveDiagnosisDto,
} from "./dto";
import { resolveDiagnosisOnsetInput } from "./diagnosis-onset.util";

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

function assertNonCatalogIcdFormat(code: string): void {
  const c = code.trim();
  if (!isIcd10CmLikeCodeFormat(c)) {
    throw new BadRequestException(DIAGNOSIS_INVALID_ICD_FORMAT);
  }
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

  /** Renumber active encounter rows 0..n-1 by current sortOrder then createdAt (collision / drift safety). */
  private async normalizeEncounterDiagnosisSortOrders(encounterId: string, facilityId: string): Promise<void> {
    const rows = await this.prisma.diagnosis.findMany({
      where: { encounterId, facilityId, status: "ACTIVE" },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    });
    if (rows.length === 0) return;
    await this.prisma.$transaction(
      rows.map((r, idx) =>
        this.prisma.diagnosis.update({
          where: { id: r.id },
          data: { sortOrder: idx },
        })
      )
    );
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

    assertEncounterOpenForClinicalMutation(encounter);
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

    if (!icd10CatalogId) {
      assertNonCatalogIcdFormat(code);
    }
    code = code.trim();

    const sortOrder = dto.sortOrder ?? (await this.nextSortOrder(encounterId));
    const onset = resolveDiagnosisOnsetInput({
      onsetDate: dto.onsetDate ?? null,
      onsetPrecision: (dto.onsetPrecision as DiagnosisOnsetPrecision | null | undefined) ?? null,
    });

    const row = await this.prisma.diagnosis.create({
      data: {
        patientId: encounter.patientId,
        encounterId,
        facilityId,
        code,
        description: description ?? undefined,
        onsetDate: onset.onsetDate,
        onsetPrecision: onset.onsetPrecision,
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
      metadata: {
        code,
        codeSource,
        onsetDate: onset.onsetDate?.toISOString() ?? null,
        onsetPrecision: onset.onsetPrecision,
      },
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

    await this.normalizeEncounterDiagnosisSortOrders(encounterId, facilityId);

    const refreshed = await this.prisma.diagnosis.findFirst({
      where: { id: row.id },
      include: diagnosisInclude,
    });
    return refreshed ?? row;
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

    const enriched = await this.attachDiagnosisCreatorDisplay(facilityId, items);
    return { items: enriched, total };
  }

  private displayNameFromUser(u: { firstName: string | null; lastName: string | null }): string {
    return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
  }

  private roleTitleFromCodes(codes: Set<RoleCode>): string {
    const order: RoleCode[] = [RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN];
    for (const rc of order) {
      if (codes.has(rc)) {
        return rc === RoleCode.RN ? "RN" : rc === RoleCode.PROVIDER ? "MD" : rc === RoleCode.ADMIN ? "ADMIN" : "";
      }
    }
    return "";
  }

  private async attachDiagnosisCreatorDisplay<T extends { id: string; createdAt: Date }>(
    facilityId: string,
    rows: T[]
  ): Promise<
    Array<
      T & {
        createdByDisplay: {
          userId: string;
          name: string;
          role: string | null;
          at: string;
        } | null;
      }
    >
  > {
    if (rows.length === 0) return [];

    const ids = rows.map((row) => row.id);
    const auditRows = await this.prisma.auditLog.findMany({
      where: {
        facilityId,
        entityType: "DIAGNOSIS",
        action: AuditAction.CREATE,
        entityId: { in: ids },
      },
      orderBy: { createdAt: "asc" },
      select: { entityId: true, userId: true, createdAt: true },
    });

    const creatorByDiagnosisId = new Map<string, { userId: string; at: Date }>();
    for (const log of auditRows) {
      if (!log.entityId || !log.userId) continue;
      if (!creatorByDiagnosisId.has(log.entityId)) {
        creatorByDiagnosisId.set(log.entityId, { userId: log.userId, at: log.createdAt });
      }
    }

    const userIds = [...new Set([...creatorByDiagnosisId.values()].map((entry) => entry.userId))];
    const [users, roleRows] = await Promise.all([
      userIds.length
        ? this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, firstName: true, lastName: true },
          })
        : Promise.resolve([]),
      userIds.length
        ? this.prisma.userRole.findMany({
            where: { userId: { in: userIds }, facilityId, isActive: true },
            include: { role: { select: { code: true } } },
          })
        : Promise.resolve([]),
    ]);

    const nameByUserId = new Map(users.map((user) => [user.id, this.displayNameFromUser(user)]));
    const roleByUserId = new Map<string, string>();
    for (const userId of userIds) {
      const codes = new Set(
        roleRows.filter((row) => row.userId === userId).map((row) => row.role.code as RoleCode)
      );
      roleByUserId.set(userId, this.roleTitleFromCodes(codes));
    }

    return rows.map((row) => {
      const creator = creatorByDiagnosisId.get(row.id);
      if (!creator) return { ...row, createdByDisplay: null };
      const name = nameByUserId.get(creator.userId) ?? "";
      if (!name) return { ...row, createdByDisplay: null };
      const at =
        creator.at instanceof Date ? creator.at.toISOString() : new Date(creator.at).toISOString();
      return {
        ...row,
        createdByDisplay: {
          userId: creator.userId,
          name,
          role: roleByUserId.get(creator.userId) ?? null,
          at,
        },
      };
    });
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
    if (existing.status === "REMOVED") {
      throw new BadRequestException("Cannot update a removed diagnosis");
    }

    const enc = await this.prisma.encounter.findFirst({
      where: { id: existing.encounterId, facilityId },
    });
    if (!enc) {
      throw new NotFoundException("Encounter not found");
    }
    assertEncounterOpenForClinicalMutation(enc);
    assertEncounterNotSigned(enc);

    const data: Prisma.DiagnosisUpdateInput = {};
    const previousOnset = {
      onsetDate: existing.onsetDate?.toISOString() ?? null,
      onsetPrecision: existing.onsetPrecision ?? null,
    };

    if (dto.sortOrder !== undefined) {
      data.sortOrder = dto.sortOrder;
    }
    if (dto.onsetDate !== undefined || dto.onsetPrecision !== undefined) {
      const onset = resolveDiagnosisOnsetInput({
        onsetDate:
          dto.onsetDate !== undefined ? dto.onsetDate : existing.onsetDate,
        onsetPrecision:
          dto.onsetPrecision !== undefined
            ? ((dto.onsetPrecision as DiagnosisOnsetPrecision | null) ?? null)
            : existing.onsetPrecision,
      });
      data.onsetDate = onset.onsetDate;
      data.onsetPrecision = onset.onsetPrecision;
    }
    if (dto.notes !== undefined) data.notes = dto.notes;

    if (dto.manualNonCatalog === true) {
      if (dto.code === undefined || !dto.code.trim()) {
        throw new BadRequestException("code is required when manualNonCatalog is true");
      }
      assertNonCatalogIcdFormat(dto.code);
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
          assertNonCatalogIcdFormat(dto.code);
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
        assertNonCatalogIcdFormat(dto.code);
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

    const nextOnset =
      dto.onsetDate !== undefined || dto.onsetPrecision !== undefined
        ? {
            onsetDate:
              row.onsetDate instanceof Date ? row.onsetDate.toISOString() : null,
            onsetPrecision: row.onsetPrecision ?? null,
          }
        : null;

    await this.audit.log(AuditAction.UPDATE, "DIAGNOSIS", {
      userId,
      facilityId,
      patientId: existing.patientId,
      encounterId: existing.encounterId,
      entityId: id,
      ip,
      userAgent,
      metadata: {
        fields: Object.keys(dto),
        ...(nextOnset
          ? { previousOnset, nextOnset }
          : {}),
      },
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

    await this.normalizeEncounterDiagnosisSortOrders(existing.encounterId, facilityId);

    const refreshed = await this.prisma.diagnosis.findFirst({
      where: { id },
      include: diagnosisInclude,
    });
    return refreshed ?? row;
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
    assertEncounterOpenForClinicalMutation(enc);
    assertEncounterNotSigned(enc);

    const rows = await this.prisma.diagnosis.findMany({
      where: { encounterId, facilityId, id: { in: orderedIds } },
      select: { id: true },
    });
    if (rows.length !== orderedIds.length) {
      throw new BadRequestException("One or more diagnosis ids are invalid for this encounter");
    }

    const active = await this.prisma.diagnosis.findMany({
      where: { encounterId, facilityId, status: "ACTIVE" },
      select: { id: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    const activeIds = new Set(active.map((r) => r.id));
    if (activeIds.size !== orderedIds.length) {
      throw new BadRequestException("orderedIds must include every active diagnosis for this encounter");
    }
    for (const id of orderedIds) {
      if (!activeIds.has(id)) {
        throw new BadRequestException("orderedIds must match the active diagnosis set for this encounter");
      }
    }

    await this.prisma.$transaction(
      orderedIds.map((dxId, idx) =>
        this.prisma.diagnosis.update({
          where: { id: dxId },
          data: { sortOrder: idx },
        })
      )
    );

    await this.normalizeEncounterDiagnosisSortOrders(encounterId, facilityId);

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
    if (existing.status === "REMOVED") {
      throw new BadRequestException("Cannot resolve a removed diagnosis");
    }

    const enc = await this.prisma.encounter.findFirst({
      where: { id: existing.encounterId, facilityId },
    });
    if (!enc) {
      throw new NotFoundException("Encounter not found");
    }
    assertEncounterOpenForClinicalMutation(enc);
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

  /**
   * Soft-remove (void) an encounter diagnosis with a required reason.
   * Promotes the next ACTIVE row to principal (sortOrder 0) via normalize.
   */
  async remove(
    id: string,
    facilityId: string,
    dto: RemoveDiagnosisDto,
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
    if (existing.status === "REMOVED") {
      throw new BadRequestException("Diagnosis is already removed");
    }
    if (existing.status === "RESOLVED") {
      throw new BadRequestException("Cannot remove a resolved diagnosis; it is already inactive");
    }

    const enc = await this.prisma.encounter.findFirst({
      where: { id: existing.encounterId, facilityId },
    });
    if (!enc) {
      throw new NotFoundException("Encounter not found");
    }
    assertEncounterOpenForClinicalMutation(enc);
    assertEncounterNotSigned(enc);

    if (!userId) {
      throw new BadRequestException("Authenticated user required to remove a diagnosis");
    }

    const removedAt = new Date();
    const wasPrimary = existing.sortOrder === 0;
    const previousSortOrder = existing.sortOrder;
    const reasonText = dto.reasonText?.trim() || dto.notes?.trim() || null;

    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.diagnosis.update({
        where: { id },
        data: {
          status: "REMOVED",
          removedAt,
          removedByUserId: userId,
          removalReasonCode: dto.reasonCode,
          removalReasonText: reasonText,
        },
        include: diagnosisInclude,
      });

      const active = await tx.diagnosis.findMany({
        where: { encounterId: existing.encounterId, facilityId, status: "ACTIVE" },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { id: true },
      });
      await Promise.all(
        active.map((r, index) =>
          tx.diagnosis.update({
            where: { id: r.id },
            data: { sortOrder: index },
          })
        )
      );

      return updated;
    });

    await this.audit.log(AuditAction.DIAGNOSIS_REMOVED, "DIAGNOSIS", {
      userId,
      facilityId,
      patientId: existing.patientId,
      encounterId: existing.encounterId,
      entityId: id,
      ip,
      userAgent,
      metadata: {
        diagnosisId: id,
        code: existing.code,
        description: existing.description,
        reasonCode: dto.reasonCode,
        reasonText,
        wasPrimary,
        previousSortOrder,
      },
    });

    return row;
  }
}
