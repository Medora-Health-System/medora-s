import {
  BadRequestException,
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
  mapBillingClassificationModeToSiteType,
  parseStoredFacilityServiceLines,
  resolveFacilityServiceLines,
  getDefaultBillingClassificationModeForProfile,
  projectFacilityPrintIdentity,
  resolveFacilityCareProfile,
  resolveFacilityModuleCapabilitiesD4c1,
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
} from "./facility-department-seed.util";
import { AuditService } from "../common/services/audit.service";
import { logSecurityAdminAudit } from "../common/services/security-admin-audit";
import {
  buildCareProfileJsonFromDto,
  mergeCareProfileJson,
  resolveServiceLinesForCareConfig,
} from "./facility-care-profile.util";

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
  return {
    id: row.id,
    name: row.name,
    defaultLanguage: row.defaultLanguage as "fr" | "en",
    ...(row.isActive !== undefined ? { isActive: row.isActive } : {}),
    ...(row.timezone !== undefined ? { timezone: row.timezone } : {}),
    facilityType: row.facilityType,
    serviceLines,
    careProfile,
    moduleCapabilities: capabilities,
    printIdentity,
    facilityCareProfileJson: row.facilityCareProfileJson ?? null,
  };
}

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

  async create(dto: CreateFacilityDto, userId: string) {
    assertNoClientEscalation(dto);
    if (!(await this.isPlatformPrincipal(userId))) {
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

      const adminRole = await tx.role.findUnique({
        where: { code: RoleCode.ADMIN },
      });
      if (!adminRole) {
        throw new NotFoundException("Rôle ADMIN introuvable.");
      }

      await tx.userRole.create({
        data: {
          userId,
          facilityId: facility.id,
          roleId: adminRole.id,
          isActive: true,
        },
      });

      await ensureFacilityServiceLineDepartments(tx, facility.id, {
        facilityType: facility.facilityType,
        serviceLines,
        defaultLanguage: (facility.defaultLanguage as "fr" | "en") ?? "fr",
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
  ) {
    await this.assertCanManageFacilityBilling(actorUserId, facilityId);
    return this.billingIdentity.getFacilityBillingIdentity(facilityId);
  }

  async updateFacilityBillingIdentityForAdmin(
    actorUserId: string,
    facilityId: string,
    dto: FacilityBillingIdentityPatchDto,
  ) {
    await this.assertCanManageFacilityBilling(actorUserId, facilityId);
    return this.billingIdentity.updateFacilityBillingIdentity(facilityId, dto);
  }

  async getFacilityBillingWorkflowForAdmin(
    actorUserId: string,
    facilityId: string,
  ) {
    await this.assertCanManageFacilityBilling(actorUserId, facilityId);
    return this.facilityBillingWorkflow.getForFacility(facilityId);
  }

  async updateFacilityBillingWorkflowForAdmin(
    actorUserId: string,
    facilityId: string,
    dto: FacilityBillingWorkflowPatchDto,
  ) {
    await this.assertCanManageFacilityBilling(actorUserId, facilityId);
    return this.facilityBillingWorkflow.updateForFacility(facilityId, dto);
  }

  /** MEDUI.AUTH.ROLE.2 — active clinical departments for admin user assignment UI. */
  async listDepartmentsForAdmin(actorUserId: string, facilityId: string) {
    await this.assertCanManageFacilityBilling(actorUserId, facilityId);
    const facility = await this.prisma.facility.findUnique({
      where: { id: facilityId },
      select: { defaultLanguage: true },
    });
    if (!facility) {
      throw new NotFoundException("Établissement introuvable.");
    }
    await ensureFacilityClinicalDepartments(this.prisma, facilityId, {
      defaultLanguage: (facility.defaultLanguage as "fr" | "en") ?? "fr",
    });
    const facilityConfig = await this.prisma.facility.findUnique({
      where: { id: facilityId },
      select: { facilityType: true, serviceLinesJson: true },
    });
    if (facilityConfig) {
      await ensureFacilityServiceLineDepartments(this.prisma, facilityId, {
        facilityType: facilityConfig.facilityType,
        serviceLines: parseStoredFacilityServiceLines(
          facilityConfig.serviceLinesJson,
        ),
        defaultLanguage: (facility.defaultLanguage as "fr" | "en") ?? "fr",
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
            id: true,
            name: true,
            isActive: true,
            defaultLanguage: true,
            facilityType: true,
            serviceLinesJson: true,
            facilityCareProfileJson: true,
            timezone: true,
          },
        })
        .then((rows) => rows.map((row) => mapFacilityRowForClient(row)));
    }
    if (await this.isPlatformPrincipal(userId)) {
      return this.prisma.facility
        .findMany({
          where: { isActive: true },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            defaultLanguage: true,
            facilityType: true,
            serviceLinesJson: true,
            facilityCareProfileJson: true,
            timezone: true,
          },
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
        select: {
          id: true,
          name: true,
          defaultLanguage: true,
          facilityType: true,
          serviceLinesJson: true,
          facilityCareProfileJson: true,
          timezone: true,
        },
      })
      .then((rows) => rows.map((row) => mapFacilityRowForClient(row)));
  }

  async updateFacilityServiceConfig(
    id: string,
    dto: UpdateFacilityServiceConfigDto,
    userId: string,
  ) {
    assertNoClientEscalation(dto);
    await this.assertCanManageFacilityBilling(userId, id);

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
      },
    });
    if (!existing) {
      throw new NotFoundException("Établissement introuvable.");
    }

    const nextType = dto.facilityType
      ? toFacilityTypeEnum(dto.facilityType)
      : existing.facilityType;
    const existingLines = parseStoredFacilityServiceLines(
      existing.serviceLinesJson,
    );
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
    const nextCountry =
      dto.operationalAddress?.country?.trim() || dto.country?.trim() || null;

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.facility.update({
        where: { id },
        data: {
          facilityType: nextType,
          serviceLinesJson: serialized,
          facilityCareProfileJson: careProfileJson,
          ...(dto.timezone != null && String(dto.timezone).trim()
            ? { timezone: String(dto.timezone).trim() }
            : {}),
          ...(nextCountry ? { country: nextCountry } : {}),
        },
        select: {
          id: true,
          name: true,
          defaultLanguage: true,
          facilityType: true,
          serviceLinesJson: true,
          facilityCareProfileJson: true,
          timezone: true,
        },
      });

      await tx.auditLog.create({
        data: {
          facilityId: id,
          userId,
          action: AuditAction.FACILITY_CARE_PROFILE_UPDATED,
          entityType: "Facility",
          entityId: id,
          metadata: {
            event: "FACILITY_CARE_PROFILE_UPDATED",
            facilityType: nextType,
            careProfile: profile,
            serviceLines: serialized,
            resetToTypeDefaults: dto.resetToTypeDefaults === true,
            operationalIdentityUpdated:
              dto.operationalAddress != null ||
              dto.printDisplayName != null ||
              dto.legalName != null,
          },
        },
      });

      return row;
    });

    await ensureFacilityServiceLineDepartments(this.prisma, id, {
      facilityType: updated.facilityType,
      serviceLines: serialized,
      defaultLanguage: (updated.defaultLanguage as "fr" | "en") ?? "fr",
    });

    return mapFacilityRowForClient(updated);
  }

  async setFacilityLanguage(
    id: string,
    defaultLanguage: "fr" | "en",
    userId: string,
  ) {
    if (!(await this.isPlatformPrincipal(userId))) {
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

  async setFacilityActive(id: string, isActive: boolean, userId: string) {
    if (!(await this.isPlatformPrincipal(userId))) {
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
}
