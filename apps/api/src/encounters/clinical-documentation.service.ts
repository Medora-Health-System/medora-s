import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditAction, Prisma } from "@prisma/client";
import {
  assertClinicalDocumentationAuditMetadataSafe,
  assertClinicalDocumentationEntryCreateAllowed,
  buildClinicalDocumentationAuditMetadata,
  clinicalDocumentationEntryCreateDtoSchema,
  mapClinicalDocumentationEntryForLegalChart,
  mapClinicalDocumentationEntryResponse,
  type ClinicalDocumentationEntryCreateDto,
  type ClinicalDocumentationEntryLegalChartRow,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { assertEncounterOpenForClinicalMutation } from "./encounter-sign-lock.util";

const entrySelect = {
  id: true,
  encounterId: true,
  category: true,
  cardId: true,
  authorDisplayNameSnapshot: true,
  authorRoleSnapshot: true,
  createdAt: true,
  payloadJson: true,
  voidedAt: true,
} as const;

@Injectable()
export class ClinicalDocumentationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async listForEncounter(
    facilityId: string,
    encounterId: string,
    options?: { includeVoided?: boolean }
  ): Promise<{ entries: ClinicalDocumentationEntryLegalChartRow[] }> {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: { id: true },
    });
    if (!encounter) throw new NotFoundException("Encounter not found");

    const where: Prisma.EncounterClinicalDocumentationEntryWhereInput = {
      encounterId,
      facilityId,
    };
    if (options?.includeVoided === false) {
      where.voidedAt = null;
    }

    const rows = await this.prisma.encounterClinicalDocumentationEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: entrySelect,
    });

    return {
      entries: rows.map((row) =>
        mapClinicalDocumentationEntryForLegalChart({
          ...row,
          payloadJson: row.payloadJson,
        })
      ),
    };
  }

  async createEntry(
    facilityId: string,
    encounterId: string,
    dto: ClinicalDocumentationEntryCreateDto,
    userId: string | undefined,
    ip?: string,
    userAgent?: string
  ) {
    if (!userId) {
      throw new ForbiddenException("Authentification requise.");
    }

    const parsed = clinicalDocumentationEntryCreateDtoSchema.safeParse(dto);
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }

    try {
      assertClinicalDocumentationEntryCreateAllowed(parsed.data);
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : "Invalid payload");
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

    const payloadKeyCount = Object.keys(parsed.data.payloadJson).length;

    const created = await this.prisma.$transaction(async (tx) => {
      const row = await tx.encounterClinicalDocumentationEntry.create({
        data: {
          facilityId,
          encounterId,
          patientId: encounter.patientId,
          category: parsed.data.category,
          cardId: parsed.data.cardId,
          payloadJson: parsed.data.payloadJson as Prisma.InputJsonValue,
          authorUserId: userId,
          authorDisplayNameSnapshot,
          authorRoleSnapshot,
        },
        select: entrySelect,
      });

      const auditMetadata = buildClinicalDocumentationAuditMetadata({
        encounterId,
        patientId: encounter.patientId,
        entryId: row.id,
        category: row.category,
        cardId: row.cardId,
        authorUserId: userId,
        authorRole: authorRoleSnapshot,
        payloadKeyCount,
      });
      assertClinicalDocumentationAuditMetadataSafe(auditMetadata as Record<string, unknown>);

      await this.audit.log(AuditAction.ENCOUNTER_CLINICAL_DOCUMENTATION_CREATED, "ENCOUNTER_CLINICAL_DOCUMENTATION_ENTRY", {
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

    return mapClinicalDocumentationEntryForLegalChart({
      ...created,
      payloadJson: created.payloadJson,
    });
  }

  mapEntriesForLegalChart(
    rows: Array<{
      id: string;
      encounterId: string;
      category: string;
      cardId: string;
      authorDisplayNameSnapshot: string;
      authorRoleSnapshot: string;
      createdAt: Date;
      payloadJson: unknown;
      voidedAt: Date | null;
    }>
  ): ClinicalDocumentationEntryLegalChartRow[] {
    return rows.map((row) =>
      mapClinicalDocumentationEntryForLegalChart({
        ...row,
        payloadJson: row.payloadJson,
      })
    );
  }
}
