import { readdirSync } from "node:fs";
import {
  resolvePrismaDataDirectory,
  resolvePrismaHelpersDirectory,
} from "./resolve-prisma-data-directory";

/**
 * Phase G: stale `tsc` output next to Haiti catalog sources makes `ts-node` load `.js`
 * instead of `.ts`, silently ignoring `displayNameEn` and new seed rows.
 *
 * Paths resolve from this helper location (apps/api/prisma/helpers), not process.cwd().
 * Optional apiRoot is ignored so callers cannot accidentally pass prisma/ and get prisma/prisma/data.
 */
export function assertNoStaleHaitiCatalogArtifacts(_apiRoot?: string): void {
  const dataDir = resolvePrismaDataDirectory();
  const helpersDir = resolvePrismaHelpersDirectory();
  /** Only these TS sources were shadowed by stale JS (Phase F); do not flag haiti-geo / haiti-seed-communes. */
  const dataStale = /^(haiti-lab-tests|haiti-imaging-studies|haiti-medications)\.(js|d\.ts|js\.map)$/;
  const helperStale = /^(seed-haiti-lab-imaging-catalog|seed-haiti-medication-catalog)\.(js|d\.ts|js\.map)$/;
  const bad: string[] = [];
  for (const f of readdirSync(dataDir)) {
    if (dataStale.test(f)) bad.push(`prisma/data/${f}`);
  }
  for (const f of readdirSync(helpersDir)) {
    if (helperStale.test(f)) bad.push(`prisma/helpers/${f}`);
  }
  if (bad.length) {
    throw new Error(
      `[catalog] Remove stale compiled prisma artifacts (they shadow .ts and break English-primary seeds): ${bad.join(", ")}`
    );
  }
}
