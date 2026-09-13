import { CanActivate, ExecutionContext, ForbiddenException, Injectable, NotFoundException, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { RoleCode } from "@prisma/client";
import { FhirCapabilityRegistry, type FhirInteraction } from "./fhir-capability.registry";

export const FHIR_CAPABILITY_METADATA = "fhir-capability";
export type RequiredFhirCapability = { resourceType: import("./fhir-capability.registry").FhirCapability["resourceType"]; interaction: FhirInteraction };
export const RequireFhirCapability = (resourceType: RequiredFhirCapability["resourceType"], interaction: FhirInteraction) =>
  SetMetadata(FHIR_CAPABILITY_METADATA, { resourceType, interaction } satisfies RequiredFhirCapability);

/** Enforces one authoritative capability registry for human and machine callers. */
@Injectable()
export class FhirCapabilityGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly registry: FhirCapabilityRegistry) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<RequiredFhirCapability>(FHIR_CAPABILITY_METADATA, [context.getHandler(), context.getClass()]);
    if (!required) throw new ForbiddenException("FHIR capability policy is required");
    const request = context.switchToHttp().getRequest();
    const capability = this.registry.enabled(request.fhirContext?.jurisdiction).find((entry) => entry.resourceType === required.resourceType && entry.interaction === required.interaction);
    if (!capability) throw new NotFoundException("FHIR interaction is disabled");

    if (request.fhirContext?.actorType === "machine") {
      const scopes = Array.isArray(request.fhirContext.scopes) ? request.fhirContext.scopes : [];
      if (!scopes.includes(capability.futureM2mScope)) throw new ForbiddenException("FHIR machine scope is not authorized");
      request.fhirCapability = capability;
      return true;
    }

    const role = (request.fhirContext?.role ?? request.userRole) as RoleCode | undefined;
    if (!role || !capability.humanRoles.includes(role)) throw new ForbiddenException("FHIR capability is not permitted for this role");
    request.fhirCapability = capability;
    return true;
  }
}
