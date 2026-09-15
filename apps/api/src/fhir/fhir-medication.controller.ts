import { Controller, Get, Header, Param, Query, Req, UseFilters, UseGuards, UseInterceptors } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleCode } from "@prisma/client";
import { RequireRoles } from "../common/guards/roles.guard";
import { FhirCapabilityGuard, RequireFhirCapability } from "./fhir-capability.guard";
import { FhirContextGuard, FhirDeploymentGuard, FhirRequestContext } from "./fhir-context.guard";
import { FhirMachineAuditInterceptor } from "./fhir-machine-audit.interceptor";
import { FhirMediaInterceptor } from "./fhir-media.interceptor";
import { FhirMedicationService } from "./fhir-medication.service";
import { FhirOperationOutcomeFilter } from "./fhir-operation-outcome.filter";

type Request = { fhirContext: FhirRequestContext };
const guards = [FhirDeploymentGuard, AuthGuard(["jwt", "fhir-client"]), FhirContextGuard, FhirCapabilityGuard];
const interceptors = [FhirMediaInterceptor, FhirMachineAuditInterceptor];
const clinicalRoles = [RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN] as const;

@Controller("fhir/MedicationRequest")
@UseGuards(...guards)
@UseFilters(FhirOperationOutcomeFilter)
@UseInterceptors(...interceptors)
export class FhirMedicationRequestController {
  constructor(private readonly medications: FhirMedicationService) {}

  @Get()
  @Header("Content-Type", "application/fhir+json; charset=utf-8")
  @Header("Cache-Control", "no-store")
  @RequireRoles(...clinicalRoles)
  @RequireFhirCapability("MedicationRequest", "search-type")
  find(@Query() query: Record<string, unknown>, @Req() request: Request) {
    return this.medications.findRequests(request.fhirContext.facilityId, query);
  }

  @Get(":id")
  @Header("Content-Type", "application/fhir+json; charset=utf-8")
  @Header("Cache-Control", "no-store")
  @RequireRoles(...clinicalRoles)
  @RequireFhirCapability("MedicationRequest", "read")
  read(@Param("id") id: string, @Req() request: Request) {
    return this.medications.readRequest(request.fhirContext.facilityId, id);
  }
}

@Controller("fhir/MedicationAdministration")
@UseGuards(...guards)
@UseFilters(FhirOperationOutcomeFilter)
@UseInterceptors(...interceptors)
export class FhirMedicationAdministrationController {
  constructor(private readonly medications: FhirMedicationService) {}

  @Get()
  @Header("Content-Type", "application/fhir+json; charset=utf-8")
  @Header("Cache-Control", "no-store")
  @RequireRoles(...clinicalRoles)
  @RequireFhirCapability("MedicationAdministration", "search-type")
  find(@Query() query: Record<string, unknown>, @Req() request: Request) {
    return this.medications.findAdministrations(request.fhirContext.facilityId, query);
  }

  @Get(":id")
  @Header("Content-Type", "application/fhir+json; charset=utf-8")
  @Header("Cache-Control", "no-store")
  @RequireRoles(...clinicalRoles)
  @RequireFhirCapability("MedicationAdministration", "read")
  read(@Param("id") id: string, @Req() request: Request) {
    return this.medications.readAdministration(request.fhirContext.facilityId, id);
  }
}
