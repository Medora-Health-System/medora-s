import type { PrismaService } from "../prisma/prisma.service";

export type DuplicateResolutionMode =
  | "CREATE_NEW"
  | "LINK_TO_EXISTING_CONCEPT"
  | "LINK_TO_EXISTING_PRODUCT"
  | "NEW_PACKAGE_ONLY";

export type DuplicateCandidate = {
  kind: "concept" | "product" | "package" | "ndc";
  existingId: string;
  existingCode: string;
  matchField: string;
};

export type DuplicateCheckResult = {
  candidates: DuplicateCandidate[];
  requiresResolution: boolean;
};

export async function findPromotionDuplicates(
  prisma: PrismaService,
  params: {
    proposedConceptCode: string | null;
    proposedProductCode: string | null;
    proposedPackageCode: string | null;
    ndc11: string | null;
    genericName: string;
    concentrationDisplay: string;
  }
): Promise<DuplicateCheckResult> {
  const candidates: DuplicateCandidate[] = [];

  if (params.proposedConceptCode) {
    const c = await prisma.medicationConcept.findUnique({
      where: { code: params.proposedConceptCode },
      select: { id: true, code: true },
    });
    if (c) candidates.push({ kind: "concept", existingId: c.id, existingCode: c.code, matchField: "code" });
  }

  if (params.proposedProductCode) {
    const p = await prisma.medicationProduct.findUnique({
      where: { code: params.proposedProductCode },
      select: { id: true, code: true },
    });
    if (p) candidates.push({ kind: "product", existingId: p.id, existingCode: p.code, matchField: "code" });
  }

  if (params.proposedPackageCode) {
    const pkg = await prisma.medicationPackage.findUnique({
      where: { code: params.proposedPackageCode },
      select: { id: true, code: true },
    });
    if (pkg) candidates.push({ kind: "package", existingId: pkg.id, existingCode: pkg.code, matchField: "code" });
  }

  if (params.ndc11) {
    const pkg = await prisma.medicationPackage.findFirst({
      where: { ndc11: params.ndc11 },
      select: { id: true, code: true },
    });
    if (pkg && !candidates.some((x) => x.kind === "package" && x.existingId === pkg.id)) {
      candidates.push({ kind: "ndc", existingId: pkg.id, existingCode: pkg.code, matchField: "ndc11" });
    }
  }

  const normalizedGeneric = params.genericName.trim().toLowerCase();
  if (normalizedGeneric) {
    const concepts = await prisma.medicationConcept.findMany({
      where: { genericName: { equals: params.genericName.trim(), mode: "insensitive" } },
      select: { id: true, code: true },
      take: 3,
    });
    for (const c of concepts) {
      if (!candidates.some((x) => x.kind === "concept" && x.existingId === c.id)) {
        candidates.push({ kind: "concept", existingId: c.id, existingCode: c.code, matchField: "genericName" });
      }
    }
  }

  if (params.concentrationDisplay.trim()) {
    const products = await prisma.medicationProduct.findMany({
      where: {
        strengthDisplay: { equals: params.concentrationDisplay.trim(), mode: "insensitive" },
      },
      select: { id: true, code: true },
      take: 3,
    });
    for (const p of products) {
      if (!candidates.some((x) => x.kind === "product" && x.existingId === p.id)) {
        candidates.push({ kind: "product", existingId: p.id, existingCode: p.code, matchField: "strengthDisplay" });
      }
    }
  }

  return {
    candidates,
    requiresResolution: candidates.length > 0,
  };
}
