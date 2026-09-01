import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ENCOUNTER_CORE_SELECT, ENCOUNTER_NESTED_CORE_SELECT } from "./encounter-query-contracts";
import {
  AuditAction,
  EncounterNoteType as PrismaEncounterNoteType,
  EncounterNoteVoidReasonCode as PrismaVoidReason,
} from "@prisma/client";
import {
  encounterNoteCreateDtoSchema,
  encounterNoteAmendDtoSchema,
  encounterNoteVoidDtoSchema,
  legacyErNotesV1DisplayEntries,
  buildEncounterNoteAuditMetadata,
  assertEncounterNoteAuditMetadataSafe,
  defaultRequiresCosignForNoteType,
  type EncounterNoteCreateDto,
  type EncounterNoteType,
  type EncounterNoteAmendDto,
  type EncounterNoteVoidDto,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { assertEncounterOpenForClinicalMutation } from "./encounter-sign-lock.util";

export type EncounterNoteApiRow = {
  id: string;
  encounterId: string;
  noteType: EncounterNoteType;
  body: string;
  authorDisplayName: string;
  authorRoleTitle: string;
  authorUserId: string;
  createdAt: string;
  legacy?: boolean;
  voidedAt: string | null;
  voidedByUserId: string | null;
  voidReasonCode: string | null;
  isAmendment: boolean;
  amendedFromNoteId: string | null;
  amendmentReason: string | null;
  requiresCosign: boolean;
  cosignedAt: string | null;
  cosignedByUserId: string | null;
  cosignRoleSnapshot: string | null;
};

const noteSelect = {
  id: true,
  encounterId: true,
  noteType: true,
  body: true,
  authorUserId: true,
  authorDisplayNameSnapshot: true,
  authorRoleSnapshot: true,
  createdAt: true,
  voidedAt: true,
  voidedByUserId: true,
  voidReasonCode: true,
  isAmendment: true,
  amendedFromNoteId: true,
  amendmentReason: true,
  requiresCosign: true,
  cosignedAt: true,
  cosignedByUserId: true,
  cosignRoleSnapshot: true,
} as const;

type NoteRow = {
  id: string;
  encounterId: string;
  noteType: PrismaEncounterNoteType;
  body: string;
  authorUserId: string;
  authorDisplayNameSnapshot: string;
  authorRoleSnapshot: string;
  createdAt: Date;
  voidedAt: Date | null;
  voidedByUserId: string | null;
  voidReasonCode: PrismaVoidReason | null;
  isAmendment: boolean;
  amendedFromNoteId: string | null;
  amendmentReason: string | null;
  requiresCosign: boolean;
  cosignedAt: Date | null;
  cosignedByUserId: string | null;
  cosignRoleSnapshot: string | null;
};

function mapNoteRow(row: NoteRow): EncounterNoteApiRow {
  return {
    id: row.id,
    encounterId: row.encounterId,
    noteType: row.noteType as EncounterNoteType,
    body: row.body,
    authorDisplayName: row.authorDisplayNameSnapshot,
    authorRoleTitle: row.authorRoleSnapshot,
    authorUserId: row.authorUserId,
    createdAt: row.createdAt.toISOString(),
    voidedAt: row.voidedAt?.toISOString() ?? null,
    voidedByUserId: row.voidedByUserId,
    voidReasonCode: row.voidReasonCode,
    isAmendment: row.isAmendment,
    amendedFromNoteId: row.amendedFromNoteId,
    amendmentReason: row.amendmentReason,
    requiresCosign: row.requiresCosign,
    cosignedAt: row.cosignedAt?.toISOString() ?? null,
    cosignedByUserId: row.cosignedByUserId,
    cosignRoleSnapshot: row.cosignRoleSnapshot,
  };
}

@Injectable()
export class EncounterNotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async listForEncounter(
    facilityId: string,
    encounterId: string,
    options?: { includeLegacy?: boolean; noteType?: EncounterNoteType }
  ): Promise<{ notes: EncounterNoteApiRow[] }> {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: { id: true, nursingAssessment: true },
    });
    if (!encounter) throw new NotFoundException("Encounter not found");

    const where: {
      encounterId: string;
      facilityId: string;
      noteType?: PrismaEncounterNoteType;
    } = {
      encounterId,
      facilityId,
    };
    if (options?.noteType) {
      where.noteType = options.noteType as PrismaEncounterNoteType;
    }

    const rows = await this.prisma.encounterNote.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: noteSelect,
    });

    const notes = rows.map(mapNoteRow);

    if (options?.includeLegacy !== false) {
      const legacy = legacyErNotesV1DisplayEntries(encounter.nursingAssessment, encounterId);
      for (const entry of legacy) {
        if (options?.noteType && entry.noteType !== options.noteType) continue;
        notes.push({
          ...entry,
          authorUserId: "",
          voidedAt: null,
          voidedByUserId: null,
          voidReasonCode: null,
          isAmendment: false,
          amendedFromNoteId: null,
          amendmentReason: null,
          requiresCosign: false,
          cosignedAt: null,
          cosignedByUserId: null,
          cosignRoleSnapshot: null,
        });
      }
      notes.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    return { notes };
  }

  private async resolveAuthorSnapshot(userId: string, facilityId: string) {
    const author = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId, facilityId, isActive: true },
      include: { role: { select: { code: true, name: true } } },
    });
    const roleRows = userRoles.flatMap((r) =>
      r.role ? [{ code: String(r.role.code), name: r.role.name ?? null }] : []
    );
    const sortedRoles = [...roleRows].sort((a, b) => a.code.localeCompare(b.code));
    const authorDisplayNameSnapshot = [author?.firstName?.trim(), author?.lastName?.trim()]
      .filter(Boolean)
      .join(" ")
      .trim() || "—";
    const authorRoleSnapshot =
      sortedRoles[0]?.name?.trim() || sortedRoles[0]?.code?.trim() || "—";
    return { authorDisplayNameSnapshot, authorRoleSnapshot };
  }

  private async assertReviewer(userId: string, facilityId: string) {
    const roles = await this.prisma.userRole.findMany({
      where: { userId, facilityId, isActive: true },
      include: { role: { select: { code: true } } },
    });
    const codes = roles.map((r) => String(r.role?.code ?? "").toUpperCase());
    if (!codes.some((c) => c === "PROVIDER" || c === "ADMIN")) {
      throw new ForbiddenException("Autorisation insuffisante pour cette action.");
    }
  }

  /** Author may void their own note; reviewers may void any non-legacy note. */
  private async assertCanVoid(userId: string, facilityId: string, authorUserId: string) {
    if (userId === authorUserId) return;
    await this.assertReviewer(userId, facilityId);
  }

  async createNote(
    facilityId: string,
    encounterId: string,
    dto: EncounterNoteCreateDto,
    userId: string | undefined,
    ip?: string,
    userAgent?: string
  ) {
    if (!userId) {
      throw new ForbiddenException("Authentification requise.");
    }

    const parsed = encounterNoteCreateDtoSchema.safeParse(dto);
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }

    const encounter = await this.prisma.encounter.findFirst({
      select: ENCOUNTER_CORE_SELECT,
      where: { id: encounterId, facilityId },
    });
    if (!encounter) throw new NotFoundException("Encounter not found");
    assertEncounterOpenForClinicalMutation(encounter);

    const { authorDisplayNameSnapshot, authorRoleSnapshot } =
      await this.resolveAuthorSnapshot(userId, facilityId);
    const requiresCosign = defaultRequiresCosignForNoteType(parsed.data.noteType);

    const created = await this.prisma.$transaction(async (tx) => {
      const row = await tx.encounterNote.create({
        data: {
          encounterId,
          patientId: encounter.patientId,
          facilityId,
          noteType: parsed.data.noteType as PrismaEncounterNoteType,
          body: parsed.data.body.trim(),
          authorUserId: userId,
          authorDisplayNameSnapshot,
          authorRoleSnapshot,
          requiresCosign,
        },
        select: noteSelect,
      });

      const auditMetadata = buildEncounterNoteAuditMetadata({
        encounterId,
        patientId: encounter.patientId,
        noteId: row.id,
        noteType: row.noteType,
        authorUserId: userId,
        authorRole: authorRoleSnapshot,
        bodyLength: row.body.length,
      });
      assertEncounterNoteAuditMetadataSafe(auditMetadata as Record<string, unknown>);

      await this.audit.log(AuditAction.CREATE, "ENCOUNTER_NOTE", {
        userId,
        facilityId,
        patientId: encounter.patientId,
        encounterId,
        entityId: row.id,
        ip,
        userAgent,
        critical: true,
        metadata: auditMetadata,
        tx,
      });

      return row;
    });

    return mapNoteRow(created);
  }

  async amendNote(
    facilityId: string,
    encounterId: string,
    noteId: string,
    dto: EncounterNoteAmendDto,
    userId: string | undefined,
    ip?: string,
    userAgent?: string
  ) {
    if (!userId) {
      throw new ForbiddenException("Authentification requise.");
    }

    const parsed = encounterNoteAmendDtoSchema.safeParse(dto);
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }

    const encounter = await this.prisma.encounter.findFirst({
      select: ENCOUNTER_CORE_SELECT,
      where: { id: encounterId, facilityId },
    });
    if (!encounter) throw new NotFoundException("Encounter not found");
    assertEncounterOpenForClinicalMutation(encounter);

    const original = await this.prisma.encounterNote.findFirst({
      where: { id: noteId, encounterId, facilityId },
      select: noteSelect,
    });
    if (!original) throw new NotFoundException("Note not found");
    if (original.voidedAt) {
      throw new BadRequestException("Cannot amend a voided note.");
    }
    if (original.authorUserId !== userId) {
      throw new ForbiddenException("Seul l'auteur peut corriger cette note.");
    }

    const { authorDisplayNameSnapshot, authorRoleSnapshot } =
      await this.resolveAuthorSnapshot(userId, facilityId);

    const created = await this.prisma.$transaction(async (tx) => {
      const row = await tx.encounterNote.create({
        data: {
          encounterId,
          patientId: encounter.patientId,
          facilityId,
          noteType: original.noteType,
          body: parsed.data.body.trim(),
          authorUserId: userId,
          authorDisplayNameSnapshot,
          authorRoleSnapshot,
          isAmendment: true,
          amendedFromNoteId: original.id,
          amendmentReason: parsed.data.amendmentReason.trim(),
          requiresCosign: original.requiresCosign,
        },
        select: noteSelect,
      });

      const auditMetadata = buildEncounterNoteAuditMetadata({
        encounterId,
        patientId: encounter.patientId,
        noteId: row.id,
        noteType: row.noteType,
        amendedFromNoteId: original.id,
        amendedByUserId: userId,
        reasonCode: parsed.data.amendmentReason.trim(),
        isAmendment: true,
        bodyLength: row.body.length,
      });
      assertEncounterNoteAuditMetadataSafe(auditMetadata as Record<string, unknown>);

      await this.audit.log(AuditAction.ENCOUNTER_NOTE_AMENDED, "ENCOUNTER_NOTE", {
        userId,
        facilityId,
        patientId: encounter.patientId,
        encounterId,
        entityId: row.id,
        ip,
        userAgent,
        critical: true,
        metadata: auditMetadata,
        tx,
      });

      return row;
    });

    return mapNoteRow(created);
  }

  async voidNote(
    facilityId: string,
    encounterId: string,
    noteId: string,
    dto: EncounterNoteVoidDto,
    userId: string | undefined,
    ip?: string,
    userAgent?: string
  ) {
    if (!userId) {
      throw new ForbiddenException("Authentification requise.");
    }

    const parsed = encounterNoteVoidDtoSchema.safeParse(dto);
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }

    const encounter = await this.prisma.encounter.findFirst({
      select: ENCOUNTER_CORE_SELECT,
      where: { id: encounterId, facilityId },
    });
    if (!encounter) throw new NotFoundException("Encounter not found");
    assertEncounterOpenForClinicalMutation(encounter);

    const existing = await this.prisma.encounterNote.findFirst({
      where: { id: noteId, encounterId, facilityId },
      select: noteSelect,
    });
    if (!existing) throw new NotFoundException("Note not found");
    if (existing.voidedAt) {
      throw new BadRequestException("Note already voided.");
    }
    await this.assertCanVoid(userId, facilityId, existing.authorUserId);

    const voided = await this.prisma.$transaction(async (tx) => {
      const row = await tx.encounterNote.update({
        where: { id: noteId },
        data: {
          voidedAt: new Date(),
          voidedByUserId: userId,
          voidReasonCode: parsed.data.voidReasonCode as PrismaVoidReason,
        },
        select: noteSelect,
      });

      const auditMetadata = buildEncounterNoteAuditMetadata({
        encounterId,
        patientId: encounter.patientId,
        noteId: row.id,
        voidedByUserId: userId,
        reasonCode: parsed.data.voidReasonCode,
      });
      assertEncounterNoteAuditMetadataSafe(auditMetadata as Record<string, unknown>);

      await this.audit.log(AuditAction.ENCOUNTER_NOTE_VOIDED, "ENCOUNTER_NOTE", {
        userId,
        facilityId,
        patientId: encounter.patientId,
        encounterId,
        entityId: row.id,
        ip,
        userAgent,
        critical: true,
        metadata: auditMetadata,
        tx,
      });

      return row;
    });

    return mapNoteRow(voided);
  }

  async cosignNote(
    facilityId: string,
    encounterId: string,
    noteId: string,
    userId: string | undefined,
    ip?: string,
    userAgent?: string
  ) {
    if (!userId) {
      throw new ForbiddenException("Authentification requise.");
    }

    const encounter = await this.prisma.encounter.findFirst({
      select: ENCOUNTER_CORE_SELECT,
      where: { id: encounterId, facilityId },
    });
    if (!encounter) throw new NotFoundException("Encounter not found");
    assertEncounterOpenForClinicalMutation(encounter);
    await this.assertReviewer(userId, facilityId);

    const existing = await this.prisma.encounterNote.findFirst({
      where: { id: noteId, encounterId, facilityId },
      select: noteSelect,
    });
    if (!existing) throw new NotFoundException("Note not found");
    if (existing.voidedAt) {
      throw new BadRequestException("Cannot cosign a voided note.");
    }
    if (!existing.requiresCosign) {
      throw new BadRequestException("This note does not require cosign.");
    }
    if (existing.cosignedAt) {
      throw new BadRequestException("Note already cosigned.");
    }

    const { authorRoleSnapshot } = await this.resolveAuthorSnapshot(userId, facilityId);

    const cosigned = await this.prisma.$transaction(async (tx) => {
      const row = await tx.encounterNote.update({
        where: { id: noteId },
        data: {
          cosignedAt: new Date(),
          cosignedByUserId: userId,
          cosignRoleSnapshot: authorRoleSnapshot,
        },
        select: noteSelect,
      });

      const auditMetadata = buildEncounterNoteAuditMetadata({
        encounterId,
        patientId: encounter.patientId,
        noteId: row.id,
        cosignedByUserId: userId,
      });
      assertEncounterNoteAuditMetadataSafe(auditMetadata as Record<string, unknown>);

      await this.audit.log(AuditAction.ENCOUNTER_NOTE_COSIGNED, "ENCOUNTER_NOTE", {
        userId,
        facilityId,
        patientId: encounter.patientId,
        encounterId,
        entityId: row.id,
        ip,
        userAgent,
        critical: true,
        metadata: auditMetadata,
        tx,
      });

      return row;
    });

    return mapNoteRow(cosigned);
  }

  mapNotesForChartSummary(rows: NoteRow[]) {
    return rows.map(mapNoteRow);
  }
}
