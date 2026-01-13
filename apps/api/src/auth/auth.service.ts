import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as argon2 from "argon2";
import crypto from "node:crypto";
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
    return this.config.get<string>("JWT_ACCESS_TTL") ?? "15m";
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
          include: { role: true }
        }
      }
    });

    if (!user) throw new UnauthorizedException("User not found");

    return {
      id: user.id,
      username: user.email,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      preferredLang: "en",
      facilityRoles: user.userRoles.map((ur) => ({
        facilityId: ur.facilityId,
        role: ur.role.code,
        departmentId: ur.departmentId ?? null
      }))
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
    try {
      const user = await this.validateUser(username, password);

      const accessPayload: JwtPayload = {
        sub: user.id,
        username: user.email,
        iss: this.issuer(),
        type: "access",
        jti: crypto.randomUUID()
      };

      const refreshPayload: JwtPayload = {
        sub: user.id,
        username: user.email,
        iss: this.issuer(),
        type: "refresh",
        jti: crypto.randomUUID()
      };

      const accessToken = this.signToken(accessPayload, this.accessSecret(), this.accessTtl());
      const refreshToken = this.signToken(refreshPayload, this.refreshSecret(), this.refreshTtl());

      await this.setRefreshTokenHash(user.id, refreshToken);

      const userDto = await this.buildAuthUserDto(user.id);
      return { accessToken, refreshToken, user: userDto };
    } catch (error) {
      // Re-throw UnauthorizedException as-is (already handled)
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      // For other errors (DB, JWT, etc.), log and throw generic error
      console.error("Login error:", error);
      throw new UnauthorizedException("Invalid credentials");
    }
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
      jti: crypto.randomUUID()
    };
    const newRefreshPayload: JwtPayload = {
      sub: user.id,
      username: user.email,
      iss: this.issuer(),
      type: "refresh",
      jti: crypto.randomUUID()
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
}

