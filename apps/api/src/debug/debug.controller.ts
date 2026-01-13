import { Controller, Get } from "@nestjs/common";

@Controller("debug")
export class DebugController {
  @Get("env")
  getEnv() {
    return {
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasJwtAccessSecret: !!process.env.JWT_ACCESS_SECRET,
      hasJwtRefreshSecret: !!process.env.JWT_REFRESH_SECRET,
    };
  }
}

