/**
 * D4A.2.7 — Enterprise Clinical Command Layer HTTP API.
 * Facility always from JWT. Consumes EnterpriseCommandService only.
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
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { EnterpriseCommandService } from "./enterprise-command.service";

function facilityIdFromReq(req: { user?: { facilityId?: string } }): string {
  return String(req.user?.facilityId ?? "").trim();
}

function actorUserIdFromReq(req: { user?: { userId?: string; sub?: string } }): string {
  return String(req.user?.userId ?? req.user?.sub ?? "").trim();
}

@Controller("hospital-care/enterprise-command")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class EnterpriseCommandController {
  constructor(private readonly command: EnterpriseCommandService) {}

  @Get("track-board")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
  trackBoard(@Req() req: { user?: { facilityId?: string; userId?: string; sub?: string } }) {
    return this.command.getTrackBoard(facilityIdFromReq(req), actorUserIdFromReq(req));
  }

  @Get("dashboard")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
  dashboard(@Req() req: { user?: { facilityId?: string; userId?: string; sub?: string } }) {
    return this.command.getCommandCenterDashboard(
      facilityIdFromReq(req),
      actorUserIdFromReq(req)
    );
  }

  @Get("patient-lists/:kind")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
  patientList(
    @Param("kind") kind: string,
    @Query("q") q: string | undefined,
    @Req() req: { user?: { facilityId?: string; userId?: string; sub?: string } }
  ) {
    return this.command.getPatientList(
      facilityIdFromReq(req),
      actorUserIdFromReq(req),
      kind,
      q
    );
  }

  @Get("capacity")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
  capacity(@Req() req: { user?: { facilityId?: string; userId?: string; sub?: string } }) {
    return this.command.getCapacity(facilityIdFromReq(req), actorUserIdFromReq(req));
  }

  @Get("alerts")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
  alerts(@Req() req: { user?: { facilityId?: string; userId?: string; sub?: string } }) {
    return this.command.getAlerts(facilityIdFromReq(req), actorUserIdFromReq(req));
  }

  @Get("escalations")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
  escalations(@Req() req: { user?: { facilityId?: string; userId?: string; sub?: string } }) {
    return this.command.getEscalations(facilityIdFromReq(req), actorUserIdFromReq(req));
  }

  @Get("notifications")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
  notifications(@Req() req: { user?: { facilityId?: string; userId?: string; sub?: string } }) {
    return this.command.getNotifications(facilityIdFromReq(req), actorUserIdFromReq(req));
  }

  @Get("tasks")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
  tasks(@Req() req: { user?: { facilityId?: string; userId?: string; sub?: string } }) {
    return this.command.getTasks(facilityIdFromReq(req), actorUserIdFromReq(req));
  }

  @Get("patient-flow")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
  patientFlow(@Req() req: { user?: { facilityId?: string; userId?: string; sub?: string } }) {
    return this.command.getPatientFlow(facilityIdFromReq(req), actorUserIdFromReq(req));
  }

  @Get("executive")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
  executive(@Req() req: { user?: { facilityId?: string; userId?: string; sub?: string } }) {
    return this.command.getExecutiveSummary(facilityIdFromReq(req), actorUserIdFromReq(req));
  }

  @Get("mobile")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
  mobile(@Req() req: { user?: { facilityId?: string; userId?: string; sub?: string } }) {
    return this.command.getMobileContract(facilityIdFromReq(req), actorUserIdFromReq(req));
  }

  @Get("ai-boundary")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
  aiBoundary() {
    return this.command.getAiBoundaryContract();
  }

  @Get("encounters/:encounterId")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
  encounterDetail(
    @Param("encounterId") encounterId: string,
    @Req() req: { user?: { facilityId?: string } }
  ) {
    return this.command.getEncounterCommandDetail(facilityIdFromReq(req), encounterId);
  }

  @Put("encounters/:encounterId/tasks")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
  upsertTask(
    @Param("encounterId") encounterId: string,
    @Body()
    body: {
      task: Parameters<EnterpriseCommandService["upsertTask"]>[3]["task"];
      expectedVersion: number;
    },
    @Req() req: { user?: { facilityId?: string; userId?: string; sub?: string } }
  ) {
    return this.command.upsertTask(
      facilityIdFromReq(req),
      encounterId,
      actorUserIdFromReq(req),
      body
    );
  }

  @Put("encounters/:encounterId/escalations")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
  upsertEscalation(
    @Param("encounterId") encounterId: string,
    @Body()
    body: {
      escalation: Parameters<EnterpriseCommandService["upsertEscalation"]>[3]["escalation"];
      expectedVersion: number;
    },
    @Req() req: { user?: { facilityId?: string; userId?: string; sub?: string } }
  ) {
    return this.command.upsertEscalation(
      facilityIdFromReq(req),
      encounterId,
      actorUserIdFromReq(req),
      body
    );
  }

  @Post("encounters/:encounterId/notifications")
  @RequireRoles(RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN)
  postNotification(
    @Param("encounterId") encounterId: string,
    @Body()
    body: {
      notification: Parameters<EnterpriseCommandService["postNotification"]>[3]["notification"];
      expectedVersion: number;
    },
    @Req() req: { user?: { facilityId?: string; userId?: string; sub?: string } }
  ) {
    return this.command.postNotification(
      facilityIdFromReq(req),
      encounterId,
      actorUserIdFromReq(req),
      body
    );
  }
}
