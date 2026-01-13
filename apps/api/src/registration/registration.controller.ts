import { Controller, Post, Patch, Param, Body, Req, UseGuards, BadRequestException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { PatientsService } from "../patients/patients.service";
import { EncountersService } from "../encounters/encounters.service";
import { RoleCode } from "@prisma/client";
import { patientCreateDtoSchema, patientUpdateDtoSchema, encounterCreateDtoSchema } from "@medora/shared";

@Controller("registration")
@UseGuards(AuthGuard("jwt"), RolesGuard)
@RequireRoles(RoleCode.FRONT_DESK, RoleCode.ADMIN)
export class RegistrationController {
  constructor(
    private readonly patientsService: PatientsService,
    private readonly encountersService: EncountersService
  ) {}

  @Post("patients")
  async createPatient(@Body() body: unknown, @Req() req: any) {
    const facilityId = req.facilityId;
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }

    const parsed = patientCreateDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }

    return this.patientsService.create(
      facilityId,
      parsed.data,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Patch("patients/:id")
  async updatePatient(@Param("id") id: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = req.facilityId;
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }

    const parsed = patientUpdateDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }

    return this.patientsService.update(
      facilityId,
      id,
      parsed.data,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Post("patients/:id/encounters")
  async createEncounter(@Param("id") patientId: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = req.facilityId;
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }

    const parsed = encounterCreateDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }

    return this.encountersService.create(
      patientId,
      facilityId,
      parsed.data,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }
}

