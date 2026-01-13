import { Controller, Get, Put, Param, Body, Req, UseGuards, BadRequestException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { TriageService } from "./triage.service";
import { RoleCode } from "@prisma/client";

@Controller("encounters")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class TriageController {
  constructor(private readonly triageService: TriageService) {}

  @Get(":id/triage")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
  async getTriage(@Param("id") encounterId: string, @Req() req: any) {
    const facilityId = req.facilityId;
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }

    return this.triageService.getTriage(encounterId, facilityId);
  }

  @Put(":id/triage")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
  async upsertTriage(
    @Param("id") encounterId: string,
    @Body() body: any,
    @Req() req: any
  ) {
    const facilityId = req.facilityId;
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }

    return this.triageService.upsertTriage(
      encounterId,
      facilityId,
      {
        chiefComplaint: body.chiefComplaint,
        onsetAt: body.onsetAt ? new Date(body.onsetAt) : null,
        esi: body.esi,
        vitalsJson: body.vitalsJson,
        strokeScreen: body.strokeScreen,
        sepsisScreen: body.sepsisScreen,
        triageCompleteAt: body.triageCompleteAt ? new Date(body.triageCompleteAt) : null,
      },
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }
}

