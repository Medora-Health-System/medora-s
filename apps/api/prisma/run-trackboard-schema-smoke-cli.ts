/**
 * Smoke: execute Trackboard explicit select against the connected database.
 * Fails on Prisma schema mismatch (e.g. P2022). Empty result set is OK when
 * the facility has no encounters — that is not treated as a soft success for errors.
 *
 * Usage: ts-node --transpile-only prisma/run-trackboard-schema-smoke-cli.ts
 */

import { PrismaClient } from "@prisma/client";
import { TRACKBOARD_ACTIVE_ENCOUNTER_SELECT } from "../src/trackboard/trackboard-encounter-select";
import { sanitizePrismaException } from "../src/common/logging/prisma-error-sanitizer";
import { checkSchemaCompatibility } from "../src/prisma/schema-compatibility";

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  const label = process.env.TRACKBOARD_SMOKE_LABEL?.trim() || "unnamed";
  try {
    const compat = await checkSchemaCompatibility(prisma, { bypassCache: true });
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        phase: "compat",
        label,
        ok: compat.ok,
        verdict: compat.verdict,
        d3bMigrationRecorded: compat.presence?.d3bMigrationRecorded ?? null,
        hospitalEpisodeIdColumnPresent:
          compat.presence?.hospitalEpisodeIdColumnPresent ?? null,
      })
    );

    const rows = await prisma.encounter.findMany({
      where: { facilityId: "__smoke_nonexistent_facility__" },
      select: TRACKBOARD_ACTIVE_ENCOUNTER_SELECT,
      orderBy: { createdAt: "desc" },
      take: 1,
    });

    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        phase: "trackboard_select",
        label,
        ok: true,
        rowCount: rows.length,
        note: "Empty rowCount is expected for synthetic facility filter; query executed successfully.",
      })
    );
  } catch (err) {
    const sanitized = sanitizePrismaException(err);
    // eslint-disable-next-line no-console
    console.error(
      JSON.stringify({
        phase: "trackboard_select",
        label,
        ok: false,
        prismaCode: sanitized?.prismaCode ?? null,
        missingDatabaseObject: sanitized?.missingDatabaseObject ?? null,
        modelName: sanitized?.modelName ?? null,
        errorName: err instanceof Error ? err.name : typeof err,
      })
    );
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
