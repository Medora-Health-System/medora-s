import { Controller, Get, Header, Param, Query, Req, UseFilters, UseGuards, UseInterceptors } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleCode } from "@prisma/client";
import { RequireRoles } from "../common/guards/roles.guard";
import { FhirCapabilityGuard, RequireFhirCapability } from "./fhir-capability.guard";
import { FhirContextGuard, FhirDeploymentGuard, FhirRequestContext } from "./fhir-context.guard";
import { FhirDocumentReferenceService } from "./fhir-document-reference.service";
import { FhirMachineAuditInterceptor } from "./fhir-machine-audit.interceptor";
import { FhirMediaInterceptor } from "./fhir-media.interceptor";
import { FhirOperationOutcomeFilter } from "./fhir-operation-outcome.filter";

type Request = { fhirContext: FhirRequestContext };
const guards = [FhirDeploymentGuard, AuthGuard(["jwt", "fhir-client"]), FhirContextGuard, FhirCapabilityGuard];
const interceptors = [FhirMediaInterceptor, FhirMachineAuditInterceptor];
const clinicalRoles = [RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN] as const;

@Controller("fhir/DocumentReference")
@UseGuards(...guards)
@UseFilters(FhirOperationOutcomeFilter)
@UseInterceptors(...interceptors)
export class FhirDocumentReferenceController {
  constructor(private readonly documents: FhirDocumentReferenceService) {}

  @Get()
  @Header("Content-Type", "application/fhir+json; charset=utf-8")
  @Header("Cache-Control", "no-store")
  @RequireRoles(...clinicalRoles)
  @RequireFhirCapability("DocumentReference", "search-type")
  find(@Query() query: Record<string, unknown>, @Req() request: Request) {
    return this.documents.find(request.fhirContext.facilityId, query);
  }

  @Get(":id")
  @Header("Content-Type", "application/fhir+json; charset=utf-8")
  @Header("Cache-Control", "no-store")
  @RequireRoles(...clinicalRoles)
  @RequireFhirCapability("DocumentReference", "read")
  read(@Param("id") id: string, @Req() request: Request) {
    return this.documents.read(request.fhirContext.facilityId, id);
  }
}
