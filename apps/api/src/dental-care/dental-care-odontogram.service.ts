import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AuditAction,
  DentitionType,
  ToothFindingClinicalState,
  ToothFindingScope,
  ToothNumberingSystem,
} from "@prisma/client";
import {
  D5A4_CERTIFICATION_ID,
  getCanonicalTooth,
  isCanonicalToothCode,
  isD5a4FindingType,
  normalizeBulkToothCodes,
  normalizeSurfaceCodes,
  projectCurrentToothFindings,
  resolveEnterpriseDentalEncounterAuthoring,
  type DentalWorkspaceAccess,
  type D5a4DentitionType,
  type D5a4ToothNumberingSystem,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";

type Actor = {
  userId: string;
  facilityId: string;
  access: DentalWorkspaceAccess;
  roleCodes?: readonly string[];
};

@Injectable()
export class DentalCareOdontogramService {
  constructor(private readonly prisma: PrismaService) {}

  private assertView(access: DentalWorkspaceAccess) {
    if (!access.canViewOdontogram) {
      throw new ForbiddenException("Odontogram view capability required.");
    }
  }

  private assertEdit(access: DentalWorkspaceAccess) {
    if (!access.canEditOdontogram) {
      throw new ForbiddenException("Odontogram edit capability required.");
    }
  }

  private mapFinding(row: {
    id: string;
    facilityId: string;
    patientId: string;
    encounterId: string;
    toothCode: string;
    scope: ToothFindingScope;
    surfaces: string[];
    findingType: string;
    clinicalState: ToothFindingClinicalState;
    notes: string | null;
    documentedByUserId: string;
    documentedAt: Date;
    supersedesFindingId: string | null;
    voidedAt: Date | null;
    voidReason: string | null;
    documentedBy?: { firstName: string; lastName: string } | null;
  }) {
    const tooth = getCanonicalTooth(row.toothCode);
    return {
      id: row.id,
      facilityId: row.facilityId,
      patientId: row.patientId,
      encounterId: row.encounterId,
      toothCode: row.toothCode,
      scope: row.scope,
      surfaces: row.surfaces,
      findingType: row.findingType,
      clinicalState: row.clinicalState,
      notes: row.notes,
      documentedByUserId: row.documentedByUserId,
      documentedAt: row.documentedAt.toISOString(),
      supersedesFindingId: row.supersedesFindingId,
      voidedAt: row.voidedAt?.toISOString() ?? null,
      voidReason: row.voidReason,
      documentedByDisplay:
        row.documentedBy != null
          ? `${row.documentedBy.firstName} ${row.documentedBy.lastName}`.trim()
          : null,
      tooth: tooth
        ? {
            code: tooth.code,
            fdi: tooth.fdi,
            universal: tooth.universal,
            palmer: tooth.palmer,
            arch: tooth.arch,
            side: tooth.side,
            morphology: tooth.morphology,
            dentition: tooth.dentition,
          }
        : null,
    };
  }

  async getEncounterOdontogram(actor: Actor, encounterId: string) {
    this.assertView(actor.access);
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId: actor.facilityId },
      select: {
        id: true,
        patientId: true,
        facilityId: true,
        status: true,
        type: true,
        nursingAssessment: true,
        admissionSummaryJson: true,
      },
    });
    if (!encounter) throw new NotFoundException("Encounter not found");

    const dentition = await this.prisma.patientDentitionState.findUnique({
      where: {
        facilityId_patientId: {
          facilityId: actor.facilityId,
          patientId: encounter.patientId,
        },
      },
    });

    const findings = await this.prisma.toothFinding.findMany({
      where: {
        facilityId: actor.facilityId,
        patientId: encounter.patientId,
      },
      include: {
        documentedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { documentedAt: "asc" },
    });

    const mapped = findings.map((f) => this.mapFinding(f));
    const current = projectCurrentToothFindings(mapped);
    const encounterFindings = mapped.filter((f) => f.encounterId === encounterId);

    const authoring = resolveEnterpriseDentalEncounterAuthoring({
      roleCodes: actor.roleCodes ?? [],
      dentalCareEnabled: true,
      encounterStatus: encounter.status,
      serviceLine: "DENTAL",
      specialties: actor.access.specialties,
    });
    const canEdit = authoring.canEditOdontogram;

    return {
      certificationId: D5A4_CERTIFICATION_ID,
      encounterId: encounter.id,
      patientId: encounter.patientId,
      facilityId: encounter.facilityId,
      encounterStatus: encounter.status,
      readOnly: !canEdit,
      canEdit,
      readOnlyReason: authoring.readOnlyReason,
      authoring,
      dentitionType: (dentition?.dentitionType ?? "PERMANENT") as D5a4DentitionType,
      numberingSystem: (dentition?.numberingSystem ?? "FDI") as D5a4ToothNumberingSystem,
      currentFindings: current,
      encounterFindings,
      history: mapped,
    };
  }

  async getPatientOdontogram(actor: Actor, patientId: string) {
    this.assertView(actor.access);
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, facilityId: actor.facilityId },
      select: { id: true, facilityId: true },
    });
    if (!patient) throw new NotFoundException("Patient not found");

    const dentition = await this.prisma.patientDentitionState.findUnique({
      where: {
        facilityId_patientId: { facilityId: actor.facilityId, patientId },
      },
    });

    const findings = await this.prisma.toothFinding.findMany({
      where: { facilityId: actor.facilityId, patientId },
      include: {
        documentedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { documentedAt: "asc" },
    });
    const mapped = findings.map((f) => this.mapFinding(f));

    return {
      certificationId: D5A4_CERTIFICATION_ID,
      patientId,
      facilityId: actor.facilityId,
      dentitionType: (dentition?.dentitionType ?? "PERMANENT") as D5a4DentitionType,
      numberingSystem: (dentition?.numberingSystem ?? "FDI") as D5a4ToothNumberingSystem,
      currentFindings: projectCurrentToothFindings(mapped),
      history: mapped,
      readOnly: !actor.access.canEditOdontogram,
      canEdit: false,
    };
  }

  async upsertDentition(
    actor: Actor,
    patientId: string,
    input: { dentitionType?: string; numberingSystem?: string }
  ) {
    this.assertEdit(actor.access);
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, facilityId: actor.facilityId },
      select: { id: true },
    });
    if (!patient) throw new NotFoundException("Patient not found");

    const dentitionType = String(input.dentitionType ?? "PERMANENT").toUpperCase();
    const numberingSystem = String(input.numberingSystem ?? "FDI").toUpperCase();
    if (!["PRIMARY", "MIXED", "PERMANENT"].includes(dentitionType)) {
      throw new BadRequestException("Invalid dentitionType");
    }
    if (!["UNIVERSAL", "FDI", "PALMER"].includes(numberingSystem)) {
      throw new BadRequestException("Invalid numberingSystem");
    }

    return this.prisma.patientDentitionState.upsert({
      where: {
        facilityId_patientId: { facilityId: actor.facilityId, patientId },
      },
      create: {
        facilityId: actor.facilityId,
        patientId,
        dentitionType: dentitionType as DentitionType,
        numberingSystem: numberingSystem as ToothNumberingSystem,
        updatedByUserId: actor.userId,
      },
      update: {
        dentitionType: dentitionType as DentitionType,
        numberingSystem: numberingSystem as ToothNumberingSystem,
        updatedByUserId: actor.userId,
      },
    });
  }

  async createBulkFindings(
    actor: Actor,
    encounterId: string,
    body: {
      toothCodes?: string[];
      scope?: string;
      surfaces?: string[];
      findingType?: string;
      clinicalState?: string;
      notes?: string | null;
    }
  ) {
    this.assertEdit(actor.access);
    const codes = normalizeBulkToothCodes(body.toothCodes ?? []);
    if (codes.length === 0) throw new BadRequestException("toothCodes required");

    const created = [];
    for (const toothCode of codes) {
      created.push(
        await this.createFinding(actor, encounterId, {
          toothCode,
          scope: body.scope,
          surfaces: body.surfaces,
          findingType: body.findingType,
          clinicalState: body.clinicalState,
          notes: body.notes,
        })
      );
    }
    return {
      certificationId: D5A4_CERTIFICATION_ID,
      count: created.length,
      findings: created,
    };
  }

  async createFinding(
    actor: Actor,
    encounterId: string,
    body: {
      toothCode?: string;
      scope?: string;
      surfaces?: string[];
      findingType?: string;
      clinicalState?: string;
      notes?: string | null;
      supersedesFindingId?: string | null;
    }
  ) {
    this.assertEdit(actor.access);

    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId: actor.facilityId },
      select: { id: true, patientId: true, facilityId: true, status: true },
    });
    if (!encounter) throw new NotFoundException("Encounter not found");
    if (encounter.status !== "OPEN") {
      throw new ForbiddenException("Closed encounters are read-only for odontogram.");
    }

    const toothCode = String(body.toothCode ?? "")
      .trim()
      .toUpperCase();
    if (!isCanonicalToothCode(toothCode)) {
      throw new BadRequestException("Invalid canonical toothCode");
    }

    const findingType = String(body.findingType ?? "")
      .trim()
      .toUpperCase();
    if (!isD5a4FindingType(findingType)) {
      throw new BadRequestException("Invalid findingType");
    }

    const scopeRaw = String(body.scope ?? "WHOLE_TOOTH").toUpperCase();
    if (scopeRaw !== "WHOLE_TOOTH" && scopeRaw !== "SURFACE_SPECIFIC") {
      throw new BadRequestException("Invalid scope");
    }
    const surfaces =
      scopeRaw === "SURFACE_SPECIFIC" ? normalizeSurfaceCodes(body.surfaces ?? []) : [];
    if (scopeRaw === "SURFACE_SPECIFIC" && surfaces.length === 0) {
      throw new BadRequestException("SURFACE_SPECIFIC requires at least one surface");
    }

    const clinicalStateRaw = String(body.clinicalState ?? "OBSERVED").toUpperCase();
    const allowedStates = [
      "OBSERVED",
      "EXISTING",
      "PLANNED",
      "IN_PROGRESS",
      "COMPLETED",
      "RESOLVED",
    ];
    if (!allowedStates.includes(clinicalStateRaw)) {
      throw new BadRequestException("Invalid clinicalState");
    }

    let supersedesFindingId: string | null = body.supersedesFindingId
      ? String(body.supersedesFindingId)
      : null;
    if (supersedesFindingId) {
      const prior = await this.prisma.toothFinding.findFirst({
        where: {
          id: supersedesFindingId,
          facilityId: actor.facilityId,
          patientId: encounter.patientId,
          toothCode,
        },
      });
      if (!prior) throw new BadRequestException("supersedesFindingId not found for tooth");
    }

    const created = await this.prisma.$transaction(async (tx) => {
      if (supersedesFindingId) {
        await tx.toothFinding.update({
          where: { id: supersedesFindingId },
          data: { clinicalState: ToothFindingClinicalState.AMENDED },
        });
      }
      const row = await tx.toothFinding.create({
        data: {
          facilityId: actor.facilityId,
          patientId: encounter.patientId,
          encounterId: encounter.id,
          toothCode,
          scope: scopeRaw as ToothFindingScope,
          surfaces,
          findingType,
          clinicalState: clinicalStateRaw as ToothFindingClinicalState,
          notes: body.notes?.trim() ? body.notes.trim() : null,
          documentedByUserId: actor.userId,
          supersedesFindingId,
        },
        include: {
          documentedBy: { select: { firstName: true, lastName: true } },
        },
      });
      await tx.auditLog.create({
        data: {
          userId: actor.userId,
          facilityId: actor.facilityId,
          patientId: encounter.patientId,
          encounterId: encounter.id,
          entityType: "ToothFinding",
          entityId: row.id,
          action: supersedesFindingId
            ? AuditAction.TOOTH_FINDING_AMEND
            : AuditAction.TOOTH_FINDING_CREATE,
          metadata: {
            certificationId: D5A4_CERTIFICATION_ID,
            toothCode,
            findingType,
            scope: scopeRaw,
            surfaces,
            clinicalState: clinicalStateRaw,
            supersedesFindingId,
          },
        },
      });
      return row;
    });

    return this.mapFinding(created);
  }

  async voidOrResolveFinding(
    actor: Actor,
    findingId: string,
    body: { action?: string; reason?: string | null }
  ) {
    this.assertEdit(actor.access);
    const action = String(body.action ?? "VOID").toUpperCase();
    if (action !== "VOID" && action !== "RESOLVE") {
      throw new BadRequestException("action must be VOID or RESOLVE");
    }

    const finding = await this.prisma.toothFinding.findFirst({
      where: { id: findingId, facilityId: actor.facilityId },
    });
    if (!finding) throw new NotFoundException("Finding not found");

    const encounter = await this.prisma.encounter.findFirst({
      where: { id: finding.encounterId, facilityId: actor.facilityId },
      select: { id: true, status: true },
    });
    if (!encounter || encounter.status !== "OPEN") {
      throw new ForbiddenException("Closed encounters are read-only for odontogram.");
    }

    if (action === "VOID") {
      if (finding.encounterId !== encounter.id && finding.voidedAt) {
        throw new ForbiddenException("Finding already voided");
      }
      // Only void findings authored in an OPEN encounter context at this facility.
      const updated = await this.prisma.$transaction(async (tx) => {
        const row = await tx.toothFinding.update({
          where: { id: finding.id },
          data: {
            clinicalState: ToothFindingClinicalState.VOIDED,
            voidedAt: new Date(),
            voidedByUserId: actor.userId,
            voidReason: body.reason?.trim() || "VOID",
          },
          include: {
            documentedBy: { select: { firstName: true, lastName: true } },
          },
        });
        await tx.auditLog.create({
          data: {
            userId: actor.userId,
            facilityId: actor.facilityId,
            patientId: finding.patientId,
            encounterId: finding.encounterId,
            entityType: "ToothFinding",
            entityId: finding.id,
            action: AuditAction.TOOTH_FINDING_RESOLVE,
            metadata: {
              certificationId: D5A4_CERTIFICATION_ID,
              mode: "VOID",
              toothCode: finding.toothCode,
              reason: body.reason?.trim() || "VOID",
            },
          },
        });
        return row;
      });
      return this.mapFinding(updated);
    }

    const resolved = await this.prisma.$transaction(async (tx) => {
      const row = await tx.toothFinding.update({
        where: { id: finding.id },
        data: { clinicalState: ToothFindingClinicalState.RESOLVED },
        include: {
          documentedBy: { select: { firstName: true, lastName: true } },
        },
      });
      await tx.auditLog.create({
        data: {
          userId: actor.userId,
          facilityId: actor.facilityId,
          patientId: finding.patientId,
          encounterId: finding.encounterId,
          entityType: "ToothFinding",
          entityId: finding.id,
          action: AuditAction.TOOTH_FINDING_RESOLVE,
          metadata: {
            certificationId: D5A4_CERTIFICATION_ID,
            mode: "RESOLVE",
            toothCode: finding.toothCode,
          },
        },
      });
      return row;
    });
    return this.mapFinding(resolved);
  }

  async getToothHistory(actor: Actor, patientId: string, toothCode: string) {
    this.assertView(actor.access);
    const code = String(toothCode ?? "")
      .trim()
      .toUpperCase();
    if (!isCanonicalToothCode(code)) {
      throw new BadRequestException("Invalid toothCode");
    }
    const rows = await this.prisma.toothFinding.findMany({
      where: {
        facilityId: actor.facilityId,
        patientId,
        toothCode: code,
      },
      include: {
        documentedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { documentedAt: "asc" },
    });
    return {
      certificationId: D5A4_CERTIFICATION_ID,
      patientId,
      toothCode: code,
      history: rows.map((r) => this.mapFinding(r)),
    };
  }
}
