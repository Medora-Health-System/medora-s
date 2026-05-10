/**
 * Phase 9 — Guards for MFA-grant–scoped endpoints.
 *
 * Two custom NestJS guards. They do **not** participate in the normal Passport
 * JWT flow because the tokens they accept have a non-`access` `type` claim
 * that `JwtStrategy` deliberately rejects.
 *
 * `MfaChallengeGuard`
 *   Accepts only `type === "mfa_challenge"` JWTs. Used by `POST /auth/mfa/verify`
 *   to bind the challenge token to the verification call.
 *
 * `MfaEnrollmentGuard`
 *   Accepts both `type === "access"` (a normal logged-in user) and
 *   `type === "mfa_enrollment"` (a user forced to enroll at login). Used by
 *   the enrollment endpoints so an already-logged-in user can enable MFA
 *   voluntarily AND a forced-enrollment user can complete enrollment.
 *
 * Both guards attach `{ userId, username, viaMfaGrant }` to `req.user`. They do
 * **not** consult `UserRole` — facility-scoped checks remain the job of
 * `RolesGuard` for endpoints that need them.
 */

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import {
  MFA_CHALLENGE_TYPE,
  MFA_ENROLLMENT_TYPE,
  type MfaGrantPayload,
  verifyMfaGrant,
} from "./mfa-challenge.util";

type AccessJwtPayload = { sub: string; username: string; type: "access" | "refresh"; iss: string };

function extractBearer(req: Request): string | null {
  const h = req.headers["authorization"];
  if (!h || typeof h !== "string") return null;
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m ? m[1]!.trim() : null;
}

@Injectable()
export class MfaChallengeGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();

    // Token may also live in the JSON body (mfa-verify uses POST body), but the
    // Bearer header is preferred / standard. We accept either.
    const headerToken = extractBearer(req);
    const bodyToken = (req.body as { challengeToken?: unknown } | undefined)?.challengeToken;
    const token =
      headerToken ?? (typeof bodyToken === "string" && bodyToken.length > 0 ? bodyToken : null);
    if (!token) throw new UnauthorizedException("Jeton de défi requis.");

    const refreshSecret = this.config.get<string>("JWT_REFRESH_SECRET");
    const issuer = this.config.get<string>("TOKEN_ISSUER") ?? "medora-s";
    if (!refreshSecret) throw new UnauthorizedException("Configuration manquante.");

    let payload: MfaGrantPayload;
    try {
      payload = verifyMfaGrant(this.jwt, token, refreshSecret, issuer, MFA_CHALLENGE_TYPE);
    } catch {
      throw new UnauthorizedException("Jeton de défi invalide ou expiré.");
    }

    (req as Request & { user?: unknown }).user = {
      userId: payload.sub,
      username: payload.username,
      viaMfaGrant: MFA_CHALLENGE_TYPE,
    };
    return true;
  }
}

@Injectable()
export class MfaEnrollmentGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();

    const headerToken = extractBearer(req);
    const bodyToken = (req.body as { enrollmentToken?: unknown } | undefined)?.enrollmentToken;

    // First try the Bearer header as a normal access token.
    const accessSecret = this.config.get<string>("JWT_ACCESS_SECRET");
    const refreshSecret = this.config.get<string>("JWT_REFRESH_SECRET");
    const issuer = this.config.get<string>("TOKEN_ISSUER") ?? "medora-s";
    if (!accessSecret || !refreshSecret) {
      throw new UnauthorizedException("Configuration manquante.");
    }

    if (headerToken) {
      try {
        const decoded = this.jwt.verify<AccessJwtPayload>(headerToken, {
          secret: accessSecret,
          issuer,
        });
        if (decoded?.type === "access") {
          (req as Request & { user?: unknown }).user = {
            userId: decoded.sub,
            username: decoded.username,
            viaMfaGrant: null,
          };
          return true;
        }
      } catch {
        // fall through and try enrollment grant
      }
    }

    const grantToken =
      typeof bodyToken === "string" && bodyToken.length > 0 ? bodyToken : headerToken;
    if (!grantToken) throw new UnauthorizedException("Jeton requis.");

    let payload: MfaGrantPayload;
    try {
      payload = verifyMfaGrant(this.jwt, grantToken, refreshSecret, issuer, MFA_ENROLLMENT_TYPE);
    } catch {
      throw new UnauthorizedException("Jeton invalide ou expiré.");
    }

    (req as Request & { user?: unknown }).user = {
      userId: payload.sub,
      username: payload.username,
      viaMfaGrant: MFA_ENROLLMENT_TYPE,
    };
    return true;
  }
}
