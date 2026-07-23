/**
 * D4A.2.8 — Enterprise Workflow & Task Orchestration HTTP API.
 * Facility always from JWT. No workflow logic in UI clients.
 */

import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleCode } from "@prisma/client";
import { RolesGuard, RequireRoles } from "../../common/guards/roles.guard";
import { EnterpriseWorkflowOrchestrationService } from "./enterprise-workflow-orchestration.service";
import type {
  ClinicalOrchestrationEventType,
  EnterpriseTaskV1,
  EscalationChainTemplateCode,
  EscalationInstanceStatusV1,
} from "@medora/shared";

function facilityIdFromReq(req: { user?: { facilityId?: string } }): string {
  return String(req.user?.facilityId ?? "").trim();
}

function actorUserIdFromReq(req: { user?: { userId?: string; sub?: string } }): string {
  return String(req.user?.userId ?? req.user?.sub ?? "").trim();
}

const CLINICAL_ROLES = [
  RoleCode.PROVIDER,
  RoleCode.RN,
  RoleCode.ADMIN,
  RoleCode.LAB,
  RoleCode.RADIOLOGY,
  RoleCode.PHARMACY,
] as const;

@Controller("hospital-care/enterprise-workflow")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class EnterpriseWorkflowController {
  constructor(private readonly orchestration: EnterpriseWorkflowOrchestrationService) {}

  @Get("definitions")
  @RequireRoles(...CLINICAL_ROLES)
  definitions() {
    return this.orchestration.listDefinitions();
  }

  @Get("admin/dashboard")
  @RequireRoles(RoleCode.ADMIN, RoleCode.PROVIDER, RoleCode.RN)
  adminDashboard(@Req() req: { user?: { facilityId?: string; userId?: string; sub?: string } }) {
    return this.orchestration.getAdminDashboard(
      facilityIdFromReq(req),
      actorUserIdFromReq(req)
    );
  }

  @Get("worklists/:department")
  @RequireRoles(...CLINICAL_ROLES)
  worklist(
    @Param("department") department: string,
    @Query("limit") limit: string | undefined,
    @Query("offset") offset: string | undefined,
    @Req() req: { user?: { facilityId?: string } }
  ) {
    return this.orchestration.getDepartmentWorklist(facilityIdFromReq(req), department, {
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get("encounters/:encounterId")
  @RequireRoles(...CLINICAL_ROLES)
  encounterDoc(
    @Param("encounterId") encounterId: string,
    @Req() req: { user?: { facilityId?: string } }
  ) {
    return this.orchestration.getEncounterDoc(facilityIdFromReq(req), encounterId);
  }

  @Get("encounters/:encounterId/timeline")
  @RequireRoles(...CLINICAL_ROLES)
  timeline(
    @Param("encounterId") encounterId: string,
    @Query("department") department: string | undefined,
    @Query("roleHint") roleHint: string | undefined,
    @Query("workflowInstanceId") workflowInstanceId: string | undefined,
    @Query("taskType") taskType: string | undefined,
    @Req() req: { user?: { facilityId?: string } }
  ) {
    return this.orchestration.getTimeline(facilityIdFromReq(req), encounterId, {
      department,
      roleHint,
      workflowInstanceId,
      taskType,
    });
  }

  @Get("encounters/:encounterId/notifications")
  @RequireRoles(...CLINICAL_ROLES)
  notifications(
    @Param("encounterId") encounterId: string,
    @Req() req: { user?: { facilityId?: string } }
  ) {
    return this.orchestration.getNotifications(facilityIdFromReq(req), encounterId);
  }

  @Post("encounters/:encounterId/workflows")
  @RequireRoles(...CLINICAL_ROLES)
  createWorkflow(
    @Param("encounterId") encounterId: string,
    @Body()
    body: {
      definitionCode: string;
      expectedVersion: number;
      clientRequestId?: string | null;
    },
    @Req() req: { user?: { facilityId?: string; userId?: string; sub?: string } }
  ) {
    return this.orchestration.createWorkflow(
      facilityIdFromReq(req),
      encounterId,
      actorUserIdFromReq(req),
      body
    );
  }

  @Put("encounters/:encounterId/tasks")
  @RequireRoles(...CLINICAL_ROLES)
  upsertTask(
    @Param("encounterId") encounterId: string,
    @Body() body: { task: EnterpriseTaskV1; expectedVersion: number },
    @Req() req: { user?: { facilityId?: string; userId?: string; sub?: string } }
  ) {
    return this.orchestration.upsertTask(
      facilityIdFromReq(req),
      encounterId,
      actorUserIdFromReq(req),
      body
    );
  }

  @Post("encounters/:encounterId/tasks/:taskId/complete")
  @RequireRoles(...CLINICAL_ROLES)
  completeTask(
    @Param("encounterId") encounterId: string,
    @Param("taskId") taskId: string,
    @Body() body: { expectedVersion: number },
    @Req() req: { user?: { facilityId?: string; userId?: string; sub?: string } }
  ) {
    return this.orchestration.completeTask(
      facilityIdFromReq(req),
      encounterId,
      taskId,
      actorUserIdFromReq(req),
      body
    );
  }

  @Post("encounters/:encounterId/tasks/:taskId/reassign")
  @RequireRoles(...CLINICAL_ROLES)
  reassignTask(
    @Param("encounterId") encounterId: string,
    @Param("taskId") taskId: string,
    @Body()
    body: {
      assignedToUserId: string | null;
      assignedToRole?: string | null;
      expectedVersion: number;
    },
    @Req() req: { user?: { facilityId?: string; userId?: string; sub?: string } }
  ) {
    return this.orchestration.reassignTask(
      facilityIdFromReq(req),
      encounterId,
      taskId,
      actorUserIdFromReq(req),
      body
    );
  }

  @Post("encounters/:encounterId/events")
  @RequireRoles(...CLINICAL_ROLES)
  ingestEvent(
    @Param("encounterId") encounterId: string,
    @Body()
    body: {
      idempotencyKey: string;
      type: ClinicalOrchestrationEventType;
      expectedVersion: number;
      eventId?: string;
      occurredAt?: string;
      payload?: Record<string, unknown> | null;
    },
    @Req() req: { user?: { facilityId?: string; userId?: string; sub?: string } }
  ) {
    return this.orchestration.ingestEvent(
      facilityIdFromReq(req),
      encounterId,
      actorUserIdFromReq(req),
      body
    );
  }

  @Post("encounters/:encounterId/escalations")
  @RequireRoles(...CLINICAL_ROLES)
  openEscalation(
    @Param("encounterId") encounterId: string,
    @Body()
    body: {
      templateCode: EscalationChainTemplateCode;
      summary: string;
      expectedVersion: number;
      relatedTaskId?: string | null;
      relatedWorkflowInstanceId?: string | null;
      relatedEventId?: string | null;
      escalationId?: string;
      clientRequestId?: string | null;
    },
    @Req() req: { user?: { facilityId?: string; userId?: string; sub?: string } }
  ) {
    return this.orchestration.openEscalation(
      facilityIdFromReq(req),
      encounterId,
      actorUserIdFromReq(req),
      body
    );
  }

  @Post("encounters/:encounterId/escalations/:escalationId/advance")
  @RequireRoles(...CLINICAL_ROLES)
  advanceEscalation(
    @Param("encounterId") encounterId: string,
    @Param("escalationId") escalationId: string,
    @Body()
    body: {
      status: EscalationInstanceStatusV1;
      expectedVersion: number;
      note?: string | null;
    },
    @Req() req: { user?: { facilityId?: string; userId?: string; sub?: string } }
  ) {
    return this.orchestration.advanceEscalation(
      facilityIdFromReq(req),
      encounterId,
      escalationId,
      actorUserIdFromReq(req),
      body
    );
  }
}
