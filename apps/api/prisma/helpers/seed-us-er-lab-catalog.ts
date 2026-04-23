import { PrismaClient } from "@prisma/client";
import type { UsErLabCatalogRow } from "../data/er-us-lab-tests";

function normalizeSearchText(raw: string): string {
  return raw.toLowerCase().replace(/\s+/g, " ").trim();
}

function labSearchTextStored(row: UsErLabCatalogRow): string {
  return normalizeSearchText(
    [
      row.searchText,
      row.displayNameEn,
      row.nameEn,
      row.displayNameFr,
      row.category,
      row.code,
      row.aliases.join(" "),
    ].join(" ")
  );
}

/** After Haiti catalog; stable sort band so ER U.S. rows list predictably. */
const US_ER_SORT_BASE = 50_000;

/**
 * U.S. ER lab tests — English `name`, French `displayNameFr`, optional CPT/HCPCS suggestion only.
 */
export async function seedUsErLabCatalog(
  prisma: PrismaClient,
  labs: UsErLabCatalogRow[]
): Promise<void> {
  for (let i = 0; i < labs.length; i++) {
    const row = labs[i];
    if (!row.displayNameEn?.trim()) {
      throw new Error(
        `[catalog] US ER lab seed ${row.code} must set displayNameEn (English-primary guard).`
      );
    }
    const searchText = labSearchTextStored(row);
    const description = `Catégorie : ${row.category}`;
    const created = await prisma.catalogLabTest.upsert({
      where: { code: row.code },
      update: {
        name: row.nameEn,
        displayNameEn: row.displayNameEn,
        displayNameFr: row.displayNameFr,
        description,
        searchText,
        sortPriority: US_ER_SORT_BASE + i * 10,
        isEssential: row.isEssential,
        isActive: row.isActive,
        billingCodeDefault: row.billingCodeDefault ?? null,
      },
      create: {
        code: row.code,
        name: row.nameEn,
        displayNameEn: row.displayNameEn,
        displayNameFr: row.displayNameFr,
        description,
        searchText,
        sortPriority: US_ER_SORT_BASE + i * 10,
        isEssential: row.isEssential,
        isActive: row.isActive,
        billingCodeDefault: row.billingCodeDefault ?? null,
      },
    });

    for (const alias of row.aliases) {
      const normalized = alias.trim().toLowerCase();
      if (!normalized) continue;
      const exists = await prisma.labTestAlias.findFirst({
        where: { catalogLabTestId: created.id, alias: normalized },
      });
      if (!exists) {
        await prisma.labTestAlias.create({
          data: {
            catalogLabTestId: created.id,
            alias: normalized,
            language: "en",
          },
        });
      }
    }
  }
}
