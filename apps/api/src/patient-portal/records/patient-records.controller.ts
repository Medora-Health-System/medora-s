import { BadRequestException, Controller, Get, Param, Req, UseGuards } from "@nestjs/common";
import { PatientPortalAuthGuard } from "../guards/patient-portal-auth.guard";
import { PatientPortalFacilityGuard } from "../guards/patient-portal-facility.guard";
import type { PatientPortalAccessContext } from "../auth/patient-portal.types";
import { PatientRecordsService } from "./patient-records.service";

@Controller("patient/v1/facilities/:facilityId")
@UseGuards(PatientPortalAuthGuard, PatientPortalFacilityGuard)
export class PatientRecordsController {
  constructor(private readonly records: PatientRecordsService) {}

  @Get("visits")
  async listVisits(@Req() req: any) {
    const access = req.patientAccess as PatientPortalAccessContext | undefined;
    if (!access) throw new BadRequestException("Patient access context missing");
    return this.records.listVisits(access, {
      ip: req.ip,
      userAgent: req.headers?.["user-agent"],
    });
  }

  @Get("visits/:encounterId")
  async getVisit(@Param("encounterId") encounterId: string, @Req() req: any) {
    const access = req.patientAccess as PatientPortalAccessContext | undefined;
    if (!access) throw new BadRequestException("Patient access context missing");
    return this.records.getVisit(access, encounterId, {
      ip: req.ip,
      userAgent: req.headers?.["user-agent"],
    });
  }
}
