/**
 * Validate an official ICD-10-CM release artifact before any DB writes.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import {
  resolveIcd10CmReleaseManifest,
  type Icd10CmReleaseManifest,
} from "./icd10-cm-release-manifest";
import { parseIcd10CmReleaseFile, type ParseIcd10CmReleaseResult } from "./parse-icd10-cm-release";

export type ValidateIcd10CmReleaseResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  manifest: Icd10CmReleaseManifest;
  resolvedSourcePath: string;
  artifactSha256: string | null;
  parse: ParseIcd10CmReleaseResult | null;
};

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function extractOrderFileFromZip(zipPath: string, preferredInnerFile: string): string {
  const dir = mkdtempSync(join(tmpdir(), "medora-icd-"));
  try {
    execFileSync("unzip", ["-o", zipPath, "-d", dir], { stdio: "pipe" });
    const candidate = join(dir, preferredInnerFile);
    if (existsSync(candidate)) {
      // Copy out of temp lifecycle by reading into a stable path under the same temp and returning path
      // Callers read immediately; keep dir until process ends for dry-run simplicity.
      return candidate;
    }
    // Fallback: find first *-order-*.txt
    const listing = execFileSync("find", [dir, "-iname", "*order*.txt"], { encoding: "utf8" })
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const preferredBase = basename(preferredInnerFile);
    const exact = listing.find((p) => basename(p) === preferredBase);
    if (exact) return exact;
    const annual = listing.find((p) => /icd10cm-order-\d+\.txt$/i.test(p));
    if (annual) return annual;
    if (listing[0]) return listing[0]!;
    throw new Error(`ZIP does not contain ${preferredInnerFile}`);
  } catch (e) {
    rmSync(dir, { recursive: true, force: true });
    throw e;
  }
}

export function validateIcd10CmRelease(opts: {
  file: string;
  release: string;
  allowDevSample?: boolean;
  skipChecksum?: boolean;
  limit?: number;
}): ValidateIcd10CmReleaseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const manifest = resolveIcd10CmReleaseManifest(opts.release);
  const filePath = resolve(opts.file);
  let artifactSha256: string | null = null;
  let resolvedSourcePath = filePath;
  let parse: ParseIcd10CmReleaseResult | null = null;

  if (!existsSync(filePath)) {
    errors.push(`Source file not found: ${filePath}`);
    return { ok: false, errors, warnings, manifest, resolvedSourcePath, artifactSha256, parse };
  }

  const isDevSample = manifest.releaseVersion.includes("DEV-SAMPLE");
  if (isDevSample && !opts.allowDevSample) {
    errors.push(
      `Release ${manifest.releaseVersion} is development-only. Pass --allow-dev-sample for local demo, never for production certification.`,
    );
  }

  const base = basename(filePath).toLowerCase();
  if (base.endsWith(".zip")) {
    artifactSha256 = sha256File(filePath);
    if (!opts.skipChecksum && manifest.artifactSha256 && artifactSha256 !== manifest.artifactSha256) {
      errors.push(
        `Artifact SHA-256 mismatch for ${basename(filePath)}. expected=${manifest.artifactSha256} actual=${artifactSha256}`,
      );
    }
    try {
      resolvedSourcePath = extractOrderFileFromZip(filePath, manifest.preferredInnerFile);
    } catch (e) {
      errors.push(`Failed to extract order file from ZIP: ${e instanceof Error ? e.message : String(e)}`);
      return { ok: false, errors, warnings, manifest, resolvedSourcePath: filePath, artifactSha256, parse };
    }
  } else if (base.endsWith(".txt") || base.endsWith(".csv")) {
    artifactSha256 = sha256File(filePath);
    if (
      !opts.skipChecksum &&
      !isDevSample &&
      manifest.preferredInnerFileSha256 &&
      basename(filePath) === manifest.preferredInnerFile &&
      artifactSha256 !== manifest.preferredInnerFileSha256
    ) {
      errors.push(
        `Order-file SHA-256 mismatch for ${basename(filePath)}. expected=${manifest.preferredInnerFileSha256} actual=${artifactSha256}`,
      );
    }
    if (
      !opts.skipChecksum &&
      !isDevSample &&
      base.endsWith(".zip") === false &&
      basename(filePath) !== manifest.preferredInnerFile &&
      basename(filePath) !== manifest.artifactFileName
    ) {
      warnings.push(
        `Source basename ${basename(filePath)} does not match manifest preferred file ${manifest.preferredInnerFile}; checksum of inner preferred file was not enforced.`,
      );
    }
  } else {
    errors.push(`Unsupported source type (expected .zip, .txt, or .csv): ${filePath}`);
  }

  if (errors.length > 0) {
    return { ok: false, errors, warnings, manifest, resolvedSourcePath, artifactSha256, parse };
  }

  try {
    parse = parseIcd10CmReleaseFile(resolvedSourcePath, {
      format: resolvedSourcePath.toLowerCase().endsWith(".csv") ? "medora_csv" : "auto",
      limit: opts.limit,
    });
  } catch (e) {
    errors.push(`Parse failed: ${e instanceof Error ? e.message : String(e)}`);
    return { ok: false, errors, warnings, manifest, resolvedSourcePath, artifactSha256, parse };
  }

  if (parse.parseFailures.length > 0) {
    errors.push(`Parse failures: ${parse.parseFailures.length} (first line ${parse.parseFailures[0]?.lineNumber})`);
  }
  if (parse.duplicateCodes.length > 0) {
    errors.push(`Duplicate codes in source: ${parse.duplicateCodes.length}`);
  }
  if (!opts.limit && !isDevSample) {
    if (parse.rows.length !== manifest.expectedOrderRows) {
      errors.push(
        `Row count mismatch: expected ${manifest.expectedOrderRows}, parsed ${parse.rows.length}`,
      );
    }
    if (parse.billableCount !== manifest.expectedBillableRows) {
      errors.push(
        `Billable count mismatch: expected ${manifest.expectedBillableRows}, parsed ${parse.billableCount}`,
      );
    }
  }
  if (
    !opts.skipChecksum &&
    !isDevSample &&
    basename(resolvedSourcePath) === manifest.preferredInnerFile &&
    parse.sourceSha256 !== manifest.preferredInnerFileSha256
  ) {
    errors.push(
      `Parsed source SHA-256 mismatch. expected=${manifest.preferredInnerFileSha256} actual=${parse.sourceSha256}`,
    );
  }

  // Non-billable headers must not be selectable.
  const invalidSelectable = parse.rows.filter((r) => !r.isBillable && r.isSelectable);
  if (invalidSelectable.length > 0) {
    errors.push(`Invalid selectable header rows: ${invalidSelectable.length}`);
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    manifest,
    resolvedSourcePath,
    artifactSha256,
    parse,
  };
}
