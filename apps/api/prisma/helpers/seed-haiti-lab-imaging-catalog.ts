import { PrismaClient } from "@prisma/client";
import type { LabCatalogSeed } from "../data/haiti-lab-tests";
import type { ImagingCatalogSeed } from "../data/haiti-imaging-studies";

function normalizeSearchText(raw: string): string {
  return raw.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Index + category/modality enrich offline/API search beyond the authored searchText. */
function labSearchTextStored(row: LabCatalogSeed): string {
  return normalizeSearchText(
    [row.searchText, row.category, row.code, row.displayNameFr, row.displayNameEn, row.aliases.join(" ")].join(" ")
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
      row.displayNameEn,
      row.aliases.join(" "),
    ].join(" ")
  );
}

/** Marqueurs cliniques prioritaires (Haïti / urgences / infectieux / coagulation courante). */
function labIsEssential(row: LabCatalogSeed): boolean {
  const codes = new Set([
    "CBC",
    "CBC_DIFF",
    "NFS_DIFF",
    "GLU",
    "GLUCOSE_POC",
    "HIV",
    "MALARIA",
    "MALARIA_RDT",
    "TROP",
    "TROPONIN",
    "BNP",
    "CRP",
    "CREAT",
    "UA",
    "BMP",
    "CMP",
    "LACTATE",
    "DDIMER",
    "D_DIMER",
    "PT_INR",
    "TP_INR",
    "PTT",
    "TCA",
    "CULT_URINE",
    "URINE_CULTURE",
    "BLOOD_CULTURE",
    "WOUND_CULTURE",
    "RAPID_STREP",
    "COVID",
    "INFLUENZA_AB",
    "HCG_URINE",
    "URINE_HCG",
    "SERUM_HCG",
    "TYPE_SCREEN",
    "CROSSMATCH",
    "ABG",
    "VBG",
    "ETHANOL",
    "URINE_DRUG_SCREEN",
  ]);
  return codes.has(row.code);
}

function imagingIsEssential(row: ImagingCatalogSeed): boolean {
  const codes = new Set([
    "XR_CHEST",
    "XR_ABDOMEN",
    "US_ABD",
    "US_ABDOMEN",
    "CT_HEAD",
    "CT_HEAD_WO_CONTRAST",
    "CT_ABD",
    "CT_ABDOMEN_PELVIS",
    "CT_CHEST",
    "CT_CHEST_CTA",
    "CTA_CHEST",
    "DOPPLER_VEIN",
    "US_VENOUS_DOPPLER_LE",
    "XR_PELVIS",
    "US_FAST",
    "CT_CERVICAL_SPINE",
    "CTA_HEAD_NECK",
    "CTA_ABDOMEN_PELVIS",
    "US_PELVIS",
  ]);
  return codes.has(row.code);
}

export async function seedHaitiLabImagingCatalog(
  prisma: PrismaClient,
  labs: LabCatalogSeed[],
  imaging: ImagingCatalogSeed[]
): Promise<void> {
  for (let i = 0; i < labs.length; i++) {
    const row = labs[i];
    if (labIsEssential(row) && !row.displayNameEn?.trim()) {
      throw new Error(
        `[catalog] Essential lab seed ${row.code} must set displayNameEn (English-primary guard).`
      );
    }
    const searchText = labSearchTextStored(row);
    const description = `Catégorie : ${row.category}`;
    const displayNameEnLab = row.displayNameEn?.trim() ?? null;

    const created = await prisma.catalogLabTest.upsert({
      where: { code: row.code },
      update: {
        name: row.displayNameFr,
        displayNameFr: row.displayNameFr,
        displayNameEn: displayNameEnLab,
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
        displayNameEn: displayNameEnLab,
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
    if (imagingIsEssential(row) && !row.displayNameEn?.trim()) {
      throw new Error(
        `[catalog] Essential imaging seed ${row.code} must set displayNameEn (English-primary guard).`
      );
    }
    const searchText = imagingSearchTextStored(row);
    const description = `${row.modality} · ${row.bodyRegion}`;
    const displayNameEnImg = row.displayNameEn?.trim() ?? null;

    const created = await prisma.catalogImagingStudy.upsert({
      where: { code: row.code },
      update: {
        name: row.displayNameFr,
        displayNameFr: row.displayNameFr,
        displayNameEn: displayNameEnImg,
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
        displayNameEn: displayNameEnImg,
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
