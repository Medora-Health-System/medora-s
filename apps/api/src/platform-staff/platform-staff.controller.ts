import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { changePersonaSchema, classifyStaffSchema, grantCapabilitySchema, provisionStaffSchema, revokeCapabilitySchema, staffLifecycleSchema } from "./dto/platform-staff.dto";
import { RequirePlatformCapabilities, RequirePlatformPrincipal } from "./platform-capabilities.decorator";
import { PlatformCapabilitiesGuard } from "./platform-capabilities.guard";
import type { MedoraStaffPersonaCode, PlatformCapabilityCode } from "./platform-capabilities";
import { PlatformStaffService } from "./platform-staff.service";

@Controller("platform")
@UseGuards(AuthGuard("jwt"), PlatformCapabilitiesGuard)
export class PlatformStaffController {
  constructor(private readonly staff: PlatformStaffService) {}
  private actor(req: any): string { return String(req.user?.userId ?? ""); }
  private parse<T>(schema: { safeParse(v: unknown): any }, body: unknown): T { const parsed = schema.safeParse(body); if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message ?? "Invalid request"); return parsed.data; }

  @Get("staff") @RequirePlatformCapabilities(["STAFF_VIEW"])
  listStaff() { return this.staff.listStaff(); }
  @Get("staff/:id") @RequirePlatformCapabilities(["STAFF_VIEW"])
  getStaff(@Param("id") id: string) { return this.staff.getStaff(id); }
  @Get("capabilities") @RequirePlatformCapabilities(["STAFF_VIEW", "STAFF_GRANT_CAPABILITIES"], { mode: "ANY" })
  listCapabilities() { return this.staff.listCapabilities(); }
  @Post("staff/:id/classification") @RequirePlatformPrincipal({ event: "MEDORA_STAFF_CLASSIFICATION_DENIED", sourceOperation: "platform.staff.classify", requestedCapabilityFrom: "NONE" })
  classify(@Req() req: any, @Param("id") id: string, @Body() body: unknown) { const dto = this.parse<{reason:string}>(classifyStaffSchema, body); return this.staff.classify(this.actor(req), id, dto.reason); }
  @Post("staff/:id/provision") @RequirePlatformPrincipal({ event: "STAFF_MUTATION_DENIED", sourceOperation: "platform.staff.provision", requestedCapabilityFrom: "NONE" })
  provision(@Req() req: any, @Param("id") id: string, @Body() body: unknown) { const dto = this.parse<{persona:MedoraStaffPersonaCode;reason:string;ticketReference?:string}>(provisionStaffSchema, body); return this.staff.provision(this.actor(req), id, dto.persona, dto.reason, dto.ticketReference); }
  @Post("staff/:id/activate") @RequirePlatformPrincipal({ event: "STAFF_MUTATION_DENIED", sourceOperation: "platform.staff.activate", requestedCapabilityFrom: "NONE" })
  activate(@Req() req: any, @Param("id") id: string, @Body() body: unknown) { const dto = this.parse<{reason:string;ticketReference?:string}>(staffLifecycleSchema, body); return this.staff.activate(this.actor(req), id, dto.reason, dto.ticketReference); }
  @Post("staff/:id/deactivate") @RequirePlatformPrincipal({ event: "STAFF_MUTATION_DENIED", sourceOperation: "platform.staff.deactivate", requestedCapabilityFrom: "NONE" })
  deactivate(@Req() req: any, @Param("id") id: string, @Body() body: unknown) { const dto = this.parse<{reason:string;ticketReference?:string}>(staffLifecycleSchema, body); return this.staff.deactivate(this.actor(req), id, dto.reason, dto.ticketReference); }
  @Post("staff/:id/persona") @RequirePlatformPrincipal({ event: "STAFF_MUTATION_DENIED", sourceOperation: "platform.staff.persona", requestedCapabilityFrom: "NONE" })
  persona(@Req() req: any, @Param("id") id: string, @Body() body: unknown) { const dto = this.parse<{persona:MedoraStaffPersonaCode;reason:string;ticketReference?:string}>(changePersonaSchema, body); return this.staff.changePersona(this.actor(req), id, dto.persona, dto.reason, dto.ticketReference); }
  @Post("staff/:id/capabilities") @RequirePlatformPrincipal({ event: "PLATFORM_CAPABILITY_GRANT_DENIED", sourceOperation: "platform.staff.capability.grant", requestedCapabilityFrom: "BODY" })
  grant(@Req() req: any, @Param("id") id: string, @Body() body: unknown) { const dto = this.parse<{code:PlatformCapabilityCode;reason:string;ticketReference?:string}>(grantCapabilitySchema, body); return this.staff.grant(this.actor(req), id, dto.code, dto.reason, dto.ticketReference); }
  @Delete("staff/:id/capabilities/:code") @RequirePlatformPrincipal({ event: "PLATFORM_CAPABILITY_REVOKE_DENIED", sourceOperation: "platform.staff.capability.revoke", requestedCapabilityFrom: "ROUTE" })
  revoke(@Req() req: any, @Param("id") id: string, @Param("code") code: PlatformCapabilityCode, @Body() body: unknown) { const dto = this.parse<{reason:string}>(revokeCapabilitySchema, body); return this.staff.revoke(this.actor(req), id, code, dto.reason); }
}
