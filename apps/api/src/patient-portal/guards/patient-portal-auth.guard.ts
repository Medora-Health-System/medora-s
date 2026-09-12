import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { PatientPortalPrincipal } from "../auth/patient-portal.types";

@Injectable()
export class PatientPortalAuthGuard extends AuthGuard("patient-portal-jwt") {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const allowed = await super.canActivate(context);
    if (!allowed) return false;

    const request = context.switchToHttp().getRequest<{
      user?: PatientPortalPrincipal;
      patientPrincipal?: PatientPortalPrincipal;
    }>();

    if (request.user) {
      request.patientPrincipal = request.user;
      // Keep patient principals out of the staff `req.user` convention after passport validation.
      delete request.user;
    }
    return true;
  }
}
