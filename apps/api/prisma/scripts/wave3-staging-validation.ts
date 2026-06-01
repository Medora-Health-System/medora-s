/**
 * Phase 2E.7B — Wave 3 staging validation (read-only checks + search smoke).
 * Usage: pnpm --filter @medora/api exec ts-node --transpile-only prisma/scripts/wave3-staging-validation.ts
 */
import { PrismaClient } from "@prisma/client";
import { HAITI_IMAGING_WAVE1_CATALOG } from "../data/haiti-imaging-wave1";
import {
  HAITI_IMAGING_WAVE2_CATALOG,
  WAVE2_IMAGING_BATCH_COUNTS as W2C,
} from "../data/haiti-imaging-wave2";
import {
  HAITI_IMAGING_WAVE3_CATALOG as W3,
  WAVE3_IMAGING_BATCH_COUNTS as W3C,
} from "../data/haiti-imaging-wave3";
import { HAITI_IMAGING_CATALOG } from "../data/haiti-imaging-studies";
import { ImagingCatalogService } from "../../src/order-catalog/imaging-catalog.service";

const WAVE3_CODES = W3.map((r) => r.code);
const WAVE2_CODES = HAITI_IMAGING_WAVE2_CATALOG.map((r) => r.code);
const WAVE1_CODES = HAITI_IMAGING_WAVE1_CATALOG.map((r) => r.code);

type Check = { name: string; pass: boolean; detail: string };

async function main() {
  const prisma = new PrismaClient();
  const imagingSearch = new ImagingCatalogService(prisma as never);
  const checks: Check[] = [];

  const wave3Studies = await prisma.catalogImagingStudy.findMany({
    where: { code: { in: [...WAVE3_CODES] } },
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
    name: "Wave 3 row count",
    pass: wave3Studies.length === 41,
    detail: `found ${wave3Studies.length} (expected 41)`,
  });
  checks.push({
    name: "MRI-2 / MRA-1 / US-2 / US-3 / FL-1 / NM-1 manifest batches",
    pass:
      W3C.mri2 === 14 &&
      W3C.mra1 === 5 &&
      W3C.us2 === 10 &&
      W3C.us3 === 3 &&
      W3C.fl1 === 4 &&
      W3C.nm1 === 5 &&
      W3.filter((r) => r.implementationBatch === "MRI-2").length === 14,
    detail: `manifest ${W3C.mri2}/${W3C.mra1}/${W3C.us2}/${W3C.us3}/${W3C.fl1}/${W3C.nm1}`,
  });

  const activeWave3 = wave3Studies.filter((s) => s.isActive);
  checks.push({
    name: "All Wave 3 rows active",
    pass: activeWave3.length === 41,
    detail: `${activeWave3.length} active`,
  });

  const wave3AliasRows = await prisma.imagingStudyAlias.findMany({
    where: { catalogImagingStudy: { code: { in: [...WAVE3_CODES] } } },
  });
  checks.push({
    name: "Wave 3 alias rows present",
    pass: wave3AliasRows.length >= 40,
    detail: `found ${wave3AliasRows.length} (expected ~55+)`,
  });

  let classifierIncomplete = 0;
  for (const row of W3) {
    const study = wave3Studies.find((s) => s.code === row.code);
    if (!study) continue;
    const c = row.classifiers;
    const required =
      study.modalityClassifier?.code === c.modality &&
      study.bodyRegionClassifier?.code === c.bodyRegion &&
      study.contrastTypeClassifier?.code === c.contrastType &&
      study.lateralityClassifier?.code === c.laterality;
    const viewOk = !study.viewCountClassifierId;
    const protocolOk = c.protocol ? study.protocolClassifier?.code === c.protocol : true;
    const subregionOk = c.anatomicSubregion
      ? study.anatomicSubregionClassifier?.code === c.anatomicSubregion
      : true;
    if (!required || !viewOk || !protocolOk || !subregionOk) classifierIncomplete += 1;
  }
  checks.push({
    name: "Classifier FK completeness (41/41)",
    pass: classifierIncomplete === 0,
    detail: `${41 - classifierIncomplete}/41 complete`,
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

  const totalActiveImaging = await prisma.catalogImagingStudy.count({ where: { isActive: true } });
  const baselineActive = HAITI_IMAGING_CATALOG.filter((r) => r.isActive).length;
  checks.push({
    name: "Active catalog growth (141 + 41 wave3)",
    pass: totalActiveImaging === baselineActive + 37 + 61 + 41,
    detail: `active=${totalActiveImaging} (expected ${baselineActive + 37 + 61 + 41})`,
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

  const mraActive = await prisma.catalogImagingStudy.count({
    where: { code: { in: W3.filter((r) => r.implementationBatch === "MRA-1").map((r) => r.code) }, isActive: true },
  });
  checks.push({
    name: "MRA-1 modality rows active",
    pass: mraActive === 5,
    detail: `active=${mraActive}`,
  });

  const searchCases: Array<{ q: string; expectCode: string }> = [
    { q: "mri knee left", expectCode: "MRI_KNEE_LEFT" },
    { q: "mra carotid wo", expectCode: "MRA_CAROTID_WO_CONTRAST" },
    { q: "carotid duplex", expectCode: "US_CAROTID_DUPLEX" },
    { q: "échographie mammaire", expectCode: "US_BREAST_BILATERAL" },
    { q: "hida", expectCode: "NM_HIDA" },
    { q: "œsophagogramme", expectCode: "FL_ESOPHAGRAM" },
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
          wave3Studies: wave3Studies.length,
          wave3Aliases: wave3AliasRows.length,
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
