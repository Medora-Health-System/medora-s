import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { loginDtoSchema } from "@medora/shared";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("login")
  async login(@Body() body: unknown): Promise<any> {
    const parsed = loginDtoSchema.safeParse(body);
    if (!parsed.success) {
      return { error: "Invalid payload", issues: parsed.error.issues };
    }

    const { username, password } = parsed.data;
    // TODO (Epic 0D): write AuditAction.LOGIN
    return this.auth.login(username, password);
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

