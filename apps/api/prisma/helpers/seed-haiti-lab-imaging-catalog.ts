import { PrismaClient } from "@prisma/client";
import type { LabCatalogSeed } from "../data/haiti-lab-tests";
import type { ImagingCatalogSeed } from "../data/haiti-imaging-studies";

function normalizeSearchText(raw: string): string {
  return raw.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Index + category/modality enrich offline/API search beyond the authored searchText. */
function labSearchTextStored(row: LabCatalogSeed): string {
  return normalizeSearchText(
    [row.searchText, row.category, row.code, row.displayNameFr, row.aliases.join(" ")].join(" ")
  );
}

function imagingSearchTextStored(row: ImagingCatalogSeed): string {
  return normalizeSearchText(
    [
      row.searchText,
      row.modality,
      row.bodyRegion,
      row.code,
      row.displayNameFr,
      row.aliases.join(" "),
    ].join(" ")
  );
}

/** Marqueurs cliniques prioritaires (Haïti / urgences / infectieux). */
function labIsEssential(row: LabCatalogSeed): boolean {
  const codes = new Set(["CBC", "GLU", "HIV", "MALARIA", "TROP", "CRP", "CREAT", "UA"]);
  return codes.has(row.code);
}

function imagingIsEssential(row: ImagingCatalogSeed): boolean {
  return row.code === "XR_CHEST" || row.code === "US_ABD";
}

export async function seedHaitiLabImagingCatalog(
  prisma: PrismaClient,
  labs: LabCatalogSeed[],
  imaging: ImagingCatalogSeed[]
): Promise<void> {
  for (let i = 0; i < labs.length; i++) {
    const row = labs[i];
    const searchText = labSearchTextStored(row);
    const description = `Catégorie : ${row.category}`;
    const created = await prisma.catalogLabTest.upsert({
      where: { code: row.code },
      update: {
        name: row.displayNameFr,
        displayNameFr: row.displayNameFr,
        description,
        searchText,
        sortPriority: i * 10,
        isEssential: labIsEssential(row),
        isActive: row.isActive,
      },
      create: {
        code: row.code,
        name: row.displayNameFr,
        displayNameFr: row.displayNameFr,
        description,
        searchText,
        sortPriority: i * 10,
        isEssential: labIsEssential(row),
        isActive: row.isActive,
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
            language: "fr",
          },
        });
      }
    }
  }

  for (let i = 0; i < imaging.length; i++) {
    const row = imaging[i];
    const searchText = imagingSearchTextStored(row);
    const description = `${row.modality} · ${row.bodyRegion}`;
    const created = await prisma.catalogImagingStudy.upsert({
      where: { code: row.code },
      update: {
        name: row.displayNameFr,
        displayNameFr: row.displayNameFr,
        description,
        modality: row.modality,
        bodyRegion: row.bodyRegion,
        searchText,
        sortPriority: i * 10,
        isEssential: imagingIsEssential(row),
        isActive: row.isActive,
      },
      create: {
        code: row.code,
        name: row.displayNameFr,
        displayNameFr: row.displayNameFr,
        description,
        modality: row.modality,
        bodyRegion: row.bodyRegion,
        searchText,
        sortPriority: i * 10,
        isEssential: imagingIsEssential(row),
        isActive: row.isActive,
      },
    });

    for (const alias of row.aliases) {
      const normalized = alias.trim().toLowerCase();
      if (!normalized) continue;
      const exists = await prisma.imagingStudyAlias.findFirst({
        where: { catalogImagingStudyId: created.id, alias: normalized },
      });
      if (!exists) {
        await prisma.imagingStudyAlias.create({
          data: {
            catalogImagingStudyId: created.id,
            alias: normalized,
            language: "fr",
          },
        });
      }
    }
  }
}
