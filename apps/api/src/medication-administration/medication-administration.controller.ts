import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { RoleCode } from "@prisma/client";
import { medicationAdministrationCreateDtoSchema } from "@medora/shared";
import { assertZodBody } from "../common/http/zod-parse";
import { MedicationAdministrationService } from "./medication-administration.service";

@Controller()
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class MedicationAdministrationController {
  constructor(private readonly medicationAdministrationService: MedicationAdministrationService) {}

  @Get("encounters/:encounterId/medication-administrations")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
  async list(@Param("encounterId") encounterId: string, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    return this.medicationAdministrationService.findByEncounter(encounterId, facilityId);
  }

  @Post("encounters/:encounterId/medication-administrations")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
  async create(@Param("encounterId") encounterId: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    const userId = req.user?.userId;
    if (!userId) {
      throw new ForbiddenException("Authentification requise");
    }
    const data = assertZodBody(medicationAdministrationCreateDtoSchema.safeParse(body));
    return this.medicationAdministrationService.create(encounterId, facilityId, userId, data);
  }
}
