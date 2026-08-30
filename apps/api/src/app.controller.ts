import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Req,
  ServiceUnavailableException,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { PrismaService } from "./prisma/prisma.service";
import { createStructuredLogger } from "./common/logging/structured-logger";
import {
  consumeReadinessAchievedLogOnce,
  getOptionalPrewarmRuntimeState,
  getSchemaGuardRuntimeState,
  isCriticalPathReady,
} from "./common/runtime/runtime-availability.state";

const healthLog = createStructuredLogger("Health");
const READY_DB_TIMEOUT_MS = 1_500;

async function pingDatabase(prisma: PrismaService): Promise<boolean> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error("db_ping_timeout")), READY_DB_TIMEOUT_MS);
      }),
    ]);
    return true;
  } catch {
    return false;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

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

  /**
   * Process liveness — unauthenticated, no DB, no catalog.
   * HTTP 200 once Nest can serve this route.
   */
  @Get("/health/live")
  live() {
    return { ok: true, live: true, service: "medora-api" };
  }

  /**
   * Production traffic readiness — unauthenticated.
   * Requires schema guard passed (or skipped) and a cheap DB ping.
   * Does NOT wait for medication catalog prewarm.
   */
  @Get("/health/ready")
  async ready() {
    const schema = getSchemaGuardRuntimeState();
    const critical = isCriticalPathReady();
    const dbOk = critical ? await pingDatabase(this.prisma) : false;
    const ready = critical && dbOk;
    const body = {
      ok: ready,
      live: true,
      ready,
      schemaCompatGuard: schema,
      db: dbOk ? "ok" : "unavailable",
      optionalPrewarm: getOptionalPrewarmRuntimeState(),
    };
    if (!ready) {
      throw new ServiceUnavailableException(body);
    }
    if (consumeReadinessAchievedLogOnce()) {
      healthLog.log("readiness_achieved", {
        schemaCompatGuard: schema,
        optionalPrewarm: body.optionalPrewarm,
      });
    }
    return body;
  }

  /**
   * Backward-compatible Railway probe. Same semantics as /health/ready
   * (critical path + DB), not medication prewarm.
   */
  @Get("/health")
  async health() {
    return this.ready();
  }

  @Get("whoami")
  @UseGuards(AuthGuard("jwt"))
  whoami(@Req() req: any) {
    return req.user;
  }
}
