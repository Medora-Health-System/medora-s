import { Body, Controller, Get, Post, Req, UseGuards, BadRequestException, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { loginDtoSchema } from "@medora/shared";
import { AuthService } from "./auth.service";

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
}

