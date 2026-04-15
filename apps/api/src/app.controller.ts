import { Controller, Get, HttpCode, HttpStatus, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ROLE_CODES } from "@medora/shared";

@Controller()
export class AppController {
  /** Quiet probes to the API host (e.g. Railway / load balancers); avoids 404 noise on GET / and favicon. */
  @Get()
  root() {
    return { ok: true, service: "medora-api" };
  }

  @Get("favicon.ico")
  @HttpCode(HttpStatus.NO_CONTENT)
  favicon(): void {
    return;
  }

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

