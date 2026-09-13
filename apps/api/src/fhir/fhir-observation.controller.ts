import {
  Controller,
  Get,
  Header,
  Param,
  Query,
  Req,
  UseGuards,
  UseFilters,
  UseInterceptors,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleCode } from "@prisma/client";
import { assertZod } from "../common/http/zod-parse";
import { RequireRoles } from "../common/guards/roles.guard";
import {
  fhirObservationInstanceIdParamSchema,
  fhirObservationSearchQuerySchema,
  parseFhirObservationSearchRefs,
} from "./dto/fhir-read.schemas";
import { FhirResourceService } from "./fhir-resource.service";
import { FhirCapabilityRegistry } from "./fhir-capability.registry";
import { FhirContextGuard, FhirDeploymentGuard, FhirRequestContext } from "./fhir-context.guard";
import { FhirOperationOutcomeFilter } from "./fhir-operation-outcome.filter";
import { FhirMediaInterceptor } from "./fhir-media.interceptor";
import { parseStrictSearch } from "./fhir-protocol";
import { FhirCapabilityGuard, RequireFhirCapability } from "./fhir-capability.guard";
import { FhirMachineAuditInterceptor } from "./fhir-machine-audit.interceptor";

@Controller("fhir/Observation")
@UseGuards(FhirDeploymentGuard, AuthGuard(["jwt", "fhir-client"]), FhirContextGuard, FhirCapabilityGuard)
@UseFilters(FhirOperationOutcomeFilter)
@UseInterceptors(FhirMediaInterceptor, FhirMachineAuditInterceptor)
export class FhirObservationController {
  constructor(private readonly fhirResource: FhirResourceService, private readonly capabilities: FhirCapabilityRegistry) {}

  @Get()
  @Header("Content-Type", "application/fhir+json; charset=utf-8")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
  @RequireFhirCapability("Observation", "search-type")
  async search(
    @Query() query: Record<string, string | undefined>,
    @Req() req: { user?: { userId?: string; facilityId?: string }; ip?: string; headers?: Record<string, string | string[] | undefined> }
  ) {
    const facilityId = (req as typeof req & { fhirContext: FhirRequestContext }).fhirContext.facilityId;
    const allowed = this.capabilities.enabled().find((c) => c.resourceType === "Observation" && c.interaction === "search-type")?.searchParameters ?? [];
    parseStrictSearch(query, allowed);
    const q = assertZod(fhirObservationSearchQuerySchema.safeParse(query));
    const parsed = parseFhirObservationSearchRefs(q);
    return this.fhirResource.searchObservations(facilityId, parsed, req.user?.userId, req.ip, this.ua(req));
  }

  @Get(":id")
  @Header("Content-Type", "application/fhir+json; charset=utf-8")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)
  @RequireFhirCapability("Observation", "read")
  async read(
    @Param("id") id: string,
    @Req() req: { user?: { userId?: string; facilityId?: string }; ip?: string; headers?: Record<string, string | string[] | undefined> }
  ) {
    const facilityId = (req as typeof req & { fhirContext: FhirRequestContext }).fhirContext.facilityId;
    const opaqueId = assertZod(fhirObservationInstanceIdParamSchema.safeParse(id));
    return this.fhirResource.readObservationById(facilityId, opaqueId, req.user?.userId, req.ip, this.ua(req));
  }

  private ua(req: { headers?: Record<string, string | string[] | undefined> }): string | undefined {
    const h = req.headers?.["user-agent"];
    return typeof h === "string" ? h : Array.isArray(h) ? h[0] : undefined;
  }
}
