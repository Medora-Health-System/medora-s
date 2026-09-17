import { Body, Controller, Post, Req, Res, UnauthorizedException, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { Request, Response } from "express";
import { randomUUID } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthService } from "../auth.service";
import { REFRESH_TOKEN_COOKIE_NAME, refreshTokenCookieOptions } from "../auth-cookie-options";

const TRUST_TTL_SECONDS = 24 * 60 * 60;
const ISSUE_FRESHNESS_MS = 5 * 60 * 1000;

type AccessReq = Request & { user?: { userId?: string; sessionId?: string | null } };
type TrustClaims = { sub: string; type: "mfa_trusted_device"; verifiedAt: string; iss: string; jti: string };
type ChallengeClaims = { sub: string; type: "mfa_challenge"; iss: string };

@Controller("auth/mfa/trust")
export class TrustedMfaController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly auth: AuthService
  ) {}

  private secret(): string {
    const value = this.config.get<string>("JWT_REFRESH_SECRET");
    if (!value) throw new Error("JWT_REFRESH_SECRET is required");
    return value;
  }

  private issuer(): string {
    return this.config.get<string>("TOKEN_ISSUER") ?? "medora-s";
  }

  /** Issue only from a session that has just completed a real authenticator/recovery MFA proof. */
  @Post("issue")
  @UseGuards(AuthGuard("jwt"))
  async issue(@Req() req: AccessReq) {
    const userId = req.user?.userId;
    const sessionId = req.user?.sessionId;
    if (!userId || !sessionId) throw new UnauthorizedException("SESSION_BOUND_MFA_REQUIRED");

    const session = await this.prisma.authSession.findFirst({
      where: { id: sessionId, userId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { mfaVerifiedAt: true },
    });
    const verifiedAt = session?.mfaVerifiedAt;
    if (!verifiedAt || Date.now() - verifiedAt.getTime() > ISSUE_FRESHNESS_MS) {
      throw new UnauthorizedException("FRESH_MFA_REQUIRED");
    }

    const trustedMfaToken = this.jwt.sign(
      { sub: userId, type: "mfa_trusted_device", verifiedAt: verifiedAt.toISOString(), iss: this.issuer(), jti: randomUUID() },
      { secret: this.secret(), expiresIn: TRUST_TTL_SECONDS }
    );
    return { trustedMfaToken, expiresInSeconds: TRUST_TTL_SECONDS };
  }

  /** Exchange password-stage challenge + unexpired trusted-device proof for a normal session. */
  @Post("exchange")
  async exchange(
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response
  ) {
    const input = body as { challengeToken?: unknown; trustedMfaToken?: unknown };
    if (typeof input?.challengeToken !== "string" || typeof input?.trustedMfaToken !== "string") {
      throw new UnauthorizedException("MFA_TRUST_INVALID");
    }

    let challenge: ChallengeClaims;
    let trust: TrustClaims;
    try {
      challenge = this.jwt.verify<ChallengeClaims>(input.challengeToken, { secret: this.secret(), issuer: this.issuer() });
      trust = this.jwt.verify<TrustClaims>(input.trustedMfaToken, { secret: this.secret(), issuer: this.issuer() });
    } catch {
      throw new UnauthorizedException("MFA_TRUST_INVALID");
    }
    if (challenge.type !== "mfa_challenge" || trust.type !== "mfa_trusted_device" || challenge.sub !== trust.sub) {
      throw new UnauthorizedException("MFA_TRUST_INVALID");
    }

    const verifiedAt = new Date(trust.verifiedAt);
    if (!Number.isFinite(verifiedAt.getTime()) || Date.now() - verifiedAt.getTime() > TRUST_TTL_SECONDS * 1000) {
      throw new UnauthorizedException("MFA_TRUST_EXPIRED");
    }
    const user = await this.prisma.user.findFirst({ where: { id: challenge.sub, isActive: true, mfaEnabled: true }, select: { id: true } });
    if (!user) throw new UnauthorizedException("MFA_TRUST_INVALID");

    const session = await this.auth.completeAuthAfterMfa(user.id, "totp");
    const decoded = this.jwt.decode(session.accessToken) as { sid?: string } | null;
    if (!decoded?.sid) throw new UnauthorizedException("MFA_TRUST_INVALID");

    // Preserve the time of the original MFA proof. Trusted-device login must never create a fresh step-up timestamp.
    await this.prisma.authSession.update({
      where: { id: decoded.sid },
      data: { mfaVerifiedAt: verifiedAt, mfaMethod: "trusted_device" },
    });
    res.cookie(REFRESH_TOKEN_COOKIE_NAME, session.refreshToken, refreshTokenCookieOptions());
    return { accessToken: session.accessToken, user: session.user, trustedMfa: true };
  }
}
