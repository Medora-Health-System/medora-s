import {
  BadRequestException,
  Controller,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleCode } from "@prisma/client";
import { RequireRoles, RolesGuard } from "../../common/guards/roles.guard";
import { PatientPortalActivationService } from "./patient-portal-activation.service";

@Controller("patient-portal-admin/v1")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class PatientPortalStaffActivationController {
  constructor(private readonly activation: PatientPortalActivationService) {}

  @Post("patients/:patientId/activation")
  @RequireRoles(RoleCode.FRONT_DESK, RoleCode.ADMIN)
  async issue(@Param("patientId") patientId: string, @Req() req: any) {
    const facilityId = req.facilityId || req.user?.facilityId || req.headers?.["x-facility-id"];
    const userId = req.user?.userId;
    if (!facilityId || typeof facilityId !== "string") {
      throw new BadRequestException("Facility ID required");
    }
    if (!userId || typeof userId !== "string") {
      throw new BadRequestException("Staff user required");
    }

    return this.activation.issueForStaff({
      patientId,
      facilityId,
      createdByUserId: userId,
      ip: req.ip,
      userAgent: req.headers?.["user-agent"],
    });
  }
}
