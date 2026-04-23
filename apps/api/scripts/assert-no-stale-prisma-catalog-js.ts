/**
 * CI / pre-seed guard: fail if stale compiled Haiti catalog JS shadows TypeScript sources.
 *
 *   pnpm --filter @medora/api catalog:guard-stale-js
 */
import { resolve } from "node:path";
import { assertNoStaleHaitiCatalogArtifacts } from "../prisma/helpers/assert-no-stale-haiti-catalog-artifacts";

const API_ROOT = resolve(__dirname, "..");

try {
  assertNoStaleHaitiCatalogArtifacts(API_ROOT);
  console.log("[catalog] No stale haiti/seed-haiti .js artifacts next to prisma sources.");
} catch (e) {
  console.error(e);
  process.exit(1);
}
