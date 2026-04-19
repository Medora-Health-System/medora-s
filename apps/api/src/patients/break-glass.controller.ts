import {
  Body,
  Controller,
  Param,
  Post,
  Req,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { breakGlassStartDtoSchema } from "@medora/shared";
import { assertZodBody } from "../common/http/zod-parse";
import { FacilityMembershipGuard } from "../common/guards/facility-membership.guard";
import { BreakGlassService } from "./break-glass.service";

@Controller("patients")
@UseGuards(AuthGuard("jwt"), FacilityMembershipGuard)
export class BreakGlassController {
  constructor(private readonly breakGlass: BreakGlassService) {}

  @Post(":id/break-glass/start")
  async start(
    @Param("id") patientId: string,
    @Body() body: unknown,
    @Req() req: any
  ) {
    const rawF = req.facilityId ?? req.user?.facilityId ?? req.headers["x-facility-id"];
    const facilityId = typeof rawF === "string" ? rawF : Array.isArray(rawF) ? rawF[0] : "";
    if (!facilityId) {
      throw new BadRequestException("Établissement requis");
    }
    const dto = assertZodBody(breakGlassStartDtoSchema.safeParse(body));
    return this.breakGlass.start(
      facilityId,
      patientId,
      req.user!.userId!,
      dto,
      req.ip,
      typeof req.headers?.["user-agent"] === "string"
        ? req.headers["user-agent"]
        : Array.isArray(req.headers?.["user-agent"])
          ? req.headers["user-agent"][0]
          : undefined
    );
  }

  @Post(":id/break-glass/end")
  async end(
    @Param("id") patientId: string,
    @Req() req: any
  ) {
    const rawF = req.facilityId ?? req.user?.facilityId ?? req.headers["x-facility-id"];
    const facilityId = typeof rawF === "string" ? rawF : Array.isArray(rawF) ? rawF[0] : "";
    if (!facilityId) {
      throw new BadRequestException("Établissement requis");
    }
    return this.breakGlass.end(
      facilityId,
      patientId,
      req.user!.userId!,
      req.ip,
      typeof req.headers?.["user-agent"] === "string"
        ? req.headers["user-agent"]
        : Array.isArray(req.headers?.["user-agent"])
          ? req.headers["user-agent"][0]
          : undefined
    );
  }
}
