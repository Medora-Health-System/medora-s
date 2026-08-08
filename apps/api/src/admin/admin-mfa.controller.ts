/**
 * Phase 9 — Admin MFA reset endpoint.
 *
 * RBAC
 *   * Facility ADMIN cannot reset globally-scoped MFA state.
 *   * MEDORA_SUPER_ADMIN may reset any user.
 *
 * Side-effects (per `MfaService.adminReset`)
 *   * Clears all MFA fields on the target user.
 *   * Revokes every active `AuthSession` for the target user.
 *   * Writes a critical `MFA_RESET_BY_ADMIN` audit (PHI-safe metadata).
 *
 * The target user will be forced to re-enroll MFA on next login if their
 * roles still require it.
 */

import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleCode } from "@prisma/client";

import { RequireRoles, RolesGuard } from "../common/guards/roles.guard";
import { adminMfaResetDtoSchema } from "../auth/mfa/mfa.dto";
import { MfaService } from "../auth/mfa/mfa.service";

type AuthedReq = {
  user?: { userId?: string; facilityId?: string };
  userRole?: RoleCode;
  headers: Record<string, string | string[] | undefined>;
};

function ctxFromReq(req: AuthedReq): {
  userId: string;
  facilityId: string;
  role: RoleCode;
} {
  const userId = req.user?.userId;
  const facilityId = req.user?.facilityId;
  const role = req.userRole;
  if (!userId) throw new BadRequestException("Authentication required");
  if (!facilityId) throw new BadRequestException("Établissement requis");
  if (!role) throw new BadRequestException("Rôle indisponible");
  return { userId, facilityId, role };
}

@Controller("admin")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class AdminMfaController {
  constructor(private readonly mfa: MfaService) {}

  @Post("mfa/reset")
  @RequireRoles(RoleCode.ADMIN, RoleCode.MEDORA_SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async resetUserMfa(@Body() body: unknown, @Req() req: AuthedReq) {
    const parsed = adminMfaResetDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.errors?.[0]?.message ?? "Données invalides."
      );
    }
    const ctx = ctxFromReq(req);
    return this.mfa.adminReset(ctx, parsed.data.userId);
  }
}
