import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { parseStoredFacilityServiceLines, resolveFacilityServiceLines } from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuthService } from "./auth.service";
import { FailedLoginTracker } from "./failed-login-tracker";
import type { AuthUserDto, FacilityRoleDto } from "./types";

/**
 * Phase 18C — corporate Technology / IT care-workspace support projection.
 *
 * This does not create facility UserRole rows and does not grant clinical or billing
 * authority. It gives the authenticated care shell an explicit active-facility context;
 * backend RolesGuard remains authoritative for every care API operation.
 */
@Injectable()
export class TechnologyItAwareAuthService extends AuthService {
  constructor(
    private readonly supportPrisma: PrismaService,
    jwt: JwtService,
    config: ConfigService,
    failedLogin: FailedLoginTracker
  ) {
    super(supportPrisma, jwt, config, failedLogin);
  }

  private async isActiveTechnologyIt(userId: string): Promise<boolean> {
    const rows = await this.supportPrisma.$queryRawUnsafe<Array<{ ok: number }>>(
      `SELECT 1 AS ok
       FROM "MedoraWorkforceProfile" w
       JOIN "MedoraStaffProfile" s ON s."userId" = w."userId"
       WHERE w."userId" = $1
         AND w."department" = 'TECHNOLOGY_IT'::"MedoraCorporateDepartment"
         AND w."employmentStatus" = 'ACTIVE'::"MedoraEmploymentStatus"
         AND s."isActive" = TRUE
       LIMIT 1`,
      userId
    );
    return rows.length > 0;
  }

  private async technologyItFacilityProjection(): Promise<FacilityRoleDto[]> {
    const facilities = await this.supportPrisma.facility.findMany({
      where: { isActive: true },
      orderBy: [{ country: "asc" }, { name: "asc" }, { id: "asc" }],
      select: {
        id: true,
        name: true,
        defaultLanguage: true,
        timezone: true,
        allowRnLabResultSubmission: true,
        facilityType: true,
        serviceLinesJson: true,
        facilityCareProfileJson: true,
        country: true,
      },
    });

    return facilities.map((facility) => ({
      facilityId: facility.id,
      facilityName: facility.name,
      defaultLanguage: facility.defaultLanguage ?? "en",
      timezone: facility.timezone ?? "UTC",
      role: "ADMIN",
      departmentId: null,
      departmentCode: null,
      departmentName: null,
      professionCode: "ADMINISTRATION",
      facilityType: facility.facilityType,
      serviceLines: resolveFacilityServiceLines({
        facilityType: facility.facilityType,
        configuredServiceLines: parseStoredFacilityServiceLines(facility.serviceLinesJson),
      }),
      careProfileJson: facility.facilityCareProfileJson ?? null,
      facilityCountry: facility.country ?? null,
      allowRnLabResultSubmission: facility.allowRnLabResultSubmission ?? false,
    } as FacilityRoleDto));
  }

  override async me(userId: string): Promise<AuthUserDto & { technologyItCareSupport?: boolean }> {
    const base = await super.me(userId);
    if (!(await this.isActiveTechnologyIt(userId))) return base;

    const supportRows = await this.technologyItFacilityProjection();
    const realFacilityIds = new Set(base.facilityRoles.map((row) => row.facilityId));
    const projected = supportRows.filter((row) => !realFacilityIds.has(row.facilityId));

    return {
      ...base,
      facilityRoles: [...base.facilityRoles, ...projected],
      technologyItCareSupport: true,
      msppContext: {
        ...base.msppContext,
        hasFacilityAccess: base.facilityRoles.length + projected.length > 0,
      },
      mfa: {
        ...base.mfa,
        required: true,
      },
    };
  }
}
