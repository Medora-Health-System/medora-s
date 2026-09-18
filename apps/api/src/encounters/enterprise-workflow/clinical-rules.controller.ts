/**
 * D4A.2.8A — Enterprise Clinical Rules Engine HTTP API.
 * Admin-only for create/modify/activate/disable/archive.
 * Facility always from JWT.
 */

import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleCode } from "@prisma/client";
import { RolesGuard, RequireRoles } from "../../common/guards/roles.guard";
import { FACILITY_OR_PLATFORM_ADMIN_ROLES } from "../../common/auth/platform-operator-roles";
import { assertFacilityAdminFacilityScope } from "../../admin/user-mutation-boundary";
import { PrismaService } from "../../prisma/prisma.service";
import { ClinicalRulesOrchestrationService } from "./clinical-rules-orchestration.service";
import type {
  ClinicalRuleDefinitionV1,
  ClinicalRuleEvaluationContextV1,
  ClinicalRuleEventType,
  ClinicalRuleStatus,
} from "@medora/shared";

function facilityIdFromReq(req: { user?: { facilityId?: string } }): string {
  return String(req.user?.facilityId ?? "").trim();
}

function actorUserIdFromReq(req: { user?: { userId?: string; sub?: string } }): string {
  return String(req.user?.userId ?? req.user?.sub ?? "").trim();
}

@Controller("hospital-care/enterprise-clinical-rules")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class ClinicalRulesController {
  constructor(
    private readonly rules: ClinicalRulesOrchestrationService,
    private readonly prisma: PrismaService
  ) {}

  private async assertAdminScope(req: {
    user?: { facilityId?: string; userId?: string; sub?: string };
  }): Promise<{ facilityId: string; actorUserId: string }> {
    const facilityId = facilityIdFromReq(req);
    const actorUserId = actorUserIdFromReq(req);
    await assertFacilityAdminFacilityScope(this.prisma, actorUserId, facilityId);
    return { facilityId, actorUserId };
  }

  @Get("catalogs")
  @RequireRoles(RoleCode.ADMIN, RoleCode.PROVIDER, RoleCode.RN)
  catalogsMeta() {
    return this.rules.catalogsMeta();
  }

  @Get("catalog")
  @RequireRoles(...FACILITY_OR_PLATFORM_ADMIN_ROLES)
  async catalog(@Req() req: { user?: { facilityId?: string; userId?: string; sub?: string } }) {
    const { facilityId } = await this.assertAdminScope(req);
    return this.rules.getCatalog(facilityId);
  }

  @Get("conflicts")
  @RequireRoles(...FACILITY_OR_PLATFORM_ADMIN_ROLES)
  async conflicts(@Req() req: { user?: { facilityId?: string; userId?: string; sub?: string } }) {
    const { facilityId } = await this.assertAdminScope(req);
    return this.rules.getConflicts(facilityId);
  }

  @Put("rules")
  @RequireRoles(...FACILITY_OR_PLATFORM_ADMIN_ROLES)
  async upsertRule(
    @Body() body: { rule: ClinicalRuleDefinitionV1; expectedVersion: number },
    @Req() req: { user?: { facilityId?: string; userId?: string; sub?: string } }
  ) {
    const { facilityId, actorUserId } = await this.assertAdminScope(req);
    return this.rules.upsertRule(facilityId, actorUserId, body);
  }

  @Post("rules/:ruleId/activate")
  @RequireRoles(...FACILITY_OR_PLATFORM_ADMIN_ROLES)
  async activate(
    @Param("ruleId") ruleId: string,
    @Body() body: { expectedVersion: number },
    @Req() req: { user?: { facilityId?: string; userId?: string; sub?: string } }
  ) {
    const { facilityId, actorUserId } = await this.assertAdminScope(req);
    return this.rules.activateRule(facilityId, ruleId, actorUserId, body);
  }

  @Post("rules/:ruleId/status")
  @RequireRoles(...FACILITY_OR_PLATFORM_ADMIN_ROLES)
  async setStatus(
    @Param("ruleId") ruleId: string,
    @Body() body: { status: ClinicalRuleStatus; expectedVersion: number },
    @Req() req: { user?: { facilityId?: string; userId?: string; sub?: string } }
  ) {
    const { facilityId, actorUserId } = await this.assertAdminScope(req);
    return this.rules.setRuleStatus(facilityId, ruleId, actorUserId, body);
  }

  @Post("rules/:ruleId/rollback")
  @RequireRoles(...FACILITY_OR_PLATFORM_ADMIN_ROLES)
  async rollback(
    @Param("ruleId") ruleId: string,
    @Body() body: { toVersion: number; expectedVersion: number },
    @Req() req: { user?: { facilityId?: string; userId?: string; sub?: string } }
  ) {
    const { facilityId, actorUserId } = await this.assertAdminScope(req);
    return this.rules.rollbackRule(facilityId, ruleId, actorUserId, body);
  }

  @Post("simulate")
  @RequireRoles(RoleCode.ADMIN, RoleCode.PROVIDER)
  simulate(
    @Body() body: { context: ClinicalRuleEvaluationContextV1 },
    @Req() req: { user?: { facilityId?: string; userId?: string; sub?: string } }
  ) {
    return this.rules.simulate(
      facilityIdFromReq(req),
      actorUserIdFromReq(req),
      body
    );
  }

  @Get("encounters/:encounterId/executions")
  @RequireRoles(RoleCode.ADMIN, RoleCode.PROVIDER, RoleCode.RN)
  executions(
    @Param("encounterId") encounterId: string,
    @Req() req: { user?: { facilityId?: string } }
  ) {
    return this.rules.getExecutionAudit(facilityIdFromReq(req), encounterId);
  }

  @Post("encounters/:encounterId/evaluate")
  @RequireRoles(RoleCode.ADMIN, RoleCode.PROVIDER)
  evaluate(
    @Param("encounterId") encounterId: string,
    @Body()
    body: {
      eventType: ClinicalRuleEventType;
      expectedVersion: number;
      payload?: Record<string, unknown> | null;
      simulated?: boolean;
    },
    @Req() req: { user?: { facilityId?: string; userId?: string; sub?: string } }
  ) {
    return this.rules.evaluateOnEncounter(
      facilityIdFromReq(req),
      encounterId,
      actorUserIdFromReq(req),
      body
    );
  }
}
