import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { CreateFacilityDto, FacilityBillingIdentityPatchDto, FacilityBillingWorkflowPatchDto } from "@medora/shared";
import { mapBillingClassificationModeToSiteType } from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import { RoleCode } from "@prisma/client";
import { randomBytes } from "crypto";
import { isPlatformPrincipalAdminEmail } from "../auth/platform-principal";
import { BillingIdentityService } from "../billing/billing-identity.service";
import { FacilityBillingWorkflowService } from "../encounters/facility-billing-workflow.service";

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

    return this.prisma.$transaction(async (tx) => {
      const facility = await tx.facility.create({
        data: {
          code,
          name: trimmed,
          country: DEFAULT_NEW_FACILITY_COUNTRY,
          timezone: DEFAULT_NEW_FACILITY_TIMEZONE,
          defaultLanguage: dto.defaultLanguage ?? "fr",
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

      return {
        id: facility.id,
        name: facility.name,
        defaultLanguage: facility.defaultLanguage as "fr" | "en",
      };
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
        select: { id: true, name: true, isActive: true, defaultLanguage: true },
      });
    }
    const principal = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (principal?.email && isPlatformPrincipalAdminEmail(principal.email)) {
      return this.prisma.facility.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, defaultLanguage: true },
      });
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
      select: { id: true, name: true, defaultLanguage: true },
    });
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
