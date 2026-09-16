import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { AuditAction, Prisma, RoleCode } from "@prisma/client";
import {
  applyFacilityConsoleModulesToServiceLines,
  diffFacilityConfiguration,
  facilityConfigurationPatchDtoSchema,
  facilityConfigurationRestoreDtoSchema,
  optionalModulesFromFacilityConsole,
  parseFacilityConfigurationSettings,
  parseStoredFacilityServiceLines,
  projectFacilityRuntimeConfiguration,
  resolveFacilityOptionalModules,
  shouldAutoReleaseDiagnosticResult,
  synchronizeDerivedSettings,
  validateFacilityConfiguration,
  type FacilityConfigurationPatchDto,
  type FacilityConfigurationSettings,
  type FacilityRuntimeConfiguration,
} from "@medora/shared";
import { randomUUID } from "crypto";
import { resolvePlatformAuthority } from "../auth/platform-principal";
import { AuditService } from "../common/services/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  ensureFacilityServiceLineDepartments,
  FacilityServiceLineDepartmentMappingError,
} from "../admin/facility-department-seed.util";
import { parseFacilityCareProfileJson, buildFacilityCareProfileJson } from "@medora/shared";
import { createStructuredLogger } from "../common/logging/structured-logger";
import { FacilityConfigurationRuntimeCache } from "./facility-configuration.runtime-cache";
import { FacilityConfigurationEvents } from "./facility-configuration.events";

type Actor = {
  userId: string;
  facilityId: string;
  ip?: string | null;
  userAgent?: string | null;
};

const FACILITY_SELECT = {
  id: true,
  name: true,
  code: true,
  timezone: true,
  country: true,
  defaultLanguage: true,
  facilityType: true,
  serviceLinesJson: true,
  facilityCareProfileJson: true,
  isActive: true,
} as const;

const log = createStructuredLogger("FacilityConfigurationService");

@Injectable()
export class FacilityConfigurationService {
  private readonly cache: FacilityConfigurationRuntimeCache;
  private readonly events: FacilityConfigurationEvents;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Optional() cache?: FacilityConfigurationRuntimeCache,
    @Optional() events?: FacilityConfigurationEvents,
  ) {
    this.cache = cache ?? new FacilityConfigurationRuntimeCache();
    this.events = events ?? new FacilityConfigurationEvents();
  }

  async assertCanConfigure(userId: string, facilityId: string) {
    const platform = await resolvePlatformAuthority(this.prisma, userId);
    if (platform.granted) return { platform: true };
    const adminHere = await this.prisma.userRole.findFirst({
      where: {
        userId,
        facilityId,
        isActive: true,
        role: { code: RoleCode.ADMIN },
      },
      select: { id: true },
    });
    if (adminHere) return { platform: false };
    throw new ForbiddenException("Configuration de l’établissement : accès refusé.");
  }

  async settingsForFacility(facilityId: string): Promise<FacilityConfigurationSettings> {
    const cached = this.cache.get(facilityId);
    if (cached) return cached.settings;
    const snapshot = await this.loadOrCreate(facilityId);
    this.cache.put(facilityId, snapshot.row.revision, snapshot.settings);
    return snapshot.settings;
  }

  async runtimeForFacility(facilityId: string): Promise<FacilityRuntimeConfiguration> {
    const started = Date.now();
    const cached = this.cache.get(facilityId);
    if (cached) {
      log.log("facility_configuration_load", { facilityId, revision: cached.revision, durationMs: Date.now() - started, source: "cache" });
      return cached.runtime;
    }
    try {
      const snapshot = await this.loadOrCreate(facilityId);
      const entry = this.cache.put(facilityId, snapshot.row.revision, snapshot.settings);
      log.log("facility_configuration_load", { facilityId, revision: snapshot.row.revision, durationMs: Date.now() - started, source: "db" });
      return entry.runtime;
    } catch (err) {
      log.warn("facility_configuration_load_failed", {
        facilityId,
        durationMs: Date.now() - started,
        name: err instanceof Error ? err.name : "unknown",
      });
      return this.cache.failoverRuntime(facilityId);
    }
  }

  async getForAdmin(actor: Actor) {
    await this.assertCanConfigure(actor.userId, actor.facilityId);
    const snapshot = await this.loadOrCreate(actor.facilityId);
    this.cache.put(actor.facilityId, snapshot.row.revision, snapshot.settings);
    const [revisions, updatedBy] = await Promise.all([
      this.prisma.facilityConfigurationRevision.findMany({
        where: { facilityId: actor.facilityId },
        orderBy: { revision: "desc" },
        take: 25,
        select: {
          id: true,
          revision: true,
          reason: true,
          changedByUserId: true,
          ip: true,
          createdAt: true,
        },
      }),
      snapshot.row.updatedByUserId
        ? this.prisma.user.findUnique({
            where: { id: snapshot.row.updatedByUserId },
            select: { id: true, firstName: true, lastName: true, email: true },
          })
        : Promise.resolve(null),
    ]);
    const changerIds = [...new Set(revisions.map((row) => row.changedByUserId))];
    const changers = changerIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: changerIds } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];
    const nameById = new Map(changers.map((user) => [user.id, [user.firstName, user.lastName].filter(Boolean).join(" ")]));
    await this.audit.log(AuditAction.VIEW, "FacilityConfiguration", {
      userId: actor.userId,
      facilityId: actor.facilityId,
      entityId: snapshot.row.id,
      ip: actor.ip ?? undefined,
      userAgent: actor.userAgent ?? undefined,
    });
    return this.toAdminDocument(actor, snapshot, revisions, updatedBy, nameById);
  }

  async getRevisionForAdmin(actor: Actor, revision: number) {
    await this.assertCanConfigure(actor.userId, actor.facilityId);
    const row = await this.prisma.facilityConfigurationRevision.findFirst({
      where: { facilityId: actor.facilityId, revision },
    });
    if (!row) throw new NotFoundException("Version de configuration introuvable.");
    const seed = await this.seedFromFacility(actor.facilityId);
    const settings = parseFacilityConfigurationSettings(row.settingsJson, seed);
    const changedBy = await this.prisma.user.findUnique({
      where: { id: row.changedByUserId },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    return {
      facilityId: actor.facilityId,
      revision: row.revision,
      reason: row.reason,
      createdAt: row.createdAt.toISOString(),
      changedBy: changedBy
        ? {
            id: changedBy.id,
            name: [changedBy.firstName, changedBy.lastName].filter(Boolean).join(" "),
            email: changedBy.email,
          }
        : null,
      settings,
      diffFromCurrent: diffFacilityConfiguration((await this.loadOrCreate(actor.facilityId)).settings, settings),
    };
  }

  async patchForAdmin(actor: Actor, body: unknown) {
    await this.assertCanConfigure(actor.userId, actor.facilityId);
    const parsed = facilityConfigurationPatchDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête de configuration invalide.");
    }
    return this.patchSettings(actor, parsed.data);
  }

  async restoreForAdmin(actor: Actor, body: unknown) {
    await this.assertCanConfigure(actor.userId, actor.facilityId);
    const parsed = facilityConfigurationRestoreDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Restauration invalide.");
    }
    const historical = await this.prisma.facilityConfigurationRevision.findFirst({
      where: { facilityId: actor.facilityId, revision: parsed.data.restoreRevision },
    });
    if (!historical) throw new NotFoundException("Version de configuration introuvable.");
    const seed = await this.seedFromFacility(actor.facilityId);
    const settings = parseFacilityConfigurationSettings(historical.settingsJson, seed);
    return this.patchSettings(actor, {
      revision: parsed.data.revision,
      reason: parsed.data.reason,
      settings,
    });
  }

  async patchSettings(actor: Actor, dto: FacilityConfigurationPatchDto) {
    const started = Date.now();
    const snapshot = await this.loadOrCreate(actor.facilityId);
    if (dto.revision !== snapshot.row.revision) {
      log.warn("facility_configuration_conflict", {
        facilityId: actor.facilityId,
        expected: snapshot.row.revision,
        received: dto.revision,
      });
      throw new ConflictException({
        code: "FACILITY_CONFIGURATION_CONFLICT",
        message: "La configuration a été modifiée par un autre administrateur. Rechargez et réessayez.",
        currentRevision: snapshot.row.revision,
      });
    }
    const issues = validateFacilityConfiguration(dto.settings);
    if (issues.length > 0) {
      log.warn("facility_configuration_validation_failed", {
        facilityId: actor.facilityId,
        issueIds: issues.map((issue) => issue.id),
      });
      throw new BadRequestException({
        code: "FACILITY_CONFIGURATION_INVALID",
        message: "Configuration invalide.",
        issues,
      });
    }
    const nextSettings = synchronizeDerivedSettings(dto.settings);
    if (nextSettings.branding.hospitalName.trim()) {
      nextSettings.branding.hospitalName = nextSettings.branding.hospitalName.trim();
    } else {
      nextSettings.branding.hospitalName = snapshot.facility.name;
    }
    const changes = diffFacilityConfiguration(snapshot.settings, nextSettings);
    if (changes.length === 0) {
      return this.getForAdmin(actor);
    }

    const nextRevision = snapshot.row.revision + 1;
    const nextLines = applyFacilityConsoleModulesToServiceLines(
      parseStoredFacilityServiceLines(snapshot.facility.serviceLinesJson) ?? [],
      nextSettings.modules,
    );
    const existingCare = parseFacilityCareProfileJson(snapshot.facility.facilityCareProfileJson);
    const optionalModules = optionalModulesFromFacilityConsole(nextSettings.modules, existingCare?.optionalModules ?? null);
    const careProfileJson = buildFacilityCareProfileJson({
      profile: existingCare?.profile ?? null,
      operatingMode: existingCare?.operatingMode ?? null,
      subtype: existingCare?.subtype ?? null,
      optionalModules,
      address: existingCare?.address ?? null,
      printDisplayName: existingCare?.printDisplayName ?? nextSettings.branding.hospitalName,
      legalName: existingCare?.legalName ?? null,
      dentalSpecialties: existingCare?.dentalSpecialties ?? null,
    });

    try {
      await this.prisma.$transaction(async (tx) => {
        try {
          await ensureFacilityServiceLineDepartments(tx, actor.facilityId, {
            facilityType: snapshot.facility.facilityType,
            serviceLines: nextLines,
            defaultLanguage: nextSettings.patientPortal.language,
          });
        } catch (err) {
          if (err instanceof FacilityServiceLineDepartmentMappingError) {
            throw new ConflictException({
              code: err.code,
              message: "Ligne de service sans département pris en charge.",
              serviceLine: err.serviceLine,
            });
          }
          throw err;
        }

        await tx.facility.update({
          where: { id: actor.facilityId },
          data: {
            name: nextSettings.branding.hospitalName,
            defaultLanguage: nextSettings.patientPortal.language,
            serviceLinesJson: nextLines as Prisma.InputJsonValue,
            facilityCareProfileJson: careProfileJson as Prisma.InputJsonValue,
          },
        });
        const locked = await tx.facilityConfiguration.updateMany({
          where: { id: snapshot.row.id, revision: dto.revision },
          data: {
            revision: nextRevision,
            settingsJson: nextSettings as Prisma.InputJsonValue,
            updatedByUserId: actor.userId,
          },
        });
        if (locked.count !== 1) {
          throw new ConflictException({
            code: "FACILITY_CONFIGURATION_CONFLICT",
            message: "La configuration a été modifiée par un autre administrateur. Rechargez et réessayez.",
            currentRevision: snapshot.row.revision,
          });
        }
        await tx.facilityConfigurationRevision.create({
          data: {
            id: randomUUID(),
            configurationId: snapshot.row.id,
            facilityId: actor.facilityId,
            revision: nextRevision,
            settingsJson: nextSettings as Prisma.InputJsonValue,
            changedByUserId: actor.userId,
            reason: dto.reason ?? null,
            ip: actor.ip ?? null,
            userAgent: actor.userAgent ?? null,
          },
        });
        await this.audit.log(AuditAction.FACILITY_CONFIGURATION_UPDATE, "FacilityConfiguration", {
          tx,
          critical: true,
          userId: actor.userId,
          facilityId: actor.facilityId,
          entityId: snapshot.row.id,
          ip: actor.ip ?? undefined,
          userAgent: actor.userAgent ?? undefined,
          metadata: {
            revision: nextRevision,
            reason: dto.reason ?? null,
            changedKeys: changes.map((change) => change.path),
            oldJson: snapshot.settings,
            newJson: nextSettings,
            changes,
          },
        });
      });
    } catch (err) {
      if (err instanceof ConflictException || err instanceof BadRequestException) throw err;
      throw err;
    }

    this.cache.invalidate(actor.facilityId);
    this.cache.put(actor.facilityId, nextRevision, nextSettings);
    this.events.emitUpdated({ facilityId: actor.facilityId, revision: nextRevision });
    log.log("facility_configuration_save", {
      facilityId: actor.facilityId,
      revision: nextRevision,
      durationMs: Date.now() - started,
      changedKeyCount: changes.length,
    });
    return this.getForAdmin(actor);
  }

  async assertStaffDigitalCare(facilityId: string) {
    const settings = await this.settingsForFacility(facilityId);
    if (!settings.modules.digitalCare.enabled || settings.modules.digitalCare.hidden) {
      throw new ForbiddenException("Soins numériques désactivés pour cet établissement.");
    }
    return settings;
  }

  async assertMessaging(facilityId: string, party: "STAFF" | "PATIENT") {
    const settings = await this.settingsForFacility(facilityId);
    if (
      !settings.modules.digitalCare.enabled ||
      settings.modules.digitalCare.hidden ||
      !settings.digitalCare.secureMessaging ||
      !settings.messaging.enabled
    ) {
      throw new ForbiddenException("Messagerie sécurisée désactivée pour cet établissement.");
    }
    if (party === "STAFF" && !settings.digitalCare.providerChat) {
      throw new ForbiddenException("Discussion clinicien désactivée pour cet établissement.");
    }
    if (party === "PATIENT" && (!settings.digitalCare.patientChat || !settings.patientPortal.messages)) {
      throw new ForbiddenException("Messagerie patient désactivée pour cet établissement.");
    }
    return settings;
  }

  async maybeAutoReleaseVerifiedItem(input: {
    facilityId: string;
    orderItemId: string;
    patientId: string;
    kind: "LAB_TEST" | "IMAGING_STUDY";
    critical: boolean;
    verifiedAt: Date;
    userId?: string;
  }) {
    const settings = await this.settingsForFacility(input.facilityId);
    if (
      !shouldAutoReleaseDiagnosticResult({
        settings,
        kind: input.kind,
        critical: input.critical,
        verifiedAt: input.verifiedAt,
      })
    ) {
      return false;
    }
    const id = randomUUID();
    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO "PatientDiagnosticResultRelease" (
        "id","orderItemId","patientId","facilityId","releasedByUserId","releasedAt","revokedByUserId","revokedAt","createdAt","updatedAt"
      ) VALUES (
        ${id}, ${input.orderItemId}, ${input.patientId}, ${input.facilityId}, ${input.userId ?? null},
        CURRENT_TIMESTAMP, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      ON CONFLICT ("orderItemId") DO UPDATE SET
        "revokedByUserId" = NULL,
        "revokedAt" = NULL,
        "releasedAt" = CURRENT_TIMESTAMP,
        "updatedAt" = CURRENT_TIMESTAMP
    `);
    return true;
  }

  async ensureAutoReleasesForFacility(facilityId: string, actorUserId?: string) {
    const settings = await this.settingsForFacility(facilityId);
    if (!settings.digitalCare.autoRelease || settings.resultRelease.mode !== "AUTO") return 0;
    const orders = await this.prisma.order.findMany({
      where: { facilityId, cancelledAt: null },
      select: {
        patientId: true,
        items: {
          select: {
            id: true,
            catalogItemType: true,
            result: { select: { verifiedAt: true, criticalValue: true } },
          },
        },
      },
      take: 250,
    });
    const candidates = orders.flatMap((order) =>
      order.items
        .filter(
          (item) =>
            (item.catalogItemType === "LAB_TEST" || item.catalogItemType === "IMAGING_STUDY") &&
            item.result?.verifiedAt &&
            shouldAutoReleaseDiagnosticResult({
              settings,
              kind: item.catalogItemType,
              critical: Boolean(item.result.criticalValue),
              verifiedAt: item.result.verifiedAt,
            }),
        )
        .map((item) => ({ orderItemId: item.id, patientId: order.patientId })),
    );
    if (candidates.length === 0) return 0;
    const existing = await this.prisma.$queryRaw<Array<{ orderItemId: string; revokedAt: Date | null }>>(Prisma.sql`
      SELECT "orderItemId", "revokedAt" FROM "PatientDiagnosticResultRelease"
      WHERE "facilityId" = ${facilityId} AND "orderItemId" IN (${Prisma.join(candidates.map((row) => row.orderItemId))})
    `);
    const released = new Set(existing.filter((row) => !row.revokedAt).map((row) => row.orderItemId));
    let created = 0;
    for (const candidate of candidates) {
      if (released.has(candidate.orderItemId)) continue;
      const id = randomUUID();
      await this.prisma.$executeRaw(Prisma.sql`
        INSERT INTO "PatientDiagnosticResultRelease" (
          "id","orderItemId","patientId","facilityId","releasedByUserId","releasedAt","revokedByUserId","revokedAt","createdAt","updatedAt"
        ) VALUES (
          ${id}, ${candidate.orderItemId}, ${candidate.patientId}, ${facilityId}, ${actorUserId ?? null},
          CURRENT_TIMESTAMP, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        ON CONFLICT ("orderItemId") DO UPDATE SET
          "revokedByUserId" = NULL,
          "revokedAt" = NULL,
          "releasedAt" = CURRENT_TIMESTAMP,
          "updatedAt" = CURRENT_TIMESTAMP
      `);
      created += 1;
    }
    return created;
  }

  private toAdminDocument(
    actor: Actor,
    snapshot: Awaited<ReturnType<FacilityConfigurationService["loadOrCreate"]>>,
    revisions: Array<{
      id: string;
      revision: number;
      reason: string | null;
      changedByUserId: string;
      ip: string | null;
      createdAt: Date;
    }>,
    updatedBy: { id: string; firstName: string; lastName: string; email: string } | null,
    nameById: Map<string, string>,
  ) {
    return {
      facility: {
        id: snapshot.facility.id,
        name: snapshot.facility.name,
        code: snapshot.facility.code,
        timezone: snapshot.facility.timezone,
        country: snapshot.facility.country,
        language: snapshot.facility.defaultLanguage,
        facilityType: snapshot.facility.facilityType,
        isActive: snapshot.facility.isActive,
      },
      revision: snapshot.row.revision,
      updatedAt: snapshot.row.updatedAt.toISOString(),
      updatedBy: updatedBy
        ? {
            id: updatedBy.id,
            name: [updatedBy.firstName, updatedBy.lastName].filter(Boolean).join(" "),
            email: updatedBy.email,
          }
        : null,
      settings: snapshot.settings,
      runtime: projectFacilityRuntimeConfiguration(actor.facilityId, snapshot.settings, snapshot.row.revision),
      history: revisions.map((row) => ({
        id: row.id,
        revision: row.revision,
        reason: row.reason,
        changedByUserId: row.changedByUserId,
        changedByName: nameById.get(row.changedByUserId) ?? null,
        ip: row.ip,
        createdAt: row.createdAt.toISOString(),
      })),
    };
  }

  private async seedFromFacility(facilityId: string) {
    const facility = await this.prisma.facility.findUnique({
      where: { id: facilityId },
      select: FACILITY_SELECT,
    });
    if (!facility) throw new NotFoundException("Établissement introuvable.");
    return {
      hospitalName: facility.name,
      language: (facility.defaultLanguage === "en" || facility.defaultLanguage === "es" ? facility.defaultLanguage : "fr") as
        | "fr"
        | "en"
        | "es",
      serviceLines: parseStoredFacilityServiceLines(facility.serviceLinesJson),
      optionalModules: resolveFacilityOptionalModules({
        facilityType: facility.facilityType,
        careProfileJson: facility.facilityCareProfileJson,
        serviceLines: parseStoredFacilityServiceLines(facility.serviceLinesJson),
      }),
      facilityType: facility.facilityType,
    };
  }

  private async loadOrCreate(facilityId: string) {
    const facility = await this.prisma.facility.findUnique({
      where: { id: facilityId },
      select: FACILITY_SELECT,
    });
    if (!facility) throw new NotFoundException("Établissement introuvable.");
    const seed = {
      hospitalName: facility.name,
      language: (facility.defaultLanguage === "en" || facility.defaultLanguage === "es" ? facility.defaultLanguage : "fr") as
        | "fr"
        | "en"
        | "es",
      serviceLines: parseStoredFacilityServiceLines(facility.serviceLinesJson),
      optionalModules: resolveFacilityOptionalModules({
        facilityType: facility.facilityType,
        careProfileJson: facility.facilityCareProfileJson,
        serviceLines: parseStoredFacilityServiceLines(facility.serviceLinesJson),
      }),
      facilityType: facility.facilityType,
    };
    const existing = await this.prisma.facilityConfiguration.findUnique({
      where: { facilityId },
    });
    if (existing) {
      return {
        facility,
        row: existing,
        settings: parseFacilityConfigurationSettings(existing.settingsJson, seed),
      };
    }
    const settings = parseFacilityConfigurationSettings(null, seed);
    try {
      const created = await this.prisma.facilityConfiguration.create({
        data: {
          facilityId,
          revision: 1,
          settingsJson: settings as Prisma.InputJsonValue,
        },
      });
      return { facility, row: created, settings };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        const raced = await this.prisma.facilityConfiguration.findUnique({ where: { facilityId } });
        if (raced) {
          return {
            facility,
            row: raced,
            settings: parseFacilityConfigurationSettings(raced.settingsJson, seed),
          };
        }
      }
      throw err;
    }
  }
}
