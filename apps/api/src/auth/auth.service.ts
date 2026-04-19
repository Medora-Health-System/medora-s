import { Injectable, UnauthorizedException, BadRequestException } from "@nestjs/common";
import { PASSWORD_POLICY_HINT_FR, passwordMeetsPolicy } from "@medora/shared";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as argon2 from "argon2";
import { randomUUID, randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthUserDto, JwtPayload } from "./types";
import { isPlatformPrincipalAdminEmail } from "./platform-principal";
import { FailedLoginTracker } from "./failed-login-tracker";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly failedLogin: FailedLoginTracker
  ) {}

  private accessSecret() {
    const s = this.config.get<string>("JWT_ACCESS_SECRET");
    if (!s) throw new Error("JWT_ACCESS_SECRET is required");
    return s;
  }
  private refreshSecret() {
    const s = this.config.get<string>("JWT_REFRESH_SECRET");
    if (!s) throw new Error("JWT_REFRESH_SECRET is required");
    return s;
  }
  private accessTtl() {
    /** Aligner apps/web JWT_ACCESS_TTL (cookies + accessTokenTtlSeconds) sur cette valeur — même chaîne (ex. 8h, 15m). */
    return this.config.get<string>("JWT_ACCESS_TTL") ?? "8h";
  }
  private refreshTtl() {
    return this.config.get<string>("JWT_REFRESH_TTL") ?? "14d";
  }
  private issuer() {
    return this.config.get<string>("TOKEN_ISSUER") ?? "medora-s";
  }

  /** Date d’expiration alignée sur le JWT signé (claim `exp`). */
  private expiryFromSignedJwt(token: string): Date {
    const decoded = this.jwt.decode(token) as { exp?: number } | null;
    if (!decoded?.exp || typeof decoded.exp !== "number") {
      return new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    }
    return new Date(decoded.exp * 1000);
  }

  async validateUser(username: string, password: string) {
    try {
      // Treat "username" as email - normalize with toLowerCase and trim
      const email = username.toLowerCase().trim();
      const user = await this.prisma.user.findUnique({
        where: { email }
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException("Invalid credentials");
      }

      const ok = await argon2.verify(user.passwordHash, password);
      if (!ok) {
        throw new UnauthorizedException("Invalid credentials");
      }

      return user;
    } catch (error) {
      // Re-throw UnauthorizedException as-is
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException("Invalid credentials");
    }
  }

  private async buildAuthUserDto(userId: string): Promise<AuthUserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          where: { isActive: true, facility: { isActive: true } },
          include: {
            role: true,
            facility: { select: { name: true, defaultLanguage: true } },
          },
        },
      },
    });

    if (!user) throw new UnauthorizedException("User not found");

    const sortedRoles = [...user.userRoles].sort((a, b) =>
      a.facilityId.localeCompare(b.facilityId, "en")
    );

    /** Isolated query so a missing/failed MSPP migration cannot break `/auth/me` or login for facility users. */
    let msppRoles: string[] = [];
    try {
      const msppRows = await this.prisma.msppUserRoleAssignment.findMany({
        where: { userId, isActive: true },
        select: { role: true },
      });
      msppRoles = [...msppRows]
        .map((a) => a.role)
        .sort((a, b) => a.localeCompare(b, "en"));
    } catch {
      msppRoles = [];
    }

    const facilityRoles = sortedRoles.map((ur) => ({
      facilityId: ur.facilityId,
      facilityName: ur.facility?.name,
      defaultLanguage: ur.facility?.defaultLanguage ?? "fr",
      role: ur.role.code,
      departmentId: ur.departmentId ?? null,
    }));

    return {
      id: user.id,
      username: user.email,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      preferredLang: "fr",
      canCreateFacilities: isPlatformPrincipalAdminEmail(user.email),
      facilityRoles,
      msppRoles,
      msppContext: {
        isMsppUser: msppRoles.length > 0,
        hasFacilityAccess: facilityRoles.length > 0,
      },
    };
  }

  private signToken(payload: JwtPayload, secret: string, expiresIn: string) {
    // `expiresIn` typing comes from `ms` StringValue; config values are plain strings.
    // Cast keeps runtime behavior correct ("15m", "14d", etc.).
    return this.jwt.sign(payload as any, {
      secret,
      expiresIn: expiresIn as any
    });
  }

  /** Révoque toutes les sessions refresh et efface le hash legacy sur `User`. */
  private async revokeAllUserSessions(userId: string, reason: string) {
    await this.prisma.authSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
  }

  async login(username: string, password: string, client?: { ip: string }) {
    const ip = client?.ip ?? "0.0.0.0";
    this.failedLogin.assertIpNotLocked(ip);

    // Normalize identifier
    const id = username.toLowerCase().trim();

    // Fetch user by email (User model only has email, not username)
    const user = await this.prisma.user.findFirst({
      where: {
        email: id
      },
      include: {
        userRoles: {
          where: { isActive: true, facility: { isActive: true } },
          include: { role: true, facility: true }
        }
      }
    });

    // Check if user exists and has passwordHash
    if (!user || !user.passwordHash) {
      this.failedLogin.recordUnknownUser(ip);
      throw new UnauthorizedException("Invalid credentials");
    }

    this.failedLogin.assertAccountNotLocked(user.email);

    // Check if user is active
    if (!user.isActive) {
      this.failedLogin.recordBadPassword(ip, user.email);
      throw new UnauthorizedException("Invalid credentials");
    }

    // Verify password
    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) {
      this.failedLogin.recordBadPassword(ip, user.email);
      throw new UnauthorizedException("Invalid credentials");
    }

    this.failedLogin.reset(ip, user.email);

    const sessionId = randomUUID();

    const accessPayload: JwtPayload = {
      sub: user.id,
      username: user.email,
      iss: this.issuer(),
      type: "access",
      jti: randomUUID()
    };

    const refreshPayload: JwtPayload = {
      sub: user.id,
      username: user.email,
      iss: this.issuer(),
      type: "refresh",
      jti: randomUUID(),
      sid: sessionId
    };

    const accessToken = this.signToken(accessPayload, this.accessSecret(), this.accessTtl());
    const refreshToken = this.signToken(refreshPayload, this.refreshSecret(), this.refreshTtl());
    const expiresAt = this.expiryFromSignedJwt(refreshToken);
    const refreshHash = await argon2.hash(refreshToken);

    /** Une seule session active : toute nouvelle connexion invalide les jetons refresh précédents (AuthSession + legacy User). */
    await this.revokeAllUserSessions(user.id, "superseded_by_login");

    await this.prisma.authSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        refreshTokenHash: refreshHash,
        expiresAt,
        lastUsedAt: new Date(),
      },
    });

    const userDto = await this.buildAuthUserDto(user.id);
    return { accessToken, refreshToken, user: userDto };
  }

  async refresh(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = this.jwt.verify<JwtPayload>(refreshToken, {
        secret: this.refreshSecret(),
        issuer: this.issuer()
      });
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }

    if (payload.type !== "refresh") {
      throw new UnauthorizedException("Invalid token type");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub }
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException("Refresh not allowed");
    }

    const newAccessPayload: JwtPayload = {
      sub: user.id,
      username: user.email,
      iss: this.issuer(),
      type: "access",
      jti: randomUUID()
    };
    const accessToken = this.signToken(newAccessPayload, this.accessSecret(), this.accessTtl());

    if (payload.sid) {
      const session = await this.prisma.authSession.findFirst({
        where: { id: payload.sid, userId: user.id },
      });
      if (!session || session.revokedAt) {
        throw new UnauthorizedException("Refresh not allowed");
      }
      if (session.expiresAt < new Date()) {
        throw new UnauthorizedException("Refresh not allowed");
      }
      const ok = await argon2.verify(session.refreshTokenHash, refreshToken);
      if (!ok) throw new UnauthorizedException("Refresh not allowed");

      const newRefreshPayload: JwtPayload = {
        sub: user.id,
        username: user.email,
        iss: this.issuer(),
        type: "refresh",
        jti: randomUUID(),
        sid: session.id
      };
      const newRefreshToken = this.signToken(newRefreshPayload, this.refreshSecret(), this.refreshTtl());
      const newExpiresAt = this.expiryFromSignedJwt(newRefreshToken);
      const newHash = await argon2.hash(newRefreshToken);

      await this.prisma.authSession.update({
        where: { id: session.id },
        data: {
          refreshTokenHash: newHash,
          lastUsedAt: new Date(),
          expiresAt: newExpiresAt,
        },
      });

      const userDto = await this.buildAuthUserDto(user.id);
      return { accessToken, refreshToken: newRefreshToken, user: userDto };
    }

    // Legacy : jeton sans `sid` — vérification sur `User.refreshTokenHash`, puis migration vers AuthSession.
    if (!user.refreshTokenHash) {
      throw new UnauthorizedException("Refresh not allowed");
    }
    const legacyOk = await argon2.verify(user.refreshTokenHash, refreshToken);
    if (!legacyOk) throw new UnauthorizedException("Refresh not allowed");

    /** Une seule session active : la migration legacy remplace tout le parc (y compris autres AuthSession). */
    await this.revokeAllUserSessions(user.id, "legacy_token_migrated");

    const sessionId = randomUUID();
    const newRefreshPayload: JwtPayload = {
      sub: user.id,
      username: user.email,
      iss: this.issuer(),
      type: "refresh",
      jti: randomUUID(),
      sid: sessionId
    };
    const newRefreshToken = this.signToken(newRefreshPayload, this.refreshSecret(), this.refreshTtl());
    const newExpiresAt = this.expiryFromSignedJwt(newRefreshToken);
    const newHash = await argon2.hash(newRefreshToken);

    await this.prisma.authSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        refreshTokenHash: newHash,
        expiresAt: newExpiresAt,
        lastUsedAt: new Date(),
      },
    });

    const userDto = await this.buildAuthUserDto(user.id);
    return { accessToken, refreshToken: newRefreshToken, user: userDto };
  }

  /**
   * Révoque uniquement la session correspondant au jeton refresh présenté (déconnexion de l’appareil courant).
   * Jeton legacy sans `sid` : efface `User.refreshTokenHash` si la vérification réussit.
   */
  async logoutWithRefreshToken(refreshToken: string): Promise<{ ok: true; userId: string }> {
    let payload: JwtPayload;
    try {
      payload = this.jwt.verify<JwtPayload>(refreshToken, {
        secret: this.refreshSecret(),
        issuer: this.issuer()
      });
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }

    if (payload.type !== "refresh") {
      throw new UnauthorizedException("Invalid token type");
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException("Logout not allowed");
    }

    if (payload.sid) {
      const session = await this.prisma.authSession.findFirst({
        where: { id: payload.sid, userId: user.id },
      });
      if (!session || session.revokedAt) {
        throw new UnauthorizedException("Logout not allowed");
      }
      const ok = await argon2.verify(session.refreshTokenHash, refreshToken);
      if (!ok) throw new UnauthorizedException("Logout not allowed");

      await this.prisma.authSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date(), revokedReason: "logout" },
      });
      return { ok: true, userId: user.id };
    }

    if (!user.refreshTokenHash) {
      throw new UnauthorizedException("Logout not allowed");
    }
    const legacyOk = await argon2.verify(user.refreshTokenHash, refreshToken);
    if (!legacyOk) throw new UnauthorizedException("Logout not allowed");

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: null },
    });
    return { ok: true, userId: user.id };
  }

  async me(userId: string) {
    return this.buildAuthUserDto(userId);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    if (!passwordMeetsPolicy(newPassword)) {
      throw new BadRequestException(PASSWORD_POLICY_HINT_FR);
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.isActive) {
      throw new UnauthorizedException("Utilisateur invalide");
    }

    const ok = await argon2.verify(user.passwordHash, currentPassword);
    if (!ok) {
      throw new UnauthorizedException("Mot de passe actuel incorrect");
    }

    const newHash = await argon2.hash(newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });
    await this.revokeAllUserSessions(userId, "password_changed");

    return { message: "Mot de passe mis à jour" };
  }

  /** Base URL for password reset links (e.g. https://app.medora.local or http://localhost:3000) */
  private resetPasswordBaseUrl(): string {
    const url = this.config.get<string>("RESET_PASSWORD_BASE_URL") ?? "http://localhost:3000";
    if (process.env.NODE_ENV === "production" && url.includes("localhost")) {
      console.error("RESET_PASSWORD_BASE_URL is not configured correctly for production");
    }
    return url;
  }

  /** Expiry for password reset tokens (1 hour) */
  private static readonly RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000;

  async forgotPassword(email: string): Promise<{ message: string }> {
    const normalized = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email: normalized },
      select: { id: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return { message: "Si ce compte existe, un lien de réinitialisation a été envoyé." };
    }

    const plainToken = randomBytes(32).toString("hex");
    const tokenHash = await argon2.hash(plainToken);
    const expiresAt = new Date(Date.now() + AuthService.RESET_TOKEN_EXPIRY_MS);

    await this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    const row = await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const baseUrl = this.resetPasswordBaseUrl().replace(/\/$/, "");
    const resetLink = `${baseUrl}/reinitialiser-mot-de-passe?id=${row.id}&token=${plainToken}`;

    if (process.env.NODE_ENV !== "production") {
      console.log("[FORGOT-PASSWORD] Reset link (dev only):", resetLink);
    }
    // TODO: when email is configured, send email with resetLink instead of/in addition to logging

    return { message: "Si ce compte existe, un lien de réinitialisation a été envoyé." };
  }

  async resetPassword(id: string, token: string, newPassword: string): Promise<{ message: string }> {
    if (!passwordMeetsPolicy(newPassword)) {
      throw new BadRequestException(PASSWORD_POLICY_HINT_FR);
    }

    const row = await this.prisma.passwordResetToken.findUnique({
      where: { id },
      include: { user: { select: { id: true, isActive: true } } },
    });

    if (
      !row ||
      row.usedAt ||
      row.expiresAt < new Date() ||
      !row.user.isActive
    ) {
      throw new BadRequestException("Lien invalide ou expiré. Demandez un nouveau lien.");
    }

    const valid = await argon2.verify(row.tokenHash, token);
    if (!valid) {
      throw new BadRequestException("Lien invalide ou expiré. Demandez un nouveau lien.");
    }

    const passwordHash = await argon2.hash(newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: row.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      }),
    ]);
    await this.revokeAllUserSessions(row.userId, "password_reset");

    return { message: "Mot de passe réinitialisé. Vous pouvez vous connecter." };
  }
}
