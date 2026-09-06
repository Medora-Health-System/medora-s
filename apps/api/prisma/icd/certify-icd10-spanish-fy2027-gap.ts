/**
 * FY2027 Spanish gap baseline. Analysis only — does not ingest or copy FY2026 labels.
 *
 *   pnpm --filter @medora/api run icd:certify-spanish-fy2027-gap -- --release=FY2027
 */
import { PrismaClient } from "@prisma/client";
import { ICD10_CM_CODE_SYSTEM } from "@medora/shared";
import { collectIcd10MultilingualCertification } from "./certify-icd10-multilingual";

async function main() {
  const releaseArg = process.argv.find((arg) => arg.startsWith("--release="));
  const releaseVersion = releaseArg?.slice("--release=".length).trim();
  if (releaseVersion !== "FY2027") {
    console.error("Usage: icd:certify-spanish-fy2027-gap --release=FY2027");
    process.exitCode = 64;
    return;
  }
  const prisma = new PrismaClient();
  try {
    const fy2027 = await collectIcd10MultilingualCertification(prisma, { releaseVersion: "FY2027" });
    const [fy2026Catalog, fy2027Catalog, fy2026Es] = await Promise.all([
      prisma.icd10DiagnosisCode.findMany({
        where: { codeSystem: ICD10_CM_CODE_SYSTEM, releaseVersion: "FY2026", isSelectable: true, isBillable: true },
        select: { normalizedCode: true, shortDescription: true },
      }),
      prisma.icd10DiagnosisCode.findMany({
        where: { codeSystem: ICD10_CM_CODE_SYSTEM, releaseVersion: "FY2027", isSelectable: true, isBillable: true },
        select: { code: true, normalizedCode: true, shortDescription: true },
      }),
      prisma.icd10DiagnosisTerminology.findMany({
        where: {
          codeSystem: ICD10_CM_CODE_SYSTEM,
          releaseVersion: "FY2026",
          locale: "es",
          isEffective: true,
          labelRegister: "CLINICIAN_PREFERRED",
          status: "APPROVED",
        },
        select: { normalizedCode: true, preferredLabel: true },
      }),
    ]);
    const fy2026ByNorm = new Map(fy2026Catalog.map((row) => [row.normalizedCode, row]));
    const fy2026EsByNorm = new Map(fy2026Es.map((row) => [row.normalizedCode, row.preferredLabel]));
    const fy2027EsExact = await prisma.icd10DiagnosisTerminology.findMany({
      where: {
        codeSystem: ICD10_CM_CODE_SYSTEM,
        releaseVersion: "FY2027",
        locale: "es",
        isEffective: true,
        labelRegister: "CLINICIAN_PREFERRED",
        status: "APPROVED",
      },
      select: { normalizedCode: true },
    });
    const fy2027ExactSet = new Set(fy2027EsExact.map((row) => row.normalizedCode));

    let carryForwardSafe = 0;
    let reviewRequired = 0;
    for (const row of fy2027Catalog) {
      if (fy2027ExactSet.has(row.normalizedCode)) continue;
      const fy2026 = fy2026ByNorm.get(row.normalizedCode);
      const sameConcept =
        Boolean(fy2026) &&
        (fy2026?.shortDescription ?? "").trim() === (row.shortDescription ?? "").trim() &&
        fy2026EsByNorm.has(row.normalizedCode);
      if (sameConcept) carryForwardSafe += 1;
      else reviewRequired += 1;
    }

    console.log(`FY2027_SELECTABLE=${fy2027.totalSearchable}`);
    console.log(`FY2027_ES_EXACT=${fy2027.esExact}`);
    console.log(`FY2027_ES_CODE_ONLY=${fy2027.codeOnlyEs}`);
    console.log(`FY2027_CARRY_FORWARD_SAFE=${carryForwardSafe}`);
    console.log(`FY2027_REVIEW_REQUIRED=${reviewRequired}`);
    console.log(`FY2027_CARRY_FORWARD_APPLIED=NO`);
    console.log(`SAMPLE_MISSING=${fy2027Catalog.filter((row) => !fy2027ExactSet.has(row.normalizedCode)).slice(0, 8).map((row) => row.code).join(",")}`);
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
