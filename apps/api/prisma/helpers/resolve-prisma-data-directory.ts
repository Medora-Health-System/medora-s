import { resolve } from "node:path";

/**
 * Stable path resolvers for Prisma seed file assets.
 * Anchored to this helper file under apps/api/prisma/helpers — not process.cwd().
 */

/** Absolute path to apps/api/prisma/data */
export function resolvePrismaDataDirectory(): string {
  return resolve(__dirname, "..", "data");
}

/** Absolute path to apps/api/prisma/helpers */
export function resolvePrismaHelpersDirectory(): string {
  return resolve(__dirname);
}

/** Absolute path to apps/api/prisma */
export function resolvePrismaDirectory(): string {
  return resolve(__dirname, "..");
}

/**
 * Absolute path to the @medora/api package root (apps/api).
 * Use as cwd for tools that expect relative paths like `prisma/data/...`.
 */
export function resolveApiPackageRoot(): string {
  return resolve(__dirname, "..", "..");
}
