import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { PatientPortalAuthGuard } from "../guards/patient-portal-auth.guard";
import { PatientPortalFacilityGuard } from "../guards/patient-portal-facility.guard";
import type { PatientPortalAccessContext } from "../auth/patient-portal.types";
import { PatientNotificationsService } from "./patient-notifications.service";

@Controller("patient/v1/facilities/:facilityId/notifications")
@UseGuards(PatientPortalAuthGuard, PatientPortalFacilityGuard)
export class PatientNotificationsController {
  constructor(private readonly notifications: PatientNotificationsService) {}
  private access(req:any): PatientPortalAccessContext { return req.patientPortalAccess; }

  @Get()
  list(@Req() req:any) { return this.notifications.list(this.access(req)); }

  @Post(":id/read")
  markRead(@Req() req:any,@Param("id") id:string) { return this.notifications.markRead(this.access(req),id); }

  @Post("devices")
  register(@Req() req:any,@Body() body:{token?:string;platform?:string}) {
    if(!body.token || !["IOS","ANDROID","WEB"].includes(body.platform ?? "")) throw new Error("Invalid push device");
    return this.notifications.registerDevice(this.access(req),body.token,body.platform as "IOS"|"ANDROID"|"WEB");
  }

  @Delete("devices")
  unregister(@Req() req:any,@Body() body:{token?:string}) {
    if(!body.token) return {registered:false};
    return this.notifications.unregisterDevice(this.access(req),body.token);
  }
}
