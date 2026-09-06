/**
 * FY2026 Spanish diagnosis certification. Honest source-limited coverage.
 * Does not claim 74,719/74,719 when the Ministry table cannot supply it.
 *
 *   pnpm --filter @medora/api run icd:certify-spanish-fy2026 -- --release=FY2026
 */
import { PrismaClient } from "@prisma/client";
import { normalizeIcd10CodeForLookup, resolveIcd10DiagnosisDisplay } from "@medora/shared";
import { collectIcd10MultilingualCertification } from "./certify-icd10-multilingual";
import { ICD10_CM_FY2026_MANIFEST } from "./icd10-cm-release-manifest";

const ADVERSARIAL = [
  "A42.1",
  "R14.0",
  "G43.D0",
  "G43.D1",
  "R11",
  "R11.0",
  "R11.1",
  "R11.2",
  "R11.10",
  "R11.11",
  "R11.12",
  "L03",
  "L03.90",
  "R10.84",
  "R10.85",
  "R10.9",
  "R10.10",
  "G35",
  "G35.A",
  "S030XXA",
  "T141",
] as const;

const PARENT_CHILD: Array<[string, string]> = [
  ["R11", "R11.0"],
  ["L03", "L03.90"],
  ["G35", "G35.A"],
];

async function main() {
  const releaseArg = process.argv.find((arg) => arg.startsWith("--release="));
  const releaseVersion = releaseArg?.slice("--release=".length).trim();
  if (!releaseVersion) {
    console.error("Usage: icd:certify-spanish-fy2026 --release=FY2026");
    process.exitCode = 64;
    return;
  }
  const started = Date.now();
  const prisma = new PrismaClient();
  try {
    const counts = await collectIcd10MultilingualCertification(prisma, { releaseVersion });
    const catalog = await prisma.icd10DiagnosisCode.findMany({
      where: { codeSystem: "ICD-10-CM", releaseVersion },
      select: {
        id: true,
        code: true,
        normalizedCode: true,
        codeSystem: true,
        releaseVersion: true,
        shortDescription: true,
        isSelectable: true,
        isActive: true,
      },
    });
    const byNorm = new Map(catalog.map((row) => [row.normalizedCode, row]));
    const terminology = await prisma.icd10DiagnosisTerminology.findMany({
      where: { codeSystem: "ICD-10-CM", releaseVersion, locale: "es" },
      select: {
        icd10CatalogId: true,
        code: true,
        locale: true,
        preferredLabel: true,
        labelRegister: true,
        provenance: true,
        exactness: true,
        status: true,
        isEffective: true,
        sourceId: true,
        terminologyVersion: true,
        codeSystem: true,
        releaseVersion: true,
      },
    });
    const termsByCatalog = new Map<string, typeof terminology>();
    for (const row of terminology) {
      const list = termsByCatalog.get(row.icd10CatalogId) ?? [];
      list.push(row);
      termsByCatalog.set(row.icd10CatalogId, list);
    }

    let parentSuppliedChild = 0;
    for (const [parentCode, childCode] of PARENT_CHILD) {
      const parent = byNorm.get(normalizeIcd10CodeForLookup(parentCode));
      const child = byNorm.get(normalizeIcd10CodeForLookup(childCode));
      if (!parent || !child) {
        console.log(`ADV ${parentCode}->${childCode} parentOrChildMissing`);
        continue;
      }
      const parentResolved = resolveIcd10DiagnosisDisplay({
        codeSystem: parent.codeSystem,
        releaseVersion: parent.releaseVersion,
        code: parent.code,
        locale: "es",
        catalog: parent,
        terminologyRows: termsByCatalog.get(parent.id) ?? [],
      });
      const childResolved = resolveIcd10DiagnosisDisplay({
        codeSystem: child.codeSystem,
        releaseVersion: child.releaseVersion,
        code: child.code,
        locale: "es",
        catalog: child,
        terminologyRows: termsByCatalog.get(child.id) ?? [],
      });
      const inherited =
        parentResolved.localized &&
        childResolved.localized &&
        childResolved.displayName === parentResolved.displayName &&
        !(termsByCatalog.get(child.id) ?? []).some((row) => row.preferredLabel === parentResolved.displayName);
      if (inherited) parentSuppliedChild += 1;
      console.log(
        `ADV ${parentCode}->${childCode} parentLocalized=${parentResolved.localized} childDisplay=${childResolved.displayName} inherited=${inherited ? "YES" : "NO"}`,
      );
    }

    for (const code of ADVERSARIAL) {
      const row = byNorm.get(normalizeIcd10CodeForLookup(code));
      if (!row) {
        console.log(`ADV ${code} US_ABSENT`);
        continue;
      }
      const resolved = resolveIcd10DiagnosisDisplay({
        codeSystem: row.codeSystem,
        releaseVersion: row.releaseVersion,
        code: row.code,
        locale: "es",
        catalog: row,
        terminologyRows: termsByCatalog.get(row.id) ?? [],
      });
      console.log(
        `ADV ${code} selectable=${row.isSelectable} exactness=${resolved.exactness} localized=${resolved.localized} display=${resolved.displayName}`,
      );
    }

    const spainOnlyAttempt = ["S30.1XXA", "T78.07XA"];
    for (const code of spainOnlyAttempt) {
      const row = byNorm.get(normalizeIcd10CodeForLookup(code));
      console.log(`SPAIN_ONLY ${code} usSelectable=${row?.isSelectable === true ? "YES" : "NO"}`);
    }

    console.log(`RELEASE=${counts.release}`);
    console.log(`EN_COVERAGE=${counts.enExact}/${counts.totalSearchable}`);
    console.log(`ES_EXACT_COVERAGE=${counts.esExact}/${counts.totalSearchable}`);
    console.log(`ES_EFFECTIVE_ROWS=${counts.esExact}`);
    console.log(`ES_CODE_ONLY_ROWS=${counts.codeOnlyEs}`);
    console.log(`ES_DUPLICATE_EFFECTIVE=${counts.duplicateEffectiveClinicianLabels}`);
    console.log(`ES_CROSS_LANGUAGE_FALLBACK=${counts.crossLanguageFallback}`);
    console.log(`ES_CATEGORY_SUBSTITUTION=${counts.categorySubstitutions + parentSuppliedChild}`);
    console.log(`ES_ALIAS_AS_DISPLAY=${counts.aliasUsedAsDisplay}`);
    console.log(`ES_CONSUMER_AS_CLINICIAN=${counts.consumerUsedAsClinician}`);
    console.log(`EXPECTED_BILLABLE_ROWS=${ICD10_CM_FY2026_MANIFEST.expectedBillableRows}`);
    console.log(`CERTIFICATION_TIME_MS=${Date.now() - started}`);
    const safety =
      counts.crossLanguageFallback === 0 &&
      counts.categorySubstitutions === 0 &&
      parentSuppliedChild === 0 &&
      counts.aliasUsedAsDisplay === 0 &&
      counts.consumerUsedAsClinician === 0 &&
      counts.duplicateEffectiveClinicianLabels === 0 &&
      counts.canonicalCodeMutations === 0;
    console.log(`SPANISH_SAFETY=${safety ? "PASS" : "FAIL"}`);
    console.log(`SPANISH_COMPLETE=${counts.esExact === counts.totalSearchable ? "YES" : "NO"}`);
    process.exitCode = safety ? 0 : 1;
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
