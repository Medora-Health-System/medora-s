/**
 * 3C-B1E — dry-run validation (no DB writes; mapping-44 slot parity).
 */
import { HAITI_IMAGING_CATALOG } from "../../prisma/data/haiti-imaging-studies";
import {
  ANATOMIC_SUBREGION_CATALOG_CODE_TO_CLASSIFIER,
  BODY_REGION_LEGACY_TO_CLASSIFIER,
  CONTRAST_CATALOG_CODE_TO_CLASSIFIER,
  CONTRAST_INTENTIONAL_NULL_IMAGING_CODES,
  IMAGING_CLASSIFIER_FIELD_NAMES,
  LATERALITY_CATALOG_CODE_TO_CLASSIFIER,
  MODALITY_CATALOG_CODE_TO_CLASSIFIER,
  MODALITY_LEGACY_TO_CLASSIFIER,
  PROTOCOL_CATALOG_CODE_TO_CLASSIFIER,
  VIEW_COUNT_CATALOG_CODE_TO_CLASSIFIER,
  classifierDomainForImagingField,
} from "./catalog-classifier-backfill-map";
import {
  type ImagingRowForBackfill,
  planImagingCatalogClassifierBackfill,
} from "./catalog-classifier-backfill.service";
import {
  HAITI_IMAGING_DRY_RUN_EXPECTED,
  validateHaitiImagingDryRunCounts,
} from "./catalog-classifier-backfill-dry-run-validation.util";

const EXPECTED = HAITI_IMAGING_DRY_RUN_EXPECTED;

const MR_CONTRAST_CODES = [
  "CT_HEAD",
  "CT_ABD",
  "CT_CHEST_ABDOMEN_PELVIS_TRAUMA",
  "MRI_SPINE",
] as const;

function buildSyntheticClassifierIndex(): Map<string, string> {
  const index = new Map<string, string>();
  let n = 0;
  const add = (domain: string, code: string) => {
    index.set(`${domain}::${code}`, `uuid-${++n}`);
  };

  for (const code of Object.values(MODALITY_LEGACY_TO_CLASSIFIER)) add("MODALITY", code);
  for (const code of Object.values(MODALITY_CATALOG_CODE_TO_CLASSIFIER)) add("MODALITY", code);
  for (const code of Object.values(BODY_REGION_LEGACY_TO_CLASSIFIER)) add("BODY_REGION", code);
  for (const code of Object.values(CONTRAST_CATALOG_CODE_TO_CLASSIFIER)) add("CONTRAST_TYPE", code);
  for (const code of Object.values(VIEW_COUNT_CATALOG_CODE_TO_CLASSIFIER)) add("VIEW_COUNT", code);
  for (const code of Object.values(LATERALITY_CATALOG_CODE_TO_CLASSIFIER)) add("LATERALITY", code);
  for (const code of Object.values(ANATOMIC_SUBREGION_CATALOG_CODE_TO_CLASSIFIER))
    add("ANATOMIC_SUBREGION", code);
  for (const code of Object.values(PROTOCOL_CATALOG_CODE_TO_CLASSIFIER)) add("PROTOCOL", code);

  for (const fieldName of IMAGING_CLASSIFIER_FIELD_NAMES) {
    add(classifierDomainForImagingField(fieldName), "PLACEHOLDER_UNUSED");
  }

  return index;
}

function haitiRowsWithNullFks(): ImagingRowForBackfill[] {
  return HAITI_IMAGING_CATALOG.map((row, i) => ({
    id: `img-${i}`,
    code: row.code,
    modality: row.modality,
    bodyRegion: row.bodyRegion,
    modalityClassifierId: null,
    bodyRegionClassifierId: null,
    contrastTypeClassifierId: null,
    viewCountClassifierId: null,
    lateralityClassifierId: null,
    anatomicSubregionClassifierId: null,
    protocolClassifierId: null,
  }));
}

describe("3C-B1E imaging backfill dry-run validation (mapping-44)", () => {
  const index = buildSyntheticClassifierIndex();

  it("produces expected slot counts on first dry-run (null FKs)", () => {
    const { summary, audits } = planImagingCatalogClassifierBackfill(haitiRowsWithNullFks(), index);
    const validation = validateHaitiImagingDryRunCounts(summary);

    expect(audits).toHaveLength(EXPECTED.total);
    expect(validation.countsMatchExpected).toBe(true);
    expect(validation.baselineProfile).toBe("all-null");
    expect(summary.applied).toBe(EXPECTED.resolvedSlots);
    expect(summary.manualReview).toBe(EXPECTED.manualReview);
    expect(summary.skipped).toBe(EXPECTED.skipped);
    expect(validation.totalSlots).toBe(EXPECTED.total);
  });

  it("is idempotent on second dry-run (unchanged when FKs already match targets)", () => {
    const rows = haitiRowsWithNullFks();
    const first = planImagingCatalogClassifierBackfill(rows, index);

    const rowsAfterFirst = rows.map((row) => {
      const next = { ...row };
      for (const audit of first.audits.filter((a) => a.catalogCode === row.code)) {
        if (audit.status === "APPLIED" && audit.classifierId) {
          next[audit.fieldName] = audit.classifierId;
        }
      }
      return next;
    });

    const second = planImagingCatalogClassifierBackfill(rowsAfterFirst, index);

    expect(validateHaitiImagingDryRunCounts(first.summary).baselineProfile).toBe("all-null");
    expect(validateHaitiImagingDryRunCounts(second.summary).countsMatchExpected).toBe(true);
    expect(validateHaitiImagingDryRunCounts(second.summary).baselineProfile).toBe("fully-resolved");
    expect(second.summary.applied).toBe(0);
    expect(second.summary.unchanged).toBe(EXPECTED.resolvedSlots);
    expect(second.summary.manualReview).toBe(EXPECTED.manualReview);
    expect(second.summary.skipped).toBe(EXPECTED.skipped);
  });

  it("accepts partially prefilled baseline (APPLIED + UNCHANGED = 199)", () => {
    const rows = haitiRowsWithNullFks();
    const first = planImagingCatalogClassifierBackfill(rows, index);
    const prefillKeys = new Set(
      first.audits
        .filter((a) => a.status === "APPLIED" && a.classifierId)
        .slice(0, 90)
        .map((a) => `${a.catalogCode}::${a.fieldName}`)
    );

    const partiallyPrefilled = rows.map((row) => {
      const next = { ...row };
      for (const audit of first.audits.filter((a) => a.catalogCode === row.code)) {
        if (
          audit.status === "APPLIED" &&
          audit.classifierId &&
          prefillKeys.has(`${audit.catalogCode}::${audit.fieldName}`)
        ) {
          next[audit.fieldName] = audit.classifierId;
        }
      }
      return next;
    });

    const partial = planImagingCatalogClassifierBackfill(partiallyPrefilled, index);
    const validation = validateHaitiImagingDryRunCounts(partial.summary);

    expect(validation.countsMatchExpected).toBe(true);
    expect(validation.baselineProfile).toBe("partial-prefill");
    expect(partial.summary.unchanged).toBe(90);
    expect(partial.summary.applied).toBe(109);
    expect(partial.summary.manualReview).toBe(EXPECTED.manualReview);
    expect(partial.summary.skipped).toBe(EXPECTED.skipped);
  });

  it("keeps contrast MANUAL_REVIEW on four ratified codes", () => {
    const { audits } = planImagingCatalogClassifierBackfill(haitiRowsWithNullFks(), index);
    for (const code of MR_CONTRAST_CODES) {
      const line = audits.find(
        (a) => a.catalogCode === code && a.fieldName === "contrastTypeClassifierId"
      );
      expect(line?.status).toBe("MANUAL_REVIEW");
      expect(line?.classifierId).toBeNull();
    }
    expect(CONTRAST_INTENTIONAL_NULL_IMAGING_CODES).toEqual([...MR_CONTRAST_CODES]);
  });

  it("does not assign contrast to CAP trauma or MRI spine", () => {
    const { audits } = planImagingCatalogClassifierBackfill(haitiRowsWithNullFks(), index);
    for (const code of ["CT_CHEST_ABDOMEN_PELVIS_TRAUMA", "MRI_SPINE"] as const) {
      const line = audits.find(
        (a) => a.catalogCode === code && a.fieldName === "contrastTypeClassifierId"
      );
      expect(line?.status).toBe("MANUAL_REVIEW");
      expect(line?.classifierCode).toBeNull();
    }
  });

  it("maps CTA catalog codes to MODALITY_CTA while legacy modality stays CT", () => {
    const rows = haitiRowsWithNullFks().filter((r) => r.code.startsWith("CTA_"));
    expect(rows.every((r) => r.modality === "CT")).toBe(true);

    const { audits } = planImagingCatalogClassifierBackfill(rows, index);
    for (const row of rows) {
      const line = audits.find(
        (a) => a.catalogCode === row.code && a.fieldName === "modalityClassifierId"
      );
      expect(line?.classifierCode).toBe("MODALITY_CTA");
      expect(line?.status).toBe("APPLIED");
      expect(row.modality).toBe("CT");
    }
  });
});
