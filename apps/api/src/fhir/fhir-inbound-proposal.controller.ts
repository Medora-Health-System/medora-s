import { Body, Controller, Header, HttpCode, Post, Req, UseFilters, UseGuards, UseInterceptors } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { FhirContextGuard, FhirDeploymentGuard, type FhirRequestContext } from "./fhir-context.guard";
import { FhirInboundProposalService } from "./fhir-inbound-proposal.service";
import { FhirMediaInterceptor } from "./fhir-media.interceptor";
import { FhirOperationOutcomeFilter } from "./fhir-operation-outcome.filter";

@Controller("fhir")
@UseGuards(FhirDeploymentGuard, AuthGuard("fhir-client"), FhirContextGuard)
@UseFilters(FhirOperationOutcomeFilter)
@UseInterceptors(FhirMediaInterceptor)
export class FhirInboundProposalController {
  constructor(private readonly proposals: FhirInboundProposalService) {}

  /**
   * Medora-controlled staging operation. This does not create or update a canonical clinical record.
   * Every accepted resource is stored PENDING_REVIEW for later human-governed workflow handling.
   */
  @Post("$propose")
  @HttpCode(202)
  @Header("Content-Type", "application/fhir+json; charset=utf-8")
  @Header("Cache-Control", "no-store")
  stage(@Body() body: unknown, @Req() req: { fhirContext: FhirRequestContext }) {
    return this.proposals.stage(req.fhirContext, body);
  }
}
