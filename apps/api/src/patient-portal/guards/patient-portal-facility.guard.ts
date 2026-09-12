import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { PatientPortalRepository } from "../persistence/patient-portal.repository";
import type {
  PatientPortalAccessContext,
  PatientPortalPrincipal,
} from "../auth/patient-portal.types";

@Injectable()
export class PatientPortalFacilityGuard implements CanActivate {
  constructor(private readonly repo: PatientPortalRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      params?: Record<string, string>;
      patientPrincipal?: PatientPortalPrincipal;
      patientAccess?: PatientPortalAccessContext;
    }>();

    const principal = request.patientPrincipal;
    const facilityId = request.params?.facilityId;
    if (!principal || !facilityId) {
      throw new ForbiddenException("Patient facility access denied");
    }

    const link = await this.repo.findVerifiedFacilityLink(
      principal.portalAccountId,
      facilityId
    );
    if (!link) {
      throw new ForbiddenException("Patient facility access denied");
    }

    request.patientAccess = {
      portalAccountId: principal.portalAccountId,
      sessionId: principal.sessionId,
      patientId: link.patientId,
      facilityId: link.facilityId,
    };
    return true;
  }
}
