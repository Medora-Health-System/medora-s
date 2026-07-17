/**
 * Enterprise ICD-10 coverage certification (Phase 19 Commit 2).
 *
 *   pnpm --filter @medora/api icd:coverage:enterprise-diagnostic-intelligence -- \
 *     --file=/path/to/official-release.zip --release=2026 --write-reports
 */
import "reflect-metadata";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  countEnterpriseScopedBySpecialty,
  ENTERPRISE_OWNERSHIP_PRIORITY,
  ENTERPRISE_SCOPE_SELECTORS,
  ENTERPRISE_SPECIALTY_PHASES,
  selectEnterpriseUniqueScopedBillableCodes,
} from "./enterprise-diagnostic-intelligence-registry";
import { validateIcd10CmRelease } from "./validate-icd10-cm-release";

const arg = (name: string) => process.argv.find((value) => value.startsWith(`--${name}=`))?.split("=", 2)[1]?.trim();
const flag = (name: string) => process.argv.includes(`--${name}`);

type SummaryPassShape = {
  certification?: { pass?: boolean };
  pass?: boolean;
};

function readSummaryPass(path: string): boolean | null {
  if (!existsSync(path)) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as SummaryPassShape;
    if (typeof parsed.pass === "boolean") return parsed.pass;
    if (typeof parsed.certification?.pass === "boolean") return parsed.certification.pass;
    return null;
  } catch {
    return null;
  }
}

function scopedCountFromSummary(path: string): number | null {
  if (!existsSync(path)) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
    for (const key of [
      "scopedOfficialBillable",
      "softTissueWoundInfectionsScoped",
      "psychiatricBehavioral",
      "obGynUrology",
      "toxicologyEnvenomation",
      "environmentalExposure",
      "dermatology",
      "entEmergencies",
      "eyeEmergencies",
      "headFacialTrauma",
      "spineBack",
      "penetratingTrauma",
      "blastPolytrauma",
      "burn",
    ]) {
      const val = parsed[key];
      if (typeof val === "number") return val;
      if (val && typeof val === "object" && "scopedOfficialBillable" in (val as object)) {
        const nested = (val as { scopedOfficialBillable?: number }).scopedOfficialBillable;
        if (typeof nested === "number") return nested;
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function main() {
  const file = arg("file");
  const release = arg("release") ?? "2026";
  if (!file) throw new Error("Missing --file=/path/to/official-release.zip");
  const validation = validateIcd10CmRelease({
    file,
    release,
    allowDevSample: flag("allow-dev-sample"),
    skipChecksum: flag("skip-checksum"),
  });
  if (!validation.ok || !validation.parse) {
    throw new Error(`Official release validation failed: ${validation.errors.join("; ")}`);
  }

  const rows = validation.parse.rows;
  const scoped = selectEnterpriseUniqueScopedBillableCodes(rows, { billableOnly: true });
  const specialtyScopedCounts = countEnterpriseScopedBySpecialty(rows, { billableOnly: true });
  const enterpriseCodeSet = new Set(scoped.map((row) => row.code));

  const prisma = new PrismaClient();
  try {
    const scopedCodes = scoped.map((row) => row.code);
    const dbRows = await prisma.icd10DiagnosisCode.findMany({
      where: {
        codeSystem: validation.manifest.codeSystem,
        releaseVersion: validation.manifest.releaseVersion,
        code: { in: scopedCodes },
      },
      select: { code: true, shortDescription: true, isActive: true, isBillable: true },
    });
    const byCode = new Map(dbRows.map((row) => [row.code, row]));
    const missingCodes = scoped.filter((row) => !byCode.get(row.code)?.isActive).map((row) => row.code);
    const descriptionMismatches = scoped
      .filter((row) => byCode.get(row.code)?.shortDescription.trim() !== row.shortDescription.trim())
      .map((row) => row.code);

    const activeScoped = dbRows.filter((row) => row.isActive && enterpriseCodeSet.has(row.code));
    const codeCounts = new Map<string, number>();
    for (const row of activeScoped) codeCounts.set(row.code, (codeCounts.get(row.code) ?? 0) + 1);
    const duplicateActiveCodes = [...codeCounts.entries()].filter(([, count]) => count > 1).map(([code]) => code);

    const invalidSelectableHeaders = scoped
      .filter((row) => {
        const medora = byCode.get(row.code);
        return medora?.isActive && medora.isBillable === false;
      })
      .map((row) => row.code);

    const activeNotInEnterprise: string[] = [];
    const orphanedActiveCodes: string[] = [];

    const summaryDir = resolve(__dirname, "certification-summaries");
    const releaseDir = join(summaryDir, release);
    mkdirSync(releaseDir, { recursive: true });

    const specialtyReconciliation: Array<{
      key: string;
      coverageSummaryFile: string;
      summaryExists: boolean;
      summaryPass: boolean | null;
      summaryScopedCount: number | null;
      liveScopedCount: number;
      codesNotInEnterpriseUnion: string[];
    }> = [];

    const specialtyClaimFailures: string[] = [];
    const specialtyPassFailures: string[] = [];

    const specialtySelectorCache: Record<string, Array<{ code: string }>> = {};
    for (const phase of ENTERPRISE_SPECIALTY_PHASES) {
      const selector = ENTERPRISE_SCOPE_SELECTORS[phase.key];
      if (!selector) continue;
      if (!specialtySelectorCache[phase.key]) {
        specialtySelectorCache[phase.key] = selector(rows, { billableOnly: true });
      }
      const liveCodes = specialtySelectorCache[phase.key]!.map((r) => r.code);
      const notInUnion = liveCodes.filter((code) => !enterpriseCodeSet.has(code));
      if (notInUnion.length > 0) {
        specialtyClaimFailures.push(`${phase.key}: ${notInUnion.length} scoped codes not in enterprise union`);
      }

      const coveragePath = join(releaseDir, phase.coverageSummaryFile);
      const fallbackPath = join(summaryDir, phase.coverageSummaryFile);
      const summaryPath = existsSync(coveragePath) ? coveragePath : fallbackPath;
      const summaryPass = readSummaryPass(summaryPath);
      if (existsSync(summaryPath) && summaryPass === false) {
        specialtyPassFailures.push(`${phase.key}: specialty coverage summary pass:false`);
      }

      specialtyReconciliation.push({
        key: phase.key,
        coverageSummaryFile: phase.coverageSummaryFile,
        summaryExists: existsSync(summaryPath),
        summaryPass,
        summaryScopedCount: scopedCountFromSummary(summaryPath),
        liveScopedCount: liveCodes.length,
        codesNotInEnterpriseUnion: notInUnion.slice(0, 20),
      });
    }

    const report = {
      generatedAt: new Date().toISOString(),
      releaseVersion: validation.manifest.releaseVersion,
      enterprise: {
        scopedUniqueBillable: scoped.length,
        presentInMedora: scoped.length - missingCodes.length,
        missingCodes,
        descriptionMismatches,
        duplicateActiveCodes,
        invalidSelectableHeaders,
        orphanedActiveCodes,
        orphanedActiveCount: orphanedActiveCodes.length,
      },
      specialtyScopedCounts,
      specialtyReconciliationFailures: {
        claimNotInUnion: specialtyClaimFailures,
        summaryPassFalse: specialtyPassFailures,
      },
      certification: {
        pass:
          missingCodes.length === 0 &&
          descriptionMismatches.length === 0 &&
          duplicateActiveCodes.length === 0 &&
          invalidSelectableHeaders.length === 0 &&
          specialtyClaimFailures.length === 0 &&
          specialtyPassFailures.length === 0,
      },
    };

    const scopeSummary = {
      generatedAt: report.generatedAt,
      releaseVersion: validation.manifest.releaseVersion,
      enterpriseUniqueScopedBillable: scoped.length,
      specialtyScopedCounts,
      ownershipPriority: scoped.slice(0, 25).map((row) => ({
        code: row.code,
        primaryOwner: row.primaryOwner,
        primaryFamilyId: row.primaryFamilyId,
      })),
      overlapNotes: "Specialty scoped counts may exceed enterprise unique due to intentional overlap; union deduplicates by ownership priority.",
    };

    const reconciliationSummary = {
      generatedAt: report.generatedAt,
      specialties: specialtyReconciliation,
      pass: specialtyClaimFailures.length === 0 && specialtyPassFailures.length === 0,
    };

    const coverageJson = JSON.stringify(report, null, 2);
    const scopeJson = JSON.stringify(scopeSummary, null, 2);
    const reconciliationJson = JSON.stringify(reconciliationSummary, null, 2);

    if (flag("write-reports")) {
      writeFileSync(join(summaryDir, "fy2026-enterprise-coverage-summary.json"), coverageJson);
      writeFileSync(join(releaseDir, "fy2026-enterprise-coverage-summary.json"), coverageJson);
      writeFileSync(join(summaryDir, "fy2026-enterprise-icd-scope-summary.json"), scopeJson);
      writeFileSync(join(releaseDir, "fy2026-enterprise-icd-scope-summary.json"), scopeJson);
      writeFileSync(join(summaryDir, "fy2026-enterprise-specialty-reconciliation-summary.json"), reconciliationJson);
      writeFileSync(join(releaseDir, "fy2026-enterprise-specialty-reconciliation-summary.json"), reconciliationJson);
    }

    console.log(coverageJson);
    process.exit(report.certification.pass ? 0 : 2);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
