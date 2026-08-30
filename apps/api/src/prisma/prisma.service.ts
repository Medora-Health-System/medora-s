import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { createStructuredLogger } from "../common/logging/structured-logger";
import { markSchemaGuardRuntime } from "../common/runtime/runtime-availability.state";
import {
  checkSchemaCompatibility,
  schemaCompatGuardEnabled,
} from "./schema-compatibility";

const log = createStructuredLogger("PrismaService");

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
    if (!schemaCompatGuardEnabled()) {
      markSchemaGuardRuntime("skipped");
      return;
    }
    const report = await checkSchemaCompatibility(this);
    if (!report.ok) {
      markSchemaGuardRuntime("failed");
      log.error("schema_compatibility_guard_failed", {
        verdict: report.verdict,
        reasons: report.reasons,
        deploymentSha: report.deploymentSha,
        hospitalEpisodeFoundationEnabled: report.hospitalEpisodeFoundationEnabled,
        d3bMigrationRecorded: report.presence?.d3bMigrationRecorded ?? null,
        hospitalEpisodeIdColumnPresent:
          report.presence?.hospitalEpisodeIdColumnPresent ?? null,
      });
      throw new Error(
        `Schema compatibility guard failed (${report.verdict}): ${report.reasons.join("; ")}`
      );
    }
    markSchemaGuardRuntime("ok");
    log.log("schema_compatibility_guard_ok", {
      verdict: report.verdict,
      deploymentSha: report.deploymentSha,
      hospitalEpisodeFoundationEnabled: report.hospitalEpisodeFoundationEnabled,
      d3bMigrationRecorded: report.presence?.d3bMigrationRecorded ?? null,
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

