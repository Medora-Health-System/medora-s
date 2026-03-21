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
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { RoleCode } from "@prisma/client";
import { AdminUsersService } from "./admin-users.service";
import {
  createAdminUserDtoSchema,
  updateAdminUserDtoSchema,
  updateAdminUserRolesDtoSchema,
  updateAdminUserStatusDtoSchema,
} from "./dto/admin-user.dto";

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
  @RequireRoles(RoleCode.ADMIN)
  async list(@Req() req: any) {
    return this.adminUsers.listForFacility(facilityIdFromReq(req));
  }

  @Post("users")
  @RequireRoles(RoleCode.ADMIN)
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
  @RequireRoles(RoleCode.ADMIN)
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
  @RequireRoles(RoleCode.ADMIN)
  async updateRoles(@Param("id") id: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = facilityIdFromReq(req);
    const parsed = updateAdminUserRolesDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.", {
        cause: parsed.error,
      });
    }
    return this.adminUsers.updateRoles(facilityId, id, parsed.data, req.user.userId);
  }

  @Patch("users/:id/status")
  @RequireRoles(RoleCode.ADMIN)
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
}
