import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { PatientPortalPrincipal } from "../auth/patient-portal.types";
import { PatientPortalAuthGuard } from "../guards/patient-portal-auth.guard";
import { PatientSessionSecurityService } from "./patient-session-security.service";

@Controller("patient/v1/security")
@UseGuards(PatientPortalAuthGuard)
export class PatientSessionSecurityController {
  constructor(private readonly security: PatientSessionSecurityService) {}

  private principal(req: any): PatientPortalPrincipal {
    const principal = req.patientPrincipal as PatientPortalPrincipal | undefined;
    if (!principal) throw new BadRequestException("Patient principal missing");
    return principal;
  }

  private requestContext(req: any) {
    return {
      ip: req.ip as string | undefined,
      userAgent: req.headers?.["user-agent"] as string | undefined,
    };
  }

  @Get("sessions")
  async listSessions(@Req() req: any) {
    return this.security.listActiveSessions(this.principal(req));
  }

  @Delete("sessions/:sessionId")
  async revokeSession(@Param("sessionId") sessionId: string, @Req() req: any) {
    return this.security.revokeSession(
      this.principal(req),
      sessionId,
      this.requestContext(req),
    );
  }

  @Post("sessions/revoke-others")
  async revokeOtherSessions(@Req() req: any) {
    return this.security.revokeOtherSessions(
      this.principal(req),
      this.requestContext(req),
    );
  }
}
