import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { PlatformCapabilitiesGuard } from "./platform-capabilities.guard";
import { RequirePlatformCapabilities } from "./platform-capabilities.decorator";
import { FacilityLifecyclePreflightService } from "./facility-lifecycle-preflight.service";

@Controller("platform/facilities")
@UseGuards(AuthGuard("jwt"), PlatformCapabilitiesGuard)
export class FacilityLifecyclePreflightController {
  constructor(private readonly preflight: FacilityLifecyclePreflightService) {}

  @Get(":id/lifecycle-preflight")
  @RequirePlatformCapabilities(["FACILITY_ACTIVATE"], { requireRecentMfa: true })
  get(@Param("id") id: string) {
    return this.preflight.get(id);
  }
}
