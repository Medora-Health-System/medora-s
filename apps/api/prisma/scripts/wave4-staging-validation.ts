/**
 * Phase 2E.8B — Wave 4 staging validation (read-only checks + search smoke).
 * Usage: pnpm --filter @medora/api exec ts-node --transpile-only prisma/scripts/wave4-staging-validation.ts
 */
import { PrismaClient } from "@prisma/client";
import { HAITI_IMAGING_WAVE1_CATALOG } from "../data/haiti-imaging-wave1";
import {
  HAITI_IMAGING_WAVE2_CATALOG,
  WAVE2_IMAGING_BATCH_COUNTS as W2C,
} from "../data/haiti-imaging-wave2";
import {
  HAITI_IMAGING_WAVE3_CATALOG,
  WAVE3_IMAGING_BATCH_COUNTS as W3C,
} from "../data/haiti-imaging-wave3";
import {
  HAITI_IMAGING_WAVE4_CATALOG as W4,
  WAVE4_IMAGING_BATCH_COUNTS as W4C,
} from "../data/haiti-imaging-wave4";
import { HAITI_IMAGING_CATALOG } from "../data/haiti-imaging-studies";
import { ImagingCatalogService } from "../../src/order-catalog/imaging-catalog.service";

const WAVE4_CODES = W4.map((r) => r.code);
const WAVE3_CODES = HAITI_IMAGING_WAVE3_CATALOG.map((r) => r.code);
const WAVE2_CODES = HAITI_IMAGING_WAVE2_CATALOG.map((r) => r.code);
const WAVE1_CODES = HAITI_IMAGING_WAVE1_CATALOG.map((r) => r.code);

type Check = { name: string; pass: boolean; detail: string };

async function main() {
  const prisma = new PrismaClient();
  const imagingSearch = new ImagingCatalogService(prisma as never);
  const checks: Check[] = [];

  const wave4Studies = await prisma.catalogImagingStudy.findMany({
    where: { code: { in: [...WAVE4_CODES] } },
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
    name: "Wave 4 row count",
    pass: wave4Studies.length === 31,
    detail: `found ${wave4Studies.length} (expected 31)`,
  });
  checks.push({
    name: "XR-3 / CT-3 manifest batches",
    pass:
      W4C.xr3 === 7 &&
      W4C.ct3 === 24 &&
      W4.filter((r) => r.implementationBatch === "XR-3").length === 7 &&
      W4.filter((r) => r.implementationBatch === "CT-3").length === 24,
    detail: `manifest XR-3=${W4C.xr3} CT-3=${W4C.ct3}`,
  });

  const activeWave4 = wave4Studies.filter((s) => s.isActive);
  checks.push({
    name: "All Wave 4 rows active",
    pass: activeWave4.length === 31,
    detail: `${activeWave4.length} active`,
  });

  const wave4AliasRows = await prisma.imagingStudyAlias.findMany({
    where: { catalogImagingStudy: { code: { in: [...WAVE4_CODES] } } },
  });
  checks.push({
    name: "Wave 4 alias rows present",
    pass: wave4AliasRows.length >= 30,
    detail: `found ${wave4AliasRows.length} (expected ~45+)`,
  });

  let classifierIncomplete = 0;
  for (const row of W4) {
    const study = wave4Studies.find((s) => s.code === row.code);
    if (!study) continue;
    const c = row.classifiers;
    const required =
      study.modalityClassifier?.code === c.modality &&
      study.bodyRegionClassifier?.code === c.bodyRegion &&
      study.contrastTypeClassifier?.code === c.contrastType &&
      study.lateralityClassifier?.code === c.laterality;
    const viewOk =
      row.implementationBatch === "XR-3"
        ? c.viewCount
          ? study.viewCountClassifier?.code === c.viewCount
          : true
        : !study.viewCountClassifierId;
    const protocolOk = c.protocol ? study.protocolClassifier?.code === c.protocol : true;
    const subregionOk = c.anatomicSubregion
      ? study.anatomicSubregionClassifier?.code === c.anatomicSubregion
      : true;
    if (!required || !viewOk || !protocolOk || !subregionOk) classifierIncomplete += 1;
  }
  checks.push({
    name: "Classifier FK completeness (31/31)",
    pass: classifierIncomplete === 0,
    detail: `${31 - classifierIncomplete}/31 complete`,
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

  const wave2Active = await prisma.catalogImagingStudy.count({
    where: { code: { in: [...WAVE2_CODES] }, isActive: true },
  });
  checks.push({
    name: "Wave 2 unchanged (61 active)",
    pass: wave2Active === 61 && W2C.total === 61,
    detail: `active=${wave2Active}`,
  });

  const wave3Active = await prisma.catalogImagingStudy.count({
    where: { code: { in: [...WAVE3_CODES] }, isActive: true },
  });
  checks.push({
    name: "Wave 3 unchanged (41 active)",
    pass: wave3Active === 41 && W3C.total === 41,
    detail: `active=${wave3Active}`,
  });

  const totalActiveImaging = await prisma.catalogImagingStudy.count({ where: { isActive: true } });
  const baselineActive = HAITI_IMAGING_CATALOG.filter((r) => r.isActive).length;
  const expectedActive = baselineActive + 37 + 61 + 41 + 31;
  checks.push({
    name: "Active catalog growth (182 + 31 wave4)",
    pass: totalActiveImaging === expectedActive,
    detail: `active=${totalActiveImaging} (expected ${expectedActive})`,
  });

  const doppler = await prisma.catalogImagingStudy.count({ where: { code: "DOPPLER_VEIN" } });
  const usAbd = await prisma.catalogImagingStudy.count({ where: { code: "US_ABD" } });
  const ctAbd = await prisma.catalogImagingStudy.count({ where: { code: "CT_ABD" } });
  const leVenousDup = await prisma.catalogImagingStudy.count({
    where: { code: { in: ["US_VENOUS_DOPPLER_LE_LEFT", "US_VENOUS_DOPPLER_LE_RIGHT"] } },
  });
  checks.push({
    name: "Forbidden / predecessor codes",
    pass: doppler === 1 && usAbd === 1 && ctAbd === 1 && leVenousDup === 0,
    detail: `DOPPLER_VEIN=${doppler} US_ABD=${usAbd} CT_ABD=${ctAbd} LE_venous_splits=${leVenousDup}`,
  });

  const ctaLeActive = await prisma.catalogImagingStudy.count({
    where: {
      code: { in: ["CTA_LOWER_EXTREMITY_LEFT", "CTA_LOWER_EXTREMITY_RIGHT"] },
      isActive: true,
    },
  });
  checks.push({
    name: "CTA extremity rows unchanged (Wave 2)",
    pass: ctaLeActive === 2,
    detail: `active=${ctaLeActive}`,
  });

  const searchCases: Array<{ q: string; expectCode: string }> = [
    { q: "ac joint left", expectCode: "XR_AC_JOINT_LEFT_2V" },
    { q: "clavicule gauche", expectCode: "XR_CLAVICLE_LEFT_2V" },
    { q: "scapula gauche", expectCode: "XR_SCAPULA_LEFT" },
    { q: "ct sinus", expectCode: "CT_SINUSES_WO_CONTRAST" },
    { q: "TDM orbites", expectCode: "CT_ORBITS_WO_CONTRAST" },
    { q: "soft tissue neck", expectCode: "CT_STN_WO_CONTRAST" },
    { q: "ct knee left", expectCode: "CT_KNEE_LEFT_WO_CONTRAST" },
    { q: "perfusion cérébrale", expectCode: "CT_BRAIN_PERFUSION" },
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

  const failed = checks.filter((c) => !c.pass);
  console.log(
    JSON.stringify(
      {
        summary: {
          pass: failed.length === 0,
          checksTotal: checks.length,
          checksFailed: failed.length,
          wave4Studies: wave4Studies.length,
          wave4Aliases: wave4AliasRows.length,
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
