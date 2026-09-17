import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleCode } from "@prisma/client";
import {
  AllowPlatformPrincipalWithFacilityContext,
  RequireRoles,
  RolesGuard,
} from "../../common/guards/roles.guard";
import { resolveAuthorizedFacilityId } from "../../common/http/request-facility";
import { PatientPortalActivationService } from "./patient-portal-activation.service";

@Controller("patient-portal-admin/v1")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class PatientPortalStaffActivationController {
  constructor(private readonly activation: PatientPortalActivationService) {}

  private staffContext(req: any) {
    const facilityId = resolveAuthorizedFacilityId(req);
    const userId = req.user?.userId;
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }
    if (!userId || typeof userId !== "string") {
      throw new BadRequestException("Staff user required");
    }
    return { facilityId, userId };
  }

  @Get("patients/:patientId/access")
  @RequireRoles(RoleCode.FRONT_DESK, RoleCode.ADMIN, RoleCode.MEDORA_SUPER_ADMIN, RoleCode.PROVIDER, RoleCode.RN)
  @AllowPlatformPrincipalWithFacilityContext()
  async access(@Param("patientId") patientId: string, @Req() req: any) {
    const { facilityId } = this.staffContext(req);
    return this.activation.getAccessForStaff({ patientId, facilityId });
  }

  @Post("patients/:patientId/activation")
  @RequireRoles(RoleCode.FRONT_DESK, RoleCode.ADMIN, RoleCode.MEDORA_SUPER_ADMIN)
  @AllowPlatformPrincipalWithFacilityContext()
  async issue(@Param("patientId") patientId: string, @Req() req: any) {
    const { facilityId, userId } = this.staffContext(req);

    return this.activation.issueForStaff({
      patientId,
      facilityId,
      createdByUserId: userId,
      ip: req.ip,
      userAgent: req.headers?.["user-agent"],
    });
  }

  @Delete("patients/:patientId/access")
  @RequireRoles(RoleCode.ADMIN, RoleCode.MEDORA_SUPER_ADMIN)
  @AllowPlatformPrincipalWithFacilityContext()
  async revoke(@Param("patientId") patientId: string, @Req() req: any) {
    const { facilityId, userId } = this.staffContext(req);
    return this.activation.revokeForStaff({
      patientId,
      facilityId,
      revokedByUserId: userId,
      ip: req.ip,
      userAgent: req.headers?.["user-agent"],
    });
  }
}
