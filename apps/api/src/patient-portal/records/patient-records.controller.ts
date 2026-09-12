import { BadRequestException, Controller, Get, Param, Req, UseGuards } from "@nestjs/common";
import { PatientPortalAuthGuard } from "../guards/patient-portal-auth.guard";
import { PatientPortalFacilityGuard } from "../guards/patient-portal-facility.guard";
import type { PatientPortalAccessContext } from "../auth/patient-portal.types";
import { PatientRecordsService } from "./patient-records.service";

@Controller("patient/v1/facilities/:facilityId")
@UseGuards(PatientPortalAuthGuard, PatientPortalFacilityGuard)
export class PatientRecordsController {
  constructor(private readonly records: PatientRecordsService) {}

  private access(req: any): PatientPortalAccessContext {
    const access = req.patientAccess as PatientPortalAccessContext | undefined;
    if (!access) throw new BadRequestException("Patient access context missing");
    return access;
  }

  private requestContext(req: any) {
    return {
      ip: req.ip,
      userAgent: req.headers?.["user-agent"],
    };
  }

  @Get("visits")
  async listVisits(@Req() req: any) {
    return this.records.listVisits(this.access(req), this.requestContext(req));
  }

  @Get("visits/:encounterId")
  async getVisit(@Param("encounterId") encounterId: string, @Req() req: any) {
    return this.records.getVisit(this.access(req), encounterId, this.requestContext(req));
  }

  @Get("allergies")
  async listAllergies(@Req() req: any) {
    return this.records.listAllergies(this.access(req), this.requestContext(req));
  }

  @Get("immunizations")
  async listImmunizations(@Req() req: any) {
    return this.records.listImmunizations(this.access(req), this.requestContext(req));
  }
}
