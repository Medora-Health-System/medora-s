import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleCode } from "@prisma/client";
import { FACILITY_OR_PLATFORM_ADMIN_ROLES } from "../common/auth/platform-operator-roles";
import { RequireRoles, RolesGuard } from "../common/guards/roles.guard";
import { FacilityConfigurationService } from "./facility-configuration.service";

function facilityActor(req: {
  user?: { userId?: string; facilityId?: string };
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
}) {
  const userId = req.user?.userId;
  const header = req.headers?.["x-facility-id"];
  const facilityId =
    req.user?.facilityId ||
    (typeof header === "string" ? header : Array.isArray(header) ? header[0] : undefined);
  if (!userId) throw new UnauthorizedException("Identité manquante.");
  if (!facilityId?.trim()) throw new BadRequestException("Établissement requis.");
  return {
    userId,
    facilityId: facilityId.trim(),
    ip: req.ip ?? null,
    userAgent: typeof req.headers?.["user-agent"] === "string" ? req.headers["user-agent"] : null,
  };
}

@Controller("admin/facility/configuration")
@UseGuards(AuthGuard("jwt"), RolesGuard)
@RequireRoles(...FACILITY_OR_PLATFORM_ADMIN_ROLES)
export class FacilityConfigurationAdminController {
  constructor(private readonly configuration: FacilityConfigurationService) {}

  @Get()
  get(@Req() req: any) {
    return this.configuration.getForAdmin(facilityActor(req));
  }

  @Patch()
  patch(@Body() body: unknown, @Req() req: any) {
    return this.configuration.patchForAdmin(facilityActor(req), body);
  }
}

@Controller("facility/runtime-configuration")
@UseGuards(AuthGuard("jwt"), RolesGuard)
@RequireRoles(
  RoleCode.ADMIN,
  RoleCode.MEDORA_SUPER_ADMIN,
  RoleCode.PROVIDER,
  RoleCode.RN,
  RoleCode.FRONT_DESK,
  RoleCode.LAB,
  RoleCode.RADIOLOGY,
  RoleCode.PHARMACY,
  RoleCode.BILLING,
  RoleCode.PATIENT_CARE_TECH,
  RoleCode.MEDICATION_REVIEWER,
  RoleCode.MEDICATION_ADMIN,
)
export class FacilityRuntimeConfigurationController {
  constructor(private readonly configuration: FacilityConfigurationService) {}

  @Get()
  runtime(@Req() req: any) {
    const actor = facilityActor(req);
    return this.configuration.runtimeForFacility(actor.facilityId);
  }
}
