import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { RoleCode } from "@prisma/client";
import { FollowUpsService } from "./follow-ups.service";
import {
  createFollowUpDtoSchema,
  listPatientFollowUpsQuerySchema,
  listUpcomingFollowUpsQuerySchema,
} from "./dto";

@Controller()
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class FollowUpsController {
  constructor(private readonly followUpsService: FollowUpsService) {}

  private facilityId(req: any): string {
    const id = req.user?.facilityId || req.headers["x-facility-id"];
    if (!id) throw new BadRequestException("Facility ID required");
    return id;
  }

  @Post("follow-ups")
  @RequireRoles(RoleCode.FRONT_DESK, RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
  async create(@Body() body: unknown, @Req() req: any) {
    const facilityId = this.facilityId(req);
    const parsed = createFollowUpDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }
    return this.followUpsService.create(
      facilityId,
      parsed.data,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"],
    );
  }

  @Get("patients/:patientId/follow-ups")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN, RoleCode.FRONT_DESK)
  async findByPatient(
    @Param("patientId") patientId: string,
    @Query() query: Record<string, string>,
    @Req() req: any,
  ) {
    const facilityId = this.facilityId(req);
    const q = listPatientFollowUpsQuerySchema.safeParse(query);
    if (!q.success) {
      throw new BadRequestException("Invalid query", { cause: q.error });
    }
    return this.followUpsService.findByPatient(
      patientId,
      facilityId,
      q.data,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"],
    );
  }

  @Get("follow-ups/upcoming")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN, RoleCode.FRONT_DESK)
  async upcoming(
    @Query() query: Record<string, string>,
    @Req() req: any,
  ) {
    const facilityId = this.facilityId(req);
    const q = listUpcomingFollowUpsQuerySchema.safeParse(query);
    if (!q.success) {
      throw new BadRequestException("Invalid query", { cause: q.error });
    }
    return this.followUpsService.findUpcoming(
      facilityId,
      q.data,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"],
    );
  }

  @Post("follow-ups/:id/complete")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
  async complete(@Param("id") id: string, @Req() req: any) {
    return this.followUpsService.complete(
      id,
      this.facilityId(req),
      req.user?.userId,
      req.ip,
      req.headers["user-agent"],
    );
  }

  @Post("follow-ups/:id/cancel")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
  async cancel(@Param("id") id: string, @Req() req: any) {
    return this.followUpsService.cancel(
      id,
      this.facilityId(req),
      req.user?.userId,
      req.ip,
      req.headers["user-agent"],
    );
  }
}
