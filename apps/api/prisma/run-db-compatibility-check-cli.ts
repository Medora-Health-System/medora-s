/**
 * CLI: pnpm db:compatibility:check
 * Exit nonzero when deployed application requirements are incompatible with the DB.
 * Does not run migrations. No PHI.
 */

import { PrismaClient } from "@prisma/client";
import {
  checkSchemaCompatibility,
  schemaCompatGuardEnabled,
} from "../src/prisma/schema-compatibility";

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const report = await checkSchemaCompatibility(prisma);
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify(
        {
          ok: report.ok,
          verdict: report.verdict,
          hospitalEpisodeFoundationEnabled: report.hospitalEpisodeFoundationEnabled,
          reasons: report.reasons,
          deploymentSha: report.deploymentSha,
          checkedAt: report.checkedAt,
          presence: report.presence
            ? {
                trackboardRequiredColumnsMissing:
                  report.presence.trackboardRequiredColumnsMissing,
                hospitalEpisodeTablePresent: report.presence.hospitalEpisodeTablePresent,
                hospitalEpisodeIdColumnPresent:
                  report.presence.hospitalEpisodeIdColumnPresent,
                hospitalEpisodeStatusEnumPresent:
                  report.presence.hospitalEpisodeStatusEnumPresent,
                hospitalEpisodeCloseReasonEnumPresent:
                  report.presence.hospitalEpisodeCloseReasonEnumPresent,
                d3bMigrationRecorded: report.presence.d3bMigrationRecorded,
                appliedMigrationCount: report.presence.appliedMigrationCount,
                latestAppliedMigration: report.presence.latestAppliedMigration,
              }
            : null,
          schemaCompatGuardEnabled: schemaCompatGuardEnabled(),
        },
        null,
        2
      )
    );
    if (!report.ok) {
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(
    JSON.stringify({
      ok: false,
      verdict: "DATABASE_UNREACHABLE",
      errorName: err instanceof Error ? err.name : typeof err,
    })
  );
  process.exit(1);
});
