import { BadRequestException, Controller, Get, Param, Req, UseGuards } from "@nestjs/common";
import type { PatientPortalAccessContext } from "../auth/patient-portal.types";
import { PatientPortalAuthGuard } from "../guards/patient-portal-auth.guard";
import { PatientPortalFacilityGuard } from "../guards/patient-portal-facility.guard";
import { PatientAppointmentsService } from "./patient-appointments.service";

@Controller("patient/v1/facilities/:facilityId/appointments")
@UseGuards(PatientPortalAuthGuard, PatientPortalFacilityGuard)
export class PatientAppointmentsController {
  constructor(private readonly appointments: PatientAppointmentsService) {}

  @Get()
  async list(@Req() req: any) {
    const access = req.patientAccess as PatientPortalAccessContext | undefined;
    if (!access) throw new BadRequestException("Patient access context missing");
    return this.appointments.list(access, {
      ip: req.ip,
      userAgent: req.headers?.["user-agent"],
    });
  }

  @Get(":appointmentId")
  async get(@Param("appointmentId") appointmentId: string, @Req() req: any) {
    const access = req.patientAccess as PatientPortalAccessContext | undefined;
    if (!access) throw new BadRequestException("Patient access context missing");
    return this.appointments.get(access, appointmentId, {
      ip: req.ip,
      userAgent: req.headers?.["user-agent"],
    });
  }
}
