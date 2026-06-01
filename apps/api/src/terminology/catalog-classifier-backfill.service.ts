import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import {
  classifierDomainForImagingField,
  IMAGING_CLASSIFIER_FIELD_NAMES,
  type ImagingClassifierFieldName,
  LAB_CATEGORY_LEGACY_TO_CLASSIFIER,
  parseLabCategoryFromDescription,
  planImagingClassifierField,
} from "./catalog-classifier-backfill-map";
import { isTerminologyBackfillEnabled } from "./terminology-flags.util";

export type BackfillAuditStatus = "APPLIED" | "UNCHANGED" | "SKIPPED" | "MANUAL_REVIEW";

export type BackfillSummary = {
  runId: string;
  applied: number;
  unchanged: number;
  skipped: number;
  manualReview: number;
};

export type ImagingBackfillAuditLine = {
  catalogCode: string;
  fieldName: ImagingClassifierFieldName;
  status: BackfillAuditStatus;
  classifierId: string | null;
  classifierCode: string | null;
  legacyValue: string | null;
  message?: string;
};

export type ImagingBackfillDryRunResult = BackfillSummary & {
  dryRun: true;
  imagingSlotCount: number;
  imagingAudits: ImagingBackfillAuditLine[];
};

export type CatalogClassifierBackfillOptions = {
  /** When true: no CatalogImagingStudy / CatalogLabTest updates and no audit table writes. */
  dryRun?: boolean;
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

export type ImagingRowForBackfill = {
  id: string;
  code: string;
  modality: string | null;
  bodyRegion: string | null;
  modalityClassifierId: string | null;
  bodyRegionClassifierId: string | null;
  contrastTypeClassifierId: string | null;
  viewCountClassifierId: string | null;
  lateralityClassifierId: string | null;
  anatomicSubregionClassifierId: string | null;
  protocolClassifierId: string | null;
};

function currentClassifierIdForField(
  row: Record<ImagingClassifierFieldName, string | null>,
  fieldName: ImagingClassifierFieldName
): string | null {
  return row[fieldName];
}

function incrementSummary(summary: BackfillSummary, status: BackfillAuditStatus): void {
  if (status === "APPLIED") summary.applied += 1;
  else if (status === "UNCHANGED") summary.unchanged += 1;
  else if (status === "SKIPPED") summary.skipped += 1;
  else summary.manualReview += 1;
}

/** Plans imaging classifier backfill audit lines without persisting (mapping-44 / 7-field). */
export function planImagingCatalogClassifierBackfill(
  imagingRows: ImagingRowForBackfill[],
  index: ClassifierIndex
): { summary: BackfillSummary; audits: ImagingBackfillAuditLine[] } {
  const summary: BackfillSummary = {
    runId: "",
    applied: 0,
    unchanged: 0,
    skipped: 0,
    manualReview: 0,
  };
  const audits: ImagingBackfillAuditLine[] = [];

  for (const row of imagingRows) {
    const legacy = { modality: row.modality, bodyRegion: row.bodyRegion };
    const classifierRow: Record<ImagingClassifierFieldName, string | null> = {
      modalityClassifierId: row.modalityClassifierId,
      bodyRegionClassifierId: row.bodyRegionClassifierId,
      contrastTypeClassifierId: row.contrastTypeClassifierId,
      viewCountClassifierId: row.viewCountClassifierId,
      lateralityClassifierId: row.lateralityClassifierId,
      anatomicSubregionClassifierId: row.anatomicSubregionClassifierId,
      protocolClassifierId: row.protocolClassifierId,
    };

    for (const fieldName of IMAGING_CLASSIFIER_FIELD_NAMES) {
      const fieldPlan = planImagingClassifierField(row.code, fieldName, legacy);

      if (fieldPlan.disposition === "MANUAL_REVIEW") {
        const status: BackfillAuditStatus = "MANUAL_REVIEW";
        incrementSummary(summary, status);
        audits.push({
          catalogCode: row.code,
          fieldName,
          status,
          classifierId: null,
          classifierCode: null,
          legacyValue: fieldPlan.legacyValue,
          message: fieldPlan.message,
        });
        continue;
      }

      if (fieldPlan.disposition === "NOT_APPLICABLE") {
        const status: BackfillAuditStatus = "SKIPPED";
        incrementSummary(summary, status);
        audits.push({
          catalogCode: row.code,
          fieldName,
          status,
          classifierId: null,
          classifierCode: null,
          legacyValue: fieldPlan.legacyValue,
          message: fieldPlan.message ?? "not applicable",
        });
        continue;
      }

      const domain = classifierDomainForImagingField(fieldName);
      const classifierCode = fieldPlan.classifierCode;
      const targetId = classifierCode ? resolveClassifierId(index, domain, classifierCode) : null;
      const currentId = currentClassifierIdForField(classifierRow, fieldName);
      const plan = planFieldBackfill(currentId, targetId);

      incrementSummary(summary, plan.status);
      audits.push({
        catalogCode: row.code,
        fieldName,
        status: plan.status,
        classifierId: plan.classifierId,
        classifierCode,
        legacyValue: fieldPlan.legacyValue,
        message: plan.message ?? fieldPlan.message,
      });
    }
  }

  return { summary, audits };
}

/**
 * Read-only dry-run for imaging rows (no FK updates, no audit table writes).
 * Does not require TERMINOLOGY_BACKFILL_ENABLED.
 */
export async function runImagingClassifierBackfillDryRun(
  prisma: PrismaClient,
  options?: { catalogCodes?: readonly string[] }
): Promise<ImagingBackfillDryRunResult> {
  const index = await loadClassifierIndex(prisma);
  const codeFilter = options?.catalogCodes ? new Set(options.catalogCodes) : null;

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
      lateralityClassifierId: true,
      anatomicSubregionClassifierId: true,
      protocolClassifierId: true,
    },
    ...(codeFilter
      ? { where: { code: { in: [...codeFilter] } } }
      : {}),
  });

  const filtered = codeFilter
    ? imagingRows.filter((r) => codeFilter.has(r.code))
    : imagingRows;

  const { summary, audits } = planImagingCatalogClassifierBackfill(filtered, index);

  return {
    ...summary,
    runId: randomUUID(),
    dryRun: true,
    imagingSlotCount: filtered.length * IMAGING_CLASSIFIER_FIELD_NAMES.length,
    imagingAudits: audits,
  };
}

export async function runCatalogClassifierBackfill(
  prisma: PrismaClient,
  options?: CatalogClassifierBackfillOptions
): Promise<BackfillSummary> {
  const dryRun = options?.dryRun === true;

  if (!dryRun && !isTerminologyBackfillEnabled()) {
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
    incrementSummary(summary, input.status);
    if (dryRun) return;

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
      lateralityClassifierId: true,
      anatomicSubregionClassifierId: true,
      protocolClassifierId: true,
    },
  });

  for (const row of imagingRows) {
    const legacy = { modality: row.modality, bodyRegion: row.bodyRegion };
    const classifierRow = {
      modalityClassifierId: row.modalityClassifierId,
      bodyRegionClassifierId: row.bodyRegionClassifierId,
      contrastTypeClassifierId: row.contrastTypeClassifierId,
      viewCountClassifierId: row.viewCountClassifierId,
      lateralityClassifierId: row.lateralityClassifierId,
      anatomicSubregionClassifierId: row.anatomicSubregionClassifierId,
      protocolClassifierId: row.protocolClassifierId,
    };

    for (const fieldName of IMAGING_CLASSIFIER_FIELD_NAMES) {
      const fieldPlan = planImagingClassifierField(row.code, fieldName, legacy);

      if (fieldPlan.disposition === "MANUAL_REVIEW") {
        await audit({
          catalogTable: "CatalogImagingStudy",
          catalogRowId: row.id,
          catalogCode: row.code,
          fieldName,
          legacyValue: fieldPlan.legacyValue,
          classifierId: null,
          status: "MANUAL_REVIEW",
          message: fieldPlan.message,
        });
        continue;
      }

      if (fieldPlan.disposition === "NOT_APPLICABLE") {
        await audit({
          catalogTable: "CatalogImagingStudy",
          catalogRowId: row.id,
          catalogCode: row.code,
          fieldName,
          legacyValue: fieldPlan.legacyValue,
          classifierId: null,
          status: "SKIPPED",
          message: fieldPlan.message ?? "not applicable",
        });
        continue;
      }

      const domain = classifierDomainForImagingField(fieldName);
      const targetId = fieldPlan.classifierCode
        ? resolveClassifierId(index, domain, fieldPlan.classifierCode)
        : null;
      const currentId = currentClassifierIdForField(classifierRow, fieldName);
      const plan = planFieldBackfill(currentId, targetId);

      if (!dryRun && plan.status === "APPLIED") {
        await prisma.catalogImagingStudy.update({
          where: { id: row.id },
          data: { [fieldName]: plan.classifierId },
        });
        classifierRow[fieldName] = plan.classifierId;
      }

      await audit({
        catalogTable: "CatalogImagingStudy",
        catalogRowId: row.id,
        catalogCode: row.code,
        fieldName,
        legacyValue: fieldPlan.legacyValue,
        classifierId: plan.classifierId,
        status: plan.status,
        message: plan.message ?? fieldPlan.message,
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
    if (!dryRun && plan.status === "APPLIED") {
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
