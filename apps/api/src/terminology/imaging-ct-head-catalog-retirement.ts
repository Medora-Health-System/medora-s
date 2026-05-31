/**
 * Phase 2C.5B — idempotent CT_HEAD catalog retirement (deactivate-not-delete).
 */
import type { PrismaClient } from "@prisma/client";

export const CT_HEAD_RETIREMENT_PREDECESSOR_CODE = "CT_HEAD";
export const CT_HEAD_RETIREMENT_SUCCESSOR_CODE = "CT_HEAD_WO_CONTRAST";

export type DeactivateCtHeadCatalogResult = {
  updated: boolean;
  predecessor: { code: string; isActive: boolean };
  successor: { code: string; isActive: boolean };
};

type RetirementClient = Pick<PrismaClient, "$transaction" | "catalogImagingStudy">;

type RetirementTx = Pick<PrismaClient, "catalogImagingStudy">;

async function runDeactivateCtHeadCatalogTx(tx: RetirementTx): Promise<DeactivateCtHeadCatalogResult> {
  const predecessor = await tx.catalogImagingStudy.findUnique({
    where: { code: CT_HEAD_RETIREMENT_PREDECESSOR_CODE },
    select: { id: true, code: true, isActive: true },
  });
  const successor = await tx.catalogImagingStudy.findUnique({
    where: { code: CT_HEAD_RETIREMENT_SUCCESSOR_CODE },
    select: { id: true, code: true, isActive: true },
  });

  if (!predecessor) {
    throw new Error(
      `[deactivate-ct-head-catalog] predecessor catalog row ${CT_HEAD_RETIREMENT_PREDECESSOR_CODE} not found`
    );
  }
  if (!successor) {
    throw new Error(
      `[deactivate-ct-head-catalog] successor catalog row ${CT_HEAD_RETIREMENT_SUCCESSOR_CODE} not found`
    );
  }
  if (!successor.isActive) {
    throw new Error(
      `[deactivate-ct-head-catalog] successor ${CT_HEAD_RETIREMENT_SUCCESSOR_CODE} must remain active`
    );
  }

  let updated = false;
  if (predecessor.isActive) {
    await tx.catalogImagingStudy.update({
      where: { id: predecessor.id },
      data: { isActive: false },
    });
    updated = true;
  }

  const verifiedPredecessor = await tx.catalogImagingStudy.findUnique({
    where: { id: predecessor.id },
    select: { code: true, isActive: true },
  });
  const verifiedSuccessor = await tx.catalogImagingStudy.findUnique({
    where: { id: successor.id },
    select: { code: true, isActive: true },
  });

  if (!verifiedPredecessor || verifiedPredecessor.isActive) {
    throw new Error("[deactivate-ct-head-catalog] verification failed — CT_HEAD is still active");
  }
  if (!verifiedSuccessor?.isActive) {
    throw new Error("[deactivate-ct-head-catalog] verification failed — CT_HEAD_WO_CONTRAST is inactive");
  }

  return {
    updated,
    predecessor: {
      code: verifiedPredecessor.code,
      isActive: verifiedPredecessor.isActive,
    },
    successor: {
      code: verifiedSuccessor.code,
      isActive: verifiedSuccessor.isActive,
    },
  };
}

export async function deactivateCtHeadCatalog(
  prisma: RetirementClient
): Promise<DeactivateCtHeadCatalogResult> {
  return prisma.$transaction((tx) => runDeactivateCtHeadCatalogTx(tx));
}
