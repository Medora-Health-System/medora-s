import { readFileSync } from "node:fs";
import { join } from "node:path";
import { HAITI_IMAGING_CATALOG } from "../../prisma/data/haiti-imaging-studies";
import {
  CONTRAST_CATALOG_CODE_TO_CLASSIFIER,
  CONTRAST_INTENTIONAL_NULL_IMAGING_CODES,
  IMAGING_CLASSIFIER_FIELD_NAMES,
  planImagingClassifierField,
} from "./catalog-classifier-backfill-map";
import {
  planFieldBackfill,
  resolveClassifierId,
  runCatalogClassifierBackfill,
} from "./catalog-classifier-backfill.service";
import { resolveImagingCatalogClassifierCodes as resolveFromMeta } from "./resolve-classifier-catalog-meta.util";

const EXPECTED_SLOT_COUNTS = {
  apply: 199,
  manualReview: 4,
  notApplicable: 105,
  total: 308,
};

function summarizeImagingPlans() {
  const counts = { apply: 0, manualReview: 0, notApplicable: 0 };
  for (const row of HAITI_IMAGING_CATALOG) {
    const legacy = { modality: row.modality, bodyRegion: row.bodyRegion };
    for (const fieldName of IMAGING_CLASSIFIER_FIELD_NAMES) {
      const plan = planImagingClassifierField(row.code, fieldName, legacy);
      if (plan.disposition === "APPLY") counts.apply += 1;
      else if (plan.disposition === "MANUAL_REVIEW") counts.manualReview += 1;
      else counts.notApplicable += 1;
    }
  }
  return counts;
}

describe("3C-B1D imaging classifier backfill maps (mapping-44)", () => {
  it("covers all 44 Haiti catalog codes for laterality APPLY", () => {
    for (const row of HAITI_IMAGING_CATALOG) {
      const plan = planImagingClassifierField(row.code, "lateralityClassifierId", {
        modality: row.modality,
        bodyRegion: row.bodyRegion,
      });
      expect(plan.disposition).toBe("APPLY");
      expect(plan.classifierCode).toBe("LATERALITY_UNSPECIFIED");
    }
  });

  it("matches expected 7-field slot disposition counts", () => {
    const counts = summarizeImagingPlans();
    expect(counts.apply).toBe(EXPECTED_SLOT_COUNTS.apply);
    expect(counts.manualReview).toBe(EXPECTED_SLOT_COUNTS.manualReview);
    expect(counts.notApplicable).toBe(EXPECTED_SLOT_COUNTS.notApplicable);
    expect(counts.apply + counts.manualReview + counts.notApplicable).toBe(EXPECTED_SLOT_COUNTS.total);
  });

  it("ratifies intentional null contrast for CAP trauma and MRI spine", () => {
    for (const code of ["CT_CHEST_ABDOMEN_PELVIS_TRAUMA", "MRI_SPINE"] as const) {
      const plan = planImagingClassifierField(code, "contrastTypeClassifierId", {
        modality: "CT",
        bodyRegion: "RACHIS",
      });
      expect(plan.disposition).toBe("MANUAL_REVIEW");
      expect(plan.classifierCode).toBeNull();
    }
  });

  it("keeps inactive/predecessor contrast as MANUAL_REVIEW without APPLY target", () => {
    for (const code of ["CT_HEAD", "CT_ABD"] as const) {
      const plan = planImagingClassifierField(code, "contrastTypeClassifierId", {
        modality: "CT",
        bodyRegion: "ABDOMEN",
      });
      expect(plan.disposition).toBe("MANUAL_REVIEW");
      expect(CONTRAST_CATALOG_CODE_TO_CLASSIFIER[code]).toBeUndefined();
    }
  });

  it("APPLY CONTRAST_TYPE_WITHOUT for B1A-resolved CT/MRI codes", () => {
    for (const code of [
      "CT_CHEST",
      "CT_SPINE_LUMBAR",
      "CT_CERVICAL_SPINE",
      "CT_ABDOMEN_PELVIS",
      "MRI_BRAIN",
    ] as const) {
      expect(CONTRAST_CATALOG_CODE_TO_CLASSIFIER[code]).toBe("CONTRAST_TYPE_WITHOUT");
      expect(CONTRAST_INTENTIONAL_NULL_IMAGING_CODES).not.toContain(code);
    }
  });

  it("maps CTA catalog codes to MODALITY_CTA while legacy modality stays CT", () => {
    const plan = planImagingClassifierField("CTA_CHEST", "modalityClassifierId", {
      modality: "CT",
      bodyRegion: "THORAX",
    });
    expect(plan.classifierCode).toBe("MODALITY_CTA");
  });

  it("resolve-classifier-catalog-meta exposes seven resolved classifier codes", () => {
    const row = HAITI_IMAGING_CATALOG.find((r) => r.code === "CT_SPINE_LUMBAR")!;
    const legacy = { modality: row.modality, bodyRegion: row.bodyRegion };
    const targets = resolveFromMeta(row.code, legacy);
    expect(targets.modalityClassifierId).toBe("MODALITY_CT");
    expect(targets.contrastTypeClassifierId).toBe("CONTRAST_TYPE_WITHOUT");
    expect(targets.anatomicSubregionClassifierId).toBe("ANATOMIC_SUBREGION_SPINE_LUMBAR");
    expect(targets.protocolClassifierId).toBeNull();
  });
});

describe("runCatalogClassifierBackfill imaging 7-field", () => {
  const classifierRows = [
    { id: "id-mod-ct", domain: "MODALITY", code: "MODALITY_CT" },
    { id: "id-mod-cta", domain: "MODALITY", code: "MODALITY_CTA" },
    { id: "id-br-chest", domain: "BODY_REGION", code: "BODY_REGION_CHEST" },
    { id: "id-contrast-without", domain: "CONTRAST_TYPE", code: "CONTRAST_TYPE_WITHOUT" },
    { id: "id-contrast-angio", domain: "CONTRAST_TYPE", code: "CONTRAST_TYPE_ANGIOGRAPHIC" },
    { id: "id-lat-unsp", domain: "LATERALITY", code: "LATERALITY_UNSPECIFIED" },
    { id: "id-proto-cap", domain: "PROTOCOL", code: "PROTOCOL_CT_CAP_TRAUMA" },
    { id: "id-proto-cta", domain: "PROTOCOL", code: "PROTOCOL_CTA_CHEST_STANDARD" },
  ];

  function buildMockPrisma(initialImaging: Array<Record<string, unknown>>) {
    const imagingState = initialImaging.map((row) => ({ ...row }));
    const audits: Array<Record<string, unknown>> = [];

    return {
      termClassifier: {
        findMany: async () => classifierRows,
      },
      catalogImagingStudy: {
        findMany: async () => imagingState,
        update: async ({
          where,
          data,
        }: {
          where: { id: string };
          data: Record<string, string | null>;
        }) => {
          const row = imagingState.find((r) => r.id === where.id);
          if (row) Object.assign(row, data);
        },
      },
      catalogLabTest: { findMany: async () => [] },
      catalogClassifierBackfillAudit: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          audits.push(data);
        },
      },
      audits,
      imagingState,
    };
  }

  beforeEach(() => {
    delete process.env.TERMINOLOGY_BACKFILL_ENABLED;
  });

  it("does not run when TERMINOLOGY_BACKFILL_ENABLED is false", async () => {
    const summary = await runCatalogClassifierBackfill({} as never);
    expect(summary.runId).toBe("");
    expect(summary.applied).toBe(0);
  });

  it("dryRun mode does not call update or audit create", async () => {
    process.env.TERMINOLOGY_BACKFILL_ENABLED = "true";
    const mock = buildMockPrisma([
      {
        id: "img-1",
        code: "CT_CHEST",
        modality: "CT",
        bodyRegion: "THORAX",
        modalityClassifierId: null,
        bodyRegionClassifierId: null,
        contrastTypeClassifierId: null,
        viewCountClassifierId: null,
        lateralityClassifierId: null,
        anatomicSubregionClassifierId: null,
        protocolClassifierId: null,
      },
    ]);
    const updateSpy = jest.fn();
    const auditCreateSpy = jest.fn();
    mock.catalogImagingStudy.update = updateSpy;
    mock.catalogClassifierBackfillAudit.create = auditCreateSpy;

    const summary = await runCatalogClassifierBackfill(mock as never, { dryRun: true });

    expect(updateSpy).not.toHaveBeenCalled();
    expect(auditCreateSpy).not.toHaveBeenCalled();
    expect(summary.applied).toBeGreaterThan(0);
    expect(mock.audits).toHaveLength(0);
  });

  it("writes audit rows for all seven fields per imaging row", async () => {
    process.env.TERMINOLOGY_BACKFILL_ENABLED = "true";
    const mock = buildMockPrisma([
      {
        id: "img-1",
        code: "CT_CHEST",
        modality: "CT",
        bodyRegion: "THORAX",
        modalityClassifierId: null,
        bodyRegionClassifierId: null,
        contrastTypeClassifierId: null,
        viewCountClassifierId: null,
        lateralityClassifierId: null,
        anatomicSubregionClassifierId: null,
        protocolClassifierId: null,
      },
    ]);

    await runCatalogClassifierBackfill(mock as never);

    const imagingAudits = mock.audits.filter((a) => a.catalogTable === "CatalogImagingStudy");
    expect(imagingAudits).toHaveLength(IMAGING_CLASSIFIER_FIELD_NAMES.length);
    expect(imagingAudits.map((a) => a.fieldName).sort()).toEqual(
      [...IMAGING_CLASSIFIER_FIELD_NAMES].sort()
    );
  });

  it("audits MANUAL_REVIEW for intentional null contrast without updating FK", async () => {
    process.env.TERMINOLOGY_BACKFILL_ENABLED = "true";
    const mock = buildMockPrisma([
      {
        id: "img-cap",
        code: "CT_CHEST_ABDOMEN_PELVIS_TRAUMA",
        modality: "CT",
        bodyRegion: "chest_abdomen_pelvis",
        modalityClassifierId: "id-mod-ct",
        bodyRegionClassifierId: "id-br-chest",
        contrastTypeClassifierId: null,
        viewCountClassifierId: null,
        lateralityClassifierId: "id-lat-unsp",
        anatomicSubregionClassifierId: null,
        protocolClassifierId: "id-proto-cap",
      },
    ]);

    await runCatalogClassifierBackfill(mock as never);

    const contrastAudit = mock.audits.find(
      (a) => a.catalogCode === "CT_CHEST_ABDOMEN_PELVIS_TRAUMA" && a.fieldName === "contrastTypeClassifierId"
    );
    expect(contrastAudit?.status).toBe("MANUAL_REVIEW");
    expect(mock.imagingState[0]?.contrastTypeClassifierId).toBeNull();
  });

  it("is idempotent when classifier FKs already match targets", async () => {
    process.env.TERMINOLOGY_BACKFILL_ENABLED = "true";
    const mock = buildMockPrisma([
      {
        id: "img-cta",
        code: "CTA_CHEST",
        modality: "CT",
        bodyRegion: "THORAX",
        modalityClassifierId: "id-mod-cta",
        bodyRegionClassifierId: "id-br-chest",
        contrastTypeClassifierId: "id-contrast-angio",
        viewCountClassifierId: null,
        lateralityClassifierId: "id-lat-unsp",
        anatomicSubregionClassifierId: null,
        protocolClassifierId: "id-proto-cta",
      },
    ]);

    const first = await runCatalogClassifierBackfill(mock as never);
    const second = await runCatalogClassifierBackfill(mock as never);

    expect(first.applied).toBe(0);
    expect(second.applied).toBe(0);
    expect(second.unchanged).toBeGreaterThan(0);
  });
});

describe("backfill isolation (no billing/search/retirement writes)", () => {
  it("service only updates CatalogImagingStudy classifier FK columns", () => {
    const source = readFileSync(
      join(__dirname, "catalog-classifier-backfill.service.ts"),
      "utf8"
    );
    expect(source).toContain("catalogImagingStudy.update");
    expect(source).not.toMatch(/billingCatalog|BillingEvent|OrderItem|ImagingStudyAlias/i);
    expect(source).not.toMatch(/searchText|displayNameEn|displayNameFr/);
  });
});

describe("loadClassifierIndex + planFieldBackfill", () => {
  it("resolves domain+code key", () => {
    const index = new Map([["BODY_REGION::BODY_REGION_KNEE", "uuid-knee"]]);
    expect(resolveClassifierId(index, "BODY_REGION", "BODY_REGION_KNEE")).toBe("uuid-knee");
  });

  it("returns UNCHANGED when FK already correct", () => {
    expect(planFieldBackfill("id-1", "id-1").status).toBe("UNCHANGED");
  });
});
