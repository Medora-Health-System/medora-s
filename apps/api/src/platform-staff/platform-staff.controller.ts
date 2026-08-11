import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { createFacilityDtoSchema, facilityBillingIdentityPatchDtoSchema, facilityBillingWorkflowPatchDtoSchema, setFacilityLanguageDtoSchema, updateFacilityServiceConfigDtoSchema } from "@medora/shared";
import { AdminFacilitiesService } from "../admin/admin-facilities.service";
import { AuthGuard } from "@nestjs/passport";
import { changePersonaSchema, classifyStaffSchema, grantCapabilitySchema, provisionStaffSchema, revokeCapabilitySchema, staffLifecycleSchema } from "./dto/platform-staff.dto";
import { RequirePlatformCapabilities, RequirePlatformPrincipal } from "./platform-capabilities.decorator";
import { PlatformCapabilitiesGuard } from "./platform-capabilities.guard";
import type { MedoraStaffPersonaCode, PlatformCapabilityCode } from "./platform-capabilities";
import { PlatformStaffService } from "./platform-staff.service";
import { PLATFORM_CAPABILITY_CODES } from "./platform-capabilities";

@Controller("platform")
@UseGuards(AuthGuard("jwt"), PlatformCapabilitiesGuard)
export class PlatformStaffController {
  constructor(private readonly staff: PlatformStaffService, private readonly facilities: AdminFacilitiesService) {}
  private actor(req: any): string { return String(req.user?.userId ?? ""); }
  private parse<T>(schema: { safeParse(v: unknown): any }, body: unknown): T { const parsed = schema.safeParse(body); if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message ?? "Invalid request"); return parsed.data; }

  @Get("context") @RequirePlatformCapabilities([...PLATFORM_CAPABILITY_CODES], { mode: "ANY" })
  context(@Req() req: any) { return this.staff.getWorkspaceContext(this.actor(req)); }

  @Get("facilities") @RequirePlatformCapabilities(["FACILITY_CREATE", "FACILITY_CONFIGURE", "FACILITY_ACTIVATE", "FACILITY_HEALTH_VIEW"], { mode: "ANY" })
  listFacilities() { return this.staff.listPlatformFacilities(); }
  @Get("facilities/:id") @RequirePlatformCapabilities(["FACILITY_CREATE", "FACILITY_CONFIGURE", "FACILITY_ACTIVATE", "FACILITY_HEALTH_VIEW"], { mode: "ANY" })
  facility(@Param("id") id: string) { return this.staff.getPlatformFacility(id); }
  @Post("facilities") @RequirePlatformCapabilities(["FACILITY_CREATE"], { requireRecentMfa: true })
  createFacility(@Req() req:any, @Body() body:unknown) { const dto=this.parse<any>(createFacilityDtoSchema,body); return this.facilities.createForPlatformCapability(dto,this.actor(req)); }
  @Get("facilities/:id/configuration") @RequirePlatformCapabilities(["FACILITY_CONFIGURE"], { requireRecentMfa: true })
  async facilityConfiguration(@Req() req:any,@Param("id") id:string) { const actor=this.actor(req); const [facility,billingIdentity,billingWorkflow,departments]=await Promise.all([this.staff.getPlatformFacility(id),this.facilities.getBillingIdentityForPlatform(actor,id),this.facilities.getBillingWorkflowForPlatform(actor,id),this.facilities.listDepartmentsForPlatform(actor,id)]);return {facility,billingIdentity,billingWorkflow,departments:departments.items}; }
  @Patch("facilities/:id/language") @RequirePlatformCapabilities(["FACILITY_CONFIGURE"], { requireRecentMfa: true })
  language(@Req()req:any,@Param("id")id:string,@Body()body:unknown){const dto=this.parse<{defaultLanguage:"fr"|"en"}>(setFacilityLanguageDtoSchema,body);return this.facilities.setLanguageForPlatform(id,dto.defaultLanguage,this.actor(req));}
  @Patch("facilities/:id/service-config") @RequirePlatformCapabilities(["FACILITY_CONFIGURE"], { requireRecentMfa: true })
  serviceConfig(@Req()req:any,@Param("id")id:string,@Body()body:unknown){const dto=this.parse<any>(updateFacilityServiceConfigDtoSchema,body);return this.facilities.updateServiceConfigForPlatform(id,dto,this.actor(req));}
  @Patch("facilities/:id/billing-identity") @RequirePlatformCapabilities(["FACILITY_CONFIGURE"], { requireRecentMfa: true })
  billingIdentity(@Req()req:any,@Param("id")id:string,@Body()body:unknown){const dto=this.parse<any>(facilityBillingIdentityPatchDtoSchema,body);return this.facilities.updateBillingIdentityForPlatform(this.actor(req),id,dto);}
  @Patch("facilities/:id/billing-workflow") @RequirePlatformCapabilities(["FACILITY_CONFIGURE"], { requireRecentMfa: true })
  billingWorkflow(@Req()req:any,@Param("id")id:string,@Body()body:unknown){const dto=this.parse<any>(facilityBillingWorkflowPatchDtoSchema,body);return this.facilities.updateBillingWorkflowForPlatform(this.actor(req),id,dto);}

  @Get("staff") @RequirePlatformCapabilities(["STAFF_VIEW"], { requireRecentMfa: true })
  listStaff() { return this.staff.listStaff(); }
  @Get("eligible-users") @RequirePlatformCapabilities(["STAFF_PROVISION"], { requireRecentMfa: true })
  eligible(@Query("q") q?:string) { return this.staff.listEligibleUsers(q); }
  @Get("security/users") @RequirePlatformCapabilities(["SECURITY_MFA_RECOVERY"], { requireRecentMfa: true })
  securityUsers(@Query("q") q?:string){return this.staff.listSecurityUsers(q);}
  @Get("staff/:id") @RequirePlatformCapabilities(["STAFF_VIEW"], { requireRecentMfa: true })
  getStaff(@Param("id") id: string) { return this.staff.getStaff(id); }
  @Get("capabilities") @RequirePlatformCapabilities(["STAFF_VIEW", "STAFF_GRANT_CAPABILITIES"], { mode: "ANY", requireRecentMfa: true })
  listCapabilities() { return this.staff.listCapabilities(); }
  @Post("staff/:id/classification") @RequirePlatformPrincipal({ event: "MEDORA_STAFF_CLASSIFICATION_DENIED", sourceOperation: "platform.staff.classify", requestedCapabilityFrom: "NONE" })
  classify(@Req() req: any, @Param("id") id: string, @Body() body: unknown) { const dto = this.parse<{reason:string}>(classifyStaffSchema, body); return this.staff.classify(this.actor(req), id, dto.reason); }
  @Post("staff/:id/provision") @RequirePlatformPrincipal({ event: "STAFF_MUTATION_DENIED", sourceOperation: "platform.staff.provision", requestedCapabilityFrom: "NONE" })
  provision(@Req() req: any, @Param("id") id: string, @Body() body: unknown) { const dto = this.parse<{persona:MedoraStaffPersonaCode;reason:string;ticketReference?:string}>(provisionStaffSchema, body); return this.staff.provision(this.actor(req), id, dto.persona, dto.reason, dto.ticketReference); }
  @Post("staff/:id/activate") @RequirePlatformPrincipal({ event: "STAFF_MUTATION_DENIED", sourceOperation: "platform.staff.activate", requestedCapabilityFrom: "NONE" })
  activate(@Req() req: any, @Param("id") id: string, @Body() body: unknown) { const dto = this.parse<{reason:string;ticketReference?:string}>(staffLifecycleSchema, body); return this.staff.activate(this.actor(req), id, dto.reason, dto.ticketReference); }
  @Post("staff/:id/deactivate") @RequirePlatformCapabilities(["STAFF_PROVISION"], { requireRecentMfa: true, denialAudit: { event: "STAFF_MUTATION_DENIED", sourceOperation: "platform.staff.deactivate", requestedCapabilityFrom: "NONE" } })
  deactivate(@Req() req: any, @Param("id") id: string, @Body() body: unknown) { const dto = this.parse<{reason:string;ticketReference?:string}>(staffLifecycleSchema, body); return this.staff.deactivate(this.actor(req), id, dto.reason, dto.ticketReference); }
  @Post("staff/:id/persona") @RequirePlatformPrincipal({ event: "STAFF_MUTATION_DENIED", sourceOperation: "platform.staff.persona", requestedCapabilityFrom: "NONE" })
  persona(@Req() req: any, @Param("id") id: string, @Body() body: unknown) { const dto = this.parse<{persona:MedoraStaffPersonaCode;reason:string;ticketReference?:string}>(changePersonaSchema, body); return this.staff.changePersona(this.actor(req), id, dto.persona, dto.reason, dto.ticketReference); }
  @Post("staff/:id/capabilities") @RequirePlatformPrincipal({ event: "PLATFORM_CAPABILITY_GRANT_DENIED", sourceOperation: "platform.staff.capability.grant", requestedCapabilityFrom: "BODY" })
  grant(@Req() req: any, @Param("id") id: string, @Body() body: unknown) { const dto = this.parse<{code:PlatformCapabilityCode;reason:string;ticketReference?:string}>(grantCapabilitySchema, body); return this.staff.grant(this.actor(req), id, dto.code, dto.reason, dto.ticketReference); }
  @Delete("staff/:id/capabilities/:code") @RequirePlatformCapabilities(["STAFF_REVOKE_CAPABILITIES"], { requireRecentMfa: true, denialAudit: { event: "PLATFORM_CAPABILITY_REVOKE_DENIED", sourceOperation: "platform.staff.capability.revoke", requestedCapabilityFrom: "ROUTE" } })
  revoke(@Req() req: any, @Param("id") id: string, @Param("code") code: PlatformCapabilityCode, @Body() body: unknown) { const dto = this.parse<{reason:string}>(revokeCapabilitySchema, body); return this.staff.revoke(this.actor(req), id, code, dto.reason); }
}
