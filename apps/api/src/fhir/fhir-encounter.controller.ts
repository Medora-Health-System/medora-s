import { Controller, Get, Header, Param, Query, Req, UseFilters, UseGuards, UseInterceptors } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleCode } from "@prisma/client";
import { assertZod } from "../common/http/zod-parse";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { fhirResourceIdParamSchema } from "./dto/fhir-read.schemas";
import { FhirResourceService } from "./fhir-resource.service";
import { FhirContextGuard, FhirDeploymentGuard, FhirRequestContext } from "./fhir-context.guard";
import { FhirOperationOutcomeFilter } from "./fhir-operation-outcome.filter";
import { FhirMediaInterceptor } from "./fhir-media.interceptor";
import { FhirCapabilityGuard, RequireFhirCapability } from "./fhir-capability.guard";

@Controller("fhir/Encounter")
@UseGuards(FhirDeploymentGuard, AuthGuard("jwt"), RolesGuard, FhirContextGuard, FhirCapabilityGuard)
@UseFilters(FhirOperationOutcomeFilter)
@UseInterceptors(FhirMediaInterceptor)
export class FhirEncounterController {
  constructor(private readonly fhirResource: FhirResourceService) {}

  /** FHIR R4 instance read: `GET [base]/Encounter/{id}` */
  @Get(":id")
  @Header("Content-Type", "application/fhir+json; charset=utf-8")
  @Header("Cache-Control", "no-store")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN, RoleCode.FRONT_DESK)
  @RequireFhirCapability("Encounter", "read")
  async read(@Param("id") id: string, @Req() req: { user?: { userId?: string; facilityId?: string }; ip?: string; headers?: Record<string, string | string[] | undefined> }) {
    const facilityId = (req as typeof req & { fhirContext: FhirRequestContext }).fhirContext.facilityId;
    const validId = assertZod(fhirResourceIdParamSchema.safeParse(id));
    return this.fhirResource.readEncounter(facilityId, validId, req.user?.userId, req.ip, this.ua(req));
  }

  @Get()
  @Header("Cache-Control", "no-store")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN, RoleCode.FRONT_DESK)
  @RequireFhirCapability("Encounter", "search-type")
  search(@Query() query: Record<string, unknown>, @Req() req: { fhirContext: FhirRequestContext }) {
    return this.fhirResource.searchEncounters(req.fhirContext.facilityId, query);
  }

  private ua(req: { headers?: Record<string, string | string[] | undefined> }): string | undefined {
    const h = req.headers?.["user-agent"];
    return typeof h === "string" ? h : Array.isArray(h) ? h[0] : undefined;
  }

}
