import { Controller, Get, Header, Param, Query, Req, UseFilters, UseGuards, UseInterceptors } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { FhirCapabilityGuard, RequireFhirCapability } from "./fhir-capability.guard";
import { FhirContextGuard, FhirDeploymentGuard, type FhirRequestContext } from "./fhir-context.guard";
import { FhirMachineAuditInterceptor } from "./fhir-machine-audit.interceptor";
import { FhirMediaInterceptor } from "./fhir-media.interceptor";
import { FhirOperationOutcomeFilter } from "./fhir-operation-outcome.filter";
import { FhirProvenanceService } from "./fhir-provenance.service";

@Controller("fhir/Provenance")
@UseGuards(FhirDeploymentGuard, AuthGuard(["jwt", "fhir-client"]), FhirContextGuard, FhirCapabilityGuard)
@UseFilters(FhirOperationOutcomeFilter)
@UseInterceptors(FhirMediaInterceptor, FhirMachineAuditInterceptor)
export class FhirProvenanceController {
  constructor(private readonly provenance: FhirProvenanceService) {}

  @Get(":id")
  @Header("Content-Type", "application/fhir+json; charset=utf-8")
  @RequireFhirCapability("Provenance", "read")
  read(@Param("id") id: string, @Req() req: { fhirContext: FhirRequestContext }) {
    return this.provenance.read(req.fhirContext.facilityId, id);
  }

  @Get()
  @Header("Content-Type", "application/fhir+json; charset=utf-8")
  @RequireFhirCapability("Provenance", "search-type")
  search(@Query() query: Record<string, unknown>, @Req() req: { fhirContext: FhirRequestContext }) {
    return this.provenance.searchProvenance(req.fhirContext.facilityId, query);
  }
}
