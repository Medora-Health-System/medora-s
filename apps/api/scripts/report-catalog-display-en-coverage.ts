/**
 * Read-only coverage report for nullable displayNameEn on shared catalogs.
 *
 * Usage (from repo root):
 *   pnpm --filter @medora/api catalog:report-display-en
 */
import "reflect-metadata";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function pct(n: number, d: number): string {
  if (d === 0) return "0%";
  return `${((100 * n) / d).toFixed(1)}%`;
}

async function main() {
  const [labs, imgs, meds] = await Promise.all([
    prisma.catalogLabTest.findMany({ select: { displayNameEn: true } }),
    prisma.catalogImagingStudy.findMany({ select: { displayNameEn: true } }),
    prisma.catalogMedication.findMany({ select: { displayNameEn: true } }),
  ]);
  const labTotal = labs.length;
  const labWithEn = labs.filter((r) => (r.displayNameEn ?? "").trim().length > 0).length;
  const imgTotal = imgs.length;
  const imgWithEn = imgs.filter((r) => (r.displayNameEn ?? "").trim().length > 0).length;
  const medTotal = meds.length;
  const medWithEn = meds.filter((r) => (r.displayNameEn ?? "").trim().length > 0).length;

  console.log("=== displayNameEn coverage (non-empty string) ===\n");
  console.log(
    `CatalogLabTest:        ${labWithEn} / ${labTotal} (${pct(labWithEn, labTotal)}) with displayNameEn`
  );
  console.log(
    `CatalogImagingStudy:   ${imgWithEn} / ${imgTotal} (${pct(imgWithEn, imgTotal)}) with displayNameEn`
  );
  console.log(
    `CatalogMedication:     ${medWithEn} / ${medTotal} (${pct(medWithEn, medTotal)}) with displayNameEn`
  );
  console.log(`\nMissing (counts): lab=${labTotal - labWithEn}, imaging=${imgTotal - imgWithEn}, med=${medTotal - medWithEn}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
