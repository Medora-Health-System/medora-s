import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "crypto";
import { parseStoredFacilityServiceLines, resolveFacilityServiceLines } from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuthService, type LoginResult } from "./auth.service";
import { FailedLoginTracker } from "./failed-login-tracker";
import type { AuthUserDto, FacilityRoleDto } from "./types";

/** Corporate Medora staff authentication + Technology / IT facility projection. */
@Injectable()
export class TechnologyItAwareAuthService extends AuthService {
  constructor(
    private readonly supportPrisma: PrismaService,
    private readonly supportJwt: JwtService,
    private readonly supportConfig: ConfigService,
    failedLogin: FailedLoginTracker
  ) {
    super(supportPrisma, supportJwt, supportConfig, failedLogin);
  }

  private async isActiveMedoraStaff(userId: string): Promise<boolean> {
    const rows = await this.supportPrisma.$queryRawUnsafe<Array<{ ok: number }>>(
      `SELECT 1 AS ok FROM "MedoraStaffProfile" s
       WHERE s."userId" = $1 AND s."isActive" = TRUE LIMIT 1`, userId
    );
    return rows.length > 0;
  }

  private async isActiveTechnologyIt(userId: string): Promise<boolean> {
    const rows = await this.supportPrisma.$queryRawUnsafe<Array<{ ok: number }>>(
      `SELECT 1 AS ok FROM "MedoraWorkforceProfile" w
       JOIN "MedoraStaffProfile" s ON s."userId" = w."userId"
       WHERE w."userId" = $1
         AND w."department" = 'TECHNOLOGY_IT'::"MedoraCorporateDepartment"
         AND w."employmentStatus" = 'ACTIVE'::"MedoraEmploymentStatus"
         AND s."isActive" = TRUE LIMIT 1`, userId
    );
    return rows.length > 0;
  }

  /**
   * Phase 18E MFA correction: corporate Medora staff may have zero facility UserRole rows,
   * so the legacy role-only enrollment policy cannot be their sole gate. If password login
   * would otherwise issue a normal session, revoke that just-created session and return an
   * enrollment grant instead. Existing mfaEnabled users already return the challenge branch
   * from AuthService before this point.
   */
  override async login(username: string, password: string, client?: { ip: string }): Promise<LoginResult> {
    const result = await super.login(username, password, client);
    if (result.kind !== "session") return result;
    if (!(await this.isActiveMedoraStaff(result.user.id))) return result;

    const decoded = this.supportJwt.decode(result.accessToken) as { sid?: string } | null;
    if (decoded?.sid) {
      await this.supportPrisma.authSession.updateMany({
        where:{ id:decoded.sid, userId:result.user.id, revokedAt:null },
        data:{ revokedAt:new Date(), revokedReason:"mfa_enrollment_required" },
      });
    }
    await this.supportPrisma.user.update({ where:{id:result.user.id}, data:{refreshTokenHash:null} });

    const refreshSecret = this.supportConfig.get<string>("JWT_REFRESH_SECRET");
    if (!refreshSecret) throw new Error("JWT_REFRESH_SECRET is required");
    const issuer = this.supportConfig.get<string>("TOKEN_ISSUER") ?? "medora-s";
    const mfaEnrollmentToken = this.supportJwt.sign(
      { sub:result.user.id, username:result.user.username, iss:issuer, type:"mfa_enrollment", jti:randomUUID() },
      { secret:refreshSecret, expiresIn:"15m" as never }
    );
    return {
      kind:"mfa_enrollment_required",
      mfaEnrollmentToken,
      userId:result.user.id,
      preferredLanguage:result.user.preferredLang,
    };
  }

  private async technologyItFacilityProjection(): Promise<FacilityRoleDto[]> {
    const facilities = await this.supportPrisma.facility.findMany({
      where: { isActive: true },
      orderBy: [{ country: "asc" }, { name: "asc" }, { id: "asc" }],
      select: {
        id: true, name: true, defaultLanguage: true, timezone: true,
        allowRnLabResultSubmission: true, facilityType: true, serviceLinesJson: true,
        facilityCareProfileJson: true, country: true,
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

  override async me(userId: string): Promise<AuthUserDto & { technologyItCareSupport?: boolean; technologyItCareScopes?: string[] }> {
    const base = await super.me(userId);
    const corporateStaff = await this.isActiveMedoraStaff(userId);
    if (!(await this.isActiveTechnologyIt(userId))) {
      return corporateStaff ? { ...base, mfa:{...base.mfa,required:true} } : base;
    }

    const [supportRows, grants] = await Promise.all([
      this.technologyItFacilityProjection(),
      this.supportPrisma.platformCapabilityGrant.findMany({
        where:{userId,isActive:true,capability:{isActive:true,code:{startsWith:"IT_CARE_"}}},
        select:{capability:{select:{code:true}}}, orderBy:{grantedAt:"asc"},
      }),
    ]);
    const realFacilityIds = new Set(base.facilityRoles.map((row) => row.facilityId));
    const projected = supportRows.filter((row) => !realFacilityIds.has(row.facilityId));
    return {
      ...base,
      facilityRoles: [...base.facilityRoles, ...projected],
      technologyItCareSupport: true,
      technologyItCareScopes: grants.map((g) => g.capability.code),
      msppContext: {...base.msppContext,hasFacilityAccess:base.facilityRoles.length + projected.length > 0},
      mfa: {...base.mfa,required:true},
    };
  }
}
