import type { Prisma } from "@prisma/client";

/** OR clause: active classifiers whose alias matches query (search flag on). */
export function termClassifierAliasMatchOr(q: string): Prisma.TermClassifierWhereInput {
  return {
    isActive: true,
    aliases: { some: { alias: { contains: q, mode: "insensitive" } } },
  };
}

export function imagingClassifierSearchOr(q: string): Prisma.CatalogImagingStudyWhereInput[] {
  const match = termClassifierAliasMatchOr(q);
  return [
    { bodyRegionClassifier: match },
    { modalityClassifier: match },
    { contrastTypeClassifier: match },
    { viewCountClassifier: match },
    { bodyRegionClassifier: { searchText: { contains: q, mode: "insensitive" } } },
    { modalityClassifier: { searchText: { contains: q, mode: "insensitive" } } },
  ];
}

export function labClassifierSearchOr(q: string): Prisma.CatalogLabTestWhereInput[] {
  const match = termClassifierAliasMatchOr(q);
  return [
    { labCategoryClassifier: match },
    { labCategoryClassifier: { searchText: { contains: q, mode: "insensitive" } } },
  ];
}
