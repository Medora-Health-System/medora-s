import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { mergeMap, Observable } from "rxjs";
import { FhirMachineIdentityService, type FhirMachinePrincipal } from "./fhir-machine-identity.service";

@Injectable()
export class FhirMachineAuditInterceptor implements NestInterceptor {
  constructor(private readonly identities: FhirMachineIdentityService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    return next.handle().pipe(mergeMap(async (body) => {
      if (request.fhirContext?.actorType === "machine" && request.user?.principalType === "fhir-client" && request.fhirCapability) {
        await this.identities.auditAccess(
          request.user as FhirMachinePrincipal,
          request.fhirCapability.resourceType,
          request.fhirCapability.interaction,
          request.requestId,
        );
      }
      return body;
    }));
  }
}
