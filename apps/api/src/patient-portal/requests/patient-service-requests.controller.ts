import { BadRequestException, Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import type { PatientPortalAccessContext } from "../auth/patient-portal.types";
import { PatientPortalAuthGuard } from "../guards/patient-portal-auth.guard";
import { PatientPortalFacilityGuard } from "../guards/patient-portal-facility.guard";
import { createPatientServiceRequestSchema } from "./patient-service-request.schemas";
import { PatientServiceRequestsService } from "./patient-service-requests.service";

@Controller("patient/v1/facilities/:facilityId/requests")
@UseGuards(PatientPortalAuthGuard, PatientPortalFacilityGuard)
export class PatientServiceRequestsController {
  constructor(private readonly requests: PatientServiceRequestsService) {}

  private access(req: any): PatientPortalAccessContext {
    const access = req.patientAccess as PatientPortalAccessContext | undefined;
    if (!access) throw new BadRequestException("Patient access context missing");
    return access;
  }

  private context(req: any) {
    return { ip: req.ip as string | undefined, userAgent: req.headers?.["user-agent"] as string | undefined };
  }

  @Get()
  list(@Req() req: any) {
    return this.requests.listPatient(this.access(req));
  }

  @Post()
  create(@Body() body: unknown, @Req() req: any) {
    const parsed = createPatientServiceRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException("Invalid service request payload");
    return this.requests.create(this.access(req), parsed.data, this.context(req));
  }

  @Post(":requestId/cancel")
  cancel(@Param("requestId") requestId: string, @Req() req: any) {
    return this.requests.cancelPatientRequest(this.access(req), requestId, this.context(req));
  }
}
