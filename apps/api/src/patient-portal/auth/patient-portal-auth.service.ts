import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { randomUUID } from "crypto";
import { PatientPortalAuditService } from "../patient-portal-audit.service";
import { PatientPortalRepository, type PatientPortalAccountRow } from "../persistence/patient-portal.repository";
import type {
  PatientPortalJwtPayload,
  PatientPortalPrincipal,
  PatientPortalRefreshJwtPayload,
} from "./patient-portal.types";
import type { PatientPortalLoginBody, PatientPortalRegisterBody } from "./patient-portal-auth.schemas";

export type PatientPortalSessionTokens = {
  accessToken: string;
  refreshToken: string;
  accessTokenTtlSeconds: number | null;
  account: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    preferredLanguage: string;
  };
};

@Injectable()
export class PatientPortalAuthService {
  constructor(
    private readonly repo: PatientPortalRepository,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: PatientPortalAuditService
  ) {}

  private accessSecret(): string {
    const secret = this.config.get<string>("PATIENT_PORTAL_JWT_ACCESS_SECRET");
    if (!secret) throw new Error("PATIENT_PORTAL_JWT_ACCESS_SECRET is required");
    return secret;
  }

  private refreshSecret(): string {
    const secret = this.config.get<string>("PATIENT_PORTAL_JWT_REFRESH_SECRET");
    if (!secret) throw new Error("PATIENT_PORTAL_JWT_REFRESH_SECRET is required");
    return secret;
  }

  private issuer(): string {
    return this.config.get<string>("PATIENT_PORTAL_TOKEN_ISSUER") ?? "medora-patient";
  }

  private accessTtl(): string {
    return this.config.get<string>("PATIENT_PORTAL_JWT_ACCESS_TTL") ?? "15m";
  }

  private refreshTtl(): string {
    return this.config.get<string>("PATIENT_PORTAL_JWT_REFRESH_TTL") ?? "30d";
  }

  private tokenExpiry(token: string, fallbackMs: number): Date {
    const decoded = this.jwt.decode(token) as { exp?: number } | null;
    return decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + fallbackMs);
  }

  private tokenTtlSeconds(token: string): number | null {
    const decoded = this.jwt.decode(token) as { exp?: number; iat?: number } | null;
    return decoded?.exp && decoded?.iat ? Math.max(0, decoded.exp - decoded.iat) : null;
  }

  private accountView(account: PatientPortalAccountRow) {
    return {
      id: account.id,
      firstName: account.firstName,
      lastName: account.lastName,
      email: account.email,
      phone: account.phone,
      preferredLanguage: account.preferredLanguage,
    };
  }

  private async issueTokens(account: PatientPortalAccountRow, sessionId: string) {
    const accessPayload: PatientPortalJwtPayload = {
      sub: account.id,
      sid: sessionId,
      type: "patient_access",
      principal: "patient",
      jti: randomUUID(),
    };
    const refreshPayload: PatientPortalRefreshJwtPayload = {
      sub: account.id,
      sid: sessionId,
      type: "patient_refresh",
      principal: "patient",
      jti: randomUUID(),
    };

    const accessToken = await this.jwt.signAsync(accessPayload, {
      secret: this.accessSecret(),
      expiresIn: this.accessTtl() as never,
      issuer: this.issuer(),
    });
    const refreshToken = await this.jwt.signAsync(refreshPayload, {
      secret: this.refreshSecret(),
      expiresIn: this.refreshTtl() as never,
      issuer: this.issuer(),
    });
    return { accessToken, refreshToken };
  }

  async register(
    body: PatientPortalRegisterBody,
    context: { ip?: string | null; userAgent?: string | null }
  ) {
    const email = body.email?.trim().toLowerCase() ?? null;
    const phone = body.phone?.trim() ?? null;
    if ((email && (await this.repo.findAccountByIdentifier(email))) || (phone && (await this.repo.findAccountByIdentifier(phone)))) {
      throw new ConflictException("A patient portal account already uses this contact information");
    }

    const account = await this.repo.createAccount({
      id: randomUUID(),
      email,
      phone,
      passwordHash: await argon2.hash(body.password),
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      dob: new Date(`${body.dateOfBirth}T00:00:00.000Z`),
      preferredLanguage: body.preferredLanguage,
    });

    await this.audit.record("PATIENT_PORTAL_REGISTER", "PATIENT_PORTAL_ACCOUNT", {
      portalAccountId: account.id,
      entityId: account.id,
      ip: context.ip,
      userAgent: context.userAgent,
    });

    return {
      accountId: account.id,
      status: account.status,
      verificationRequired: true,
    };
  }

  async login(
    body: PatientPortalLoginBody,
    context: { ip?: string | null; userAgent?: string | null }
  ): Promise<PatientPortalSessionTokens> {
    const account = await this.repo.findAccountByIdentifier(body.identifier);
    if (!account) throw new UnauthorizedException("Invalid credentials");
    if (account.status !== "ACTIVE") throw new UnauthorizedException("Patient portal account not active");
    if (account.lockedUntil && account.lockedUntil.getTime() > Date.now()) {
      throw new UnauthorizedException("Patient portal account locked");
    }

    const passwordOk = await argon2.verify(account.passwordHash, body.password);
    if (!passwordOk) {
      await this.repo.incrementFailedLogin(account.id);
      await this.audit.record("PATIENT_PORTAL_LOGIN_FAILED", "PATIENT_PORTAL_ACCOUNT", {
        portalAccountId: account.id,
        entityId: account.id,
        ip: context.ip,
        userAgent: context.userAgent,
      });
      throw new UnauthorizedException("Invalid credentials");
    }

    const sessionId = randomUUID();
    const { accessToken, refreshToken } = await this.issueTokens(account, sessionId);
    await this.repo.createSession({
      id: sessionId,
      portalAccountId: account.id,
      refreshTokenHash: await argon2.hash(refreshToken),
      expiresAt: this.tokenExpiry(refreshToken, 30 * 24 * 60 * 60 * 1000),
      deviceId: body.deviceId ?? null,
      deviceName: body.deviceName ?? null,
      userAgent: context.userAgent,
      ipCreated: context.ip,
    });
    await this.repo.markLoginSuccess(account.id);
    await this.audit.record("PATIENT_PORTAL_LOGIN", "PATIENT_PORTAL_SESSION", {
      portalAccountId: account.id,
      sessionId,
      entityId: sessionId,
      ip: context.ip,
      userAgent: context.userAgent,
      critical: true,
    });

    return {
      accessToken,
      refreshToken,
      accessTokenTtlSeconds: this.tokenTtlSeconds(accessToken),
      account: this.accountView(account),
    };
  }

  async refresh(refreshToken: string): Promise<PatientPortalSessionTokens> {
    let payload: PatientPortalRefreshJwtPayload;
    try {
      payload = await this.jwt.verifyAsync<PatientPortalRefreshJwtPayload>(refreshToken, {
        secret: this.refreshSecret(),
        issuer: this.issuer(),
      });
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }

    if (payload.type !== "patient_refresh" || payload.principal !== "patient" || !payload.sub || !payload.sid) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const account = await this.repo.findAccountById(payload.sub);
    const session = await this.repo.findActiveSession(payload.sid, payload.sub);
    if (!account || account.status !== "ACTIVE" || !session?.refreshTokenHash) {
      throw new UnauthorizedException("Patient portal session not active");
    }

    if (!(await argon2.verify(session.refreshTokenHash, refreshToken))) {
      await this.repo.revokeSession(payload.sid, payload.sub);
      throw new UnauthorizedException("Refresh token no longer valid");
    }

    const next = await this.issueTokens(account, session.id);
    await this.repo.rotateRefreshToken(
      session.id,
      account.id,
      await argon2.hash(next.refreshToken),
      this.tokenExpiry(next.refreshToken, 30 * 24 * 60 * 60 * 1000)
    );

    return {
      accessToken: next.accessToken,
      refreshToken: next.refreshToken,
      accessTokenTtlSeconds: this.tokenTtlSeconds(next.accessToken),
      account: this.accountView(account),
    };
  }

  async logout(principal: PatientPortalPrincipal): Promise<void> {
    await this.repo.revokeSession(principal.sessionId, principal.portalAccountId);
    await this.audit.record("PATIENT_PORTAL_LOGOUT", "PATIENT_PORTAL_SESSION", {
      portalAccountId: principal.portalAccountId,
      sessionId: principal.sessionId,
      entityId: principal.sessionId,
    });
  }

  async me(principal: PatientPortalPrincipal) {
    const account = await this.repo.findAccountById(principal.portalAccountId);
    if (!account || account.status !== "ACTIVE") {
      throw new UnauthorizedException("Patient portal account not active");
    }
    return {
      ...this.accountView(account),
      emailVerified: !!account.emailVerifiedAt,
      phoneVerified: !!account.phoneVerifiedAt,
    };
  }
}
