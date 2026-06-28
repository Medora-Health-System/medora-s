import { PrismaClient } from "@prisma/client";
import { CANONICAL_CARE_PROCEDURE_CATALOG } from "@medora/shared";

function buildSearchText(row: (typeof CANONICAL_CARE_PROCEDURE_CATALOG)[number]): string {
  return [
    row.code,
    row.displayNameEn,
    row.displayNameFr,
    row.category,
    ...row.aliases,
  ]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

export async function seedCareProcedureCatalog(prisma: PrismaClient): Promise<{
  upserted: number;
  aliasesCreated: number;
}> {
  let upserted = 0;
  let aliasesCreated = 0;

  for (const row of CANONICAL_CARE_PROCEDURE_CATALOG) {
    const displayNameEn = row.displayNameEn.trim();
    const displayNameFr = row.displayNameFr.trim();
    const record = await prisma.catalogProcedure.upsert({
      where: { code: row.code },
      create: {
        code: row.code,
        name: displayNameEn,
        displayNameEn,
        displayNameFr,
        category: row.category,
        executionRoleCategory: row.executionRoleCategory,
        orderable: row.orderable,
        isActive: row.isActive,
        deprecatedBy: row.deprecatedBy ?? null,
        documentationTemplateId: row.documentationTemplateId ?? null,
        billingCode: row.billingCode ?? null,
        defaultInstructions: row.defaultInstructions ?? null,
        requiresProviderOrder: row.requiresProviderOrder,
        nursingProtocolAllowed: row.nursingProtocolAllowed,
        requiresClinicalNote: row.requiresClinicalNote,
        searchText: buildSearchText(row),
        sortPriority: row.sortPriority,
      },
      update: {
        name: displayNameEn,
        displayNameEn,
        displayNameFr,
        category: row.category,
        executionRoleCategory: row.executionRoleCategory,
        orderable: row.orderable,
        isActive: row.isActive,
        deprecatedBy: row.deprecatedBy ?? null,
        documentationTemplateId: row.documentationTemplateId ?? null,
        billingCode: row.billingCode ?? null,
        defaultInstructions: row.defaultInstructions ?? null,
        requiresProviderOrder: row.requiresProviderOrder,
        nursingProtocolAllowed: row.nursingProtocolAllowed,
        requiresClinicalNote: row.requiresClinicalNote,
        searchText: buildSearchText(row),
        sortPriority: row.sortPriority,
      },
    });
    upserted += 1;

    for (const alias of row.aliases) {
      const trimmed = alias.trim();
      if (!trimmed) continue;
      await prisma.catalogProcedureAlias.upsert({
        where: {
          catalogProcedureId_alias: {
            catalogProcedureId: record.id,
            alias: trimmed,
          },
        },
        create: {
          catalogProcedureId: record.id,
          alias: trimmed,
        },
        update: {},
      });
      aliasesCreated += 1;
    }
  }

  return { upserted, aliasesCreated };
}
