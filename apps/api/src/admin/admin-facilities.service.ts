import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import type {
  CreateFacilityDto,
  FacilityBillingIdentityPatchDto,
  FacilityBillingWorkflowPatchDto,
  UpdateFacilityServiceConfigDto,
  MedoraServiceLine,
} from "@medora/shared";
import {
  FACILITY_CONFIGURATION_CONFLICT,
  buildServiceLineDisablePreflight,
  mapBillingClassificationModeToSiteType,
  parseStoredFacilityServiceLines,
  projectEnterpriseFacilityCapabilities,
  resolveFacilityServiceLines,
  getDefaultBillingClassificationModeForProfile,
  projectFacilityPrintIdentity,
  resolveFacilityCareProfile,
  resolveFacilityModuleCapabilitiesD4c1,
  resolveDentalSpecialtiesFromCareProfile,
  resolveEffectiveFacilityBillingWorkflow,
  FACILITY_DEFAULT_LANGUAGE,
  parseProductUiLanguage,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditAction, FacilityType, RoleCode } from "@prisma/client";
import { randomBytes } from "crypto";
import { resolvePlatformAuthority } from "../auth/platform-principal";
import { BillingIdentityService } from "../billing/billing-identity.service";
import { FacilityBillingWorkflowService } from "../encounters/facility-billing-workflow.service";
import {
  ensureFacilityClinicalDepartments,
  ensureFacilityServiceLineDepartments,
  FacilityServiceLineDepartmentMappingError,
} from "./facility-department-seed.util";
import { AuditService } from "../common/services/audit.service";
import { logSecurityAdminAudit } from "../common/services/security-admin-audit";
import {
  buildCareProfileJsonFromDto,
  mergeCareProfileJson,
  resolveServiceLinesForCareConfig,
} from "./facility-care-profile.util";

function facilityUiLanguage(raw: string | null | undefined) {
  return parseProductUiLanguage(raw) ?? FACILITY_DEFAULT_LANGUAGE;
}

async function ensureServiceLineDepartmentsOrThrow(
  prisma: Parameters<typeof ensureFacilityServiceLineDepartments>[0],
  facilityId: string,
  input: Parameters<typeof ensureFacilityServiceLineDepartments>[2],
) {
  try {
    return await ensureFacilityServiceLineDepartments(prisma, facilityId, input);
  } catch (err: unknown) {
    if (err instanceof FacilityServiceLineDepartmentMappingError) {
      throw new BadRequestException({
        code: err.code,
        message:
          "Configuration des services invalide : ligne de service sans département Prisma pris en charge.",
        serviceLine: err.serviceLine,
        invalidCode: err.invalidCode,
      });
    }
    throw err;
  }
}

/** Valeurs par défaut — le schéma Prisma exige country et timezone ; non exposés sur POST minimal (nom seul). */
const DEFAULT_NEW_FACILITY_COUNTRY = "Haiti";
const DEFAULT_NEW_FACILITY_TIMEZONE = "America/Port-au-Prince";

const FACILITY_BILLING_KEYS = [
  "billingLegalName",
  "billingNpi",
  "taxIdEin",
  "billingAddressLine1",
  "billingAddressLine2",
  "billingCity",
  "billingStateProvince",
  "billingPostalCode",
  "billingCountry",
  "billingFacilityTypeLabel",
] as const;

const CLIENT_ESCALATION_KEYS = [
  "ownerUserId",
  "capabilities",
  "isPlatformAdmin",
  "roleCodes",
  "facilityId",
] as const;

function assertNoClientEscalation(dto: object) {
  const record = dto as Record<string, unknown>;
  for (const key of CLIENT_ESCALATION_KEYS) {
    if (key in record && record[key] !== undefined) {
      throw new BadRequestException(`Champ non autorisé: ${key}`);
    }
  }
}

function pickFacilityBillingFromCreateDto(
  dto: CreateFacilityDto,
): Partial<FacilityBillingIdentityPatchDto> {
  const out: Partial<FacilityBillingIdentityPatchDto> = {};
  for (const k of FACILITY_BILLING_KEYS) {
    const v = dto[k];
    if (v !== undefined) {
      (out as Record<string, unknown>)[k] = v;
    }
  }
  return out;
}

function toFacilityTypeEnum(value: string | undefined | null): FacilityType {
  const code = String(value ?? "CLINIC")
    .trim()
    .toUpperCase();
  if (Object.values(FacilityType).includes(code as FacilityType)) {
    return code as FacilityType;
  }
  return FacilityType.CLINIC;
}

function serializeServiceLinesForStorage(
  facilityType: FacilityType,
  serviceLines: readonly string[] | null | undefined,
): MedoraServiceLine[] {
  return resolveFacilityServiceLines({
    facilityType,
    configuredServiceLines: serviceLines ?? null,
  });
}

function mapFacilityRowForClient(row: {
  id: string;
  name: string;
  defaultLanguage: string;
  isActive?: boolean;
  facilityType: FacilityType;
  serviceLinesJson: unknown;
  facilityCareProfileJson?: unknown;
  timezone?: string;
  country?: string | null;
  updatedAt?: Date;
  billingClassificationMode?: string | null;
  billingSiteType?: string | null;
}) {
  const serviceLines = resolveFacilityServiceLines({
    facilityType: row.facilityType,
    configuredServiceLines: parseStoredFacilityServiceLines(
      row.serviceLinesJson,
    ),
  });
  const careProfile = resolveFacilityCareProfile({
    facilityType: row.facilityType,
    careProfileJson: row.facilityCareProfileJson,
    serviceLines,
  });
  const capabilities = resolveFacilityModuleCapabilitiesD4c1({
    facilityType: row.facilityType,
    careProfileJson: row.facilityCareProfileJson,
    serviceLines,
  });
  const printIdentity = projectFacilityPrintIdentity({
    facilityName: row.name,
    careProfileJson: row.facilityCareProfileJson,
  });
  const enterpriseCapabilities = projectEnterpriseFacilityCapabilities({
    facilityId: row.id,
    facilityType: row.facilityType,
    serviceLinesJson: row.serviceLinesJson,
    careProfileJson: row.facilityCareProfileJson,
    facilityCountry: row.country,
    billing: {
      billingClassificationMode:
        (row.billingClassificationMode as
          | "CLINIC_ONLY"
          | "URGENT_CARE_ONLY"
          | "EMERGENCY_ONLY"
          | "HYBRID_UC_ED"
          | "HOSPITAL_ENTERPRISE"
          | null
          | undefined) ?? null,
      billingSiteType:
        (row.billingSiteType as
          | "CLINIC"
          | "URGENT_CARE"
          | "FREESTANDING_ER"
          | "HYBRID"
          | "HOSPITAL"
          | null
          | undefined) ?? null,
    },
    updatedAt: row.updatedAt ?? null,
  });
  return {
    id: row.id,
    name: row.name,
    defaultLanguage: facilityUiLanguage(row.defaultLanguage),
    ...(row.isActive !== undefined ? { isActive: row.isActive } : {}),
    ...(row.timezone !== undefined ? { timezone: row.timezone } : {}),
    facilityType: row.facilityType,
    serviceLines,
    careProfile,
    moduleCapabilities: capabilities,
    printIdentity,
    facilityCareProfileJson: row.facilityCareProfileJson ?? null,
    configurationUpdatedAt: row.updatedAt?.toISOString() ?? null,
    enterpriseCapabilities,
  };
}

const FACILITY_LIST_SELECT = {
  id: true,
  name: true,
  defaultLanguage: true,
  facilityType: true,
  serviceLinesJson: true,
  facilityCareProfileJson: true,
  timezone: true,
  country: true,
  updatedAt: true,
  billingClassificationMode: true,
  billingSiteType: true,
} as const;

@Injectable()
export class AdminFacilitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billingIdentity: BillingIdentityService,
    private readonly facilityBillingWorkflow: FacilityBillingWorkflowService,
    @Optional() private readonly audit?: AuditService,
  ) {}

  private get requiredAudit(): AuditService {
    if (!this.audit) throw new Error("SECURITY_ADMIN_AUDIT_SERVICE_REQUIRED");
    return this.audit;
  }

  private async isPlatformPrincipal(userId: string): Promise<boolean> {
    return (await resolvePlatformAuthority(this.prisma, userId)).granted;
  }

  async create(dto: CreateFacilityDto, userId: string, capabilityAuthorized = false, assignCreatorAdmin = true) {
    assertNoClientEscalation(dto);
    if (!capabilityAuthorized && !(await this.isPlatformPrincipal(userId))) {
      throw new ForbiddenException(
        "Création d’établissement non autorisée pour ce compte.",
      );
    }

    const trimmed = dto.name.trim();
    const code = `FAC-${randomBytes(6).toString("hex")}`;
    const billingFragment = pickFacilityBillingFromCreateDto(dto);
    const hasBillingInput = Object.keys(billingFragment).length > 0;
    const facilityType = toFacilityTypeEnum(dto.facilityType ?? "CLINIC");
    const careProfileJson = buildCareProfileJsonFromDto(dto, facilityType);
    const serviceLines = serializeServiceLinesForStorage(
      facilityType,
      resolveServiceLinesForCareConfig({
        facilityType,
        dto,
      }),
    );
    const profile = resolveFacilityCareProfile({
      facilityType,
      careProfileJson,
      serviceLines,
    });
    const workflowMode =
      dto.billingClassificationMode ??
      getDefaultBillingClassificationModeForProfile(profile);
    const timezone = dto.timezone?.trim() || DEFAULT_NEW_FACILITY_TIMEZONE;
    const countryFromDto =
      dto.operationalAddress?.country?.trim() ||
      dto.country?.trim() ||
      DEFAULT_NEW_FACILITY_COUNTRY;

    return this.prisma.$transaction(async (tx) => {
      const facility = await tx.facility.create({
        data: {
          code,
          name: trimmed,
          country: countryFromDto,
          timezone,
          defaultLanguage: dto.defaultLanguage ?? "fr",
          facilityType,
          serviceLinesJson: serviceLines,
          facilityCareProfileJson: careProfileJson,
          ...(hasBillingInput ? billingFragment : {}),
          ...(workflowMode
            ? {
                billingClassificationMode: workflowMode,
                billingSiteType:
                  mapBillingClassificationModeToSiteType(workflowMode),
                allowUrgentCareToEmergencyUpgrade:
                  dto.allowUrgentCareToEmergencyUpgrade ??
                  (workflowMode === "HYBRID_UC_ED" ||
                    workflowMode === "HOSPITAL_ENTERPRISE"),
                requireUcToEdPatientAcknowledgement:
                  dto.requireUcToEdPatientAcknowledgement ?? true,
                showEncounterBillingControls:
                  dto.showEncounterBillingControls ??
                  (workflowMode === "HYBRID_UC_ED" ||
                    workflowMode === "HOSPITAL_ENTERPRISE"),
                allowedEncounterBillingClassifications:
                  dto.allowedEncounterBillingClassifications ?? [],
              }
            : {}),
        },
      });

      if (assignCreatorAdmin) {
        const adminRole = await tx.role.findUnique({ where: { code: RoleCode.ADMIN } });
        if (!adminRole) throw new NotFoundException("Rôle ADMIN introuvable.");
        await tx.userRole.create({
          data: {
            userId,
            facilityId: facility.id,
            roleId: adminRole.id,
            professionCode: "ADMINISTRATION",
            isActive: true,
          },
        });
      }

      await ensureServiceLineDepartmentsOrThrow(tx, facility.id, {
        facilityType: facility.facilityType,
        serviceLines,
        defaultLanguage: facilityUiLanguage(facility.defaultLanguage),
      });

      await logSecurityAdminAudit(
        this.requiredAudit,
        AuditAction.FACILITY_CARE_PROFILE_UPDATED,
        {
          event: "FACILITY_CREATED",
          actorUserId: userId,
          facilityId: facility.id,
          entityType: "Facility",
          entityId: facility.id,
          severity: "HIGH",
          outcome: "SUCCESS",
          sourceOperation: "AdminFacilitiesService.create",
          evidence: {
            facilityType: facility.facilityType,
            careProfile: profile,
            serviceLines,
          },
          tx,
        },
      );

      return mapFacilityRowForClient(facility);
    });
  }

  /** Platform principal or facility ADMIN — same data as GET billing/facility-identity for `id`. */
  async getFacilityBillingIdentityForAdmin(
    actorUserId: string,
    facilityId: string,
    preauthorized = false,
  ) {
    if (!preauthorized) await this.assertCanManageFacilityBilling(actorUserId, facilityId);
    return this.billingIdentity.getFacilityBillingIdentity(facilityId);
  }

  async updateFacilityBillingIdentityForAdmin(
    actorUserId: string,
    facilityId: string,
    dto: FacilityBillingIdentityPatchDto,
    preauthorized = false,
  ) {
    if (!preauthorized) await this.assertCanManageFacilityBilling(actorUserId, facilityId);
    return this.billingIdentity.updateFacilityBillingIdentity(facilityId, dto);
  }

  async getFacilityBillingWorkflowForAdmin(
    actorUserId: string,
    facilityId: string,
    preauthorized = false,
  ) {
    if (!preauthorized) await this.assertCanManageFacilityBilling(actorUserId, facilityId);
    return this.facilityBillingWorkflow.getForFacility(facilityId);
  }

  async updateFacilityBillingWorkflowForAdmin(
    actorUserId: string,
    facilityId: string,
    dto: FacilityBillingWorkflowPatchDto,
    preauthorized = false,
  ) {
    if (!preauthorized) await this.assertCanManageFacilityBilling(actorUserId, facilityId);
    return this.facilityBillingWorkflow.updateForFacility(facilityId, dto, actorUserId);
  }

  /** MEDUI.AUTH.ROLE.2 — active clinical departments for admin user assignment UI. */
  async listDepartmentsForAdmin(actorUserId: string, facilityId: string, preauthorized = false) {
    if (!preauthorized) await this.assertCanManageFacilityBilling(actorUserId, facilityId);
    const facility = await this.prisma.facility.findUnique({
      where: { id: facilityId },
      select: { defaultLanguage: true },
    });
    if (!facility) {
      throw new NotFoundException("Établissement introuvable.");
    }
    await ensureFacilityClinicalDepartments(this.prisma, facilityId, {
      defaultLanguage: facilityUiLanguage(facility.defaultLanguage),
    });
    const facilityConfig = await this.prisma.facility.findUnique({
      where: { id: facilityId },
      select: { facilityType: true, serviceLinesJson: true },
    });
    if (facilityConfig) {
      await ensureServiceLineDepartmentsOrThrow(this.prisma, facilityId, {
        facilityType: facilityConfig.facilityType,
        serviceLines: parseStoredFacilityServiceLines(
          facilityConfig.serviceLinesJson,
        ),
        defaultLanguage: facilityUiLanguage(facility.defaultLanguage),
      });
    }
    const items = await this.prisma.department.findMany({
      where: { facilityId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, code: true, name: true },
    });
    return { items };
  }

  private async assertCanManageFacilityBilling(
    actorUserId: string,
    facilityId: string,
  ) {
    if (await this.isPlatformPrincipal(actorUserId)) {
      return;
    }
    const adminHere = await this.prisma.userRole.findFirst({
      where: {
        userId: actorUserId,
        facilityId,
        isActive: true,
        role: { code: RoleCode.ADMIN },
      },
    });
    if (adminHere) {
      return;
    }
    throw new ForbiddenException(
      "Profil de facturation établissement : accès refusé.",
    );
  }

  /**
   * An authoritative platform principal may list all facilities without per-facility ADMIN.
   * Facility-level ADMIN at the active `x-facility-id` retains the previous list access (global rows).
   */
  async assertCanListFacilities(
    userId: string,
    facilityIdHeader: string | undefined,
  ) {
    if (await this.isPlatformPrincipal(userId)) {
      return;
    }

    if (!facilityIdHeader) {
      throw new BadRequestException("Établissement requis");
    }

    const hasAdminHere = await this.prisma.userRole.findFirst({
      where: {
        userId,
        facilityId: facilityIdHeader,
        isActive: true,
        role: { code: RoleCode.ADMIN },
      },
    });
    if (!hasAdminHere) {
      throw new ForbiddenException(
        "Liste des établissements non autorisée pour ce compte.",
      );
    }
  }

  /**
   * @param includeInactive — If true, only the platform principal may list all facilities (with `isActive`).
   * Otherwise active facilities are returned: all for the principal, or only those the user belongs to.
   */
  async list(userId: string, includeInactive: boolean) {
    if (includeInactive) {
      if (!(await this.isPlatformPrincipal(userId))) {
        throw new ForbiddenException(
          "Liste complète des établissements non autorisée pour ce compte.",
        );
      }
      return this.prisma.facility
        .findMany({
          orderBy: { name: "asc" },
          select: {
            ...FACILITY_LIST_SELECT,
            isActive: true,
          },
        })
        .then((rows) => rows.map((row) => mapFacilityRowForClient(row)));
    }
    if (await this.isPlatformPrincipal(userId)) {
      return this.prisma.facility
        .findMany({
          where: { isActive: true },
          orderBy: { name: "asc" },
          select: FACILITY_LIST_SELECT,
        })
        .then((rows) => rows.map((row) => mapFacilityRowForClient(row)));
    }
    const roles = await this.prisma.userRole.findMany({
      where: {
        userId,
        isActive: true,
      },
      select: { facilityId: true },
    });
    const facilityIds = roles.map((r) => r.facilityId);
    return this.prisma.facility
      .findMany({
        where: {
          isActive: true,
          id: { in: facilityIds },
        },
        orderBy: { name: "asc" },
        select: FACILITY_LIST_SELECT,
      })
      .then((rows) => rows.map((row) => mapFacilityRowForClient(row)));
  }

  async updateFacilityServiceConfig(
    id: string,
    dto: UpdateFacilityServiceConfigDto,
    userId: string,
    preauthorized = false,
  ) {
    assertNoClientEscalation(dto);
    if (!preauthorized) await this.assertCanManageFacilityBilling(userId, id);

    const existing = await this.prisma.facility.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        defaultLanguage: true,
        facilityType: true,
        serviceLinesJson: true,
        facilityCareProfileJson: true,
        timezone: true,
        country: true,
        updatedAt: true,
        billingClassificationMode: true,
        billingSiteType: true,
      },
    });
    if (!existing) {
      throw new NotFoundException("Établissement introuvable.");
    }

    if (dto.expectedUpdatedAt) {
      const currentIso = existing.updatedAt.toISOString();
      if (currentIso !== dto.expectedUpdatedAt) {
        throw new ConflictException({
          code: FACILITY_CONFIGURATION_CONFLICT,
          message:
            "La configuration de l’établissement a été modifiée par un autre administrateur. Rechargez et réessayez.",
          currentUpdatedAt: currentIso,
        });
      }
    }

    const nextType = dto.facilityType
      ? toFacilityTypeEnum(dto.facilityType)
      : existing.facilityType;
    const existingLines = parseStoredFacilityServiceLines(
      existing.serviceLinesJson,
    ) ?? [];
    const nextServiceLines = resolveServiceLinesForCareConfig({
      facilityType: nextType,
      dto,
      existingServiceLines: existingLines,
      existingCareProfileJson: existing.facilityCareProfileJson,
    });
    const serialized = serializeServiceLinesForStorage(
      nextType,
      nextServiceLines,
    );
    const priorLines = [...existingLines];
    const addedServiceLines = serialized.filter((l) => !priorLines.includes(l));
    const removedServiceLines = priorLines.filter((l) => !serialized.includes(l));
    const careProfileJson = mergeCareProfileJson(
      existing.facilityCareProfileJson,
      dto,
      nextType,
    );
    const profile = resolveFacilityCareProfile({
      facilityType: nextType,
      careProfileJson,
      serviceLines: serialized,
    });
    const priorSpecialties = resolveDentalSpecialtiesFromCareProfile(
      existing.facilityCareProfileJson,
    );
    const nextSpecialties = resolveDentalSpecialtiesFromCareProfile(careProfileJson);
    const nextCountry =
      dto.operationalAddress?.country?.trim() || dto.country?.trim() || null;

    const billingBefore = resolveEffectiveFacilityBillingWorkflow({
      billingClassificationMode: existing.billingClassificationMode as never,
      billingSiteType: existing.billingSiteType as never,
    });

    if (removedServiceLines.length > 0 && dto.acknowledgeServiceLineDisable !== true) {
      const preflight = [];
      for (const line of removedServiceLines) {
        const openEncounterCount = await this.countOpenEncountersForServiceLine(
          id,
          line,
        );
        const futureAppointmentCount =
          line === "CLINIC" || line === "URGENT_CARE" || line === "DENTAL"
            ? await this.prisma.appointment.count({
                where: {
                  facilityId: id,
                  status: { in: ["SCHEDULED", "ARRIVED"] },
                  scheduledStartAt: { gt: new Date() },
                },
              })
            : 0;
        const item = buildServiceLineDisablePreflight({
          serviceLine: line,
          openEncounterCount,
          futureAppointmentCount,
        });
        if (item.acknowledgementRequired) preflight.push(item);
      }
      if (preflight.length > 0) {
        throw new BadRequestException({
          code: "FACILITY_SERVICE_LINE_DISABLE_ACK_REQUIRED",
          message:
            "Des dépendances opérationnelles existent. Confirmez la désactivation pour continuer.",
          preflight,
        });
      }
    }

    const isPlatform = await this.isPlatformPrincipal(userId);

    const updated = await this.prisma.$transaction(async (tx) => {
      const data = {
        facilityType: nextType,
        serviceLinesJson: serialized,
        facilityCareProfileJson: careProfileJson,
        ...(dto.timezone != null && String(dto.timezone).trim()
          ? { timezone: String(dto.timezone).trim() }
          : {}),
        ...(nextCountry ? { country: nextCountry } : {}),
      };

      if (dto.expectedUpdatedAt != null) {
        const count = await tx.facility.updateMany({
          where: { id, updatedAt: existing.updatedAt },
          data,
        });
        if (count.count === 0) {
          throw new ConflictException({
            code: FACILITY_CONFIGURATION_CONFLICT,
            message:
              "La configuration de l’établissement a été modifiée par un autre administrateur. Rechargez et réessayez.",
            currentUpdatedAt: existing.updatedAt.toISOString(),
          });
        }
      } else {
        await tx.facility.update({
          where: { id },
          data,
        });
      }

      const row = await tx.facility.findUniqueOrThrow({
        where: { id },
        select: FACILITY_LIST_SELECT,
      });

      const deptResult = await ensureServiceLineDepartmentsOrThrow(tx, id, {
        facilityType: row.facilityType,
        serviceLines: serialized,
        defaultLanguage: facilityUiLanguage(row.defaultLanguage),
      });

      await tx.auditLog.create({
        data: {
          facilityId: id,
          userId,
          action: AuditAction.FACILITY_CARE_PROFILE_UPDATED,
          entityType: "Facility",
          entityId: id,
          metadata: {
            event: "FACILITY_CONFIGURATION_UPDATED",
            certificationId: "MEDUI.D4C.9",
            actorIsPlatformPrincipal: isPlatform,
            configurationVersion: row.updatedAt.toISOString(),
            facilityType: nextType,
            careProfile: profile,
            previousServiceLines: priorLines,
            newServiceLines: serialized,
            addedServiceLines,
            removedServiceLines,
            previousSpecialties: priorSpecialties,
            newSpecialties: nextSpecialties,
            previousOptionalModules: resolveFacilityModuleCapabilitiesD4c1({
              facilityType: existing.facilityType,
              careProfileJson: existing.facilityCareProfileJson,
              serviceLines: priorLines,
            }),
            newOptionalModules: resolveFacilityModuleCapabilitiesD4c1({
              facilityType: nextType,
              careProfileJson: careProfileJson,
              serviceLines: serialized,
            }),
            previousBillingWorkflowConfigured: billingBefore.configuredMode,
            newBillingWorkflowConfigured: billingBefore.configuredMode,
            previousBillingWorkflowEffective: billingBefore.effectiveMode,
            newBillingWorkflowEffective: billingBefore.effectiveMode,
            departmentProvisioning: deptResult,
            resetToTypeDefaults: dto.resetToTypeDefaults === true,
            operationalIdentityUpdated:
              dto.operationalAddress != null ||
              dto.printDisplayName != null ||
              dto.legalName != null,
            ...(addedServiceLines.includes("DENTAL")
              ? { enablementEvent: "FACILITY_SERVICE_LINE_ENABLED", enabledLine: "DENTAL" }
              : {}),
            ...(removedServiceLines.includes("DENTAL")
              ? { disablementEvent: "FACILITY_SERVICE_LINE_DISABLED", disabledLine: "DENTAL" }
              : {}),
          },
        },
      });

      return row;
    });

    return mapFacilityRowForClient(updated);
  }

  /** Best-effort open-encounter counts for disable preflight (Dental tagged vs type). */
  private async countOpenEncountersForServiceLine(
    facilityId: string,
    serviceLine: string,
  ): Promise<number> {
    if (serviceLine === "DENTAL") {
      const open = await this.prisma.encounter.findMany({
        where: { facilityId, status: "OPEN" },
        select: { nursingAssessment: true, roomLabel: true },
        take: 500,
      });
      return open.filter((e) => {
        const na = e.nursingAssessment;
        if (na && typeof na === "object" && !Array.isArray(na)) {
          if ((na as Record<string, unknown>).dentalServiceLineV1 != null) return true;
        }
        return String(e.roomLabel ?? "").toUpperCase() === "DENTAL";
      }).length;
    }
    if (serviceLine === "EMERGENCY") {
      return this.prisma.encounter.count({
        where: { facilityId, status: "OPEN", type: "EMERGENCY" },
      });
    }
    if (serviceLine === "HOSPITAL" || serviceLine === "INPATIENT") {
      return this.prisma.encounter.count({
        where: { facilityId, status: "OPEN", type: "INPATIENT" },
      });
    }
    if (serviceLine === "CLINIC" || serviceLine === "URGENT_CARE") {
      return this.prisma.encounter.count({
        where: {
          facilityId,
          status: "OPEN",
          type: serviceLine === "URGENT_CARE" ? "URGENT_CARE" : "OUTPATIENT",
        },
      });
    }
    return 0;
  }

  async setFacilityLanguage(
    id: string,
    defaultLanguage: "fr" | "en",
    userId: string,
    preauthorized = false,
  ) {
    if (!preauthorized && !(await this.isPlatformPrincipal(userId))) {
      throw new ForbiddenException(
        "Modification de l’établissement non autorisée pour ce compte.",
      );
    }

    const existing = await this.prisma.facility.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException("Établissement introuvable.");
    }

    return this.prisma.facility.update({
      where: { id },
      data: { defaultLanguage },
      select: { id: true, name: true, defaultLanguage: true },
    });
  }

  async setFacilityActive(id: string, isActive: boolean, userId: string, preauthorized = false) {
    if (!preauthorized && !(await this.isPlatformPrincipal(userId))) {
      throw new ForbiddenException(
        "Modification de l’établissement non autorisée pour ce compte.",
      );
    }

    const existing = await this.prisma.facility.findUnique({
      where: { id },
      select: { id: true, isActive: true },
    });
    if (!existing) {
      throw new NotFoundException("Établissement introuvable.");
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.facility.update({
        where: { id },
        data: { isActive },
        select: { id: true, name: true, isActive: true, defaultLanguage: true },
      });
      await logSecurityAdminAudit(this.requiredAudit, AuditAction.UPDATE, {
        event: isActive ? "FACILITY_ACTIVATED" : "FACILITY_DEACTIVATED",
        actorUserId: userId,
        facilityId: id,
        entityType: "Facility",
        entityId: id,
        severity: "CRITICAL",
        outcome: "SUCCESS",
        sourceOperation: "AdminFacilitiesService.setFacilityActive",
        evidence: {
          before: { isActive: existing.isActive },
          after: { isActive },
        },
        tx,
      });
      return updated;
    });
  }

  /** Called only behind PlatformCapabilitiesGuard; keeps creation logic and audit in one authority. */
  createForPlatformCapability(dto: CreateFacilityDto, userId: string) {
    // Platform authority never grants clinical/facility RolesGuard authority.
    return this.create(dto, userId, true, false);
  }

  /** These adapters are callable only after PlatformCapabilitiesGuard resolves authority. */
  getBillingIdentityForPlatform(userId: string, facilityId: string) { return this.getFacilityBillingIdentityForAdmin(userId, facilityId, true); }
  updateBillingIdentityForPlatform(userId: string, facilityId: string, dto: FacilityBillingIdentityPatchDto) { return this.updateFacilityBillingIdentityForAdmin(userId, facilityId, dto, true); }
  getBillingWorkflowForPlatform(userId: string, facilityId: string) { return this.getFacilityBillingWorkflowForAdmin(userId, facilityId, true); }
  updateBillingWorkflowForPlatform(userId: string, facilityId: string, dto: FacilityBillingWorkflowPatchDto) { return this.updateFacilityBillingWorkflowForAdmin(userId, facilityId, dto, true); }
  listDepartmentsForPlatform(userId: string, facilityId: string) { return this.listDepartmentsForAdmin(userId, facilityId, true); }
  updateServiceConfigForPlatform(id: string, dto: UpdateFacilityServiceConfigDto, userId: string) { return this.updateFacilityServiceConfig(id, dto, userId, true); }
  setLanguageForPlatform(id: string, language: "fr" | "en", userId: string) { return this.setFacilityLanguage(id, language, userId, true); }
  async setActiveForPrivilegedAction(id: string, isActive: boolean, userId: string, tx: any = this.prisma) {
    const existing=await tx.facility.findUnique({where:{id},select:{id:true,isActive:true}});
    if(!existing)throw new NotFoundException("Établissement introuvable.");
    const updated=await tx.facility.update({where:{id},data:{isActive},select:{id:true,name:true,isActive:true,defaultLanguage:true}});
    await logSecurityAdminAudit(this.requiredAudit,AuditAction.UPDATE,{event:isActive?"FACILITY_ACTIVATED":"FACILITY_DEACTIVATED",actorUserId:userId,facilityId:id,entityType:"Facility",entityId:id,severity:"CRITICAL",outcome:"SUCCESS",sourceOperation:"platform.privileged-action.execute",evidence:{before:{isActive:existing.isActive},after:{isActive}},tx});
    return updated;
  }
}
