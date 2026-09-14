import { Controller, Get, Header, Param, Query, Req, UseFilters, UseGuards, UseInterceptors } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { FhirCapabilityGuard, RequireFhirCapability } from "./fhir-capability.guard";
import { FhirContextGuard, FhirDeploymentGuard, FhirRequestContext } from "./fhir-context.guard";
import { FhirMediaInterceptor } from "./fhir-media.interceptor";
import { FhirOperationOutcomeFilter } from "./fhir-operation-outcome.filter";
import { FhirMachineAuditInterceptor } from "./fhir-machine-audit.interceptor";
import { ClinicalResourceType, FhirClinicalService } from "./fhir-clinical.service";

type Request = { fhirContext: FhirRequestContext };
const guards = [FhirDeploymentGuard, AuthGuard(["jwt", "fhir-client"]), FhirContextGuard, FhirCapabilityGuard];
const interceptors = [FhirMediaInterceptor, FhirMachineAuditInterceptor];

abstract class ClinicalController {
  abstract readonly resourceType: ClinicalResourceType;
  constructor(protected readonly clinical: FhirClinicalService) {}
  search(q: Record<string, unknown>, r: Request) { return this.clinical.find(this.resourceType, r.fhirContext.facilityId, q); }
  read(id: string, r: Request) { return this.clinical.read(this.resourceType, r.fhirContext.facilityId, id); }
}

function secure(target: Function) {
  UseGuards(...guards)(target);
  UseFilters(FhirOperationOutcomeFilter)(target);
  UseInterceptors(...interceptors)(target);
}

@Controller("fhir/Condition")
export class FhirConditionController extends ClinicalController {
  readonly resourceType = "Condition" as const;
  constructor(clinical: FhirClinicalService) { super(clinical); }
  @Get() @Header("Content-Type", "application/fhir+json; charset=utf-8") @RequireFhirCapability("Condition", "search-type")
  find(@Query() q: Record<string, unknown>, @Req() r: Request) { return this.search(q, r); }
  @Get(":id") @Header("Content-Type", "application/fhir+json; charset=utf-8") @RequireFhirCapability("Condition", "read")
  get(@Param("id") id: string, @Req() r: Request) { return this.read(id, r); }
}
secure(FhirConditionController);

@Controller("fhir/ServiceRequest")
export class FhirServiceRequestController extends ClinicalController {
  readonly resourceType = "ServiceRequest" as const;
  constructor(clinical: FhirClinicalService) { super(clinical); }
  @Get() @Header("Content-Type", "application/fhir+json; charset=utf-8") @RequireFhirCapability("ServiceRequest", "search-type")
  find(@Query() q: Record<string, unknown>, @Req() r: Request) { return this.search(q, r); }
  @Get(":id") @Header("Content-Type", "application/fhir+json; charset=utf-8") @RequireFhirCapability("ServiceRequest", "read")
  get(@Param("id") id: string, @Req() r: Request) { return this.read(id, r); }
}
secure(FhirServiceRequestController);

@Controller("fhir/DiagnosticReport")
export class FhirDiagnosticReportController extends ClinicalController {
  readonly resourceType = "DiagnosticReport" as const;
  constructor(clinical: FhirClinicalService) { super(clinical); }
  @Get() @Header("Content-Type", "application/fhir+json; charset=utf-8") @RequireFhirCapability("DiagnosticReport", "search-type")
  find(@Query() q: Record<string, unknown>, @Req() r: Request) { return this.search(q, r); }
  @Get(":id") @Header("Content-Type", "application/fhir+json; charset=utf-8") @RequireFhirCapability("DiagnosticReport", "read")
  get(@Param("id") id: string, @Req() r: Request) { return this.read(id, r); }
}
secure(FhirDiagnosticReportController);

@Controller("fhir/CarePlan")
export class FhirCarePlanController extends ClinicalController {
  readonly resourceType = "CarePlan" as const;
  constructor(clinical: FhirClinicalService) { super(clinical); }
  @Get() @Header("Content-Type", "application/fhir+json; charset=utf-8") @RequireFhirCapability("CarePlan", "search-type")
  find(@Query() q: Record<string, unknown>, @Req() r: Request) { return this.search(q, r); }
  @Get(":id") @Header("Content-Type", "application/fhir+json; charset=utf-8") @RequireFhirCapability("CarePlan", "read")
  get(@Param("id") id: string, @Req() r: Request) { return this.read(id, r); }
}
secure(FhirCarePlanController);
