import { CanActivate, ExecutionContext, ForbiddenException, Injectable, NotFoundException, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { RoleCode } from "@prisma/client";
import { FhirCapabilityRegistry, type FhirInteraction } from "./fhir-capability.registry";

export const FHIR_CAPABILITY_METADATA = "fhir-capability";
export type RequiredFhirCapability = { resourceType: "Patient" | "Encounter" | "Observation"; interaction: FhirInteraction };
export const RequireFhirCapability = (resourceType: RequiredFhirCapability["resourceType"], interaction: FhirInteraction) =>
  SetMetadata(FHIR_CAPABILITY_METADATA, { resourceType, interaction } satisfies RequiredFhirCapability);

/** Enforces the same registry entry used by metadata and integration permission options. */
@Injectable()
export class FhirCapabilityGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly registry: FhirCapabilityRegistry) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<RequiredFhirCapability>(FHIR_CAPABILITY_METADATA, [context.getHandler(), context.getClass()]);
    if (!required) throw new ForbiddenException("FHIR capability policy is required");
    const request = context.switchToHttp().getRequest();
    const capability = this.registry.enabled(request.fhirContext?.jurisdiction).find((entry) => entry.resourceType === required.resourceType && entry.interaction === required.interaction);
    if (!capability) throw new NotFoundException("FHIR interaction is disabled");
    const role = request.userRole as RoleCode | undefined;
    if (!role || !capability.humanRoles.includes(role)) throw new ForbiddenException("FHIR capability is not permitted for this role");
    request.fhirCapability = capability;
    return true;
  }
}
