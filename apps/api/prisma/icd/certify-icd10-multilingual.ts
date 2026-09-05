/**
 * MEDUI.TRILANG.DX.P2.1 — multilingual ICD terminology certifier.
 *
 * Queries the actual imported ICD release. FULL_TRILINGUAL_COVERAGE is expected
 * to FAIL until genuine FR/ES clinician-grade coverage exists. Do not weaken it.
 *
 * Usage:
 *   pnpm --filter @medora/api run icd:certify-multilingual -- --gate=safety
 *   pnpm --filter @medora/api run icd:certify-multilingual -- --gate=coverage
 *   pnpm --filter @medora/api run icd:certify-multilingual
 *
 * --gate=safety     architecture/safety only. Exit 1 on fail, 0 on pass.
 * --gate=coverage   EN/FR/ES exact coverage. Exit 2 on fail, 0 on pass.
 * no --gate         reports both. Exit 1 if safety fails, 2 if only coverage fails.
 *                   Exit 0 only when BOTH gates pass. Incomplete FR/ES is not a green pass.
 */
import { PrismaClient } from "@prisma/client";
import { normalizeIcd10CodeForLookup } from "@medora/shared";
import {
  countAliasUsedAsDisplay,
  countConsumerUsedAsClinician,
  countCrossLanguageFallback,
  evaluateIcd10MultilingualCertification,
  ICD10_CM_CODE_SYSTEM,
  icd10MultilingualCertificationExitCode,
  resolveIcd10DiagnosisDisplay,
  type Icd10CertificationGate,
  type Icd10MultilingualCertificationCounts,
  type Icd10TerminologyDisplayRow,
} from "@medora/shared";
import { ICD10_CM_FY2026_MANIFEST } from "./icd10-cm-release-manifest";

const CODE_SYSTEM = ICD10_CM_CODE_SYSTEM;
const R11_FAMILY = ["R11.0", "R11.1", "R11.2", "R11.10", "R11.11", "R11.12"] as const;
const CATEGORY_CHILD_PAIRS = [
  ["L03", "L03.90"],
  ["G43", "G43.D0"],
  ["G43", "G43.D1"],
] as const;

function preferOfficialRelease(versions: string[]): string | null {
  if (versions.includes("FY2026")) return "FY2026";
  const nonSample = versions.find((v) => !v.includes("DEV-SAMPLE") && v !== "UNSPECIFIED");
  return nonSample ?? versions[0] ?? null;
}

export async function collectIcd10MultilingualCertification(
  prisma: PrismaClient,
  options?: { releaseVersion?: string },
): Promise<Icd10MultilingualCertificationCounts> {
  const releaseRows = await prisma.icd10DiagnosisCode.groupBy({
    by: ["releaseVersion"],
    where: { codeSystem: CODE_SYSTEM },
    _count: { _all: true },
  });
  const release =
    options?.releaseVersion ??
    preferOfficialRelease(releaseRows.map((row) => row.releaseVersion)) ??
    "NONE";
  const releaseFilter = release === "NONE" ? undefined : release;

  const catalog = await prisma.icd10DiagnosisCode.findMany({
    where: { codeSystem: CODE_SYSTEM, releaseVersion: releaseFilter },
    select: {
      id: true,
      code: true,
      normalizedCode: true,
      codeSystem: true,
      releaseVersion: true,
      shortDescription: true,
      longDescription: true,
      isActive: true,
      isSelectable: true,
    },
  });
  const searchable = catalog.filter((row) => row.isActive && row.isSelectable);
  const catalogById = new Map(catalog.map((row) => [row.id, row]));
  const catalogByNormalized = new Map(catalog.map((row) => [row.normalizedCode, row]));

  const terminology = await prisma.icd10DiagnosisTerminology.findMany({
    where: { codeSystem: CODE_SYSTEM, releaseVersion: releaseFilter },
    select: {
      icd10CatalogId: true,
      codeSystem: true,
      releaseVersion: true,
      code: true,
      locale: true,
      preferredLabel: true,
      labelRegister: true,
      provenance: true,
      exactness: true,
      sourceId: true,
      terminologyVersion: true,
      sourcePriority: true,
      status: true,
      isEffective: true,
    },
  });
  const termsByCatalogId = new Map<string, Icd10TerminologyDisplayRow[]>();
  let invalidTerminologyCodes = 0;
  let orphanTerminology = 0;
  for (const row of terminology) {
    const parent = catalogById.get(row.icd10CatalogId);
    if (!parent) {
      orphanTerminology += 1;
      continue;
    }
    if (
      parent.code !== row.code ||
      parent.codeSystem !== row.codeSystem ||
      parent.releaseVersion !== row.releaseVersion ||
      parent.normalizedCode !== normalizeIcd10CodeForLookup(row.code)
    ) {
      invalidTerminologyCodes += 1;
    }
    const list = termsByCatalogId.get(row.icd10CatalogId) ?? [];
    list.push(row);
    termsByCatalogId.set(row.icd10CatalogId, list);
  }

  const preferredCounts = new Map<string, number>();
  const effectiveCounts = new Map<string, number>();
  for (const row of terminology) {
    if (row.status !== "APPROVED" || row.labelRegister !== "CLINICIAN_PREFERRED") continue;
    const sourceKey = `${row.codeSystem}|${row.releaseVersion}|${row.code}|${row.locale}|${row.labelRegister}|${row.provenance}|${row.sourceId}|${row.terminologyVersion}`;
    preferredCounts.set(sourceKey, (preferredCounts.get(sourceKey) ?? 0) + 1);
    if (row.isEffective) {
      const effectiveKey = `${row.codeSystem}|${row.releaseVersion}|${row.code}|${row.locale}`;
      effectiveCounts.set(effectiveKey, (effectiveCounts.get(effectiveKey) ?? 0) + 1);
    }
  }
  const duplicateActivePreferredLabels = [...preferredCounts.values()].filter((n) => n > 1).length;
  const duplicateEffectiveClinicianLabels = [...effectiveCounts.values()].filter((n) => n > 1).length;

  const aliases = await prisma.icd10DiagnosisSearchAlias.findMany({
    where: { codeSystem: CODE_SYSTEM, releaseVersion: releaseFilter, status: "APPROVED" },
    select: { aliasText: true, code: true, locale: true, icd10CatalogId: true },
  });

  let enExact = 0;
  let frExact = 0;
  let esExact = 0;
  let missingEn = 0;
  let missingFr = 0;
  let missingEs = 0;
  let codeOnlyEn = 0;
  let codeOnlyFr = 0;
  let codeOnlyEs = 0;
  let crossLanguageFallback = 0;
  let consumerUsedAsClinician = 0;
  let aliasUsedAsDisplay = 0;
  let categorySubstitutions = 0;

  for (const row of searchable) {
    const rowsForCode = termsByCatalogId.get(row.id) ?? [];
    const en = resolveIcd10DiagnosisDisplay({
      codeSystem: row.codeSystem,
      releaseVersion: row.releaseVersion,
      code: row.code,
      locale: "en",
      catalog: row,
      terminologyRows: rowsForCode,
    });
    const fr = resolveIcd10DiagnosisDisplay({
      codeSystem: row.codeSystem,
      releaseVersion: row.releaseVersion,
      code: row.code,
      locale: "fr",
      catalog: row,
      terminologyRows: rowsForCode,
    });
    const es = resolveIcd10DiagnosisDisplay({
      codeSystem: row.codeSystem,
      releaseVersion: row.releaseVersion,
      code: row.code,
      locale: "es",
      catalog: row,
      terminologyRows: rowsForCode,
    });

    if (en.exactness === "EXACT_SOURCE" || en.exactness === "EXACT_GOVERNED") enExact += 1;
    else {
      missingEn += 1;
      codeOnlyEn += 1;
    }
    if (fr.exactness === "EXACT_SOURCE" || fr.exactness === "EXACT_GOVERNED") frExact += 1;
    else {
      missingFr += 1;
      codeOnlyFr += 1;
    }
    if (es.exactness === "EXACT_SOURCE" || es.exactness === "EXACT_GOVERNED") esExact += 1;
    else {
      missingEs += 1;
      codeOnlyEs += 1;
    }

    crossLanguageFallback += countCrossLanguageFallback({ fr, es });

    const consumerLabels = new Set(
      rowsForCode.filter((t) => t.labelRegister === "CONSUMER").map((t) => t.preferredLabel),
    );
    consumerUsedAsClinician += countConsumerUsedAsClinician({ fr, es, consumerLabels });

    const clinicianFr = new Set(
      rowsForCode
        .filter((t) => t.locale === "fr" && t.labelRegister === "CLINICIAN_PREFERRED" && t.status === "APPROVED")
        .map((t) => t.preferredLabel),
    );
    const clinicianEs = new Set(
      rowsForCode
        .filter((t) => t.locale === "es" && t.labelRegister === "CLINICIAN_PREFERRED" && t.status === "APPROVED")
        .map((t) => t.preferredLabel),
    );
    aliasUsedAsDisplay += countAliasUsedAsDisplay({
      catalogId: row.id,
      fr,
      es,
      clinicianFrLabels: clinicianFr,
      clinicianEsLabels: clinicianEs,
      aliases,
    });
  }

  for (const [parentCode, childCode] of CATEGORY_CHILD_PAIRS) {
    const parentRow = catalogByNormalized.get(normalizeIcd10CodeForLookup(parentCode));
    const childRow = catalogByNormalized.get(normalizeIcd10CodeForLookup(childCode));
    if (!parentRow || !childRow) continue;
    for (const locale of ["fr", "es"] as const) {
      const parentResolved = resolveIcd10DiagnosisDisplay({
        codeSystem: parentRow.codeSystem,
        releaseVersion: parentRow.releaseVersion,
        code: parentRow.code,
        locale,
        catalog: parentRow,
        terminologyRows: termsByCatalogId.get(parentRow.id) ?? [],
      });
      const childResolved = resolveIcd10DiagnosisDisplay({
        codeSystem: childRow.codeSystem,
        releaseVersion: childRow.releaseVersion,
        code: childRow.code,
        locale,
        catalog: childRow,
        terminologyRows: termsByCatalogId.get(childRow.id) ?? [],
      });
      const childHasOwn = (termsByCatalogId.get(childRow.id) ?? []).some(
        (t) =>
          t.locale === locale &&
          t.status === "APPROVED" &&
          t.labelRegister === "CLINICIAN_PREFERRED" &&
          t.preferredLabel === parentResolved.displayName,
      );
      if (parentResolved.localized && childResolved.displayName === parentResolved.displayName && !childHasOwn) {
        categorySubstitutions += 1;
      }
    }
  }

  for (const code of R11_FAMILY) {
    const row = catalogByNormalized.get(normalizeIcd10CodeForLookup(code));
    if (!row) continue;
    for (const other of R11_FAMILY) {
      if (other === code) continue;
      const otherRow = catalogByNormalized.get(normalizeIcd10CodeForLookup(other));
      if (!otherRow) continue;
      for (const locale of ["fr", "es"] as const) {
        const resolved = resolveIcd10DiagnosisDisplay({
          codeSystem: row.codeSystem,
          releaseVersion: row.releaseVersion,
          code: row.code,
          locale,
          catalog: row,
          terminologyRows: termsByCatalogId.get(otherRow.id) ?? [],
        });
        if (resolved.localized) categorySubstitutions += 1;
      }
    }
  }

  const linkedMismatches = await prisma.$queryRaw<Array<{ n: bigint }>>`
    SELECT COUNT(*)::bigint AS n
    FROM "Diagnosis" d
    INNER JOIN "Icd10DiagnosisCode" c ON c."id" = d."icd10CatalogId"
    WHERE d."code" <> c."code"
  `;

  return {
    release,
    totalSearchable: searchable.length,
    enExact,
    frExact,
    esExact,
    missingEn,
    missingFr,
    missingEs,
    codeOnlyEn,
    codeOnlyFr,
    codeOnlyEs,
    categorySubstitutions,
    invalidTerminologyCodes,
    orphanTerminology,
    duplicateActivePreferredLabels,
    duplicateEffectiveClinicianLabels,
    crossLanguageFallback,
    aliasUsedAsDisplay,
    consumerUsedAsClinician,
    canonicalCodeMutations: Number(linkedMismatches[0]?.n ?? 0),
    expectedBillableRows: ICD10_CM_FY2026_MANIFEST.expectedBillableRows,
  };
}

function printReport(counts: Icd10MultilingualCertificationCounts) {
  const gates = evaluateIcd10MultilingualCertification(counts);
  const lines = [
    `RELEASE=${counts.release}`,
    `TOTAL_SEARCHABLE=${counts.totalSearchable}`,
    `EN_EXACT=${counts.enExact}`,
    `FR_EXACT=${counts.frExact}`,
    `ES_EXACT=${counts.esExact}`,
    `MISSING_EN=${counts.missingEn}`,
    `MISSING_FR=${counts.missingFr}`,
    `MISSING_ES=${counts.missingEs}`,
    `CODE_ONLY_EN=${counts.codeOnlyEn}`,
    `CODE_ONLY_FR=${counts.codeOnlyFr}`,
    `CODE_ONLY_ES=${counts.codeOnlyEs}`,
    `CATEGORY_SUBSTITUTIONS=${counts.categorySubstitutions}`,
    `INVALID_TERMINOLOGY_CODES=${counts.invalidTerminologyCodes}`,
    `ORPHAN_TERMINOLOGY=${counts.orphanTerminology}`,
    `DUPLICATE_ACTIVE_PREFERRED_LABELS=${counts.duplicateActivePreferredLabels}`,
    `DUPLICATE_EFFECTIVE_CLINICIAN_LABELS=${counts.duplicateEffectiveClinicianLabels}`,
    `CROSS_LANGUAGE_FALLBACK=${counts.crossLanguageFallback}`,
    `ALIAS_USED_AS_DISPLAY=${counts.aliasUsedAsDisplay}`,
    `CONSUMER_USED_AS_CLINICIAN=${counts.consumerUsedAsClinician}`,
    `CANONICAL_CODE_MUTATIONS=${counts.canonicalCodeMutations}`,
    `SAFE_ARCHITECTURE=${gates.SAFE_ARCHITECTURE ? "PASS" : "FAIL"}`,
    `FULL_TRILINGUAL_COVERAGE=${gates.FULL_TRILINGUAL_COVERAGE ? "PASS" : "FAIL"}`,
    `AMBIGUOUS_GREEN=NO`,
  ];
  for (const line of lines) console.log(line);
  return gates;
}

function parseCli(argv: string[]): {
  gate: Icd10CertificationGate | "both" | "help";
  releaseVersion?: string;
} {
  if (argv.includes("--help") || argv.includes("-h")) return { gate: "help" };
  const gateArg = argv.find((arg) => arg.startsWith("--gate="));
  const releaseArg = argv.find((arg) => arg.startsWith("--release="));
  const releaseVersion = releaseArg?.slice("--release=".length).trim() || undefined;
  if (!gateArg) return { gate: "both", releaseVersion };
  const value = gateArg.slice("--gate=".length);
  if (value === "safety" || value === "coverage") return { gate: value, releaseVersion };
  return { gate: "help" };
}

function printUsage() {
  console.log("Usage: icd:certify-multilingual --gate=safety|coverage [--release=FY2026]");
  console.log("  --gate=safety     architecture/safety only (exit 1 on fail)");
  console.log("  --gate=coverage   full EN/FR/ES exact coverage (exit 2 on fail; expected FAIL today)");
  console.log("  no --gate         report both; exit 1 if safety fails, exit 2 if only coverage fails");
  console.log("  Exit 0 only when the selected gate(s) pass. Incomplete FR/ES is not a green pass.");
}

async function main() {
  const { gate, releaseVersion } = parseCli(process.argv.slice(2));
  if (gate === "help") {
    printUsage();
    process.exitCode = 64;
    return;
  }
  const prisma = new PrismaClient();
  try {
    const counts = await collectIcd10MultilingualCertification(prisma, { releaseVersion });
    const gates = printReport(counts);
    console.log(`GATE=${gate}`);
    process.exitCode = icd10MultilingualCertificationExitCode(gate, gates);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
