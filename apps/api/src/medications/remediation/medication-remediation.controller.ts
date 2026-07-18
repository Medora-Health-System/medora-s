import {
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
import type { Phase15WorkItemStatus } from "@medora/shared";
import { RolesGuard, RequireRoles } from "../../common/guards/roles.guard";
import {
  REMEDIATION_ADMIN_ROLES,
  REMEDIATION_READ_ROLES,
} from "./medication-remediation.roles";
import { MedicationRemediationHttpService } from "./medication-remediation.http-service";

type AuthReq = Request & {
  user?: { userId?: string };
  userRole?: string;
};

function actorFromReq(req: AuthReq) {
  const userId = req.user?.userId;
  if (!userId) throw new UnauthorizedException();
  return {
    userId,
    roles: req.userRole ? [String(req.userRole)] : ["MEDICATION_REVIEWER"],
  };
}

@Controller("medications/remediation")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class MedicationRemediationController {
  constructor(private readonly http: MedicationRemediationHttpService) {}

  @Get("dashboard")
  @RequireRoles(...REMEDIATION_READ_ROLES)
  dashboard() {
    return this.http.dashboard();
  }

  @Get("baseline")
  @RequireRoles(...REMEDIATION_READ_ROLES)
  baseline() {
    return this.http.baseline();
  }

  @Get("readiness")
  @RequireRoles(...REMEDIATION_READ_ROLES)
  readiness() {
    return this.http.readiness();
  }

  @Get("families")
  @RequireRoles(...REMEDIATION_READ_ROLES)
  families() {
    return this.http.families();
  }

  @Get("families/:familyKey")
  @RequireRoles(...REMEDIATION_READ_ROLES)
  family(@Param("familyKey") familyKey: string) {
    return this.http.family(familyKey);
  }

  @Get("work-items")
  @RequireRoles(...REMEDIATION_READ_ROLES)
  workItems(
    @Query("familyKey") familyKey?: string,
    @Query("gapCategory") gapCategory?: string,
    @Query("status") status?: string,
    @Query("severity") severity?: string
  ) {
    return this.http.remediations({ familyKey, gapCategory, status, severity });
  }

  @Get("work-items/:id")
  @RequireRoles(...REMEDIATION_READ_ROLES)
  workItem(@Param("id") id: string) {
    return this.http.remediation(id);
  }

  @Post("work-items/refresh")
  @RequireRoles(...REMEDIATION_ADMIN_ROLES)
  refresh(@Req() req: AuthReq) {
    return this.http.refresh(actorFromReq(req));
  }

  @Post("work-items/:id/preview")
  @RequireRoles(...REMEDIATION_READ_ROLES)
  preview(
    @Param("id") id: string,
    @Body() body: { toStatus: Phase15WorkItemStatus }
  ) {
    return this.http.preview(id, body.toStatus);
  }

  @Post("work-items/:id/transition")
  @RequireRoles(...REMEDIATION_ADMIN_ROLES)
  transition(
    @Req() req: AuthReq,
    @Param("id") id: string,
    @Body()
    body: {
      toStatus: Phase15WorkItemStatus;
      reason: string;
      evidenceRegistrationId?: string;
      expectedStatus?: string;
    }
  ) {
    return this.http.transition(actorFromReq(req), {
      workItemId: id,
      ...body,
    });
  }

  @Post("work-items/:id/defer")
  @RequireRoles(...REMEDIATION_ADMIN_ROLES)
  defer(
    @Req() req: AuthReq,
    @Param("id") id: string,
    @Body() body: { reason: string }
  ) {
    return this.http.defer(actorFromReq(req), id, body.reason);
  }

  @Post("work-items/:id/reopen")
  @RequireRoles(...REMEDIATION_ADMIN_ROLES)
  reopen(
    @Req() req: AuthReq,
    @Param("id") id: string,
    @Body() body: { reason: string }
  ) {
    return this.http.reopen(actorFromReq(req), id, body.reason);
  }

  @Post("work-items/:id/evidence-links")
  @RequireRoles(...REMEDIATION_ADMIN_ROLES)
  attachEvidence(
    @Req() req: AuthReq,
    @Param("id") id: string,
    @Body() body: { evidenceRegistrationId: string; reason: string }
  ) {
    return this.http.attachEvidence(actorFromReq(req), {
      workItemId: id,
      ...body,
    });
  }

  @Post("work-items/:id/verify-source")
  @RequireRoles(...REMEDIATION_ADMIN_ROLES)
  verifySource(
    @Req() req: AuthReq,
    @Param("id") id: string,
    @Body() body: { reason: string }
  ) {
    return this.http.verifySource(actorFromReq(req), id, body.reason);
  }

  @Post("work-items/:id/knowledge-preview")
  @RequireRoles(...REMEDIATION_READ_ROLES)
  knowledgePreview(@Param("id") id: string) {
    return this.http.knowledgePreview(id);
  }

  @Post("work-items/:id/apply-supported-knowledge")
  @RequireRoles(...REMEDIATION_ADMIN_ROLES)
  applyKnowledge(
    @Req() req: AuthReq,
    @Param("id") id: string,
    @Body() body: { reason: string }
  ) {
    return this.http.applyKnowledge(actorFromReq(req), {
      workItemId: id,
      reason: body.reason,
    });
  }

  @Post("work-items/:id/mark-deferred")
  @RequireRoles(...REMEDIATION_ADMIN_ROLES)
  markDeferred(
    @Req() req: AuthReq,
    @Param("id") id: string,
    @Body() body: { reason: string }
  ) {
    return this.http.markDeferred(actorFromReq(req), id, body.reason);
  }

  @Get("sources")
  @RequireRoles(...REMEDIATION_READ_ROLES)
  sources(
    @Query("sourceTier") sourceTier?: string,
    @Query("acquisitionStatus") acquisitionStatus?: string
  ) {
    return this.http.sources({ sourceTier, acquisitionStatus });
  }

  @Get("sources/:id")
  @RequireRoles(...REMEDIATION_READ_ROLES)
  source(@Param("id") id: string) {
    return this.http.source(id);
  }

  @Post("sources/:id/promote")
  @RequireRoles(...REMEDIATION_ADMIN_ROLES)
  promote(
    @Req() req: AuthReq,
    @Param("id") id: string,
    @Body()
    body: {
      reason: string;
      licensingStatus?: "LICENSED" | "PUBLIC_DOMAIN" | "RESTRICTED" | "UNKNOWN";
    }
  ) {
    return this.http.promoteSource(actorFromReq(req), {
      registrationId: id,
      ...body,
    });
  }

  @Post("sources/:id/advance")
  @RequireRoles(...REMEDIATION_ADMIN_ROLES)
  advance(
    @Req() req: AuthReq,
    @Param("id") id: string,
    @Body()
    body: {
      targetStatus: string;
      reason?: string;
      reviewStatus?: "PENDING" | "APPROVED" | "REJECTED";
      licensingStatus?: "LICENSED" | "PUBLIC_DOMAIN" | "RESTRICTED" | "UNKNOWN";
    }
  ) {
    return this.http.advanceSource(actorFromReq(req), {
      registrationId: id,
      ...body,
    });
  }

  @Post("quality/recalculate")
  @RequireRoles(...REMEDIATION_ADMIN_ROLES)
  qualityRecalc(@Req() req: AuthReq) {
    return this.http.qualityRecalc(actorFromReq(req));
  }
}
