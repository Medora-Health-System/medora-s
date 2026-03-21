import { Injectable, UnauthorizedException, BadRequestException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as argon2 from "argon2";
import { randomUUID, randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthUserDto, JwtPayload } from "./types";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService
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
    /** Durée de session API alignée sur l’usage clinique (rafraîchissement côté web si besoin). */
    return this.config.get<string>("JWT_ACCESS_TTL") ?? "8h";
  }
  private refreshTtl() {
    return this.config.get<string>("JWT_REFRESH_TTL") ?? "14d";
  }
  private issuer() {
    return this.config.get<string>("TOKEN_ISSUER") ?? "medora-s";
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
      // For database or other errors, log and throw generic unauthorized
      console.error("validateUser error:", error);
      throw new UnauthorizedException("Invalid credentials");
    }
  }

  private async buildAuthUserDto(userId: string): Promise<AuthUserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          where: { isActive: true },
          include: { role: true, facility: { select: { name: true } } },
        },
      }
    });

    if (!user) throw new UnauthorizedException("User not found");

    const sortedRoles = [...user.userRoles].sort((a, b) =>
      a.facilityId.localeCompare(b.facilityId, "en")
    );
    return {
      id: user.id,
      username: user.email,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      preferredLang: "fr",
      facilityRoles: sortedRoles.map((ur) => ({
        facilityId: ur.facilityId,
        facilityName: ur.facility?.name,
        role: ur.role.code,
        departmentId: ur.departmentId ?? null,
      })),
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

  private async setRefreshTokenHash(userId: string, refreshToken: string) {
    const hash = await argon2.hash(refreshToken);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: hash }
    });
  }

  async login(username: string, password: string) {
    // Normalize identifier
    const id = username.toLowerCase().trim();

    // Fetch user by email (User model only has email, not username)
    const user = await this.prisma.user.findFirst({
      where: {
        email: id
      },
      include: {
        userRoles: {
          where: { isActive: true },
          include: { role: true, facility: true }
        }
      }
    });

    // Debug logging (dev only)
    if (process.env.NODE_ENV !== "production") {
      console.log(`[LOGIN DEBUG] Identifier: ${id}`);
      console.log(`[LOGIN DEBUG] User found: ${user ? "yes" : "no"}`);
      if (user) {
        console.log(`[LOGIN DEBUG] User ID: ${user.id}, Email: ${user.email}, Active: ${user.isActive}`);
      }
    }

    // Check if user exists and has passwordHash
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException("Invalid credentials");
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException("Invalid credentials");
    }

    // Verify password
    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) {
      if (process.env.NODE_ENV !== "production") {
        console.log(`[LOGIN DEBUG] Password verification failed`);
      }
      throw new UnauthorizedException("Invalid credentials");
    }

    if (process.env.NODE_ENV !== "production") {
      console.log(`[LOGIN DEBUG] Password verification succeeded`);
    }

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
      jti: randomUUID()
    };

    const accessToken = this.signToken(accessPayload, this.accessSecret(), this.accessTtl());
    const refreshToken = this.signToken(refreshPayload, this.refreshSecret(), this.refreshTtl());

    await this.setRefreshTokenHash(user.id, refreshToken);

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
    if (!user || !user.isActive || !user.refreshTokenHash) {
      throw new UnauthorizedException("Refresh not allowed");
    }

    const ok = await argon2.verify(user.refreshTokenHash, refreshToken);
    if (!ok) throw new UnauthorizedException("Refresh not allowed");

    // Rotate refresh token (recommended)
    const newAccessPayload: JwtPayload = {
      sub: user.id,
      username: user.email,
      iss: this.issuer(),
      type: "access",
      jti: randomUUID()
    };
    const newRefreshPayload: JwtPayload = {
      sub: user.id,
      username: user.email,
      iss: this.issuer(),
      type: "refresh",
      jti: randomUUID()
    };

    const accessToken = this.signToken(newAccessPayload, this.accessSecret(), this.accessTtl());
    const newRefreshToken = this.signToken(newRefreshPayload, this.refreshSecret(), this.refreshTtl());

    await this.setRefreshTokenHash(user.id, newRefreshToken);

    const userDto = await this.buildAuthUserDto(user.id);
    return { accessToken, refreshToken: newRefreshToken, user: userDto };
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null }
    });
    return { ok: true };
  }

  async me(userId: string) {
    return this.buildAuthUserDto(userId);
  }

  /** Base URL for password reset links (e.g. https://app.medora.local or http://localhost:3000) */
  private resetPasswordBaseUrl(): string {
    return this.config.get<string>("RESET_PASSWORD_BASE_URL") ?? "http://localhost:3000";
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

    return { message: "Mot de passe réinitialisé. Vous pouvez vous connecter." };
  }
}

