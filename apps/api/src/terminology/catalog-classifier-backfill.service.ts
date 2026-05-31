import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import {
  BODY_REGION_LEGACY_TO_CLASSIFIER,
  CONTRAST_CATALOG_CODE_TO_CLASSIFIER,
  CONTRAST_MANUAL_REVIEW_IMAGING_CODES,
  LAB_CATEGORY_LEGACY_TO_CLASSIFIER,
  MODALITY_LEGACY_TO_CLASSIFIER,
  VIEW_COUNT_CATALOG_CODE_TO_CLASSIFIER,
  parseLabCategoryFromDescription,
} from "../../prisma/data/catalog-classifier-backfill-map";
import { isTerminologyBackfillEnabled } from "./terminology-flags.util";

export type BackfillAuditStatus = "APPLIED" | "UNCHANGED" | "SKIPPED" | "MANUAL_REVIEW";

export type BackfillSummary = {
  runId: string;
  applied: number;
  unchanged: number;
  skipped: number;
  manualReview: number;
};

type ClassifierIndex = Map<string, string>;

function classifierKey(domain: string, code: string): string {
  return `${domain}::${code}`;
}

export async function loadClassifierIndex(prisma: PrismaClient): Promise<ClassifierIndex> {
  const rows = await prisma.termClassifier.findMany({
    where: { isActive: true },
    select: { id: true, domain: true, code: true },
  });
  const index = new Map<string, string>();
  for (const row of rows) {
    index.set(classifierKey(row.domain, row.code), row.id);
  }
  return index;
}

export function resolveClassifierId(
  index: ClassifierIndex,
  domain: string,
  code: string
): string | null {
  return index.get(classifierKey(domain, code)) ?? null;
}

export type ApplyFieldResult = {
  status: BackfillAuditStatus;
  classifierId: string | null;
  message?: string;
};

export function planFieldBackfill(
  currentClassifierId: string | null,
  targetClassifierId: string | null
): ApplyFieldResult {
  if (!targetClassifierId) {
    return { status: "SKIPPED", classifierId: null, message: "target classifier not found" };
  }
  if (currentClassifierId === targetClassifierId) {
    return { status: "UNCHANGED", classifierId: targetClassifierId };
  }
  return { status: "APPLIED", classifierId: targetClassifierId };
}

export async function runCatalogClassifierBackfill(prisma: PrismaClient): Promise<BackfillSummary> {
  if (!isTerminologyBackfillEnabled()) {
    return { runId: "", applied: 0, unchanged: 0, skipped: 0, manualReview: 0 };
  }

  const runId = randomUUID();
  const index = await loadClassifierIndex(prisma);
  const summary: BackfillSummary = { runId, applied: 0, unchanged: 0, skipped: 0, manualReview: 0 };

  async function audit(input: {
    catalogTable: string;
    catalogRowId: string;
    catalogCode: string | null;
    fieldName: string;
    legacyValue: string | null;
    classifierId: string | null;
    status: BackfillAuditStatus;
    message?: string;
  }): Promise<void> {
    await prisma.catalogClassifierBackfillAudit.create({
      data: {
        runId,
        catalogTable: input.catalogTable,
        catalogRowId: input.catalogRowId,
        catalogCode: input.catalogCode,
        fieldName: input.fieldName,
        legacyValue: input.legacyValue,
        classifierId: input.classifierId,
        status: input.status,
        message: input.message,
      },
    });
    if (input.status === "APPLIED") summary.applied += 1;
    else if (input.status === "UNCHANGED") summary.unchanged += 1;
    else if (input.status === "SKIPPED") summary.skipped += 1;
    else summary.manualReview += 1;
  }

  const imagingRows = await prisma.catalogImagingStudy.findMany({
    select: {
      id: true,
      code: true,
      bodyRegion: true,
      modality: true,
      bodyRegionClassifierId: true,
      modalityClassifierId: true,
      contrastTypeClassifierId: true,
      viewCountClassifierId: true,
    },
  });

  for (const row of imagingRows) {
    if (row.bodyRegion) {
      const code = BODY_REGION_LEGACY_TO_CLASSIFIER[row.bodyRegion];
      const targetId = code ? resolveClassifierId(index, "BODY_REGION", code) : null;
      const plan = planFieldBackfill(row.bodyRegionClassifierId, targetId);
      if (plan.status === "APPLIED") {
        await prisma.catalogImagingStudy.update({
          where: { id: row.id },
          data: { bodyRegionClassifierId: plan.classifierId },
        });
      }
      await audit({
        catalogTable: "CatalogImagingStudy",
        catalogRowId: row.id,
        catalogCode: row.code,
        fieldName: "bodyRegionClassifierId",
        legacyValue: row.bodyRegion,
        classifierId: plan.classifierId,
        status: plan.status,
        message: plan.message,
      });
    }

    if (row.modality) {
      const code = MODALITY_LEGACY_TO_CLASSIFIER[row.modality];
      const targetId = code ? resolveClassifierId(index, "MODALITY", code) : null;
      const plan = planFieldBackfill(row.modalityClassifierId, targetId);
      if (plan.status === "APPLIED") {
        await prisma.catalogImagingStudy.update({
          where: { id: row.id },
          data: { modalityClassifierId: plan.classifierId },
        });
      }
      await audit({
        catalogTable: "CatalogImagingStudy",
        catalogRowId: row.id,
        catalogCode: row.code,
        fieldName: "modalityClassifierId",
        legacyValue: row.modality,
        classifierId: plan.classifierId,
        status: plan.status,
        message: plan.message,
      });
    }

    const viewCode = VIEW_COUNT_CATALOG_CODE_TO_CLASSIFIER[row.code];
    if (viewCode) {
      const targetId = resolveClassifierId(index, "VIEW_COUNT", viewCode);
      const plan = planFieldBackfill(row.viewCountClassifierId, targetId);
      if (plan.status === "APPLIED") {
        await prisma.catalogImagingStudy.update({
          where: { id: row.id },
          data: { viewCountClassifierId: plan.classifierId },
        });
      }
      await audit({
        catalogTable: "CatalogImagingStudy",
        catalogRowId: row.id,
        catalogCode: row.code,
        fieldName: "viewCountClassifierId",
        legacyValue: row.code,
        classifierId: plan.classifierId,
        status: plan.status,
        message: plan.message,
      });
    }

    const contrastCode = CONTRAST_CATALOG_CODE_TO_CLASSIFIER[row.code];
    if (contrastCode) {
      const targetId = resolveClassifierId(index, "CONTRAST_TYPE", contrastCode);
      const plan = planFieldBackfill(row.contrastTypeClassifierId, targetId);
      if (plan.status === "APPLIED") {
        await prisma.catalogImagingStudy.update({
          where: { id: row.id },
          data: { contrastTypeClassifierId: plan.classifierId },
        });
      }
      await audit({
        catalogTable: "CatalogImagingStudy",
        catalogRowId: row.id,
        catalogCode: row.code,
        fieldName: "contrastTypeClassifierId",
        legacyValue: row.code,
        classifierId: plan.classifierId,
        status: plan.status,
        message: plan.message ?? (plan.status === "SKIPPED" ? "catalog row or classifier missing" : undefined),
      });
    } else if ((CONTRAST_MANUAL_REVIEW_IMAGING_CODES as readonly string[]).includes(row.code)) {
      await audit({
        catalogTable: "CatalogImagingStudy",
        catalogRowId: row.id,
        catalogCode: row.code,
        fieldName: "contrastTypeClassifierId",
        legacyValue: row.code,
        classifierId: null,
        status: "MANUAL_REVIEW",
        message: "unspecified contrast — excluded from 2B.2 backfill",
      });
    }
  }

  const labRows = await prisma.catalogLabTest.findMany({
    select: {
      id: true,
      code: true,
      description: true,
      labCategoryClassifierId: true,
    },
  });

  for (const row of labRows) {
    const legacyCategory = parseLabCategoryFromDescription(row.description);
    if (!legacyCategory) continue;
    const classifierCode = LAB_CATEGORY_LEGACY_TO_CLASSIFIER[legacyCategory];
    const targetId = classifierCode
      ? resolveClassifierId(index, "LAB_CATEGORY", classifierCode)
      : null;
    const plan = planFieldBackfill(row.labCategoryClassifierId, targetId);
    if (plan.status === "APPLIED") {
      await prisma.catalogLabTest.update({
        where: { id: row.id },
        data: { labCategoryClassifierId: plan.classifierId },
      });
    }
    await audit({
      catalogTable: "CatalogLabTest",
      catalogRowId: row.id,
      catalogCode: row.code,
      fieldName: "labCategoryClassifierId",
      legacyValue: legacyCategory,
      classifierId: plan.classifierId,
      status: plan.status,
      message: plan.message,
    });
  }

  return summary;
}
