import { Controller, Get } from "@nestjs/common";
import { ROLE_CODES } from "@medora/shared";

@Controller()
export class AppController {
  @Get("/health")
  health() {
    return { ok: true, roles: ROLE_CODES };
  }
}

