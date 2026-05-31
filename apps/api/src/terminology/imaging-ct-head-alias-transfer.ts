/**
 * Phase 2C.3.4B — idempotent CT head alias ownership transfer (governance/data only).
 * Moves normalized alias "ct head" from CT_HEAD to CT_HEAD_WO_CONTRAST.
 */
import type { PrismaClient } from "@prisma/client";

export const CT_HEAD_ALIAS_TRANSFER_TEXT = "ct head";
export const CT_HEAD_ALIAS_PREDECESSOR_CODE = "CT_HEAD";
export const CT_HEAD_ALIAS_SUCCESSOR_CODE = "CT_HEAD_WO_CONTRAST";

export type CtHeadAliasTransferResult = {
  deletedFromPredecessor: number;
  createdOnSuccessor: boolean;
  verified: {
    predecessorHasAlias: boolean;
    successorHasAlias: boolean;
  };
};

type TransferClient = Pick<
  PrismaClient,
  "$transaction" | "catalogImagingStudy" | "imagingStudyAlias"
>;

type TransferTx = Pick<PrismaClient, "catalogImagingStudy" | "imagingStudyAlias">;

function normalizeAlias(alias: string): string {
  return alias.trim().toLowerCase();
}

async function runCtHeadAliasTransferTx(tx: TransferTx): Promise<CtHeadAliasTransferResult> {
  const alias = normalizeAlias(CT_HEAD_ALIAS_TRANSFER_TEXT);

  const predecessor = await tx.catalogImagingStudy.findUnique({
    where: { code: CT_HEAD_ALIAS_PREDECESSOR_CODE },
    select: { id: true, code: true },
  });
  const successor = await tx.catalogImagingStudy.findUnique({
    where: { code: CT_HEAD_ALIAS_SUCCESSOR_CODE },
    select: { id: true, code: true },
  });

  if (!predecessor) {
    throw new Error(
      `[ct-head-alias-transfer] predecessor catalog row ${CT_HEAD_ALIAS_PREDECESSOR_CODE} not found`
    );
  }
  if (!successor) {
    throw new Error(
      `[ct-head-alias-transfer] successor catalog row ${CT_HEAD_ALIAS_SUCCESSOR_CODE} not found`
    );
  }

  const deleted = await tx.imagingStudyAlias.deleteMany({
    where: { catalogImagingStudyId: predecessor.id, alias },
  });

  const existingOnSuccessor = await tx.imagingStudyAlias.findFirst({
    where: { catalogImagingStudyId: successor.id, alias },
    select: { id: true },
  });

  let createdOnSuccessor = false;
  if (!existingOnSuccessor) {
    await tx.imagingStudyAlias.create({
      data: {
        catalogImagingStudyId: successor.id,
        alias,
        language: "fr",
      },
    });
    createdOnSuccessor = true;
  }

  const predecessorHasAlias = Boolean(
    await tx.imagingStudyAlias.findFirst({
      where: { catalogImagingStudyId: predecessor.id, alias },
      select: { id: true },
    })
  );
  const successorHasAlias = Boolean(
    await tx.imagingStudyAlias.findFirst({
      where: { catalogImagingStudyId: successor.id, alias },
      select: { id: true },
    })
  );

  if (predecessorHasAlias || !successorHasAlias) {
    throw new Error(
      `[ct-head-alias-transfer] verification failed (predecessorHasAlias=${predecessorHasAlias}, successorHasAlias=${successorHasAlias})`
    );
  }

  return {
    deletedFromPredecessor: deleted.count,
    createdOnSuccessor,
    verified: { predecessorHasAlias, successorHasAlias },
  };
}

export async function transferCtHeadAliasOwnership(
  prisma: TransferClient
): Promise<CtHeadAliasTransferResult> {
  return prisma.$transaction((tx) => runCtHeadAliasTransferTx(tx));
}
