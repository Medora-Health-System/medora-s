import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
  BadRequestException,
  UnauthorizedException,
  ServiceUnavailableException,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { AuthGuard } from "@nestjs/passport";
import type { Request, Response } from "express";
import { loginDtoSchema } from "@medora/shared";
import { AuthService } from "./auth.service";
import { forgotPasswordDtoSchema } from "./dto/forgot-password.dto";
import { resetPasswordDtoSchema } from "./dto/reset-password.dto";
import { createStructuredLogger } from "../common/logging/structured-logger";
import {
  REFRESH_TOKEN_COOKIE_NAME,
  refreshTokenCookieOptions,
  clearRefreshTokenCookieOptions,
} from "./auth-cookie-options";
import {
  AUTH_THROTTLE_FORGOT_PASSWORD,
  AUTH_THROTTLE_LOGIN,
  AUTH_THROTTLE_REFRESH,
} from "./auth-throttle.config";

const authLog = createStructuredLogger("AuthController");

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  private clientIp(req: Request): string {
    const xf = req.headers["x-forwarded-for"];
    if (typeof xf === "string" && xf.trim()) {
      return xf.split(",")[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || "0.0.0.0";
  }

  @Post("login")
  @UseGuards(ThrottlerGuard)
  @Throttle(AUTH_THROTTLE_LOGIN)
  async login(@Body() body: unknown, @Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<any> {
    try {
      const parsed = loginDtoSchema.safeParse(body);
      if (!parsed.success) {
        throw new BadRequestException("Invalid payload");
      }

      const { username, password } = parsed.data;

      const result = await this.auth.login(username, password, { ip: this.clientIp(req) });
      if (result.kind === "mfa_challenge") {
        authLog.log("auth_login_mfa_challenge_issued", {
          userId: result.userId,
          requestId: (req as { requestId?: string }).requestId,
        });
        return {
          mfaRequired: true as const,
          mfaChallengeToken: result.mfaChallengeToken,
          /** Phase 9 patch — surface the user's facility language so the MFA UI uses the correct locale. */
          preferredLanguage: result.preferredLanguage,
        };
      }
      if (result.kind === "mfa_enrollment_required") {
        authLog.log("auth_login_mfa_enrollment_required", {
          userId: result.userId,
          requestId: (req as { requestId?: string }).requestId,
        });
        return {
          mfaEnrollmentRequired: true as const,
          mfaEnrollmentToken: result.mfaEnrollmentToken,
          preferredLanguage: result.preferredLanguage,
        };
      }
      res.cookie(REFRESH_TOKEN_COOKIE_NAME, result.refreshToken, refreshTokenCookieOptions());
      authLog.log("auth_login_success", {
        userId: result.user.id,
        requestId: (req as { requestId?: string }).requestId,
      });
      return { accessToken: result.accessToken, user: result.user };
    } catch (error) {
      authLog.warn("auth_login_failed", {
        requestId: (req as { requestId?: string }).requestId,
      });
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      if (error instanceof HttpException && error.getStatus() === HttpStatus.TOO_MANY_REQUESTS) {
        throw error;
      }
      authLog.error("auth_login_unexpected_error", {
        requestId: (req as { requestId?: string }).requestId,
        errorName: error instanceof Error ? error.name : typeof error,
      });
      throw new UnauthorizedException("Invalid credentials");
    }
  }

  @Post("refresh")
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];
    const token = typeof raw === "string" ? raw.trim() : "";
    if (!token) {
      throw new UnauthorizedException("Refresh token required");
    }
    const result = await this.auth.refresh(token);
    res.cookie(REFRESH_TOKEN_COOKIE_NAME, result.refreshToken, refreshTokenCookieOptions());
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post("logout")
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];
    const rt = typeof raw === "string" ? raw.trim() : "";
    if (!rt) {
      throw new BadRequestException("Session required");
    }
    const result = await this.auth.logoutWithRefreshToken(rt);
    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, clearRefreshTokenCookieOptions());
    authLog.log("auth_logout", {
      userId: result.userId,
      requestId: (req as { requestId?: string }).requestId,
    });
    return { ok: result.ok };
  }

  @Get("me")
  @UseGuards(AuthGuard("jwt"))
  async me(@Req() req: Request & { user: { userId: string } }) {
    const requestId = (req as { requestId?: string }).requestId;
    try {
      return await this.auth.me(req.user.userId);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      authLog.error("auth_me_failed", {
        requestId,
        reason: error instanceof Error ? error.name : typeof error,
      });
      throw new ServiceUnavailableException(
        "Service d'authentification temporairement indisponible."
      );
    }
  }

  @Post("change-password")
  @UseGuards(AuthGuard("jwt"))
  async changePassword(@Req() req: any, @Body() body: any) {
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      throw new BadRequestException("Données invalides");
    }

    return this.auth.changePassword(req.user.userId, currentPassword, newPassword);
  }

  @Post("forgot-password")
  @UseGuards(ThrottlerGuard)
  @Throttle(AUTH_THROTTLE_FORGOT_PASSWORD)
  async forgotPassword(@Body() body: unknown) {
    const parsed = forgotPasswordDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.errors?.[0]?.message ?? "Email invalide.");
    }
    return this.auth.forgotPassword(parsed.data.email);
  }

  @Post("reset-password")
  async resetPassword(@Body() body: unknown) {
    const parsed = resetPasswordDtoSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.errors?.[0]?.message ?? "Données invalides.";
      throw new BadRequestException(msg);
    }
    const { id, token, newPassword } = parsed.data;
    return this.auth.resetPassword(id, token, newPassword);
  }
}
