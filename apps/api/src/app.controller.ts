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
import { ROLE_CODES } from "@medora/shared";
import { PrismaService } from "./prisma/prisma.service";
import {
  checkSchemaCompatibility,
  schemaCompatGuardEnabled,
} from "./prisma/schema-compatibility";

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
   * Liveness + schema readiness when MEDORA_SCHEMA_COMPAT_GUARD / production.
   * Missing required Trackboard columns → 503 (fail closed before traffic).
   */
  @Get("/health")
  async health() {
    if (!schemaCompatGuardEnabled()) {
      return { ok: true, roles: ROLE_CODES, schemaCompatGuard: "skipped" };
    }
    const report = await checkSchemaCompatibility(this.prisma);
    if (!report.ok) {
      throw new ServiceUnavailableException({
        ok: false,
        roles: ROLE_CODES,
        schemaCompat: {
          verdict: report.verdict,
          reasons: report.reasons,
          deploymentSha: report.deploymentSha,
          hospitalEpisodeFoundationEnabled: report.hospitalEpisodeFoundationEnabled,
          encounterQueryContractsSafe: report.encounterQueryContractsSafe,
        },
      });
    }
    return {
      ok: true,
      roles: ROLE_CODES,
      schemaCompat: {
        verdict: report.verdict,
        deploymentSha: report.deploymentSha,
        hospitalEpisodeFoundationEnabled: report.hospitalEpisodeFoundationEnabled,
        encounterQueryContractsSafe: report.encounterQueryContractsSafe,
        d3bMigrationRecorded: report.presence?.d3bMigrationRecorded ?? null,
      },
    };
  }

  @Get("whoami")
  @UseGuards(AuthGuard("jwt"))
  whoami(@Req() req: any) {
    return req.user;
  }
}

