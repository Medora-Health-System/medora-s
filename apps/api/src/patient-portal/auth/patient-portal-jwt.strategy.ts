import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PatientPortalRepository } from "../persistence/patient-portal.repository";
import type { PatientPortalJwtPayload, PatientPortalPrincipal } from "./patient-portal.types";

@Injectable()
export class PatientPortalJwtStrategy extends PassportStrategy(Strategy, "patient-portal-jwt") {
  constructor(
    config: ConfigService,
    private readonly portalRepo: PatientPortalRepository
  ) {
    const secret = config.get<string>("PATIENT_PORTAL_JWT_ACCESS_SECRET");
    if (!secret) {
      throw new Error("PATIENT_PORTAL_JWT_ACCESS_SECRET is required when PatientPortalModule is enabled");
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      issuer: config.get<string>("PATIENT_PORTAL_TOKEN_ISSUER") ?? "medora-patient",
    });
  }

  async validate(payload: PatientPortalJwtPayload): Promise<PatientPortalPrincipal> {
    if (
      !payload ||
      payload.type !== "patient_access" ||
      payload.principal !== "patient" ||
      !payload.sub ||
      !payload.sid
    ) {
      throw new UnauthorizedException("Invalid patient portal token");
    }

    const account = await this.portalRepo.findAccountById(payload.sub);
    if (!account || account.status !== "ACTIVE") {
      throw new UnauthorizedException("Patient portal account not active");
    }
    if (account.lockedUntil && account.lockedUntil.getTime() > Date.now()) {
      throw new UnauthorizedException("Patient portal account locked");
    }

    const session = await this.portalRepo.findActiveSession(payload.sid, payload.sub);
    if (!session) {
      throw new UnauthorizedException("Patient portal session not active");
    }

    return {
      portalAccountId: account.id,
      sessionId: session.id,
    };
  }
}
