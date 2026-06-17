import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Param,
  Patch,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleCode } from "@prisma/client";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import {
  assertMarDoseScheduleAdjustmentRoles,
  MedicationDoseScheduleAdjustmentService,
} from "./medication-dose-schedule-adjustment.service";

type AdjustScheduleBody = {
  newScheduledAt: string;
  reasonCode: string;
  reasonDetail?: string | null;
};

@Controller("facilities/:facilityId/encounters/:encounterId/medication-doses")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class MedicationDoseScheduleAdjustmentController {
  constructor(
    private readonly medicationDoseScheduleAdjustmentService: MedicationDoseScheduleAdjustmentService
  ) {}

  @Patch(":doseInstanceId/scheduled-at")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
  async adjustScheduledAt(
    @Param("facilityId") facilityId: string,
    @Param("encounterId") encounterId: string,
    @Param("doseInstanceId") doseInstanceId: string,
    @Body() body: AdjustScheduleBody,
    @Req()
    req: {
      user?: {
        userId?: string;
        facilityId?: string;
        roleCodes?: RoleCode[];
        firstName?: string;
        lastName?: string;
      };
    }
  ) {
    const requestFacilityId = req.user?.facilityId;
    if (!requestFacilityId || requestFacilityId !== facilityId) {
      throw new ForbiddenException("Établissement invalide pour cette requête.");
    }
    const userId = req.user?.userId;
    if (!userId) {
      throw new ForbiddenException("Authentification requise");
    }
    assertMarDoseScheduleAdjustmentRoles(req.user?.roleCodes ?? [RoleCode.RN]);

    const newScheduledAt = body.newScheduledAt?.trim();
    const reasonCode = body.reasonCode?.trim();
    if (!newScheduledAt || !reasonCode) {
      throw new BadRequestException("newScheduledAt and reasonCode are required");
    }

    const userDisplay = [req.user?.firstName, req.user?.lastName].filter(Boolean).join(" ").trim() || null;

    const facility = await this.medicationDoseScheduleAdjustmentService.resolveFacilityTimeZone(facilityId);

    return this.medicationDoseScheduleAdjustmentService.adjustScheduledAt({
      facilityId,
      encounterId,
      doseInstanceId,
      userId,
      userDisplay,
      facilityTimeZone: facility,
      newScheduledAtIso: newScheduledAt,
      reasonCode,
      reasonDetail: body.reasonDetail,
    });
  }
}
