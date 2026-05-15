import { Controller, Get, HttpCode, HttpStatus, Param, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import { PlatformAnnouncementsService } from "./platform-announcements.service";

type JwtReqUser = { userId: string };

@Controller("platform-announcements")
@UseGuards(AuthGuard("jwt"))
export class PlatformAnnouncementsController {
  constructor(private readonly svc: PlatformAnnouncementsService) {}

  @Get("active")
  async active(@Req() req: Request & { user: JwtReqUser }) {
    return this.svc.findActiveUnacknowledged(req.user.userId);
  }

  @Post(":id/acknowledge")
  @HttpCode(HttpStatus.OK)
  async acknowledge(@Req() req: Request & { user: JwtReqUser }, @Param("id") id: string) {
    const rawFacility = req.headers["x-facility-id"];
    const facilityId =
      typeof rawFacility === "string"
        ? rawFacility
        : Array.isArray(rawFacility)
          ? rawFacility[0]
          : undefined;
    const xf = req.headers["x-forwarded-for"];
    const ip =
      typeof xf === "string" && xf.trim()
        ? xf.split(",")[0].trim()
        : req.ip || req.socket?.remoteAddress || undefined;
    const userAgent = typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined;
    return this.svc.acknowledge(id, req.user.userId, { facilityId, ip, userAgent });
  }
}
