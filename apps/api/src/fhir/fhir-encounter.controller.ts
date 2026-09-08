import { Controller, Get, Header, Param, Req, UseFilters, UseGuards, UseInterceptors } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleCode } from "@prisma/client";
import { assertZod } from "../common/http/zod-parse";
import { RolesGuard, RequireRoles } from "../common/guards/roles.guard";
import { fhirResourceIdParamSchema } from "./dto/fhir-read.schemas";
import { FhirResourceService } from "./fhir-resource.service";
import { FhirContextGuard, FhirDeploymentGuard, FhirRequestContext } from "./fhir-context.guard";
import { FhirOperationOutcomeFilter } from "./fhir-operation-outcome.filter";
import { FhirMediaInterceptor } from "./fhir-media.interceptor";

@Controller("fhir/Encounter")
@UseGuards(FhirDeploymentGuard, AuthGuard("jwt"), RolesGuard, FhirContextGuard)
@UseFilters(FhirOperationOutcomeFilter)
@UseInterceptors(FhirMediaInterceptor)
export class FhirEncounterController {
  constructor(private readonly fhirResource: FhirResourceService) {}

  /** FHIR R4 instance read: `GET [base]/Encounter/{id}` */
  @Get(":id")
  @Header("Content-Type", "application/fhir+json; charset=utf-8")
  @RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN, RoleCode.FRONT_DESK)
  async read(@Param("id") id: string, @Req() req: { user?: { userId?: string; facilityId?: string }; ip?: string; headers?: Record<string, string | string[] | undefined> }) {
    const facilityId = (req as typeof req & { fhirContext: FhirRequestContext }).fhirContext.facilityId;
    const validId = assertZod(fhirResourceIdParamSchema.safeParse(id));
    return this.fhirResource.readEncounter(facilityId, validId, req.user?.userId, req.ip, this.ua(req));
  }

  private ua(req: { headers?: Record<string, string | string[] | undefined> }): string | undefined {
    const h = req.headers?.["user-agent"];
    return typeof h === "string" ? h : Array.isArray(h) ? h[0] : undefined;
  }

}
