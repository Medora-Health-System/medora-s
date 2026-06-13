import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { CreateFacilityDto, FacilityBillingIdentityPatchDto, FacilityBillingWorkflowPatchDto, UpdateFacilityServiceConfigDto, MedoraServiceLine } from "@medora/shared";
import { mapBillingClassificationModeToSiteType, parseStoredFacilityServiceLines, resolveFacilityServiceLines } from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import { FacilityType, RoleCode } from "@prisma/client";
import { randomBytes } from "crypto";
import { isPlatformPrincipalAdminEmail } from "../auth/platform-principal";
import { BillingIdentityService } from "../billing/billing-identity.service";
import { FacilityBillingWorkflowService } from "../encounters/facility-billing-workflow.service";
import { ensureFacilityClinicalDepartments, ensureFacilityServiceLineDepartments } from "./facility-department-seed.util";

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

function pickFacilityBillingFromCreateDto(dto: CreateFacilityDto): Partial<FacilityBillingIdentityPatchDto> {
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
  const code = String(value ?? "CLINIC").trim().toUpperCase();
  if (Object.values(FacilityType).includes(code as FacilityType)) {
    return code as FacilityType;
  }
  return FacilityType.CLINIC;
}

function serializeServiceLinesForStorage(
  facilityType: FacilityType,
  serviceLines: readonly string[] | null | undefined
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
}) {
  const serviceLines = resolveFacilityServiceLines({
    facilityType: row.facilityType,
    configuredServiceLines: parseStoredFacilityServiceLines(row.serviceLinesJson),
  });
  return {
    id: row.id,
    name: row.name,
    defaultLanguage: row.defaultLanguage as "fr" | "en",
    ...(row.isActive !== undefined ? { isActive: row.isActive } : {}),
    facilityType: row.facilityType,
    serviceLines,
  };
}

@Injectable()
export class AdminFacilitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billingIdentity: BillingIdentityService,
    private readonly facilityBillingWorkflow: FacilityBillingWorkflowService,
  ) {}

  async create(dto: CreateFacilityDto, userId: string) {
    const actor = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!actor?.email || !isPlatformPrincipalAdminEmail(actor.email)) {
      throw new ForbiddenException("Création d’établissement non autorisée pour ce compte.");
    }

    const trimmed = dto.name.trim();
    const code = `FAC-${randomBytes(6).toString("hex")}`;
    const billingFragment = pickFacilityBillingFromCreateDto(dto);
    const hasBillingInput = Object.keys(billingFragment).length > 0;
    const workflowMode = dto.billingClassificationMode ?? null;
    const facilityType = toFacilityTypeEnum(dto.facilityType ?? "CLINIC");
    const serviceLines = serializeServiceLinesForStorage(facilityType, dto.serviceLines ?? null);

    return this.prisma.$transaction(async (tx) => {
      const facility = await tx.facility.create({
        data: {
          code,
          name: trimmed,
          country: DEFAULT_NEW_FACILITY_COUNTRY,
          timezone: DEFAULT_NEW_FACILITY_TIMEZONE,
          defaultLanguage: dto.defaultLanguage ?? "fr",
          facilityType,
          serviceLinesJson: serviceLines,
          ...(hasBillingInput ? billingFragment : {}),
          ...(workflowMode
            ? {
                billingClassificationMode: workflowMode,
                billingSiteType: mapBillingClassificationModeToSiteType(workflowMode),
                allowUrgentCareToEmergencyUpgrade:
                  dto.allowUrgentCareToEmergencyUpgrade ??
                  (workflowMode === "HYBRID_UC_ED" || workflowMode === "HOSPITAL_ENTERPRISE"),
                requireUcToEdPatientAcknowledgement: dto.requireUcToEdPatientAcknowledgement ?? true,
                showEncounterBillingControls:
                  dto.showEncounterBillingControls ??
                  (workflowMode === "HYBRID_UC_ED" || workflowMode === "HOSPITAL_ENTERPRISE"),
                allowedEncounterBillingClassifications: dto.allowedEncounterBillingClassifications ?? [],
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

      return mapFacilityRowForClient(facility);
    });
  }

  /** Platform principal or facility ADMIN — same data as GET billing/facility-identity for `id`. */
  async getFacilityBillingIdentityForAdmin(actorUserId: string, facilityId: string) {
    await this.assertCanManageFacilityBilling(actorUserId, facilityId);
    return this.billingIdentity.getFacilityBillingIdentity(facilityId);
  }

  async updateFacilityBillingIdentityForAdmin(
    actorUserId: string,
    facilityId: string,
    dto: FacilityBillingIdentityPatchDto
  ) {
    await this.assertCanManageFacilityBilling(actorUserId, facilityId);
    return this.billingIdentity.updateFacilityBillingIdentity(facilityId, dto);
  }

  async getFacilityBillingWorkflowForAdmin(actorUserId: string, facilityId: string) {
    await this.assertCanManageFacilityBilling(actorUserId, facilityId);
    return this.facilityBillingWorkflow.getForFacility(facilityId);
  }

  async updateFacilityBillingWorkflowForAdmin(
    actorUserId: string,
    facilityId: string,
    dto: FacilityBillingWorkflowPatchDto
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
        serviceLines: parseStoredFacilityServiceLines(facilityConfig.serviceLinesJson),
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

  private async assertCanManageFacilityBilling(actorUserId: string, facilityId: string) {
    const actor = await this.prisma.user.findUnique({
      where: { id: actorUserId },
      select: { email: true },
    });
    if (actor?.email && isPlatformPrincipalAdminEmail(actor.email)) {
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
    throw new ForbiddenException("Profil de facturation établissement : accès refusé.");
  }

  /**
   * Platform principal (`atranchant@medora.local`) may list all facilities without per-facility ADMIN.
   * Facility-level ADMIN at the active `x-facility-id` retains the previous list access (global rows).
   */
  async assertCanListFacilities(userId: string, facilityIdHeader: string | undefined) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (user?.email && isPlatformPrincipalAdminEmail(user.email)) {
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
      throw new ForbiddenException("Liste des établissements non autorisée pour ce compte.");
    }
  }

  /**
   * @param includeInactive — If true, only the platform principal may list all facilities (with `isActive`).
   * Otherwise active facilities are returned: all for the principal, or only those the user belongs to.
   */
  async list(userId: string, includeInactive: boolean) {
    if (includeInactive) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      if (!user?.email || !isPlatformPrincipalAdminEmail(user.email)) {
        throw new ForbiddenException("Liste complète des établissements non autorisée pour ce compte.");
      }
      return this.prisma.facility.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          isActive: true,
          defaultLanguage: true,
          facilityType: true,
          serviceLinesJson: true,
        },
      }).then((rows) => rows.map((row) => mapFacilityRowForClient(row)));
    }
    const principal = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (principal?.email && isPlatformPrincipalAdminEmail(principal.email)) {
      return this.prisma.facility.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          defaultLanguage: true,
          facilityType: true,
          serviceLinesJson: true,
        },
      }).then((rows) => rows.map((row) => mapFacilityRowForClient(row)));
    }
    const roles = await this.prisma.userRole.findMany({
      where: {
        userId,
        isActive: true,
      },
      select: { facilityId: true },
    });
    const facilityIds = roles.map((r) => r.facilityId);
    return this.prisma.facility.findMany({
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
      },
    }).then((rows) => rows.map((row) => mapFacilityRowForClient(row)));
  }

  async updateFacilityServiceConfig(id: string, dto: UpdateFacilityServiceConfigDto, userId: string) {
    const actor = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!actor?.email || !isPlatformPrincipalAdminEmail(actor.email)) {
      throw new ForbiddenException("Modification de l’établissement non autorisée pour ce compte.");
    }

    const existing = await this.prisma.facility.findUnique({
      where: { id },
      select: { id: true, defaultLanguage: true, facilityType: true, serviceLinesJson: true },
    });
    if (!existing) {
      throw new NotFoundException("Établissement introuvable.");
    }

    const nextType = dto.facilityType ? toFacilityTypeEnum(dto.facilityType) : existing.facilityType;
    const nextServiceLines =
      dto.serviceLines === undefined
        ? parseStoredFacilityServiceLines(existing.serviceLinesJson)
        : dto.serviceLines;
    const serialized = serializeServiceLinesForStorage(nextType, nextServiceLines);

    const updated = await this.prisma.facility.update({
      where: { id },
      data: {
        facilityType: nextType,
        serviceLinesJson: serialized,
      },
      select: {
        id: true,
        name: true,
        defaultLanguage: true,
        facilityType: true,
        serviceLinesJson: true,
      },
    });

    await ensureFacilityServiceLineDepartments(this.prisma, id, {
      facilityType: updated.facilityType,
      serviceLines: serialized,
      defaultLanguage: (updated.defaultLanguage as "fr" | "en") ?? "fr",
    });

    return mapFacilityRowForClient(updated);
  }

  async setFacilityLanguage(id: string, defaultLanguage: "fr" | "en", userId: string) {
    const actor = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!actor?.email || !isPlatformPrincipalAdminEmail(actor.email)) {
      throw new ForbiddenException("Modification de l’établissement non autorisée pour ce compte.");
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
    const actor = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!actor?.email || !isPlatformPrincipalAdminEmail(actor.email)) {
      throw new ForbiddenException("Modification de l’établissement non autorisée pour ce compte.");
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
      data: { isActive },
      select: { id: true, name: true, isActive: true, defaultLanguage: true },
    });
  }
}
