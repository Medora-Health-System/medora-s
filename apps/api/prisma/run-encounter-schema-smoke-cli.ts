/**
 * Smoke: execute shared Encounter query contracts against the connected database.
 * Fails on Prisma schema mismatch (e.g. P2022 for hospitalEpisodeId).
 *
 * Usage: ts-node --transpile-only prisma/run-encounter-schema-smoke-cli.ts
 */

import { PrismaClient } from "@prisma/client";
import {
  ENCOUNTER_CORE_SELECT,
  ENCOUNTER_DETAIL_SELECT,
  ENCOUNTER_DISPOSITION_SELECT,
  ENCOUNTER_MEDICATION_SELECT,
  ENCOUNTER_TRIAGE_SELECT,
} from "../src/encounters/encounter-query-contracts";
import { sanitizePrismaException } from "../src/common/logging/prisma-error-sanitizer";
import { checkSchemaCompatibility } from "../src/prisma/schema-compatibility";

const CONTRACTS = {
  ENCOUNTER_CORE_SELECT,
  ENCOUNTER_DETAIL_SELECT,
  ENCOUNTER_DISPOSITION_SELECT,
  ENCOUNTER_TRIAGE_SELECT,
  ENCOUNTER_MEDICATION_SELECT,
} as const;

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  const label = process.env.ENCOUNTER_SMOKE_LABEL?.trim() || "unnamed";
  try {
    const compat = await checkSchemaCompatibility(prisma, { bypassCache: true });
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        phase: "compat",
        label,
        ok: compat.ok,
        verdict: compat.verdict,
        encounterQueryContractsSafe: compat.encounterQueryContractsSafe,
        d3bMigrationRecorded: compat.presence?.d3bMigrationRecorded ?? null,
        hospitalEpisodeIdColumnPresent:
          compat.presence?.hospitalEpisodeIdColumnPresent ?? null,
      })
    );
    if (!compat.ok) {
      process.exitCode = 1;
      return;
    }

    for (const [name, select] of Object.entries(CONTRACTS)) {
      await prisma.encounter.findMany({
        where: { facilityId: "__smoke_nonexistent_facility__" },
        select,
        take: 1,
      });
      // eslint-disable-next-line no-console
      console.log(
        JSON.stringify({
          phase: "encounter_contract",
          label,
          contract: name,
          ok: true,
        })
      );
    }
  } catch (err) {
    const sanitized = sanitizePrismaException(err);
    // eslint-disable-next-line no-console
    console.error(
      JSON.stringify({
        phase: "encounter_contract",
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
