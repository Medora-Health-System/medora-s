import { Controller, Get, Query, Req, UseGuards, BadRequestException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { TrackboardService } from "./trackboard.service";
import { RoleCode } from "@prisma/client";

@Controller("trackboard")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class TrackboardController {
  constructor(private readonly trackboardService: TrackboardService) {}

  @Get()
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
  async getActiveEncounters(@Query("status") status: string, @Req() req: any) {
    const facilityId = req.facilityId;
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }

    return this.trackboardService.getActiveEncounters(facilityId, status);
  }
}

