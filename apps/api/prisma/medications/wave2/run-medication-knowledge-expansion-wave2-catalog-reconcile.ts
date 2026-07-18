/**
 * Consolidate Wave 2 concepts that share the same genericName into one canonical concept.
 * Keeps EM_W2C_{GENERIC_SLUG} when present; otherwise the shortest code.
 *
 *   pnpm medication:wave2:catalog:reconcile
 */
import { PrismaClient } from "@prisma/client";
import { writeWave2CatalogArtifact } from "./medication-knowledge-expansion-wave2-catalog-import";
import { mkExpansionWave2CatalogConceptCode } from "@medora/shared";

const prisma = new PrismaClient();

async function main() {
  const dups = await prisma.$queryRaw<
    Array<{ g: string; c: number }>
  >`
    SELECT LOWER(TRIM("genericName")) AS g, COUNT(*)::int AS c
    FROM "MedicationConcept"
    WHERE "code" LIKE 'EM_W2C_%'
    GROUP BY 1
    HAVING COUNT(*) > 1
  `;

  let groups = 0;
  let productsRelinked = 0;
  let conceptsRetired = 0;
  const details: Array<{ generic: string; keep: string; retired: string[] }> = [];

  for (const row of dups) {
    const concepts = await prisma.medicationConcept.findMany({
      where: {
        code: { startsWith: "EM_W2C_" },
        genericName: { equals: row.g, mode: "insensitive" },
      },
      select: { id: true, code: true, genericName: true },
    });
    if (concepts.length < 2) continue;

    const preferredCode = mkExpansionWave2CatalogConceptCode(row.g);
    const keep =
      concepts.find((c) => c.code === preferredCode) ??
      [...concepts].sort((a, b) => a.code.length - b.code.length)[0];
    const retire = concepts.filter((c) => c.id !== keep.id);
    groups += 1;

    for (const r of retire) {
      const moved = await prisma.medicationProduct.updateMany({
        where: { conceptId: r.id },
        data: { conceptId: keep.id },
      });
      productsRelinked += moved.count;

      // Move safety profile if keep lacks one
      const keepSafety = await prisma.medicationSafetyProfile.findUnique({
        where: { conceptId: keep.id },
      });
      const retireSafety = await prisma.medicationSafetyProfile.findUnique({
        where: { conceptId: r.id },
      });
      if (!keepSafety && retireSafety) {
        await prisma.medicationSafetyProfile.update({
          where: { id: retireSafety.id },
          data: { conceptId: keep.id },
        });
      } else if (retireSafety) {
        await prisma.medicationSafetyProfile.delete({ where: { id: retireSafety.id } });
      }

      await prisma.medicationConcept.update({
        where: { id: r.id },
        data: {
          isActive: false,
          displayName: `${r.code} [MERGED_INTO_${keep.code}]`,
          // Keep row for audit; mark retired via displayName + inactive
        },
      });
      conceptsRetired += 1;
    }

    details.push({
      generic: row.g,
      keep: keep.code,
      retired: retire.map((r) => r.code),
    });
  }

  const remainingDups = await prisma.$queryRaw<Array<{ c: number }>>`
    SELECT COUNT(*)::int AS c FROM (
      SELECT LOWER(TRIM("genericName")) AS g
      FROM "MedicationConcept"
      WHERE "code" LIKE 'EM_W2C_%'
        AND "displayName" NOT LIKE '%[MERGED_INTO_%'
      GROUP BY 1
      HAVING COUNT(*) > 1
    ) t
  `;

  const report = {
    mode: "RECONCILE",
    duplicateGroupsFound: dups.length,
    groupsProcessed: groups,
    productsRelinked,
    conceptsRetired,
    remainingActiveDuplicateGenerics: remainingDups[0]?.c ?? 0,
    details: details.slice(0, 50),
    detailsTruncated: details.length > 50,
  };

  const path = writeWave2CatalogArtifact(
    "medication-knowledge-expansion-wave2-catalog-reconcile.json",
    report
  );
  console.log(JSON.stringify({ path, ...report, details: undefined }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
