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
  async login(@Body() body: unknown): Promise<any> {
    try {
      const parsed = loginDtoSchema.safeParse(body);
      if (!parsed.success) {
        throw new BadRequestException("Invalid payload");
      }

      const { username, password } = parsed.data;
      // TODO (Epic 0D): write AuditAction.LOGIN
      return await this.auth.login(username, password);
    } catch (error) {
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

  @Post("logout")
  @UseGuards(AuthGuard("jwt"))
  async logout(@Req() req: any) {
    const userId = req.user?.userId;
    // TODO (Epic 0D): write AuditAction.LOGOUT
    return this.auth.logout(userId);
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

