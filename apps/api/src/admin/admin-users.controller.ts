import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { FACILITY_OR_PLATFORM_ADMIN_ROLES } from "../common/auth/platform-operator-roles";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { AdminUsersService } from "./admin-users.service";
import {
  createAdminUserDtoSchema,
  updateAdminUserDtoSchema,
  updateAdminUserRolesDtoSchema,
  updateAdminUserStatusDtoSchema,
} from "./dto/admin-user.dto";
import { userBillingIdentityPatchDtoSchema } from "@medora/shared";

function facilityIdFromReq(req: { user?: { facilityId?: string }; headers: Record<string, string | string[] | undefined> }): string {
  const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
  const fid = typeof facilityId === "string" ? facilityId : Array.isArray(facilityId) ? facilityId[0] : "";
  if (!fid) throw new BadRequestException("Établissement requis");
  return fid;
}

@Controller("admin")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class AdminUsersController {
  constructor(private readonly adminUsers: AdminUsersService) {}

  @Get("users")
  @RequireRoles(...FACILITY_OR_PLATFORM_ADMIN_ROLES)
  async list(@Req() req: any) {
    return this.adminUsers.listForFacility(facilityIdFromReq(req), req.user.userId);
  }

  @Post("users")
  @RequireRoles(...FACILITY_OR_PLATFORM_ADMIN_ROLES)
  async create(@Body() body: unknown, @Req() req: any) {
    const facilityId = facilityIdFromReq(req);
    const parsed = createAdminUserDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.", {
        cause: parsed.error,
      });
    }
    return this.adminUsers.create(facilityId, parsed.data, req.user.userId);
  }

  /** Profil (prénom, nom, courriel) */
  @Patch("users/:id")
  @RequireRoles(...FACILITY_OR_PLATFORM_ADMIN_ROLES)
  async updateProfile(@Param("id") id: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = facilityIdFromReq(req);
    const parsed = updateAdminUserDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.", {
        cause: parsed.error,
      });
    }
    return this.adminUsers.updateProfile(facilityId, id, parsed.data, req.user.userId);
  }

  @Patch("users/:id/roles")
  @RequireRoles(...FACILITY_OR_PLATFORM_ADMIN_ROLES)
  async updateRoles(@Param("id") id: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = facilityIdFromReq(req);
    const parsed = updateAdminUserRolesDtoSchema.safeParse(body);
    if (!parsed.success) {
      const detail = parsed.error.issues.map((i) => i.message).filter(Boolean).join(" ");
      throw new BadRequestException(detail || "Requête invalide : rôles non reconnus ou corps de requête invalide.", {
        cause: parsed.error,
      });
    }
    return this.adminUsers.updateRoles(facilityId, id, parsed.data, req.user.userId);
  }

  @Patch("users/:id/status")
  @RequireRoles(...FACILITY_OR_PLATFORM_ADMIN_ROLES)
  async updateStatus(@Param("id") id: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = facilityIdFromReq(req);
    const parsed = updateAdminUserStatusDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.", {
        cause: parsed.error,
      });
    }
    return this.adminUsers.updateStatus(facilityId, id, parsed.data, req.user.userId);
  }

  @Get("users/:id/billing-identity")
  @RequireRoles(...FACILITY_OR_PLATFORM_ADMIN_ROLES)
  async getBillingIdentity(@Param("id") id: string, @Req() req: any) {
    const facilityId = facilityIdFromReq(req);
    return this.adminUsers.getUserBillingIdentity(facilityId, id, req.user.userId);
  }

  @Patch("users/:id/billing-identity")
  @RequireRoles(...FACILITY_OR_PLATFORM_ADMIN_ROLES)
  async patchBillingIdentity(@Param("id") id: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = facilityIdFromReq(req);
    const parsed = userBillingIdentityPatchDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.adminUsers.updateUserBillingIdentity(facilityId, id, parsed.data, req.user.userId);
  }

  @Patch("users/:id/password")
  @RequireRoles(...FACILITY_OR_PLATFORM_ADMIN_ROLES)
  async resetPassword(@Param("id") id: string, @Body() body: any, @Req() req: any) {
    const facilityId = facilityIdFromReq(req);

    if (!body?.newPassword || body.newPassword.length < 8) {
      throw new BadRequestException("Mot de passe invalide");
    }

    return this.adminUsers.resetPassword(facilityId, id, body.newPassword, req.user.userId);
  }
}
