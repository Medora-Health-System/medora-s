import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import type { Request, Response } from "express";

import { AuthService } from "../auth.service";
import {
  REFRESH_TOKEN_COOKIE_NAME,
  refreshTokenCookieOptions,
} from "../auth-cookie-options";
import { MfaChallengeGuard, MfaEnrollmentGuard } from "./mfa-grant.guard";
import {
  mfaDisableDtoSchema,
  mfaEnrollInitDtoSchema,
  mfaEnrollVerifyDtoSchema,
  mfaLoginVerifyDtoSchema,
  mfaRegenerateRecoveryCodesDtoSchema,
} from "./mfa.dto";
import { MfaService } from "./mfa.service";

type ReqWithUser = Request & {
  user?: { userId: string; username?: string; viaMfaGrant?: string | null };
};

const TOTP_VERIFY_THROTTLE = { default: { limit: 10, ttl: 60_000 } };
const ENROLL_THROTTLE = { default: { limit: 20, ttl: 60_000 } };

function userIdFromReq(req: ReqWithUser): string {
  const id = req.user?.userId;
  if (typeof id !== "string" || id.length === 0) {
    throw new UnauthorizedException("MFA_AUTH_REQUIRED");
  }
  return id;
}

@Controller("auth/mfa")
export class MfaController {
  constructor(
    private readonly mfa: MfaService,
    private readonly auth: AuthService
  ) {}

  /**
   * Status — read-only summary of the current user's MFA state.
   * Standard access JWT only; no enrollment grant accepted (the grant is for
   * enrollment endpoints).
   */
  @Get("status")
  @UseGuards(AuthGuard("jwt"))
  async status(@Req() req: ReqWithUser) {
    return this.mfa.getUserMfaSummary(userIdFromReq(req));
  }

  /**
   * Begin enrollment — generate / store a fresh TOTP secret and return the
   * otpauth URI plus a server-rendered QR data URL. The plaintext secret is
   * **not** returned in the response payload (only via the otpauth URI which
   * the user scans into their authenticator app and never persists in app
   * state). Subsequent calls re-roll the secret until enrollment is confirmed.
   */
  @Post("enroll/init")
  @UseGuards(MfaEnrollmentGuard, ThrottlerGuard)
  @Throttle(ENROLL_THROTTLE)
  @HttpCode(HttpStatus.OK)
  async enrollInit(@Body() body: unknown, @Req() req: ReqWithUser) {
    const parsed = mfaEnrollInitDtoSchema.safeParse(body ?? {});
    if (!parsed.success) throw new BadRequestException("INVALID_REQUEST_BODY");
    return this.mfa.beginEnrollment(userIdFromReq(req));
  }

  /**
   * Verify the first TOTP code, persist `mfaEnabled=true`, generate single-use
   * recovery codes, and **return a full session** — this becomes the user's
   * normal logged-in state.
   */
  @Post("enroll/verify")
  @UseGuards(MfaEnrollmentGuard, ThrottlerGuard)
  @Throttle(TOTP_VERIFY_THROTTLE)
  @HttpCode(HttpStatus.OK)
  async enrollVerify(
    @Body() body: unknown,
    @Req() req: ReqWithUser,
    @Res({ passthrough: true }) res: Response
  ) {
    const parsed = mfaEnrollVerifyDtoSchema.safeParse(body);
    if (!parsed.success) {
      const zmsg = parsed.error.errors?.[0]?.message;
      throw new BadRequestException(typeof zmsg === "string" && zmsg.length > 0 ? zmsg : "INVALID_REQUEST_BODY");
    }
    const userId = userIdFromReq(req);
    const enroll = await this.mfa.confirmEnrollment(userId, parsed.data.code);
    const session = await this.auth.completeAuthAfterMfa(userId);
    res.cookie(REFRESH_TOKEN_COOKIE_NAME, session.refreshToken, refreshTokenCookieOptions());
    return {
      enabled: enroll.enabled,
      recoveryCodes: enroll.recoveryCodes,
      accessToken: session.accessToken,
      user: session.user,
    };
  }

  /**
   * Login challenge step. Consumes an `mfa_challenge` JWT, verifies a TOTP or
   * a recovery code, and issues a full session.
   */
  @Post("verify")
  @UseGuards(MfaChallengeGuard, ThrottlerGuard)
  @Throttle(TOTP_VERIFY_THROTTLE)
  @HttpCode(HttpStatus.OK)
  async verifyLogin(
    @Body() body: unknown,
    @Req() req: ReqWithUser,
    @Res({ passthrough: true }) res: Response
  ) {
    const parsed = mfaLoginVerifyDtoSchema.safeParse(body);
    if (!parsed.success) {
      const zmsg = parsed.error.errors?.[0]?.message;
      throw new BadRequestException(typeof zmsg === "string" && zmsg.length > 0 ? zmsg : "INVALID_REQUEST_BODY");
    }
    const userId = userIdFromReq(req);
    const verify = await this.mfa.verifyLoginChallenge(
      userId,
      parsed.data.code,
      parsed.data.recoveryCode
    );
    const session = await this.auth.completeAuthAfterMfa(userId);
    res.cookie(REFRESH_TOKEN_COOKIE_NAME, session.refreshToken, refreshTokenCookieOptions());
    return {
      method: verify.method,
      accessToken: session.accessToken,
      user: session.user,
    };
  }

  /**
   * Disable MFA. Requires a fresh TOTP code. Standard access JWT only.
   */
  @Post("disable")
  @UseGuards(AuthGuard("jwt"), ThrottlerGuard)
  @Throttle(TOTP_VERIFY_THROTTLE)
  @HttpCode(HttpStatus.OK)
  async disable(@Body() body: unknown, @Req() req: ReqWithUser) {
    const parsed = mfaDisableDtoSchema.safeParse(body);
    if (!parsed.success) {
      const zmsg = parsed.error.errors?.[0]?.message;
      throw new BadRequestException(typeof zmsg === "string" && zmsg.length > 0 ? zmsg : "INVALID_REQUEST_BODY");
    }
    return this.mfa.disable(userIdFromReq(req), parsed.data.code);
  }

  /**
   * Regenerate recovery codes. Requires a fresh TOTP code. Standard access
   * JWT only.
   */
  @Post("recovery-codes/regenerate")
  @UseGuards(AuthGuard("jwt"), ThrottlerGuard)
  @Throttle(TOTP_VERIFY_THROTTLE)
  @HttpCode(HttpStatus.OK)
  async regenerateRecoveryCodes(@Body() body: unknown, @Req() req: ReqWithUser) {
    const parsed = mfaRegenerateRecoveryCodesDtoSchema.safeParse(body);
    if (!parsed.success) {
      const zmsg = parsed.error.errors?.[0]?.message;
      throw new BadRequestException(typeof zmsg === "string" && zmsg.length > 0 ? zmsg : "INVALID_REQUEST_BODY");
    }
    return this.mfa.regenerateRecoveryCodes(userIdFromReq(req), parsed.data.code);
  }
}
