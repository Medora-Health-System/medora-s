import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import type { JwtPayload } from "./types";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService
  ) {
    const secret = config.get<string>("JWT_ACCESS_SECRET");
    if (!secret) {
      throw new Error("JWT_ACCESS_SECRET is required");
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload || payload.type !== "access") {
      throw new UnauthorizedException("Invalid token type");
    }

    // Load user with facility roles
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        userRoles: {
          where: { isActive: true, facility: { isActive: true } },
          include: { role: true }
        }
      }
    });

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    // [DEV] Log successful JWT validation for auth debugging (local dev only)
    if (process.env.NODE_ENV !== "production") {
      console.log("[nest auth] JWT validation succeeded", { userId: payload.sub, username: payload.username });
    }

    // What gets attached to req.user:
    return {
      userId: payload.sub,
      username: payload.username,
      facilityRoles: user.userRoles.map((ur) => ({
        facilityId: ur.facilityId,
        role: ur.role.code,
        departmentId: ur.departmentId ?? null
      }))
    };
  }
}

