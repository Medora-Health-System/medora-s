import { BadRequestException, Controller, Get, Req, UseGuards } from "@nestjs/common";
import { PatientPortalAuthGuard } from "../guards/patient-portal-auth.guard";
import type { PatientPortalPrincipal } from "../auth/patient-portal.types";
import { PatientOrganizationsService } from "./patient-organizations.service";

@Controller("patient/v1/organizations")
@UseGuards(PatientPortalAuthGuard)
export class PatientOrganizationsController {
  constructor(private readonly organizations: PatientOrganizationsService) {}

  @Get()
  async list(
    @Req()
    req: {
      patientPrincipal?: PatientPortalPrincipal;
      ip?: string;
      headers?: Record<string, string | string[] | undefined>;
    }
  ) {
    if (!req.patientPrincipal) {
      throw new BadRequestException("Patient principal missing");
    }
    const userAgent = req.headers?.["user-agent"];
    return this.organizations.list(req.patientPrincipal, {
      ip: req.ip,
      userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
    });
  }
}
