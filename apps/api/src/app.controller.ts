import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ROLE_CODES } from "@medora/shared";

@Controller()
export class AppController {
  @Get("/health")
  health() {
    return { ok: true, roles: ROLE_CODES };
  }

  @Get("whoami")
  @UseGuards(AuthGuard("jwt"))
  whoami(@Req() req: any) {
    return req.user;
  }
}

