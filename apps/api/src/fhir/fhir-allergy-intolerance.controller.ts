import { Controller, Get, Header, Param, Query, Req, UseFilters, UseGuards, UseInterceptors } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { FhirCapabilityGuard, RequireFhirCapability } from "./fhir-capability.guard";
import { FhirContextGuard, FhirDeploymentGuard, FhirRequestContext } from "./fhir-context.guard";
import { FhirMediaInterceptor } from "./fhir-media.interceptor";
import { FhirOperationOutcomeFilter } from "./fhir-operation-outcome.filter";
import { FhirMachineAuditInterceptor } from "./fhir-machine-audit.interceptor";
import { FhirAllergyIntoleranceService } from "./fhir-allergy-intolerance.service";

type Request = { fhirContext: FhirRequestContext };

@Controller("fhir/AllergyIntolerance")
@UseGuards(FhirDeploymentGuard, AuthGuard(["jwt", "fhir-client"]), FhirContextGuard, FhirCapabilityGuard)
@UseFilters(FhirOperationOutcomeFilter)
@UseInterceptors(FhirMediaInterceptor, FhirMachineAuditInterceptor)
export class FhirAllergyIntoleranceController {
  constructor(private readonly allergies: FhirAllergyIntoleranceService) {}

  @Get()
  @Header("Content-Type", "application/fhir+json; charset=utf-8")
  @RequireFhirCapability("AllergyIntolerance", "search-type")
  find(@Query() query: Record<string, unknown>, @Req() request: Request) {
    return this.allergies.find(request.fhirContext.facilityId, query);
  }

  @Get(":id")
  @Header("Content-Type", "application/fhir+json; charset=utf-8")
  @RequireFhirCapability("AllergyIntolerance", "read")
  read(@Param("id") id: string, @Req() request: Request) {
    return this.allergies.read(request.fhirContext.facilityId, id);
  }
}
