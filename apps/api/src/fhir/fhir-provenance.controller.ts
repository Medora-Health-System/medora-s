import { Controller, Get, Header, Param, Query, Req, UseFilters, UseGuards, UseInterceptors } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleCode } from "@prisma/client";
import { RequireRoles } from "../common/guards/roles.guard";
import { FhirCapabilityGuard, RequireFhirCapability } from "./fhir-capability.guard";
import { FhirContextGuard, FhirDeploymentGuard, FhirRequestContext } from "./fhir-context.guard";
import { FhirMachineAuditInterceptor } from "./fhir-machine-audit.interceptor";
import { FhirMediaInterceptor } from "./fhir-media.interceptor";
import { FhirOperationOutcomeFilter } from "./fhir-operation-outcome.filter";
import { FhirProvenanceService } from "./fhir-provenance.service";

type Request = { fhirContext: FhirRequestContext };
const guards = [FhirDeploymentGuard, AuthGuard(["jwt", "fhir-client"]), FhirContextGuard, FhirCapabilityGuard];
const interceptors = [FhirMediaInterceptor, FhirMachineAuditInterceptor];
const clinicalRoles = [RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN] as const;

@Controller("fhir/Provenance")
@UseGuards(...guards)
@UseFilters(FhirOperationOutcomeFilter)
@UseInterceptors(...interceptors)
export class FhirProvenanceController {
  constructor(private readonly provenance: FhirProvenanceService) {}

  @Get()
  @Header("Content-Type", "application/fhir+json; charset=utf-8")
  @Header("Cache-Control", "no-store")
  @RequireRoles(...clinicalRoles)
  @RequireFhirCapability("Provenance", "search-type")
  find(@Query() query: Record<string, unknown>, @Req() request: Request) {
    return this.provenance.find(request.fhirContext.facilityId, query);
  }

  @Get(":id")
  @Header("Content-Type", "application/fhir+json; charset=utf-8")
  @Header("Cache-Control", "no-store")
  @RequireRoles(...clinicalRoles)
  @RequireFhirCapability("Provenance", "read")
  read(@Param("id") id: string, @Req() request: Request) {
    return this.provenance.read(request.fhirContext.facilityId, id);
  }
}
