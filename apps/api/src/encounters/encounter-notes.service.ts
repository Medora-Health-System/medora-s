import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditAction, EncounterNoteType as PrismaEncounterNoteType } from "@prisma/client";
import {
  encounterNoteCreateDtoSchema,
  legacyErNotesV1DisplayEntries,
  buildEncounterNoteAuditMetadata,
  assertEncounterNoteAuditMetadataSafe,
  type EncounterNoteCreateDto,
  type EncounterNoteType,
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
  createdAt: string;
  legacy?: boolean;
};

function mapNoteRow(row: {
  id: string;
  encounterId: string;
  noteType: PrismaEncounterNoteType;
  body: string;
  authorDisplayNameSnapshot: string;
  authorRoleSnapshot: string;
  createdAt: Date;
}): EncounterNoteApiRow {
  return {
    id: row.id,
    encounterId: row.encounterId,
    noteType: row.noteType as EncounterNoteType,
    body: row.body,
    authorDisplayName: row.authorDisplayNameSnapshot,
    authorRoleTitle: row.authorRoleSnapshot,
    createdAt: row.createdAt.toISOString(),
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
      voidedAt: null;
      noteType?: PrismaEncounterNoteType;
    } = {
      encounterId,
      facilityId,
      voidedAt: null,
    };
    if (options?.noteType) {
      where.noteType = options.noteType as PrismaEncounterNoteType;
    }

    const rows = await this.prisma.encounterNote.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        encounterId: true,
        noteType: true,
        body: true,
        authorDisplayNameSnapshot: true,
        authorRoleSnapshot: true,
        createdAt: true,
      },
    });

    const notes = rows.map(mapNoteRow);

    if (options?.includeLegacy !== false) {
      const legacy = legacyErNotesV1DisplayEntries(encounter.nursingAssessment, encounterId);
      for (const entry of legacy) {
        if (options?.noteType && entry.noteType !== options.noteType) continue;
        notes.push(entry);
      }
      notes.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    return { notes };
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
      where: { id: encounterId, facilityId },
    });
    if (!encounter) throw new NotFoundException("Encounter not found");
    assertEncounterOpenForClinicalMutation(encounter);

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
        },
        select: {
          id: true,
          encounterId: true,
          noteType: true,
          body: true,
          authorDisplayNameSnapshot: true,
          authorRoleSnapshot: true,
          createdAt: true,
        },
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

  mapNotesForChartSummary(
    rows: Array<{
      id: string;
      noteType: PrismaEncounterNoteType;
      body: string;
      authorDisplayNameSnapshot: string;
      authorRoleSnapshot: string;
      createdAt: Date;
    }>
  ) {
    return rows.map((row) => ({
      id: row.id,
      noteType: row.noteType as EncounterNoteType,
      body: row.body,
      authorDisplayName: row.authorDisplayNameSnapshot,
      authorRoleTitle: row.authorRoleSnapshot,
      createdAt: row.createdAt.toISOString(),
    }));
  }
}
