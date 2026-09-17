import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RequirePlatformCapabilities } from "./platform-capabilities.decorator";
import { PlatformCapabilitiesGuard } from "./platform-capabilities.guard";
import { WorkforceAccessPackageService } from "./workforce-access-package.service";

@Controller("platform/staff")
@UseGuards(AuthGuard("jwt"),PlatformCapabilitiesGuard)
export class WorkforceAccessPackageController {
  constructor(private readonly packages:WorkforceAccessPackageService){}
  @Get(":id/workforce/access-package")
  @RequirePlatformCapabilities(["STAFF_VIEW"],{requireRecentMfa:true})
  preview(@Param("id") id:string){return this.packages.preview(id);}
}
