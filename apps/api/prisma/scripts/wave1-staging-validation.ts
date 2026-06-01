/**
 * Phase 2E.4B — Wave 1 staging validation (read-only checks + search smoke).
 * Usage: pnpm --filter @medora/api exec ts-node --transpile-only prisma/scripts/wave1-staging-validation.ts
 */
import { PrismaClient } from "@prisma/client";
import {
  HAITI_IMAGING_WAVE1_CATALOG,
  WAVE1_FORBIDDEN_CATALOG_CODES,
  WAVE1_IMAGING_BATCH_COUNTS,
  WAVE1_XR_CHEST_TUPLE_ALIASES,
} from "../data/haiti-imaging-wave1";
import { HAITI_IMAGING_CATALOG } from "../data/haiti-imaging-studies";
import { ImagingCatalogService } from "../../src/order-catalog/imaging-catalog.service";

const WAVE1_CODES = HAITI_IMAGING_WAVE1_CATALOG.map((r) => r.code);
const BASELINE_CODES = HAITI_IMAGING_CATALOG.map((r) => r.code);

type Check = { name: string; pass: boolean; detail: string };

async function main() {
  const prisma = new PrismaClient();
  const imagingSearch = new ImagingCatalogService(prisma as never);
  const checks: Check[] = [];

  const wave1Studies = await prisma.catalogImagingStudy.findMany({
    where: { code: { in: [...WAVE1_CODES] } },
    include: {
      aliases: true,
      modalityClassifier: true,
      bodyRegionClassifier: true,
      contrastTypeClassifier: true,
      lateralityClassifier: true,
      viewCountClassifier: true,
      anatomicSubregionClassifier: true,
      protocolClassifier: true,
    },
  });

  const xr1 = HAITI_IMAGING_WAVE1_CATALOG.filter((r) => r.implementationBatch === "XR-1").length;
  const ct1 = HAITI_IMAGING_WAVE1_CATALOG.filter((r) => r.implementationBatch === "CT-1").length;
  const mri1 = HAITI_IMAGING_WAVE1_CATALOG.filter((r) => r.implementationBatch === "MRI-1").length;

  checks.push({
    name: "Wave 1 row count",
    pass: wave1Studies.length === 37,
    detail: `found ${wave1Studies.length} (expected 37)`,
  });
  checks.push({
    name: "XR-1 / CT-1 / MRI-1 manifest batches",
    pass: xr1 === 19 && ct1 === 7 && mri1 === 11,
    detail: `manifest ${xr1}/${ct1}/${mri1}`,
  });

  const activeWave1 = wave1Studies.filter((s) => s.isActive);
  checks.push({
    name: "All Wave 1 rows active",
    pass: activeWave1.length === 37,
    detail: `${activeWave1.length} active`,
  });

  const wave1AliasRows = await prisma.imagingStudyAlias.findMany({
    where: { catalogImagingStudy: { code: { in: [...WAVE1_CODES] } } },
  });
  checks.push({
    name: "Wave 1 alias count",
    pass: wave1AliasRows.length === 41,
    detail: `found ${wave1AliasRows.length} (expected 41)`,
  });

  const xrChest = await prisma.catalogImagingStudy.findUnique({
    where: { code: "XR_CHEST" },
    include: { aliases: true },
  });
  const tupleNormalized = WAVE1_XR_CHEST_TUPLE_ALIASES.map((a) => a.toLowerCase());
  const xrChestTupleFound = tupleNormalized.every((a) =>
    xrChest?.aliases.some((row) => row.alias === a)
  );
  checks.push({
    name: "XR_CHEST tuple-pass aliases",
    pass: xrChestTupleFound && (xrChest?.aliases.filter((a) => tupleNormalized.includes(a.alias)).length ?? 0) === 2,
    detail: `tuple aliases present: ${xrChestTupleFound}`,
  });

  const wave1DupAliasGroups = await prisma.$queryRaw<Array<{ alias: string; cnt: bigint }>>`
    SELECT a.alias, COUNT(*)::bigint AS cnt
    FROM "ImagingStudyAlias" a
    INNER JOIN "CatalogImagingStudy" c ON c.id = a."catalogImagingStudyId"
    WHERE c.code = ANY(${WAVE1_CODES}::text[])
    GROUP BY a.alias
    HAVING COUNT(*) > 1
  `;
  checks.push({
    name: "No duplicate aliases within Wave 1 codes",
    pass: wave1DupAliasGroups.length === 0,
    detail: wave1DupAliasGroups.length ? `${wave1DupAliasGroups.length} duplicated` : "0 duplicates",
  });

  let classifierIncomplete = 0;
  for (const row of HAITI_IMAGING_WAVE1_CATALOG) {
    const study = wave1Studies.find((s) => s.code === row.code);
    if (!study) continue;
    const c = row.classifiers;
    const required =
      study.modalityClassifier?.code === c.modality &&
      study.bodyRegionClassifier?.code === c.bodyRegion &&
      study.contrastTypeClassifier?.code === c.contrastType &&
      study.lateralityClassifier?.code === c.laterality;
    const viewOk = c.viewCount ? study.viewCountClassifier?.code === c.viewCount : !study.viewCountClassifierId;
    const subOk = c.anatomicSubregion
      ? study.anatomicSubregionClassifier?.code === c.anatomicSubregion
      : !study.anatomicSubregionClassifierId;
    const protoOk = c.protocol ? study.protocolClassifier?.code === c.protocol : !study.protocolClassifierId;
    if (!required || !viewOk || !subOk || !protoOk) classifierIncomplete += 1;
  }
  checks.push({
    name: "Classifier FK completeness (37/37)",
    pass: classifierIncomplete === 0,
    detail: `${37 - classifierIncomplete}/37 complete`,
  });

  const ribsLeft = wave1Studies.find((s) => s.code === "XR_RIBS_LEFT");
  const ribsRight = wave1Studies.find((s) => s.code === "XR_RIBS_RIGHT");
  checks.push({
    name: "Rib subregion correction",
    pass:
      ribsLeft?.anatomicSubregionClassifier?.code === "ANATOMIC_SUBREGION_RIBS" &&
      ribsRight?.anatomicSubregionClassifier?.code === "ANATOMIC_SUBREGION_RIBS",
    detail: `left=${ribsLeft?.anatomicSubregionClassifier?.code ?? "null"} right=${ribsRight?.anatomicSubregionClassifier?.code ?? "null"}`,
  });

  const ctHead = await prisma.catalogImagingStudy.findUnique({ where: { code: "CT_HEAD" } });
  checks.push({
    name: "CT_HEAD remains inactive",
    pass: ctHead?.isActive === false,
    detail: `isActive=${ctHead?.isActive}`,
  });

  const wave1ForbiddenInserted = WAVE1_CODES.filter((code) =>
    (WAVE1_FORBIDDEN_CATALOG_CODES as readonly string[]).includes(code)
  );
  checks.push({
    name: "Wave 1 did not insert forbidden catalog codes",
    pass: wave1ForbiddenInserted.length === 0,
    detail: wave1ForbiddenInserted.join(", ") || "none",
  });

  const ctAbdCount = await prisma.catalogImagingStudy.count({ where: { code: "CT_ABD" } });
  checks.push({
    name: "CT_ABD not duplicated",
    pass: ctAbdCount === 1,
    detail: `count=${ctAbdCount}`,
  });

  const totalActiveImaging = await prisma.catalogImagingStudy.count({ where: { isActive: true } });
  const baselineActive = HAITI_IMAGING_CATALOG.filter((r) => r.isActive).length;
  checks.push({
    name: "Active catalog growth (44 baseline active + 37 wave1)",
    pass: totalActiveImaging === baselineActive + 37,
    detail: `active=${totalActiveImaging} (expected ${baselineActive + 37})`,
  });

  const billingTouched = await prisma.catalogImagingStudy.count({
    where: { code: { in: [...WAVE1_CODES] }, billingCodeDefault: { not: null } },
  });
  checks.push({
    name: "Wave 1 billingCodeDefault unset (PENDING_CPT_REVIEW design)",
    pass: billingTouched === 0,
    detail: `${billingTouched} rows with billingCodeDefault`,
  });

  const searchCases: Array<{ q: string; expectCode: string }> = [
    { q: "sacrum", expectCode: "XR_SACRUM_COCCYX_2V" },
    { q: "coccyx and sacrum", expectCode: "XR_SACRUM_COCCYX_2V" },
    { q: "tdm tête avec", expectCode: "CT_HEAD_W_CONTRAST" },
    { q: "irm rachis cervical", expectCode: "MRI_CSPINE_WO_CONTRAST" },
    { q: "thorax", expectCode: "XR_CHEST" },
    { q: "ct head", expectCode: "CT_HEAD_WO_CONTRAST" },
  ];
  const searchResults: string[] = [];
  for (const { q, expectCode } of searchCases) {
    const { items } = await imagingSearch.search({ q, limit: 20 });
    const codes = items.map((i) => i.code);
    const hit = codes.includes(expectCode);
    searchResults.push(`${q} → ${hit ? "PASS" : "FAIL"} (expected ${expectCode}, got ${codes.slice(0, 5).join(",")})`);
    checks.push({
      name: `Search: ${q}`,
      pass: hit,
      detail: codes.slice(0, 8).join(", ") || "(empty)",
    });
  }

  const ctHeadSearch = await imagingSearch.search({ q: "ct head", limit: 20 });
  const ctHeadActiveInSearch = ctHeadSearch.items.some((i) => i.code === "CT_HEAD");
  checks.push({
    name: "CT_HEAD not in active search results",
    pass: !ctHeadActiveInSearch,
    detail: ctHeadSearch.items.map((i) => i.code).join(", "),
  });

  const baselineSample = ["XR_CHEST", "MRI_BRAIN", "CT_ABDOMEN_PELVIS"];
  for (const code of baselineSample) {
    const row = await prisma.catalogImagingStudy.findUnique({ where: { code } });
    checks.push({
      name: `Baseline row ${code} still active`,
      pass: row?.isActive === true,
      detail: `isActive=${row?.isActive}`,
    });
  }

  const failed = checks.filter((c) => !c.pass);
  console.log(JSON.stringify({
    summary: {
      pass: failed.length === 0,
      checksTotal: checks.length,
      checksFailed: failed.length,
      wave1Studies: wave1Studies.length,
      wave1Aliases: wave1AliasRows.length,
      totalActiveImaging,
      baselineActiveManifest: baselineActive,
    },
    checks,
    searchResults,
  }, null, 2));

  await prisma.$disconnect();
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
