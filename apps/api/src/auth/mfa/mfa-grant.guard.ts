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
 * **Precedence (urgent patch):** when the JSON body includes a non-empty
 * `enrollmentToken`, it is verified **before** any `Authorization` bearer.
 * Otherwise a stale `accessToken` cookie (still valid) would win and bind the
 * wrong `userId` — TOTP enrollment would never match the scanned QR.
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
import { MFA_GRANT_INVALID } from "./mfa-error-codes";

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
    if (!token) throw new UnauthorizedException("MFA_CHALLENGE_TOKEN_REQUIRED");

    const refreshSecret = this.config.get<string>("JWT_REFRESH_SECRET");
    const issuer = this.config.get<string>("TOKEN_ISSUER") ?? "medora-s";
    if (!refreshSecret) throw new UnauthorizedException("MFA_SERVER_MISCONFIGURED");

    let payload: MfaGrantPayload;
    try {
      payload = verifyMfaGrant(this.jwt, token, refreshSecret, issuer, MFA_CHALLENGE_TYPE);
    } catch {
      throw new UnauthorizedException(MFA_GRANT_INVALID);
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
    const bodyRaw = req.body as { enrollmentToken?: unknown } | undefined;
    const bodyEnrollment =
      typeof bodyRaw?.enrollmentToken === "string" ? bodyRaw.enrollmentToken.trim() : "";

    const accessSecret = this.config.get<string>("JWT_ACCESS_SECRET");
    const refreshSecret = this.config.get<string>("JWT_REFRESH_SECRET");
    const issuer = this.config.get<string>("TOKEN_ISSUER") ?? "medora-s";
    if (!accessSecret || !refreshSecret) {
      throw new UnauthorizedException("MFA_SERVER_MISCONFIGURED");
    }

    // Forced enrollment: body grant must win over a stale session JWT in Authorization.
    if (bodyEnrollment.length > 0) {
      try {
        const payload = verifyMfaGrant(this.jwt, bodyEnrollment, refreshSecret, issuer, MFA_ENROLLMENT_TYPE);
        (req as Request & { user?: unknown }).user = {
          userId: payload.sub,
          username: payload.username,
          viaMfaGrant: MFA_ENROLLMENT_TYPE,
        };
        return true;
      } catch {
        throw new UnauthorizedException(MFA_GRANT_INVALID);
      }
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
        // fall through — header may be an enrollment JWT signed with refresh secret
      }
    }

    const grantToken = headerToken;
    if (!grantToken) throw new UnauthorizedException(MFA_GRANT_INVALID);

    let payload: MfaGrantPayload;
    try {
      payload = verifyMfaGrant(this.jwt, grantToken, refreshSecret, issuer, MFA_ENROLLMENT_TYPE);
    } catch {
      throw new UnauthorizedException(MFA_GRANT_INVALID);
    }

    (req as Request & { user?: unknown }).user = {
      userId: payload.sub,
      username: payload.username,
      viaMfaGrant: MFA_ENROLLMENT_TYPE,
    };
    return true;
  }
}
