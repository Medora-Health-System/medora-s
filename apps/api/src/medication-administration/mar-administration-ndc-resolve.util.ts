import { normalizeNdc } from "@medora/shared";
import type { PrismaService } from "../prisma/prisma.service";

export type MarNdcSnapshot = {
  ndc11: string | null;
  ndcDisplay: string | null;
};

async function loadPackageNdc(
  prisma: PrismaService,
  packageId: string | null | undefined
): Promise<MarNdcSnapshot | null> {
  const pid = packageId?.trim();
  if (!pid) return null;
  const pkg = await prisma.medicationPackage.findFirst({
    where: { id: pid },
    select: { ndc11: true, ndcDisplay: true },
  });
  if (!pkg) return null;
  const ndc11 = pkg.ndc11?.trim() || null;
  const ndcDisplay = pkg.ndcDisplay?.trim() || null;
  if (!ndc11 && !ndcDisplay) return null;
  return { ndc11, ndcDisplay };
}

async function loadDefaultPackageNdcForProduct(
  prisma: PrismaService,
  productId: string | null | undefined
): Promise<MarNdcSnapshot | null> {
  const pid = productId?.trim();
  if (!pid) return null;
  const product = await prisma.medicationProduct.findFirst({
    where: { id: pid },
    select: { id: true },
  });
  if (!product?.id) return null;
  const defaultPackage = await prisma.medicationPackage.findFirst({
    where: { productId: product.id },
    orderBy: [{ isDefaultForProduct: "desc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  if (!defaultPackage) return null;
  return loadPackageNdc(prisma, defaultPackage.id);
}

async function loadDefaultPackageNdcForLegacyCatalog(
  prisma: PrismaService,
  catalogMedicationId: string | null | undefined
): Promise<MarNdcSnapshot | null> {
  const catalogId = catalogMedicationId?.trim();
  if (!catalogId) return null;
  const product = await prisma.medicationProduct.findFirst({
    where: { legacyCatalogMedicationId: catalogId },
    select: { id: true },
  });
  if (!product?.id) return null;
  return loadDefaultPackageNdcForProduct(prisma, product.id);
}

/**
 * M1.7B.7 — Best-effort NDC snapshot for MAR create when UI omits visible NDC field.
 * Priority: explicit input → catalog → order package → product default package.
 */
export async function resolveMarNdcSnapshotFromOrderLine(
  prisma: PrismaService,
  input: {
    orderItem?: {
      medicationPackageId?: string | null;
      medicationProductId?: string | null;
      catalogItemId?: string | null;
    } | null;
    catalogMedication?: { id?: string; ndc11?: string | null; ndcDisplay?: string | null } | null;
    normalizedInputNdc?: { ok: true; ndc11: string; ndcDisplay: string } | { ok: false } | null;
  }
): Promise<MarNdcSnapshot> {
  try {
    if (input.normalizedInputNdc && input.normalizedInputNdc.ok) {
      return {
        ndc11: input.normalizedInputNdc.ndc11,
        ndcDisplay: input.normalizedInputNdc.ndcDisplay,
      };
    }

    const catalogCandidate =
      input.catalogMedication?.ndcDisplay?.trim() ||
      input.catalogMedication?.ndc11?.trim() ||
      null;
    if (catalogCandidate) {
      const normalizedCatalog = normalizeNdc(catalogCandidate);
      if (normalizedCatalog.ok) {
        return {
          ndc11: normalizedCatalog.ndc11,
          ndcDisplay: normalizedCatalog.ndcDisplay,
        };
      }
    }

    const fromOrderPackage = await loadPackageNdc(prisma, input.orderItem?.medicationPackageId);
    if (fromOrderPackage) return fromOrderPackage;

    if (input.orderItem?.medicationProductId?.trim()) {
      const fromExplicitProduct = await loadDefaultPackageNdcForProduct(
        prisma,
        input.orderItem.medicationProductId
      );
      if (fromExplicitProduct) return fromExplicitProduct;
    }

    const fromLegacyCatalog = await loadDefaultPackageNdcForLegacyCatalog(
      prisma,
      input.catalogMedication?.id ?? input.orderItem?.catalogItemId
    );
    if (fromLegacyCatalog) return fromLegacyCatalog;

    return { ndc11: null, ndcDisplay: null };
  } catch {
    return { ndc11: null, ndcDisplay: null };
  }
}
