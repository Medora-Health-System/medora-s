import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import { PLATFORM_OPERATOR_ROLES } from "../common/auth/platform-operator-roles";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { AdminCatalogAuditService } from "./admin-catalog-audit.service";
import { patchCatalogClassificationBodySchema } from "./dto/admin-catalog-audit-classification.dto";

function facilityIdFromReq(req: { user?: { facilityId?: string }; headers: Record<string, string | string[] | undefined> }): string {
  const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
  const fid = typeof facilityId === "string" ? facilityId : Array.isArray(facilityId) ? facilityId[0] : "";
  if (!fid) throw new BadRequestException("Établissement requis");
  return fid;
}

@Controller("admin")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class AdminCatalogAuditController {
  constructor(private readonly catalogAudit: AdminCatalogAuditService) {}

  /** Phase 6B — PHI-safe catalog classification audit; platform operators only. */
  @Get("catalog-audit")
  @RequireRoles(...PLATFORM_OPERATOR_ROLES)
  async getCatalogAudit(@Req() req: { user?: { facilityId?: string }; headers: Record<string, string | string[] | undefined> }) {
    const facilityId = facilityIdFromReq(req);
    return this.catalogAudit.getDashboard(facilityId);
  }

  /** Phase 6C — classification correction; platform operators only; audit trail. */
  @Patch("catalog-audit/:catalogMedicationId/classification")
  @RequireRoles(...PLATFORM_OPERATOR_ROLES)
  async patchCatalogClassification(
    @Param("catalogMedicationId") catalogMedicationId: string,
    @Body() body: unknown,
    @Req() req: Request & { user?: { facilityId?: string; userId?: string } }
  ) {
    const facilityId = facilityIdFromReq(req);
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();

    const parsed = patchCatalogClassificationBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.", {
        cause: parsed.error,
      });
    }

    const ip = typeof req.ip === "string" && req.ip ? req.ip : undefined;
    const uaRaw = req.headers["user-agent"];
    const userAgent = typeof uaRaw === "string" ? uaRaw : undefined;

    return this.catalogAudit.patchClassification(facilityId, catalogMedicationId, parsed.data, userId, ip, userAgent);
  }
}
