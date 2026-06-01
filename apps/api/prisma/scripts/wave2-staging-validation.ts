/**
 * Phase 2E.6B — Wave 2 staging validation (read-only checks + search smoke).
 * Usage: pnpm --filter @medora/api exec ts-node --transpile-only prisma/scripts/wave2-staging-validation.ts
 */
import { PrismaClient } from "@prisma/client";
import { HAITI_IMAGING_WAVE1_CATALOG } from "../data/haiti-imaging-wave1";
import {
  HAITI_IMAGING_WAVE2_CATALOG as W2,
  WAVE2_IMAGING_BATCH_COUNTS as W2C,
} from "../data/haiti-imaging-wave2";
import { HAITI_IMAGING_CATALOG } from "../data/haiti-imaging-studies";
import { WAVE2_US_TUPLE_PASS_COUNT } from "../data/wave2-us-tuple-pass";
import { ImagingCatalogService } from "../../src/order-catalog/imaging-catalog.service";

const WAVE2_CODES = W2.map((r) => r.code);
const WAVE1_CODES = HAITI_IMAGING_WAVE1_CATALOG.map((r) => r.code);

type Check = { name: string; pass: boolean; detail: string };

async function main() {
  const prisma = new PrismaClient();
  const imagingSearch = new ImagingCatalogService(prisma as never);
  const checks: Check[] = [];

  const wave2Studies = await prisma.catalogImagingStudy.findMany({
    where: { code: { in: [...WAVE2_CODES] } },
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

  checks.push({
    name: "Wave 2 row count",
    pass: wave2Studies.length === 61,
    detail: `found ${wave2Studies.length} (expected 61)`,
  });
  checks.push({
    name: "XR-2 / CT-2 / US-1 manifest batches",
    pass:
      W2C.xr === 53 &&
      W2C.ct === 4 &&
      W2C.us === 4 &&
      W2.filter((r) => r.implementationBatch === "XR-2").length === 53,
    detail: `manifest ${W2C.xr}/${W2C.ct}/${W2C.us}`,
  });

  const activeWave2 = wave2Studies.filter((s) => s.isActive);
  checks.push({
    name: "All Wave 2 rows active",
    pass: activeWave2.length === 61,
    detail: `${activeWave2.length} active`,
  });

  const wave2AliasRows = await prisma.imagingStudyAlias.findMany({
    where: { catalogImagingStudy: { code: { in: [...WAVE2_CODES] } } },
  });
  checks.push({
    name: "Wave 2 alias rows present",
    pass: wave2AliasRows.length >= 60,
    detail: `found ${wave2AliasRows.length} (expected ~65+)`,
  });

  const calcLeft = wave2Studies.find((s) => s.code === "XR_CALCANEUS_LEFT_2V");
  checks.push({
    name: "REQUIRED calcaneus aliases",
    pass: (calcLeft?.aliases.length ?? 0) >= 3,
    detail: `left=${calcLeft?.aliases.length ?? 0}`,
  });

  let classifierIncomplete = 0;
  for (const row of W2) {
    const study = wave2Studies.find((s) => s.code === row.code);
    if (!study) continue;
    const c = row.classifiers;
    const required =
      study.modalityClassifier?.code === c.modality &&
      study.bodyRegionClassifier?.code === c.bodyRegion &&
      study.contrastTypeClassifier?.code === c.contrastType &&
      study.lateralityClassifier?.code === c.laterality;
    const viewOk =
      row.implementationBatch === "XR-2"
        ? c.viewCount
          ? study.viewCountClassifier?.code === c.viewCount
          : !study.viewCountClassifierId
        : !study.viewCountClassifierId;
    if (!required || !viewOk) classifierIncomplete += 1;
  }
  checks.push({
    name: "Classifier FK completeness (61/61)",
    pass: classifierIncomplete === 0,
    detail: `${61 - classifierIncomplete}/61 complete`,
  });

  const ctHead = await prisma.catalogImagingStudy.findUnique({ where: { code: "CT_HEAD" } });
  checks.push({
    name: "CT_HEAD remains inactive",
    pass: ctHead?.isActive === false,
    detail: `isActive=${ctHead?.isActive}`,
  });

  const mriSpine = await prisma.catalogImagingStudy.findUnique({
    where: { code: "MRI_SPINE" },
    select: { contrastTypeClassifierId: true },
  });
  checks.push({
    name: "MRI_SPINE contrast null",
    pass: mriSpine?.contrastTypeClassifierId === null,
    detail: `contrastTypeClassifierId=${mriSpine?.contrastTypeClassifierId ?? "null"}`,
  });

  const wave1Active = await prisma.catalogImagingStudy.count({
    where: { code: { in: [...WAVE1_CODES] }, isActive: true },
  });
  checks.push({
    name: "Wave 1 unchanged (37 active)",
    pass: wave1Active === 37,
    detail: `active=${wave1Active}`,
  });

  const totalActiveImaging = await prisma.catalogImagingStudy.count({ where: { isActive: true } });
  const baselineActive = HAITI_IMAGING_CATALOG.filter((r) => r.isActive).length;
  checks.push({
    name: "Active catalog growth (80 + 61 wave2)",
    pass: totalActiveImaging === baselineActive + 37 + 61,
    detail: `active=${totalActiveImaging} (expected ${baselineActive + 37 + 61})`,
  });

  const usAbdomen = await prisma.catalogImagingStudy.findUnique({
    where: { code: "US_ABDOMEN" },
    include: { protocolClassifier: true },
  });
  checks.push({
    name: "US tuple — US_ABDOMEN limited protocol",
    pass: usAbdomen?.protocolClassifier?.code === "PROTOCOL_US_ABDOMEN_LIMITED",
    detail: usAbdomen?.protocolClassifier?.code ?? "null",
  });

  const searchCases: Array<{ q: string; expectCode: string }> = [
    { q: "os calcis left", expectCode: "XR_CALCANEUS_LEFT_2V" },
    { q: "ankle left", expectCode: "XR_ANKLE_LEFT_2V" },
    { q: "cta lower extremity left", expectCode: "CTA_LOWER_EXTREMITY_LEFT" },
    { q: "thyroid ultrasound", expectCode: "US_THYROID" },
  ];
  for (const { q, expectCode } of searchCases) {
    const { items } = await imagingSearch.search({ q, limit: 20 });
    const codes = items.map((i) => i.code);
    checks.push({
      name: `Search: ${q}`,
      pass: codes.includes(expectCode),
      detail: codes.slice(0, 8).join(", ") || "(empty)",
    });
  }

  const ctHeadSearch = await imagingSearch.search({ q: "ct head", limit: 20 });
  checks.push({
    name: "CT_HEAD not in active search results",
    pass: !ctHeadSearch.items.some((i) => i.code === "CT_HEAD"),
    detail: ctHeadSearch.items.map((i) => i.code).join(", "),
  });

  checks.push({
    name: "US tuple pass manifest count",
    pass: WAVE2_US_TUPLE_PASS_COUNT === 15,
    detail: `${WAVE2_US_TUPLE_PASS_COUNT}`,
  });

  const failed = checks.filter((c) => !c.pass);
  console.log(
    JSON.stringify(
      {
        summary: {
          pass: failed.length === 0,
          checksTotal: checks.length,
          checksFailed: failed.length,
          wave2Studies: wave2Studies.length,
          wave2Aliases: wave2AliasRows.length,
          totalActiveImaging,
        },
        checks,
      },
      null,
      2
    )
  );

  await prisma.$disconnect();
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
