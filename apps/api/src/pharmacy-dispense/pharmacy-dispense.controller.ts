import { Controller, Get, Param, Req, UseGuards, BadRequestException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { PharmacyDispenseService } from "./pharmacy-dispense.service";
import { RoleCode } from "@prisma/client";

@Controller("pharmacy")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class PharmacyDispenseController {
  constructor(private readonly pharmacyDispenseService: PharmacyDispenseService) {}

  @Get("patients/:id/summary")
  @RequireRoles(RoleCode.PHARMACY, RoleCode.ADMIN)
  async getPatientSummary(@Param("id") id: string, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    return this.pharmacyDispenseService.getPatientSummary(id, facilityId);
  }

  @Get("encounters/:id/dispense-context")
  @RequireRoles(RoleCode.PHARMACY, RoleCode.ADMIN)
  async getDispenseContext(@Param("id") id: string, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    return this.pharmacyDispenseService.getDispenseContext(id, facilityId);
  }
}
