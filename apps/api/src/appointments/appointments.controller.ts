import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  ServiceUnavailableException,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleCode } from "@prisma/client";
import {
  ambulatoryWalkInCreateDtoSchema,
  appointmentCheckInDtoSchema,
  appointmentCreateDtoSchema,
} from "@medora/shared";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import {
  CLINIC_CARE_SCHEMA_MISS_MESSAGE,
  isPrismaSchemaMissError,
} from "../clinic-care/clinic-care-schema-miss";
import { AppointmentsService } from "./appointments.service";

@Controller()
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  private facilityId(req: any): string {
    const id = req.facilityId || req.user?.facilityId || req.headers["x-facility-id"];
    if (!id) throw new BadRequestException("Facility ID required");
    return id;
  }

  @Post("appointments")
  @RequireRoles(RoleCode.FRONT_DESK, RoleCode.ADMIN, RoleCode.PROVIDER)
  async create(@Body() body: unknown, @Req() req: any) {
    const parsed = appointmentCreateDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }
    return this.appointmentsService.create(
      this.facilityId(req),
      parsed.data,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Get("appointments/today")
  @RequireRoles(RoleCode.FRONT_DESK, RoleCode.ADMIN, RoleCode.PROVIDER, RoleCode.RN, RoleCode.BILLING)
  async listToday(@Req() req: any) {
    try {
      return await this.appointmentsService.listToday(this.facilityId(req));
    } catch (err) {
      // MEDUI.D4C.2A.1 — missing Appointment table must not look like an empty day.
      if (isPrismaSchemaMissError(err)) {
        throw new ServiceUnavailableException({
          message: CLINIC_CARE_SCHEMA_MISS_MESSAGE,
          code: "CLINIC_CARE_SCHEMA_MISS",
          migration: "20261028120000_enterprise_appointment_visit_origin_d4c3",
        });
      }
      throw err;
    }
  }

  @Post("appointments/:id/arrive")
  @RequireRoles(RoleCode.FRONT_DESK, RoleCode.ADMIN)
  async arrive(@Param("id") id: string, @Req() req: any) {
    return this.appointmentsService.markArrived(
      id,
      this.facilityId(req),
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Post("appointments/:id/check-in")
  @RequireRoles(RoleCode.FRONT_DESK, RoleCode.ADMIN)
  async checkIn(@Param("id") id: string, @Body() body: unknown, @Req() req: any) {
    const parsed = appointmentCheckInDtoSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }
    return this.appointmentsService.checkIn(
      id,
      this.facilityId(req),
      parsed.data,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Post("registration/walk-in")
  @RequireRoles(RoleCode.FRONT_DESK, RoleCode.ADMIN)
  async walkIn(@Body() body: unknown, @Req() req: any) {
    const parsed = ambulatoryWalkInCreateDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }
    return this.appointmentsService.createWalkIn(
      this.facilityId(req),
      parsed.data,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Get("registration/patients/:patientId/completeness")
  @RequireRoles(RoleCode.FRONT_DESK, RoleCode.ADMIN, RoleCode.BILLING, RoleCode.RN, RoleCode.PROVIDER)
  async completeness(
    @Param("patientId") patientId: string,
    @Query("encounterId") encounterId: string | undefined,
    @Query("appointmentId") appointmentId: string | undefined,
    @Req() req: any
  ) {
    return this.appointmentsService.registrationCompleteness(this.facilityId(req), patientId, {
      encounterId,
      appointmentId,
    });
  }
}
