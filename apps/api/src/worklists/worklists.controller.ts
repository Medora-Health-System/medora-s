import { Controller, Get, Req, UseGuards, BadRequestException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { WorklistsService } from "./worklists.service";
import { RoleCode } from "@prisma/client";

@Controller("worklists")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class WorklistsController {
  constructor(private readonly worklistsService: WorklistsService) {}

  @Get("lab")
  @RequireRoles(RoleCode.LAB, RoleCode.ADMIN)
  async getLabWorklist(@Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }

    return this.worklistsService.getLabWorklist(facilityId);
  }

  @Get("radiology")
  @RequireRoles(RoleCode.RADIOLOGY, RoleCode.ADMIN)
  async getRadiologyWorklist(@Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }

    return this.worklistsService.getRadiologyWorklist(facilityId);
  }

  @Get("pharmacy")
  @RequireRoles(RoleCode.PHARMACY, RoleCode.ADMIN)
  async getPharmacyWorklist(@Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }

    return this.worklistsService.getPharmacyWorklist(facilityId);
  }

  @Get("billing")
  @RequireRoles(RoleCode.BILLING, RoleCode.ADMIN)
  async getBillingWorklist(@Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }

    return this.worklistsService.getBillingWorklist(facilityId);
  }
}

