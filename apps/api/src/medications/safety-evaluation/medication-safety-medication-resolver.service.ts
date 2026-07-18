/**
 * Phase 10 — resolve candidate medications to canonical identity (no new concepts).
 */
import type { PrismaClient } from "@prisma/client";

export type ResolvedMedicationIdentity = {
  resolved: boolean;
  conceptId?: string;
  productId?: string;
  therapeuticClassId?: string;
  ingredientConceptIds: string[];
  identityKey: string;
  unresolvedReason?: string;
};

export async function resolveMedicationIdentity(
  prisma: PrismaClient,
  input: {
    conceptId?: string;
    productId?: string;
    orderItemId?: string;
  }
): Promise<ResolvedMedicationIdentity> {
  if (input.productId) {
    const product = await prisma.medicationProduct.findUnique({
      where: { id: input.productId },
      select: {
        id: true,
        conceptId: true,
        concept: { select: { id: true, therapeuticClassId: true } },
      },
    });
    if (!product) {
      return {
        resolved: false,
        ingredientConceptIds: [],
        identityKey: `unresolved:product:${input.productId}`,
        unresolvedReason: "PRODUCT_NOT_FOUND",
      };
    }
    return {
      resolved: true,
      productId: product.id,
      conceptId: product.conceptId,
      therapeuticClassId: product.concept.therapeuticClassId ?? undefined,
      ingredientConceptIds: [product.conceptId],
      identityKey: `product:${product.id}`,
    };
  }

  if (input.conceptId) {
    const concept = await prisma.medicationConcept.findUnique({
      where: { id: input.conceptId },
      select: { id: true, therapeuticClassId: true },
    });
    if (!concept) {
      return {
        resolved: false,
        ingredientConceptIds: [],
        identityKey: `unresolved:concept:${input.conceptId}`,
        unresolvedReason: "CONCEPT_NOT_FOUND",
      };
    }
    return {
      resolved: true,
      conceptId: concept.id,
      therapeuticClassId: concept.therapeuticClassId ?? undefined,
      ingredientConceptIds: [concept.id],
      identityKey: `concept:${concept.id}`,
    };
  }

  if (input.orderItemId) {
    const item = await prisma.orderItem.findUnique({
      where: { id: input.orderItemId },
      select: {
        id: true,
        medicationProductId: true,
      },
    });
    if (!item) {
      return {
        resolved: false,
        ingredientConceptIds: [],
        identityKey: `unresolved:orderItem:${input.orderItemId}`,
        unresolvedReason: "ORDER_ITEM_NOT_FOUND",
      };
    }
    if (item.medicationProductId) {
      return resolveMedicationIdentity(prisma, {
        productId: item.medicationProductId,
      });
    }
    return {
      resolved: false,
      ingredientConceptIds: [],
      identityKey: `unresolved:orderItem:${item.id}`,
      unresolvedReason: "ORDER_ITEM_UNMAPPED",
    };
  }

  return {
    resolved: false,
    ingredientConceptIds: [],
    identityKey: "unresolved:none",
    unresolvedReason: "NO_IDENTITY_INPUT",
  };
}
