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
import { PathwaysService } from "./pathways.service";
import { RoleCode, PathwayType, PathwayMilestoneStatus } from "@prisma/client";

@Controller()
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class PathwaysController {
  constructor(private readonly pathwaysService: PathwaysService) {}

  @Post("encounters/:encounterId/pathways/activate")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
  async activatePathway(
    @Param("encounterId") encounterId: string,
    @Body() body: { type: PathwayType; contextJson?: any },
    @Req() req: any
  ) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }

    if (!body.type) {
      throw new BadRequestException("Pathway type is required");
    }

    return this.pathwaysService.activatePathway(
      encounterId,
      facilityId,
      body.type,
      body.contextJson,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Post("pathways/:id/pause")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
  async pause(@Param("id") pathwayId: string, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }

    return this.pathwaysService.pause(pathwayId, facilityId, req.user?.userId, req.ip, req.headers["user-agent"]);
  }

  @Post("pathways/:id/complete")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
  async complete(@Param("id") pathwayId: string, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }

    return this.pathwaysService.complete(pathwayId, facilityId, req.user?.userId, req.ip, req.headers["user-agent"]);
  }

  @Get("encounters/:encounterId/pathways")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
  async getByEncounter(@Param("encounterId") encounterId: string, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }

    return this.pathwaysService.getByEncounter(encounterId, facilityId);
  }

  @Get("pathways/:id/timers")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
  async getTimers(@Param("id") pathwayId: string, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }

    return this.pathwaysService.getTimers(pathwayId, facilityId);
  }

  @Patch("pathways/:id/milestones/:mid")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
  async updateMilestone(
    @Param("id") pathwayId: string,
    @Param("mid") milestoneId: string,
    @Body() body: { status: PathwayMilestoneStatus },
    @Req() req: any
  ) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }

    if (!body.status) {
      throw new BadRequestException("Status is required");
    }

    return this.pathwaysService.updateMilestone(
      pathwayId,
      milestoneId,
      facilityId,
      body.status,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }
}

