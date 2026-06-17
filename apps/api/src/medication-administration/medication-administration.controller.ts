import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { RoleCode } from "@prisma/client";
import {
  medicationAdministrationCreateDtoSchema,
  medicationAdministrationEffectiveTimeDtoSchema,
} from "@medora/shared";
import { assertZodBody } from "../common/http/zod-parse";
import { MedicationAdministrationService } from "./medication-administration.service";
import { MedicationAdministrationHistoryService } from "./medication-administration-history.service";
import {
  parseOptionalPositiveInt,
  ENCOUNTER_MAR_LIST_MAX_LIMIT,
} from "../common/encounter-clinical-read-limits";
import type { MedicationAdministrationHistoryEventType } from "@medora/shared";
import { MEDICATION_ADMINISTRATION_HISTORY_EVENT_TYPES } from "@medora/shared";

@Controller()
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class MedicationAdministrationController {
  constructor(
    private readonly medicationAdministrationService: MedicationAdministrationService,
    private readonly medicationAdministrationHistoryService: MedicationAdministrationHistoryService
  ) {}

  @Get("encounters/:encounterId/medication-administration-history")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
  async listHistory(
    @Param("encounterId") encounterId: string,
    @Req() req: any
  ) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }

    const query = req.query ?? {};
    const limit = parseOptionalPositiveInt(
      typeof query.limit === "string" ? query.limit : undefined
    );
    const lookbackDays = parseOptionalPositiveInt(
      typeof query.lookbackDays === "string" ? query.lookbackDays : undefined
    );
    const orderItemId =
      typeof query.orderItemId === "string" ? query.orderItemId.trim() : undefined;
    const eventTypeRaw =
      typeof query.eventType === "string" ? query.eventType.trim().toUpperCase() : undefined;
    const eventType = (MEDICATION_ADMINISTRATION_HISTORY_EVENT_TYPES as readonly string[]).includes(
      eventTypeRaw ?? ""
    )
      ? (eventTypeRaw as MedicationAdministrationHistoryEventType)
      : undefined;

    if (limit != null && limit > ENCOUNTER_MAR_LIST_MAX_LIMIT) {
      throw new BadRequestException(`limit must be <= ${ENCOUNTER_MAR_LIST_MAX_LIMIT}`);
    }

    return this.medicationAdministrationHistoryService.findByEncounter(encounterId, facilityId, {
      limit,
      lookbackDays,
      eventType,
      orderItemId: orderItemId || undefined,
    });
  }

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

  @Patch("encounters/:encounterId/medication-administrations/:administrationId/effective-administered-time")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
  async setEffectiveAdministeredAt(
    @Param("encounterId") encounterId: string,
    @Param("administrationId") administrationId: string,
    @Body() body: unknown,
    @Req() req: any
  ) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    const userId = req.user?.userId;
    if (!userId) {
      throw new ForbiddenException("Authentification requise");
    }
    const dto = assertZodBody(medicationAdministrationEffectiveTimeDtoSchema.safeParse(body));
    return this.medicationAdministrationService.setEffectiveAdministeredAt(
      encounterId,
      facilityId,
      administrationId,
      dto,
      userId,
      req.ip,
      req.headers["user-agent"]
    );
  }
}
