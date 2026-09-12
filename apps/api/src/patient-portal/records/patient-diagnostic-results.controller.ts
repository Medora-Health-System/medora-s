import { BadRequestException, Controller, Get, Param, Req, UseGuards } from "@nestjs/common";
import type { PatientPortalAccessContext } from "../auth/patient-portal.types";
import { PatientPortalAuthGuard } from "../guards/patient-portal-auth.guard";
import { PatientPortalFacilityGuard } from "../guards/patient-portal-facility.guard";
import { PatientDiagnosticResultsService } from "./patient-diagnostic-results.service";

@Controller("patient/v1/facilities/:facilityId")
@UseGuards(PatientPortalAuthGuard, PatientPortalFacilityGuard)
export class PatientDiagnosticResultsController {
  constructor(private readonly diagnostics: PatientDiagnosticResultsService) {}

  private access(req: any): PatientPortalAccessContext {
    const access = req.patientAccess as PatientPortalAccessContext | undefined;
    if (!access) throw new BadRequestException("Patient access context missing");
    return access;
  }

  @Get("labs")
  listLabs(@Req() req: any) {
    return this.diagnostics.list(this.access(req), "LAB_TEST", {
      ip: req.ip,
      userAgent: req.headers?.["user-agent"],
    });
  }

  @Get("labs/:orderItemId")
  getLab(@Param("orderItemId") orderItemId: string, @Req() req: any) {
    return this.diagnostics.get(this.access(req), "LAB_TEST", orderItemId, {
      ip: req.ip,
      userAgent: req.headers?.["user-agent"],
    });
  }

  @Get("imaging")
  listImaging(@Req() req: any) {
    return this.diagnostics.list(this.access(req), "IMAGING_STUDY", {
      ip: req.ip,
      userAgent: req.headers?.["user-agent"],
    });
  }

  @Get("imaging/:orderItemId")
  getImaging(@Param("orderItemId") orderItemId: string, @Req() req: any) {
    return this.diagnostics.get(this.access(req), "IMAGING_STUDY", orderItemId, {
      ip: req.ip,
      userAgent: req.headers?.["user-agent"],
    });
  }
}
