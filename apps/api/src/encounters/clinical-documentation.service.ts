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
  buildClinicalDocumentationWitnessAuditMetadata,
  canActAsClinicalDocumentationWitness,
  finalizeClinicalDocumentationPayloadAfterWitness,
  mapClinicalDocumentationEntryForLegalChart,
  clinicalDocumentationEntryCreateDtoSchema,
  clinicalDocumentationEntryCreateWithWitnessDtoSchema,
  parseFacilityClinicalDocumentationWitnessPolicy,
  requiresImmediateWitnessCaptureForPayload,
  resolveRequiresWitnessSignatureForClinicalDocumentationEntry,
  validatePayloadForCard,
  type ClinicalDocumentationEntryCreateDto,
  type ClinicalDocumentationEntryCreateWithWitnessDto,
  type ClinicalDocumentationEntryLegalChartRow,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { assertEncounterOpenForClinicalMutation } from "./encounter-sign-lock.util";

export const clinicalDocumentationEntrySelect = {
  id: true,
  encounterId: true,
  category: true,
  cardId: true,
  authorUserId: true,
  authorDisplayNameSnapshot: true,
  authorRoleSnapshot: true,
  createdAt: true,
  payloadJson: true,
  voidedAt: true,
  requiresWitnessSignature: true,
  witnessedAt: true,
  witnessedByUserId: true,
  witnessDisplayNameSnapshot: true,
  witnessRoleSnapshot: true,
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
      select: clinicalDocumentationEntrySelect,
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
    return { authorDisplayNameSnapshot, authorRoleSnapshot, roleCodes: sortedRoles.map((r) => r.code) };
  }

  private async loadFacilityWitnessPolicy(facilityId: string) {
    const facility = await this.prisma.facility.findFirst({
      where: { id: facilityId },
      select: { clinicalDocumentationWitnessPolicyJson: true },
    });
    return parseFacilityClinicalDocumentationWitnessPolicy(
      facility?.clinicalDocumentationWitnessPolicyJson
    );
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

    const payloadValidation = validatePayloadForCard(
      parsed.data.cardId,
      parsed.data.payloadJson as Record<string, unknown>
    );
    if (!payloadValidation.ok) {
      throw new BadRequestException(payloadValidation.message);
    }

    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
    });
    if (!encounter) throw new NotFoundException("Encounter not found");
    assertEncounterOpenForClinicalMutation(encounter);

    const { authorDisplayNameSnapshot, authorRoleSnapshot } = await this.resolveAuthorSnapshot(
      userId,
      facilityId
    );
    const facilityWitnessPolicy = await this.loadFacilityWitnessPolicy(facilityId);
    const requiresWitnessSignature = resolveRequiresWitnessSignatureForClinicalDocumentationEntry(
      parsed.data.cardId,
      payloadValidation.data,
      facilityWitnessPolicy
    );

    const payloadKeyCount = Object.keys(payloadValidation.data).length;

    const created = await this.prisma.$transaction(async (tx) => {
      const row = await tx.encounterClinicalDocumentationEntry.create({
        data: {
          facilityId,
          encounterId,
          patientId: encounter.patientId,
          category: parsed.data.category,
          cardId: parsed.data.cardId,
          payloadJson: payloadValidation.data as Prisma.InputJsonValue,
          authorUserId: userId,
          authorDisplayNameSnapshot,
          authorRoleSnapshot,
          requiresWitnessSignature,
        },
        select: clinicalDocumentationEntrySelect,
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

  async createEntryWithWitness(
    facilityId: string,
    encounterId: string,
    dto: ClinicalDocumentationEntryCreateWithWitnessDto,
    authorUserId: string | undefined,
    ip?: string,
    userAgent?: string
  ) {
    if (!authorUserId) {
      throw new ForbiddenException("Authentification requise.");
    }

    const parsed = clinicalDocumentationEntryCreateWithWitnessDtoSchema.safeParse(dto);
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }

    if (
      !requiresImmediateWitnessCaptureForPayload(
        parsed.data.cardId,
        parsed.data.payloadJson as Record<string, unknown>
      )
    ) {
      throw new BadRequestException(
        "This card does not support immediate witness capture on create."
      );
    }

    if (parsed.data.witnessUserId === authorUserId) {
      throw new BadRequestException("Author cannot witness their own entry.");
    }

    try {
      assertClinicalDocumentationEntryCreateAllowed(parsed.data);
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : "Invalid payload");
    }

    const payloadValidation = validatePayloadForCard(
      parsed.data.cardId,
      parsed.data.payloadJson as Record<string, unknown>
    );
    if (!payloadValidation.ok) {
      throw new BadRequestException(payloadValidation.message);
    }

    const witnessUser = await this.prisma.user.findFirst({
      where: { id: parsed.data.witnessUserId, isActive: true },
      select: { id: true },
    });
    if (!witnessUser) {
      throw new BadRequestException("Witness user not found or inactive.");
    }

    const witnessRoles = await this.prisma.userRole.findMany({
      where: {
        userId: parsed.data.witnessUserId,
        facilityId,
        isActive: true,
      },
      include: { role: { select: { code: true, name: true } } },
    });
    if (witnessRoles.length === 0) {
      throw new BadRequestException("Witness user has no active facility access.");
    }

    const witnessRoleRows = witnessRoles.flatMap((r) =>
      r.role ? [{ code: String(r.role.code), name: r.role.name ?? null }] : []
    );
    const witnessRoleCodes = witnessRoleRows.map((r) => r.code);
    if (!canActAsClinicalDocumentationWitness(witnessRoleCodes)) {
      throw new ForbiddenException("Autorisation insuffisante pour témoigner.");
    }

    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
    });
    if (!encounter) throw new NotFoundException("Encounter not found");
    assertEncounterOpenForClinicalMutation(encounter);

    const { authorDisplayNameSnapshot, authorRoleSnapshot } = await this.resolveAuthorSnapshot(
      authorUserId,
      facilityId
    );
    const {
      authorDisplayNameSnapshot: witnessDisplayNameSnapshot,
      authorRoleSnapshot: witnessRoleSnapshot,
    } = await this.resolveAuthorSnapshot(parsed.data.witnessUserId, facilityId);

    const facilityWitnessPolicy = await this.loadFacilityWitnessPolicy(facilityId);
    const requiresWitnessSignature = resolveRequiresWitnessSignatureForClinicalDocumentationEntry(
      parsed.data.cardId,
      payloadValidation.data,
      facilityWitnessPolicy
    );
    if (!requiresWitnessSignature) {
      throw new BadRequestException("This card does not require witness signature.");
    }

    const finalizedPayload = finalizeClinicalDocumentationPayloadAfterWitness(
      parsed.data.cardId,
      payloadValidation.data
    );
    const payloadKeyCount = Object.keys(finalizedPayload).length;
    const witnessedAt = new Date();

    const created = await this.prisma.$transaction(async (tx) => {
      const row = await tx.encounterClinicalDocumentationEntry.create({
        data: {
          facilityId,
          encounterId,
          patientId: encounter.patientId,
          category: parsed.data.category,
          cardId: parsed.data.cardId,
          payloadJson: finalizedPayload as Prisma.InputJsonValue,
          authorUserId,
          authorDisplayNameSnapshot,
          authorRoleSnapshot,
          requiresWitnessSignature: true,
          witnessedAt,
          witnessedByUserId: parsed.data.witnessUserId,
          witnessDisplayNameSnapshot,
          witnessRoleSnapshot,
        },
        select: clinicalDocumentationEntrySelect,
      });

      const createAuditMetadata = buildClinicalDocumentationAuditMetadata({
        encounterId,
        patientId: encounter.patientId,
        entryId: row.id,
        category: row.category,
        cardId: row.cardId,
        authorUserId,
        authorRole: authorRoleSnapshot,
        payloadKeyCount,
      });
      assertClinicalDocumentationAuditMetadataSafe(createAuditMetadata as Record<string, unknown>);

      await this.audit.log(
        AuditAction.ENCOUNTER_CLINICAL_DOCUMENTATION_CREATED,
        "ENCOUNTER_CLINICAL_DOCUMENTATION_ENTRY",
        {
          userId: authorUserId,
          facilityId,
          patientId: encounter.patientId,
          encounterId,
          entityId: row.id,
          ip,
          userAgent,
          critical: true,
          metadata: createAuditMetadata,
          tx,
        }
      );

      const witnessAuditMetadata = buildClinicalDocumentationWitnessAuditMetadata({
        encounterId,
        patientId: encounter.patientId,
        entryId: row.id,
        category: row.category,
        cardId: row.cardId,
        authorUserId,
        authorRole: authorRoleSnapshot,
        witnessUserId: parsed.data.witnessUserId,
        witnessRole: witnessRoleSnapshot,
      });
      assertClinicalDocumentationAuditMetadataSafe(witnessAuditMetadata as Record<string, unknown>);

      await this.audit.log(
        AuditAction.ENCOUNTER_CLINICAL_DOCUMENTATION_WITNESSED,
        "ENCOUNTER_CLINICAL_DOCUMENTATION_ENTRY",
        {
          userId: parsed.data.witnessUserId,
          facilityId,
          patientId: encounter.patientId,
          encounterId,
          entityId: row.id,
          ip,
          userAgent,
          critical: true,
          metadata: witnessAuditMetadata,
          tx,
        }
      );

      return row;
    });

    return mapClinicalDocumentationEntryForLegalChart({
      ...created,
      payloadJson: created.payloadJson,
    });
  }

  async witnessEntry(
    facilityId: string,
    encounterId: string,
    entryId: string,
    userId: string | undefined,
    ip?: string,
    userAgent?: string
  ) {
    if (!userId) {
      throw new ForbiddenException("Authentification requise.");
    }

    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
    });
    if (!encounter) throw new NotFoundException("Encounter not found");
    assertEncounterOpenForClinicalMutation(encounter);

    const existing = await this.prisma.encounterClinicalDocumentationEntry.findFirst({
      where: { id: entryId, encounterId, facilityId },
      select: clinicalDocumentationEntrySelect,
    });
    if (!existing) throw new NotFoundException("Clinical documentation entry not found");
    if (existing.voidedAt) {
      throw new BadRequestException("Cannot witness a voided entry.");
    }
    if (!existing.requiresWitnessSignature) {
      throw new BadRequestException("This entry does not require witness signature.");
    }
    if (existing.witnessedAt) {
      throw new BadRequestException("Entry already witnessed.");
    }
    if (existing.authorUserId === userId) {
      throw new BadRequestException("Author cannot witness their own entry.");
    }

    const { authorDisplayNameSnapshot, authorRoleSnapshot, roleCodes } =
      await this.resolveAuthorSnapshot(userId, facilityId);
    if (!canActAsClinicalDocumentationWitness(roleCodes)) {
      throw new ForbiddenException("Autorisation insuffisante pour témoigner.");
    }

    const existingPayload =
      existing.payloadJson &&
      typeof existing.payloadJson === "object" &&
      !Array.isArray(existing.payloadJson)
        ? (existing.payloadJson as Record<string, unknown>)
        : {};
    const finalizedPayload = finalizeClinicalDocumentationPayloadAfterWitness(
      existing.cardId,
      existingPayload
    );

    const witnessed = await this.prisma.$transaction(async (tx) => {
      const row = await tx.encounterClinicalDocumentationEntry.update({
        where: { id: entryId },
        data: {
          witnessedAt: new Date(),
          witnessedByUserId: userId,
          witnessDisplayNameSnapshot: authorDisplayNameSnapshot,
          witnessRoleSnapshot: authorRoleSnapshot,
          payloadJson: finalizedPayload as Prisma.InputJsonValue,
        },
        select: clinicalDocumentationEntrySelect,
      });

      const auditMetadata = buildClinicalDocumentationWitnessAuditMetadata({
        encounterId,
        patientId: encounter.patientId,
        entryId: row.id,
        category: row.category,
        cardId: row.cardId,
        authorUserId: existing.authorUserId,
        authorRole: existing.authorRoleSnapshot,
        witnessUserId: userId,
        witnessRole: authorRoleSnapshot,
      });
      assertClinicalDocumentationAuditMetadataSafe(auditMetadata as Record<string, unknown>);

      await this.audit.log(
        AuditAction.ENCOUNTER_CLINICAL_DOCUMENTATION_WITNESSED,
        "ENCOUNTER_CLINICAL_DOCUMENTATION_ENTRY",
        {
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
        }
      );

      return row;
    });

    return mapClinicalDocumentationEntryForLegalChart({
      ...witnessed,
      payloadJson: witnessed.payloadJson,
    });
  }

  mapEntriesForLegalChart(
    rows: Array<{
      id: string;
      encounterId: string;
      category: string;
      cardId: string;
      authorUserId: string;
      authorDisplayNameSnapshot: string;
      authorRoleSnapshot: string;
      createdAt: Date;
      payloadJson: unknown;
      voidedAt: Date | null;
      requiresWitnessSignature?: boolean;
      witnessedAt?: Date | null;
      witnessedByUserId?: string | null;
      witnessDisplayNameSnapshot?: string | null;
      witnessRoleSnapshot?: string | null;
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
