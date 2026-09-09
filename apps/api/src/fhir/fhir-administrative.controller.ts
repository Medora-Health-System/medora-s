import { Controller, Get, Header, NotFoundException, Param, Query, Req, UseFilters, UseGuards, UseInterceptors } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleCode } from "@prisma/client";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { FhirAdministrativeService } from "./fhir-administrative.service";
import { FhirCapabilityGuard, RequireFhirCapability } from "./fhir-capability.guard";
import { FhirContextGuard, FhirDeploymentGuard, FhirRequestContext } from "./fhir-context.guard";
import { FhirMediaInterceptor } from "./fhir-media.interceptor";
import { FhirOperationOutcomeFilter } from "./fhir-operation-outcome.filter";
import { parseLogicalId } from "./fhir-protocol";

const TYPES = ["Practitioner", "PractitionerRole", "Organization", "Location"] as const;
type Type = (typeof TYPES)[number];

@Controller("fhir")
@UseGuards(FhirDeploymentGuard, AuthGuard("jwt"), RolesGuard, FhirContextGuard, FhirCapabilityGuard)
@UseFilters(FhirOperationOutcomeFilter)
@UseInterceptors(FhirMediaInterceptor)
export class FhirAdministrativeController {
  constructor(private readonly service: FhirAdministrativeService) {}
  @Get(":type/:id") @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN) @RequireFhirCapability(":type" as never, "read")
  read(@Param("type") raw: string, @Param("id") id: string, @Req() req: { fhirContext: FhirRequestContext }) { const type = this.type(raw); return this.service.read(type, parseLogicalId(id), req.fhirContext.facilityId); }
  @Get(":type") @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN) @RequireFhirCapability(":type" as never, "search-type")
  find(@Param("type") raw: string, @Query() query: Record<string, unknown>, @Req() req: { fhirContext: FhirRequestContext }) { const type = this.type(raw); return this.service.find(type, req.fhirContext.facilityId, query); }
  private type(raw: string): Type { if (!(TYPES as readonly string[]).includes(raw)) throw new NotFoundException("Resource not found"); return raw as Type; }
}
