import { BadRequestException, Controller, Get, Req, UseGuards } from "@nestjs/common";
import type { PatientPortalAccessContext } from "../auth/patient-portal.types";
import { PatientPortalAuthGuard } from "../guards/patient-portal-auth.guard";
import { PatientPortalFacilityGuard } from "../guards/patient-portal-facility.guard";
import { PatientDashboardService } from "./patient-dashboard.service";

@Controller("patient/v1/facilities/:facilityId/dashboard")
@UseGuards(PatientPortalAuthGuard, PatientPortalFacilityGuard)
export class PatientDashboardController {
  constructor(private readonly dashboard: PatientDashboardService) {}

  @Get()
  get(@Req() req: any) {
    const access = req.patientAccess as PatientPortalAccessContext | undefined;
    if (!access) throw new BadRequestException("Patient access context missing");
    return this.dashboard.get(access, {
      ip: req.ip,
      userAgent: req.headers?.["user-agent"],
    });
  }
}
