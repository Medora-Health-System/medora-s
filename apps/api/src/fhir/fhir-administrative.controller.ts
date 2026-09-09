import { Controller, Get, Param, Query, Req, UseFilters, UseGuards, UseInterceptors } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleCode } from "@prisma/client";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { FhirAdministrativeService } from "./fhir-administrative.service";
import { FhirCapabilityGuard, RequireFhirCapability } from "./fhir-capability.guard";
import { FhirContextGuard, FhirDeploymentGuard, FhirRequestContext } from "./fhir-context.guard";
import { FhirMediaInterceptor } from "./fhir-media.interceptor";
import { FhirOperationOutcomeFilter } from "./fhir-operation-outcome.filter";
import { parseLogicalId } from "./fhir-protocol";

const guards = [FhirDeploymentGuard, AuthGuard("jwt"), RolesGuard, FhirContextGuard, FhirCapabilityGuard];
const roles = [RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN];
type Request = { fhirContext: FhirRequestContext };
type Query = Record<string, unknown>;

@Controller("fhir/Practitioner") @UseGuards(...guards) @UseFilters(FhirOperationOutcomeFilter) @UseInterceptors(FhirMediaInterceptor)
export class FhirPractitionerController {
  constructor(private readonly service: FhirAdministrativeService) {}
  @Get(":id") @RequireRoles(...roles) @RequireFhirCapability("Practitioner", "read")
  read(@Param("id") id: string, @Req() req: Request) { return this.service.read("Practitioner", parseLogicalId(id), req.fhirContext.facilityId); }
  @Get() @RequireRoles(...roles) @RequireFhirCapability("Practitioner", "search-type")
  find(@Query() query: Query, @Req() req: Request) { return this.service.find("Practitioner", req.fhirContext.facilityId, query); }
}

@Controller("fhir/PractitionerRole") @UseGuards(...guards) @UseFilters(FhirOperationOutcomeFilter) @UseInterceptors(FhirMediaInterceptor)
export class FhirPractitionerRoleController {
  constructor(private readonly service: FhirAdministrativeService) {}
  @Get(":id") @RequireRoles(...roles) @RequireFhirCapability("PractitionerRole", "read")
  read(@Param("id") id: string, @Req() req: Request) { return this.service.read("PractitionerRole", parseLogicalId(id), req.fhirContext.facilityId); }
  @Get() @RequireRoles(...roles) @RequireFhirCapability("PractitionerRole", "search-type")
  find(@Query() query: Query, @Req() req: Request) { return this.service.find("PractitionerRole", req.fhirContext.facilityId, query); }
}

@Controller("fhir/Organization") @UseGuards(...guards) @UseFilters(FhirOperationOutcomeFilter) @UseInterceptors(FhirMediaInterceptor)
export class FhirOrganizationController {
  constructor(private readonly service: FhirAdministrativeService) {}
  @Get(":id") @RequireRoles(...roles) @RequireFhirCapability("Organization", "read")
  read(@Param("id") id: string, @Req() req: Request) { return this.service.read("Organization", parseLogicalId(id), req.fhirContext.facilityId); }
  @Get() @RequireRoles(...roles) @RequireFhirCapability("Organization", "search-type")
  find(@Query() query: Query, @Req() req: Request) { return this.service.find("Organization", req.fhirContext.facilityId, query); }
}

@Controller("fhir/Location") @UseGuards(...guards) @UseFilters(FhirOperationOutcomeFilter) @UseInterceptors(FhirMediaInterceptor)
export class FhirLocationController {
  constructor(private readonly service: FhirAdministrativeService) {}
  @Get(":id") @RequireRoles(...roles) @RequireFhirCapability("Location", "read")
  read(@Param("id") id: string, @Req() req: Request) { return this.service.read("Location", parseLogicalId(id), req.fhirContext.facilityId); }
  @Get() @RequireRoles(...roles) @RequireFhirCapability("Location", "search-type")
  find(@Query() query: Query, @Req() req: Request) { return this.service.find("Location", req.fhirContext.facilityId, query); }
}
