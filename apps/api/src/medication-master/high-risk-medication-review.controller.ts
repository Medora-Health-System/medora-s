import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Body,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import { RoleCode } from "@prisma/client";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { HighRiskMedicationReviewService } from "./high-risk-medication-review.service";
import {
  highRiskApproveCatalogBodySchema,
  highRiskApproveProviderOrderingBodySchema,
  highRiskRejectBodySchema,
} from "./dto/high-risk-medication-review.dto";

const HIGH_RISK_REVIEW_ROLES = [RoleCode.MEDORA_SUPER_ADMIN, RoleCode.PHARMACY] as const;

function facilityIdFromReq(req: {
  user?: { facilityId?: string };
  headers: Record<string, string | string[] | undefined>;
}): string | undefined {
  const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
  return typeof facilityId === "string" ? facilityId : Array.isArray(facilityId) ? facilityId[0] : undefined;
}

@Controller("medication-master/high-risk-review")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class HighRiskMedicationReviewController {
  constructor(private readonly review: HighRiskMedicationReviewService) {}

  @Get()
  @RequireRoles(...HIGH_RISK_REVIEW_ROLES)
  async listQueue(
    @Query("facilityId") facilityId: string | undefined,
    @Req() req: Request & { user?: { userId?: string; facilityId?: string } }
  ) {
    if (!facilityId) {
      throw new BadRequestException("Identifiant d'établissement requis.");
    }
    return this.review.listQueue(facilityId, facilityIdFromReq(req));
  }

  @Post(":productId/approve-catalog")
  @RequireRoles(...HIGH_RISK_REVIEW_ROLES)
  async approveCatalog(
    @Param("productId") productId: string,
    @Body() body: unknown,
    @Req() req: Request & { user?: { userId?: string; facilityId?: string } }
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();

    const parsed = highRiskApproveCatalogBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.");
    }

    const ip = typeof req.ip === "string" ? req.ip : undefined;
    const ua = typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined;

    return this.review.approveCatalogOnly(productId, parsed.data, userId, facilityIdFromReq(req), {
      ip,
      userAgent: ua,
    });
  }

  @Post(":productId/approve-provider-ordering")
  @RequireRoles(...HIGH_RISK_REVIEW_ROLES)
  async approveProviderOrdering(
    @Param("productId") productId: string,
    @Body() body: unknown,
    @Req() req: Request & { user?: { userId?: string; facilityId?: string } }
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();

    const parsed = highRiskApproveProviderOrderingBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.");
    }

    const ip = typeof req.ip === "string" ? req.ip : undefined;
    const ua = typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined;

    return this.review.approveProviderOrdering(productId, parsed.data, userId, facilityIdFromReq(req), {
      ip,
      userAgent: ua,
    });
  }

  @Post(":productId/reject")
  @RequireRoles(...HIGH_RISK_REVIEW_ROLES)
  async reject(
    @Param("productId") productId: string,
    @Body() body: unknown,
    @Req() req: Request & { user?: { userId?: string; facilityId?: string } }
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();

    const parsed = highRiskRejectBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.");
    }

    const ip = typeof req.ip === "string" ? req.ip : undefined;
    const ua = typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined;

    return this.review.reject(productId, parsed.data, userId, facilityIdFromReq(req), {
      ip,
      userAgent: ua,
    });
  }
}
