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
  constructor(private readonly rules: ClinicalRulesOrchestrationService) {}

  @Get("catalogs")
  @RequireRoles(RoleCode.ADMIN, RoleCode.PROVIDER, RoleCode.RN)
  catalogsMeta() {
    return this.rules.catalogsMeta();
  }

  @Get("catalog")
  @RequireRoles(RoleCode.ADMIN, RoleCode.PROVIDER, RoleCode.RN)
  catalog(@Req() req: { user?: { facilityId?: string } }) {
    return this.rules.getCatalog(facilityIdFromReq(req));
  }

  @Get("conflicts")
  @RequireRoles(RoleCode.ADMIN, RoleCode.PROVIDER)
  conflicts(@Req() req: { user?: { facilityId?: string } }) {
    return this.rules.getConflicts(facilityIdFromReq(req));
  }

  @Put("rules")
  @RequireRoles(RoleCode.ADMIN)
  upsertRule(
    @Body() body: { rule: ClinicalRuleDefinitionV1; expectedVersion: number },
    @Req() req: { user?: { facilityId?: string; userId?: string; sub?: string } }
  ) {
    return this.rules.upsertRule(
      facilityIdFromReq(req),
      actorUserIdFromReq(req),
      body
    );
  }

  @Post("rules/:ruleId/activate")
  @RequireRoles(RoleCode.ADMIN)
  activate(
    @Param("ruleId") ruleId: string,
    @Body() body: { expectedVersion: number },
    @Req() req: { user?: { facilityId?: string; userId?: string; sub?: string } }
  ) {
    return this.rules.activateRule(
      facilityIdFromReq(req),
      ruleId,
      actorUserIdFromReq(req),
      body
    );
  }

  @Post("rules/:ruleId/status")
  @RequireRoles(RoleCode.ADMIN)
  setStatus(
    @Param("ruleId") ruleId: string,
    @Body() body: { status: ClinicalRuleStatus; expectedVersion: number },
    @Req() req: { user?: { facilityId?: string; userId?: string; sub?: string } }
  ) {
    return this.rules.setRuleStatus(
      facilityIdFromReq(req),
      ruleId,
      actorUserIdFromReq(req),
      body
    );
  }

  @Post("rules/:ruleId/rollback")
  @RequireRoles(RoleCode.ADMIN)
  rollback(
    @Param("ruleId") ruleId: string,
    @Body() body: { toVersion: number; expectedVersion: number },
    @Req() req: { user?: { facilityId?: string; userId?: string; sub?: string } }
  ) {
    return this.rules.rollbackRule(
      facilityIdFromReq(req),
      ruleId,
      actorUserIdFromReq(req),
      body
    );
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
