import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import { RoleCode } from "@prisma/client";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { ErProcedureComplexityReviewService } from "./er-procedure-complexity-review.service";
import {
  erProcedureComplexityApproveBodySchema,
  erProcedureComplexityRejectBodySchema,
} from "./dto/er-procedure-catalog-import.dto";

const ER_PROCEDURE_REVIEW_ROLES = [
  RoleCode.ADMIN,
  RoleCode.MEDORA_SUPER_ADMIN,
  RoleCode.PHARMACY,
  RoleCode.BILLING,
] as const;

function facilityIdFromReq(req: {
  user?: { facilityId?: string };
  headers: Record<string, string | string[] | undefined>;
}): string | undefined {
  const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
  return typeof facilityId === "string" ? facilityId : Array.isArray(facilityId) ? facilityId[0] : undefined;
}

@Controller("medication-master/er-procedure-complexity-review")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class ErProcedureComplexityReviewController {
  constructor(private readonly review: ErProcedureComplexityReviewService) {}

  @Get()
  @RequireRoles(...ER_PROCEDURE_REVIEW_ROLES)
  async list(@Query("facilityId") facilityId: string | undefined, @Req() req: Request) {
    if (!facilityId) throw new BadRequestException("Identifiant d'établissement requis.");
    return this.review.listQueue(facilityId, facilityIdFromReq(req));
  }

  @Post(":id/approve")
  @RequireRoles(...ER_PROCEDURE_REVIEW_ROLES)
  async approve(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: Request & { user?: { userId?: string; facilityId?: string } }
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();
    const parsed = erProcedureComplexityApproveBodySchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.");
    const ip = typeof req.ip === "string" ? req.ip : undefined;
    const ua = typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined;
    return this.review.approve(id, parsed.data, userId, facilityIdFromReq(req), { ip, userAgent: ua });
  }

  @Post(":id/reject")
  @RequireRoles(...ER_PROCEDURE_REVIEW_ROLES)
  async reject(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: Request & { user?: { userId?: string; facilityId?: string } }
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();
    const parsed = erProcedureComplexityRejectBodySchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.");
    const ip = typeof req.ip === "string" ? req.ip : undefined;
    const ua = typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined;
    return this.review.reject(id, parsed.data, userId, facilityIdFromReq(req), { ip, userAgent: ua });
  }
}
