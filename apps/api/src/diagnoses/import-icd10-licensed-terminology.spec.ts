import {
  applyLicensedImportPlanInChunks,
  ICD10_LICENSED_IMPORT_DEFAULT_CHUNK_SIZE,
  licensedSourceIdentityKey,
  type Icd10LicensedTerminologyRow,
  type LicensedImportChunkWriter,
} from "@medora/shared";
import {
  importLicensedIcd10Terminology,
  parseLicensedImportArgs,
  sha256Utf8,
} from "../../prisma/icd/import-icd10-licensed-terminology";

const SCALE_ROWS = 2500;
const SCALE_CHUNK = 500;

function syntheticCatalog(n: number, release = "FY2026") {
  return Array.from({ length: n }, (_, i) => ({
    id: `cat-synth-${i}`,
    code: `X${i}`,
    normalizedCode: `X${i}`,
    codeSystem: "ICD-10-CM",
    releaseVersion: release,
    isSelectable: true,
    isBillable: true,
  }));
}

function syntheticJsonl(n: number, locale: "fr" | "es" = "fr"): string {
  return Array.from({ length: n }, (_, i) =>
    JSON.stringify({
      code: `X${i}`,
      locale,
      label: `TEST_SYNTHETIC_LABEL_${locale.toUpperCase()}_${i}`,
      sourceId: "TEST_P3F2_SYNTHETIC",
      terminologyVersion: "TEST.P3F2.1",
      provenance: "LICENSED_VENDOR",
      status: "APPROVED",
    }),
  ).join("\n");
}

function identityKey(row: Pick<Icd10LicensedTerminologyRow, "code" | "locale" | "labelRegister" | "provenance" | "sourceId" | "terminologyVersion">) {
  return licensedSourceIdentityKey(row);
}

function createMemoryWriter(options?: { failAtInsertChunk?: number }): {
  writer: LicensedImportChunkWriter;
  rows: Map<string, Icd10LicensedTerminologyRow>;
  insertChunkCalls: () => number;
  aliasWrites: number;
} {
  const rows = new Map<string, Icd10LicensedTerminologyRow>();
  let insertChunkCalls = 0;
  let remainingFails = options?.failAtInsertChunk != null ? 1 : 0;
  const writer: LicensedImportChunkWriter = {
    async insertChunk(chunk) {
      insertChunkCalls += 1;
      if (remainingFails > 0 && insertChunkCalls === options?.failAtInsertChunk) {
        remainingFails -= 1;
        throw new Error("injected chunk failure");
      }
      let count = 0;
      for (const row of chunk) {
        const key = identityKey(row);
        if (!rows.has(key)) {
          rows.set(key, row);
          count += 1;
        }
      }
      return { count };
    },
    async updateRow(row) {
      rows.set(identityKey(row), row);
    },
    async supersedeChunk() {
      /* no-op in memory: status rewrite is covered by planner + prisma updateMany */
    },
  };
  return {
    writer,
    rows,
    insertChunkCalls: () => insertChunkCalls,
    aliasWrites: 0,
  };
}

function mockPrisma(catalog: ReturnType<typeof syntheticCatalog>, existing: Icd10LicensedTerminologyRow[]) {
  const findManyCatalog = jest.fn().mockResolvedValueOnce(catalog).mockResolvedValueOnce([]);
  return {
    icd10DiagnosisCode: {
      findMany: findManyCatalog,
      count: jest.fn().mockResolvedValue(0),
    },
    icd10DiagnosisTerminology: {
      findMany: jest.fn().mockResolvedValue(
        existing.map((row) => ({
          code: row.code,
          locale: row.locale,
          labelRegister: row.labelRegister,
          provenance: row.provenance,
          sourceId: row.sourceId,
          terminologyVersion: row.terminologyVersion,
          preferredLabel: row.preferredLabel,
          exactness: row.exactness,
          sourcePriority: row.sourcePriority,
          status: row.status,
        })),
      ),
      count: jest.fn().mockResolvedValue(0),
      createMany: jest.fn(),
      upsert: jest.fn(),
    },
    icd10DiagnosisSearchAlias: { findMany: jest.fn(), upsert: jest.fn(), createMany: jest.fn() },
    $transaction: jest.fn(),
  };
}

describe("P3-F licensed terminology importer CLI", () => {
  it("parses operator flags without inventing a source file or defaulting the release", () => {
    const opts = parseLicensedImportArgs([
      "--file=/secure/vendor-fr.jsonl",
      "--release=FY2026",
      "--dry-run",
      "--supersede-prior",
      "--chunk-size=250",
      "--allow-rejects",
    ]);
    expect(opts.file).toBe("/secure/vendor-fr.jsonl");
    expect(opts.releaseVersion).toBe("FY2026");
    expect(opts.dryRun).toBe(true);
    expect(opts.supersedePrior).toBe(true);
    expect(opts.allowSameVersionUpdate).toBe(false);
    expect(opts.chunkSize).toBe(250);
    expect(opts.allowRejects).toBe(true);
    expect(parseLicensedImportArgs(["--file=/x.jsonl"]).releaseVersion).toBe("");
    expect(parseLicensedImportArgs([]).chunkSize).toBe(ICD10_LICENSED_IMPORT_DEFAULT_CHUNK_SIZE);
  });

  it("dry-runs JSONL against catalog, rejecting headers and unknown codes, inserting no aliases", async () => {
    const findManyCatalog = jest
      .fn()
      .mockResolvedValueOnce([
        {
          id: "cat-r1085",
          code: "R10.85",
          normalizedCode: "R1085",
          codeSystem: "ICD-10-CM",
          releaseVersion: "FY2026",
          isSelectable: true,
          isBillable: true,
        },
        {
          id: "cat-l03",
          code: "L03",
          normalizedCode: "L03",
          codeSystem: "ICD-10-CM",
          releaseVersion: "FY2026",
          isSelectable: false,
          isBillable: false,
        },
      ])
      .mockResolvedValueOnce([]);
    const prisma = {
      icd10DiagnosisCode: { findMany: findManyCatalog },
      icd10DiagnosisTerminology: { findMany: jest.fn().mockResolvedValue([]) },
      icd10DiagnosisSearchAlias: { findMany: jest.fn(), upsert: jest.fn() },
      $transaction: jest.fn(),
    };
    const artifactText = [
      JSON.stringify({
        code: "R10.85",
        locale: "fr",
        label: "Douleur abdominale à plusieurs sites",
        sourceId: "VENDOR_CONTRACT_A",
        terminologyVersion: "VENDOR.2026.1",
        provenance: "LICENSED_VENDOR",
      }),
      JSON.stringify({
        code: "L03",
        locale: "fr",
        label: "Cellulite",
        sourceId: "VENDOR_CONTRACT_A",
        terminologyVersion: "VENDOR.2026.1",
        provenance: "LICENSED_VENDOR",
      }),
      JSON.stringify({
        code: "ZZZ.99",
        locale: "fr",
        label: "Invented",
        sourceId: "VENDOR_CONTRACT_A",
        terminologyVersion: "VENDOR.2026.1",
        provenance: "LICENSED_VENDOR",
      }),
    ].join("\n");

    const plan = await importLicensedIcd10Terminology(prisma as never, {
      file: "vendor-fr.jsonl",
      releaseVersion: "FY2026",
      dryRun: true,
      supersedePrior: false,
      allowSameVersionUpdate: false,
      artifactText,
    });
    expect(plan.acceptedInserts).toHaveLength(1);
    expect(plan.acceptedInserts[0]?.code).toBe("R10.85");
    expect(plan.report.REJECTED_NONSELECTABLE).toBe(1);
    expect(plan.report.REJECTED_UNKNOWN_CODE).toBe(1);
    expect(plan.report.ARTIFACT_SHA256).toBe(sha256Utf8(artifactText));
    expect(plan.report.ARTIFACT_FILE_NAME).toBe("vendor-fr.jsonl");
    expect(plan.report.IMPORT_STATUS).toBe("DRY_RUN");
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.icd10DiagnosisSearchAlias.upsert).not.toHaveBeenCalled();
  });

  it("does not write when prevalidation has rejects unless --allow-rejects", async () => {
    const catalog = syntheticCatalog(1);
    catalog[0] = {
      ...catalog[0]!,
      code: "R10.85",
      normalizedCode: "R1085",
      id: "cat-r1085",
    };
    const prisma = mockPrisma([catalog[0]!], []);
    const artifactText = [
      JSON.stringify({
        code: "R10.85",
        locale: "fr",
        label: "TEST_SYNTHETIC_LABEL_OK",
        sourceId: "TEST_P3F2_SYNTHETIC",
        terminologyVersion: "TEST.P3F2.1",
        provenance: "LICENSED_VENDOR",
      }),
      JSON.stringify({
        code: "ZZZ.99",
        locale: "fr",
        label: "TEST_SYNTHETIC_LABEL_UNKNOWN",
        sourceId: "TEST_P3F2_SYNTHETIC",
        terminologyVersion: "TEST.P3F2.1",
        provenance: "LICENSED_VENDOR",
      }),
    ].join("\n");
    const memory = createMemoryWriter();
    const plan = await importLicensedIcd10Terminology(prisma as never, {
      file: "mixed.jsonl",
      releaseVersion: "FY2026",
      dryRun: false,
      supersedePrior: false,
      allowSameVersionUpdate: false,
      artifactText,
      writer: memory.writer,
      skipCoverageQuery: true,
      recompute: async () => undefined,
    });
    expect(plan.report.IMPORT_STATUS).toBe("NOT_APPLIED");
    expect(memory.rows.size).toBe(0);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("requires an explicit release and refuses to assume FY2026", async () => {
    await expect(
      importLicensedIcd10Terminology({} as never, {
        file: "x.jsonl",
        releaseVersion: "",
        dryRun: true,
        supersedePrior: false,
        allowSameVersionUpdate: false,
        artifactText: "{}",
      }),
    ).rejects.toThrow(/Missing --release/);
  });
});

describe("P3-F.2 chunked licensed import scale (in-memory, TEST ONLY)", () => {
  it("applies 2500 synthetic rows in 5 chunks, resumes after chunk 3 failure, then is idempotent", async () => {
    const catalog = syntheticCatalog(SCALE_ROWS);
    const artifactText = syntheticJsonl(SCALE_ROWS, "fr");
    const memory = createMemoryWriter({ failAtInsertChunk: 3 });
    let recomputeCalls = 0;

    const firstPrisma = mockPrisma(catalog, []);
    const started = Date.now();
    await expect(
      importLicensedIcd10Terminology(firstPrisma as never, {
        file: "/tmp/p3f2-synthetic-fr.jsonl",
        releaseVersion: "FY2026",
        dryRun: false,
        supersedePrior: false,
        allowSameVersionUpdate: false,
        artifactText,
        chunkSize: SCALE_CHUNK,
        writer: memory.writer,
        skipCoverageQuery: true,
        recompute: async (identities) => {
          recomputeCalls += identities.length;
        },
      }),
    ).rejects.toThrow(/INSERT_CHUNK_3_FAILED/);
    expect(memory.rows.size).toBe(1000);
    expect(memory.insertChunkCalls()).toBe(3);
    expect(recomputeCalls).toBe(0);
    expect(firstPrisma.$transaction).not.toHaveBeenCalled();
    expect(firstPrisma.icd10DiagnosisSearchAlias.upsert).not.toHaveBeenCalled();
    expect(firstPrisma.icd10DiagnosisSearchAlias.createMany).not.toHaveBeenCalled();

    const retryPrisma = mockPrisma(catalog, [...memory.rows.values()]);
    const retryStarted = Date.now();
    const retry = await importLicensedIcd10Terminology(retryPrisma as never, {
      file: "/tmp/p3f2-synthetic-fr.jsonl",
      releaseVersion: "FY2026",
      dryRun: false,
      supersedePrior: false,
      allowSameVersionUpdate: false,
      artifactText,
      chunkSize: SCALE_CHUNK,
      writer: memory.writer,
      skipCoverageQuery: true,
      recompute: async (identities) => {
        recomputeCalls += identities.length;
      },
    });
    const retryDuration = Date.now() - retryStarted;
    expect(retry.report.UNCHANGED).toBe(1000);
    expect(retry.acceptedInserts).toHaveLength(1500);
    expect(retry.report.IMPORT_STATUS).toBe("COMPLETE");
    expect(memory.rows.size).toBe(SCALE_ROWS);
    expect(retry.report.ARTIFACT_FILE_NAME).toBe("p3f2-synthetic-fr.jsonl");
    expect(retry.report.ARTIFACT_SHA256).toBe(sha256Utf8(artifactText));
    expect(retry.report.SOURCE_ID).toBe("TEST_P3F2_SYNTHETIC");
    expect(recomputeCalls).toBe(SCALE_ROWS);

    const secondPrisma = mockPrisma(catalog, [...memory.rows.values()]);
    const secondStarted = Date.now();
    const second = await importLicensedIcd10Terminology(secondPrisma as never, {
      file: "/tmp/p3f2-synthetic-fr.jsonl",
      releaseVersion: "FY2026",
      dryRun: false,
      supersedePrior: false,
      allowSameVersionUpdate: false,
      artifactText,
      chunkSize: SCALE_CHUNK,
      writer: memory.writer,
      skipCoverageQuery: true,
      recompute: async (identities) => {
        recomputeCalls += identities.length;
      },
    });
    const secondDuration = Date.now() - secondStarted;
    const firstDurationNote = Date.now() - started;
    expect(second.report.UNCHANGED).toBe(SCALE_ROWS);
    expect(second.report.INSERTED).toBe(0);
    expect(second.acceptedInserts).toHaveLength(0);
    expect(memory.rows.size).toBe(SCALE_ROWS);
    expect(second.report.WRITE_ROUND_TRIPS).toBe(0);

    console.log(
      [
        `IMPORT_TEST_ROWS=${SCALE_ROWS}`,
        `IMPORT_CHUNK_SIZE=${SCALE_CHUNK}`,
        `IMPORT_CHUNK_COUNT=5`,
        `APPROX_DB_WRITE_ROUND_TRIPS=${retry.report.WRITE_ROUND_TRIPS}`,
        `RECOMPUTE_CALL_COUNT=${SCALE_ROWS}`,
        `FIRST_RUN_DURATION_MS_PARTIAL=${firstDurationNote}`,
        `RETRY_DURATION_MS=${retryDuration}`,
        `SECOND_RUN_DURATION_MS=${secondDuration}`,
        `SECOND_RUN_NEW_ROWS=0`,
        `PERFORMANCE_CLASS=in-memory mock; not production Postgres throughput`,
      ].join("\n"),
    );
  });

  it("applies an ES artifact and mixed FR/ES only when source identity is consistent", async () => {
    const catalog = [
      {
        id: "cat-r1085",
        code: "R10.85",
        normalizedCode: "R1085",
        codeSystem: "ICD-10-CM",
        releaseVersion: "FY2026",
        isSelectable: true,
        isBillable: true,
      },
    ];
    const esText = JSON.stringify({
      code: "R10.85",
      locale: "es",
      label: "TEST_SYNTHETIC_LABEL_ES_ONLY",
      sourceId: "TEST_P3F2_SYNTHETIC",
      terminologyVersion: "TEST.P3F2.1",
      provenance: "LICENSED_VENDOR",
    });
    const memory = createMemoryWriter();
    const esPlan = await importLicensedIcd10Terminology(mockPrisma(catalog, []) as never, {
      file: "es.jsonl",
      releaseVersion: "FY2026",
      dryRun: false,
      supersedePrior: false,
      allowSameVersionUpdate: false,
      artifactText: esText,
      writer: memory.writer,
      skipCoverageQuery: true,
      recompute: async () => undefined,
    });
    expect(esPlan.acceptedInserts).toHaveLength(1);
    expect(esPlan.acceptedInserts[0]?.locale).toBe("es");
    expect(memory.rows.size).toBe(1);

    const mixed = [
      esText,
      JSON.stringify({
        code: "R10.85",
        locale: "fr",
        label: "TEST_SYNTHETIC_LABEL_FR_ONLY",
        sourceId: "TEST_P3F2_SYNTHETIC",
        terminologyVersion: "TEST.P3F2.1",
        provenance: "LICENSED_VENDOR",
      }),
    ].join("\n");
    const mixedPlan = await importLicensedIcd10Terminology(mockPrisma(catalog, [...memory.rows.values()]) as never, {
      file: "mixed.jsonl",
      releaseVersion: "FY2026",
      dryRun: true,
      supersedePrior: false,
      allowSameVersionUpdate: false,
      artifactText: mixed,
    });
    expect(mixedPlan.acceptedInserts.some((row) => row.locale === "fr")).toBe(true);
    expect(mixedPlan.report.UNCHANGED).toBe(1);
  });

  it("chunk helper plus apply round-trips stay bounded (createMany-per-chunk, not per-row upsert)", async () => {
    const rows = Array.from({ length: 501 }, (_, i) => ({
      icd10CatalogId: `c${i}`,
      codeSystem: "ICD-10-CM",
      releaseVersion: "FY2026",
      code: `X${i}`,
      normalizedCode: `X${i}`,
      locale: "fr" as const,
      preferredLabel: `TEST_SYNTHETIC_LABEL_${i}`,
      labelRegister: "CLINICIAN_PREFERRED" as const,
      provenance: "LICENSED_VENDOR" as const,
      exactness: "EXACT_SOURCE" as const,
      sourceId: "TEST_P3F2_SYNTHETIC",
      terminologyVersion: "TEST.P3F2.1",
      sourcePriority: 50,
      status: "APPROVED" as const,
    }));
    const memory = createMemoryWriter();
    const applied = await applyLicensedImportPlanInChunks({
      plan: { acceptedInserts: rows, acceptedUpdates: [], supersede: [] },
      writer: memory.writer,
      chunkSize: 500,
    });
    expect(applied.insertChunks).toBe(2);
    expect(applied.writeRoundTrips).toBe(2);
    expect(memory.rows.size).toBe(501);
  });
});
