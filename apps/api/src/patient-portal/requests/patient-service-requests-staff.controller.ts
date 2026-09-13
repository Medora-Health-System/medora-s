import { BadRequestException, Body, Controller, Get, Param, Post, Req, UnauthorizedException, UseGuards } from "@nestjs/common";
import { RoleCode } from "@prisma/client";
import { AuthGuard } from "@nestjs/passport";
import { RequireRoles, RolesGuard } from "../../common/guards/roles.guard";
import { patientServiceRequestDecisionSchema } from "./patient-service-request.schemas";
import { PatientServiceRequestsService } from "./patient-service-requests.service";

@Controller("patient-portal/v1/staff/requests")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class PatientServiceRequestsStaffController {
  constructor(private readonly requests: PatientServiceRequestsService) {}

  private actor(req: any) {
    const userId = req.user?.userId as string | undefined;
    const facilityId = (req.user?.facilityId || req.headers?.["x-facility-id"]) as string | undefined;
    if (!userId) throw new UnauthorizedException("Staff identity missing");
    if (!facilityId) throw new BadRequestException("Facility is required");
    return {
      userId,
      facilityId,
      ip: req.ip as string | undefined,
      userAgent: req.headers?.["user-agent"] as string | undefined,
    };
  }

  @Get()
  @RequireRoles(RoleCode.ADMIN, RoleCode.PROVIDER, RoleCode.RN, RoleCode.FRONT_DESK)
  list(@Req() req: any) {
    return this.requests.listStaff(this.actor(req));
  }

  @Post(":requestId/decision")
  @RequireRoles(RoleCode.PROVIDER)
  decide(@Param("requestId") requestId: string, @Body() body: unknown, @Req() req: any) {
    const parsed = patientServiceRequestDecisionSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException("Invalid service request decision payload");
    return this.requests.decideStaff(this.actor(req), requestId, parsed.data);
  }
}
