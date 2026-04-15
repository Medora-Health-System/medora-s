import { Body, Controller, Get, Post, Req, UseGuards, BadRequestException, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { loginDtoSchema } from "@medora/shared";
import { AuthService } from "./auth.service";
import { forgotPasswordDtoSchema } from "./dto/forgot-password.dto";
import { resetPasswordDtoSchema } from "./dto/reset-password.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("login")
  async login(@Body() body: unknown, @Req() req: any): Promise<any> {
    let attemptedEmail: string | undefined;
    try {
      const parsed = loginDtoSchema.safeParse(body);
      if (!parsed.success) {
        throw new BadRequestException("Invalid payload");
      }

      const { username, password } = parsed.data;
      attemptedEmail = username.toLowerCase().trim();

      const result = await this.auth.login(username, password);
      console.log("[AUTH] LOGIN_SUCCESS", {
        userId: result.user.id,
        email: result.user.username,
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      console.warn("[AUTH] LOGIN_FAILED", {
        email: attemptedEmail,
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      });
      // Re-throw HttpExceptions (BadRequestException, UnauthorizedException) as-is
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      // For unexpected errors, log and throw generic unauthorized
      console.error("Login controller error:", error);
      throw new UnauthorizedException("Invalid credentials");
    }
  }

  @Post("refresh")
  async refresh(@Body() body: { refreshToken?: string }) {
    if (!body?.refreshToken) return { error: "refreshToken required" };
    return this.auth.refresh(body.refreshToken);
  }

  /** Révoque la session refresh correspondant au cookie (un appareil à la fois). */
  @Post("logout")
  async logout(@Body() body: { refreshToken?: string }, @Req() req: any) {
    const rt = typeof body?.refreshToken === "string" ? body.refreshToken.trim() : "";
    if (!rt) {
      throw new BadRequestException("refreshToken required");
    }
    const result = await this.auth.logoutWithRefreshToken(rt);
    let userId: string | undefined;
    try {
      const payload = JSON.parse(Buffer.from(rt.split(".")[1], "base64url").toString("utf8")) as { sub?: string };
      userId = typeof payload.sub === "string" ? payload.sub : undefined;
    } catch {
      userId = undefined;
    }
    console.log("[AUTH] LOGOUT", {
      userId,
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    });
    return result;
  }

  @Get("me")
  @UseGuards(AuthGuard("jwt"))
  async me(@Req() req: any) {
    return this.auth.me(req.user.userId);
  }

  @Post("change-password")
  @UseGuards(AuthGuard("jwt"))
  async changePassword(@Req() req: any, @Body() body: any) {
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword || newPassword.length < 8) {
      throw new BadRequestException("Données invalides");
    }

    return this.auth.changePassword(req.user.userId, currentPassword, newPassword);
  }

  @Post("forgot-password")
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

