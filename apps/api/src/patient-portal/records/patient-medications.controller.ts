import { BadRequestException, Controller, Get, Param, Req, UseGuards } from "@nestjs/common";
import type { PatientPortalAccessContext } from "../auth/patient-portal.types";
import { PatientPortalAuthGuard } from "../guards/patient-portal-auth.guard";
import { PatientPortalFacilityGuard } from "../guards/patient-portal-facility.guard";
import { PatientMedicationsService } from "./patient-medications.service";

@Controller("patient/v1/facilities/:facilityId/medications")
@UseGuards(PatientPortalAuthGuard, PatientPortalFacilityGuard)
export class PatientMedicationsController {
  constructor(private readonly medications: PatientMedicationsService) {}

  private access(req: any): PatientPortalAccessContext {
    const access = req.patientAccess as PatientPortalAccessContext | undefined;
    if (!access) throw new BadRequestException("Patient access context missing");
    return access;
  }

  @Get()
  list(@Req() req: any) {
    return this.medications.list(this.access(req), {
      ip: req.ip,
      userAgent: req.headers?.["user-agent"],
    });
  }

  @Get(":orderItemId")
  get(@Param("orderItemId") orderItemId: string, @Req() req: any) {
    return this.medications.get(this.access(req), orderItemId, {
      ip: req.ip,
      userAgent: req.headers?.["user-agent"],
    });
  }
}
