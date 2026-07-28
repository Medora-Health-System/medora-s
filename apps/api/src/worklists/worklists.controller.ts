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
  /**
   * LAB / RN / PROVIDER / ADMIN may browse the lab queue (sidebar-aligned).
   * LAB_TEST workflow ack/start/complete is enforced in `assertDepartmentRoleForItem`.
   * Lab result finalize remains separately gated on PUT /orders/:id/result
   * (RN requires Facility.allowRnLabResultSubmission).
   * MEDUI.D4C.7C — PROVIDER browse aligned with nav; Front Desk / Billing excluded.
   */
  @RequireRoles(RoleCode.LAB, RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
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

