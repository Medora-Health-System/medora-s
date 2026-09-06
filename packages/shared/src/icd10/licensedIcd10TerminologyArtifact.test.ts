import { describe, expect, it } from "vitest";
import type { Icd10CatalogIdentity } from "./buildGovernedIcd10TerminologySeed.js";
import {
  applyLicensedImportPlanInChunks,
  buildLicensedIcd10TerminologyImportPlan,
  chunkLicensedImportRows,
  formatLicensedImportReport,
  licensedArtifactFileName,
  parseLicensedTerminologyArtifact,
} from "./licensedIcd10TerminologyArtifact.js";

const RELEASE = "FY2026";

function cat(code: string, extras: Partial<Icd10CatalogIdentity> = {}): Icd10CatalogIdentity {
  return {
    id: `cat-${code.replace(/\./g, "")}`,
    code,
    normalizedCode: code.replace(/\./g, ""),
    codeSystem: "ICD-10-CM",
    releaseVersion: RELEASE,
    isSelectable: true,
    isBillable: true,
    ...extras,
  };
}

function vendorRec(code: string, locale: "fr" | "es", label: string, extras: Record<string, string | number> = {}) {
  return {
    code,
    locale,
    label,
    sourceId: "VENDOR_CONTRACT_A",
    terminologyVersion: "VENDOR.2026.1",
    provenance: "LICENSED_VENDOR",
    ...extras,
  };
}

describe("P3-F licensed terminology artifact contract", () => {
  it("parses CSV and JSONL without generating labels", () => {
    const csv = parseLicensedTerminologyArtifact({
      format: "csv",
      text: `code,locale,label,sourceId,terminologyVersion,provenance
R10.85,fr,Douleur abdominale à plusieurs sites,VENDOR_CONTRACT_A,VENDOR.2026.1,LICENSED_VENDOR
`,
    });
    const jsonl = parseLicensedTerminologyArtifact({
      format: "jsonl",
      text: `{"code":"R10.85","locale":"es","label":"Dolor abdominal en varios sitios","sourceId":"VENDOR_CONTRACT_A","terminologyVersion":"VENDOR.2026.1","provenance":"LICENSED_VENDOR"}`,
    });
    expect(csv).toHaveLength(1);
    expect(jsonl[0]?.label).toBe("Dolor abdominal en varios sitios");
  });

  it("accepts exact selectable FR/ES rows as EXACT_SOURCE LICENSED_VENDOR", () => {
    const plan = buildLicensedIcd10TerminologyImportPlan({
      records: [vendorRec("R10.85", "fr", "Douleur abdominale à plusieurs sites")],
      catalogByNormalizedCode: new Map([["R1085", cat("R10.85")]]),
      expectedReleaseVersion: RELEASE,
    });
    expect(plan.acceptedInserts).toHaveLength(1);
    expect(plan.acceptedInserts[0]?.exactness).toBe("EXACT_SOURCE");
    expect(plan.acceptedInserts[0]?.provenance).toBe("LICENSED_VENDOR");
    expect(plan.acceptedInserts[0]?.labelRegister).toBe("CLINICIAN_PREFERRED");
    expect(plan.report.INSERTED).toBe(1);
  });

  it("rejects unknown codes and does not rewrite them", () => {
    const plan = buildLicensedIcd10TerminologyImportPlan({
      records: [vendorRec("S030XXA", "fr", "whatever")],
      catalogByNormalizedCode: new Map(),
      expectedReleaseVersion: RELEASE,
    });
    expect(plan.acceptedInserts).toHaveLength(0);
    expect(plan.rejected[0]?.reason).toBe("REJECTED_UNKNOWN_CODE");
    expect(plan.report.REJECTED_UNKNOWN_CODE).toBe(1);
  });

  it("rejects codes that exist only on another release", () => {
    const plan = buildLicensedIcd10TerminologyImportPlan({
      records: [vendorRec("R10.85", "es", "Dolor")],
      catalogByNormalizedCode: new Map(),
      otherReleaseNormalizedCodes: new Set(["R1085"]),
      expectedReleaseVersion: RELEASE,
    });
    expect(plan.rejected[0]?.reason).toBe("REJECTED_WRONG_RELEASE");
  });

  it("rejects category/header nonselectable rows", () => {
    const plan = buildLicensedIcd10TerminologyImportPlan({
      records: [vendorRec("L03", "fr", "Cellulite")],
      catalogByNormalizedCode: new Map([
        ["L03", cat("L03", { isSelectable: false, isBillable: false })],
      ]),
      expectedReleaseVersion: RELEASE,
    });
    expect(plan.rejected[0]?.reason).toBe("REJECTED_NONSELECTABLE");
    expect(plan.report.REJECTED_NONSELECTABLE).toBe(1);
  });

  it("rejects blank labels and unsupported locales", () => {
    const catalog = new Map([["R1085", cat("R10.85")]]);
    const empty = buildLicensedIcd10TerminologyImportPlan({
      records: [vendorRec("R10.85", "fr", "   ")],
      catalogByNormalizedCode: catalog,
      expectedReleaseVersion: RELEASE,
    });
    const en = buildLicensedIcd10TerminologyImportPlan({
      records: [vendorRec("R10.85", "en" as "fr", "Abdominal pain")],
      catalogByNormalizedCode: catalog,
      expectedReleaseVersion: RELEASE,
    });
    expect(empty.rejected[0]?.reason).toBe("REJECTED_EMPTY");
    expect(en.rejected[0]?.reason).toBe("REJECTED_UNSUPPORTED_LOCALE");
  });

  it("rejects consumer register and does not treat aliases as clinician display", () => {
    const plan = buildLicensedIcd10TerminologyImportPlan({
      records: [vendorRec("R10.85", "es", "dolor abdominal", { labelRegister: "CONSUMER" })],
      catalogByNormalizedCode: new Map([["R1085", cat("R10.85")]]),
      expectedReleaseVersion: RELEASE,
    });
    expect(plan.acceptedInserts).toHaveLength(0);
    expect(plan.rejected[0]?.reason).toBe("REJECTED_CONSUMER_REGISTER");
  });

  it("rejects duplicate source identities in the artifact", () => {
    const rec = vendorRec("R10.85", "fr", "Douleur abdominale à plusieurs sites");
    const plan = buildLicensedIcd10TerminologyImportPlan({
      records: [rec, rec],
      catalogByNormalizedCode: new Map([["R1085", cat("R10.85")]]),
      expectedReleaseVersion: RELEASE,
    });
    expect(plan.report.DUPLICATE_SOURCE_IDENTITY).toBe(1);
    expect(plan.acceptedInserts).toHaveLength(1);
  });

  it("is idempotent: same identity and content is UNCHANGED", () => {
    const rec = vendorRec("R10.85", "fr", "Douleur abdominale à plusieurs sites");
    const catalog = new Map([["R1085", cat("R10.85")]]);
    const first = buildLicensedIcd10TerminologyImportPlan({
      records: [rec],
      catalogByNormalizedCode: catalog,
      expectedReleaseVersion: RELEASE,
    });
    const row = first.acceptedInserts[0]!;
    const second = buildLicensedIcd10TerminologyImportPlan({
      records: [rec],
      catalogByNormalizedCode: catalog,
      expectedReleaseVersion: RELEASE,
      existingRows: [
        {
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
        },
      ],
    });
    expect(second.report.UNCHANGED).toBe(1);
    expect(second.report.INSERTED).toBe(0);
    expect(second.acceptedUpdates).toHaveLength(0);
  });

  it("does not silently overwrite the same version; explicit update flag required", () => {
    const catalog = new Map([["R1085", cat("R10.85")]]);
    const existing = {
      code: "R10.85",
      locale: "fr",
      labelRegister: "CLINICIAN_PREFERRED",
      provenance: "LICENSED_VENDOR",
      sourceId: "VENDOR_CONTRACT_A",
      terminologyVersion: "VENDOR.2026.1",
      preferredLabel: "Ancien libellé",
      exactness: "EXACT_SOURCE",
      sourcePriority: 50,
      status: "APPROVED",
    };
    const blocked = buildLicensedIcd10TerminologyImportPlan({
      records: [vendorRec("R10.85", "fr", "Nouveau libellé")],
      catalogByNormalizedCode: catalog,
      expectedReleaseVersion: RELEASE,
      existingRows: [existing],
    });
    expect(blocked.rejected[0]?.reason).toBe("REJECT_SAME_VERSION_MUTATION");
    const allowed = buildLicensedIcd10TerminologyImportPlan({
      records: [vendorRec("R10.85", "fr", "Nouveau libellé")],
      catalogByNormalizedCode: catalog,
      expectedReleaseVersion: RELEASE,
      existingRows: [existing],
      allowSameVersionUpdate: true,
    });
    expect(allowed.acceptedUpdates).toHaveLength(1);
    expect(allowed.report.UPDATED).toBe(1);
  });

  it("explicit supersede targets prior versions of the same source identity stem", () => {
    const plan = buildLicensedIcd10TerminologyImportPlan({
      records: [vendorRec("R10.85", "fr", "Douleur abdominale à plusieurs sites", { terminologyVersion: "VENDOR.2027.1" })],
      catalogByNormalizedCode: new Map([["R1085", cat("R10.85")]]),
      expectedReleaseVersion: RELEASE,
      supersedePrior: true,
    });
    expect(plan.supersede).toHaveLength(1);
    expect(plan.supersede[0]?.keepTerminologyVersion).toBe("VENDOR.2027.1");
  });

  it("formats the machine-readable import report", () => {
    const plan = buildLicensedIcd10TerminologyImportPlan({
      records: [],
      catalogByNormalizedCode: new Map(),
      expectedReleaseVersion: RELEASE,
    });
    const lines = formatLicensedImportReport(plan.report);
    expect(lines.some((line) => line.startsWith("TOTAL_INPUT="))).toBe(true);
    expect(lines.some((line) => line.startsWith("COVERAGE_AFTER="))).toBe(true);
    expect(lines.some((line) => line.startsWith("ARTIFACT_SHA256="))).toBe(true);
    expect(lines.some((line) => line.startsWith("ARTIFACT_FILE_NAME="))).toBe(true);
    expect(lines.some((line) => line.startsWith("LOCALES="))).toBe(true);
  });

  it("chunks at 1, chunkSize-1, chunkSize, chunkSize+1, and multiple chunks", () => {
    expect(chunkLicensedImportRows([1], 500)).toEqual([[1]]);
    expect(chunkLicensedImportRows(range(499), 500)).toHaveLength(1);
    expect(chunkLicensedImportRows(range(500), 500)).toHaveLength(1);
    expect(chunkLicensedImportRows(range(501), 500)).toHaveLength(2);
    expect(chunkLicensedImportRows(range(501), 500)[0]).toHaveLength(500);
    expect(chunkLicensedImportRows(range(501), 500)[1]).toHaveLength(1);
    expect(chunkLicensedImportRows(range(2500), 500)).toHaveLength(5);
  });

  it("uses basename only for ARTIFACT_FILE_NAME", () => {
    expect(licensedArtifactFileName("/secure/vendor/fr-fy2026.jsonl")).toBe("fr-fy2026.jsonl");
    expect(licensedArtifactFileName("C:\\\\licenses\\\\es.csv")).toBe("es.csv");
    expect(licensedArtifactFileName("")).toBe("(inline)");
  });

  it("rejects mixed sourceId/terminologyVersion unless explicitly allowed", () => {
    const catalog = new Map([["R1085", cat("R10.85")]]);
    const blocked = buildLicensedIcd10TerminologyImportPlan({
      records: [
        vendorRec("R10.85", "fr", "A"),
        vendorRec("R10.85", "es", "B", { sourceId: "OTHER_VENDOR" }),
      ],
      catalogByNormalizedCode: catalog,
      expectedReleaseVersion: RELEASE,
    });
    expect(blocked.acceptedInserts).toHaveLength(0);
    expect(blocked.rejected.every((row) => row.reason === "REJECTED_INCONSISTENT_SOURCE")).toBe(true);
    expect(blocked.report.REJECTED_INCONSISTENT_SOURCE).toBe(2);
  });

  it("allows mixed FR/ES in one artifact when source identity is consistent", () => {
    const plan = buildLicensedIcd10TerminologyImportPlan({
      records: [
        vendorRec("R10.85", "fr", "TEST_SYNTHETIC_LABEL_FR"),
        vendorRec("R10.85", "es", "TEST_SYNTHETIC_LABEL_ES"),
      ],
      catalogByNormalizedCode: new Map([["R1085", cat("R10.85")]]),
      expectedReleaseVersion: RELEASE,
    });
    expect(plan.acceptedInserts).toHaveLength(2);
    expect(plan.report.LOCALE_SET).toBe("fr,es");
  });

  it("apply chunks are sequential, resumable, and idempotent without per-row upserts", async () => {
    const catalog = new Map(range(12).map((i) => [`X${i}`, cat(`X${i}`)]));
    const records = range(12).map((i) =>
      vendorRec(`X${i}`, "fr", `TEST_SYNTHETIC_LABEL_${i}`, { sourceId: "TEST_P3F2_SYNTHETIC" }),
    );
    const first = buildLicensedIcd10TerminologyImportPlan({
      records,
      catalogByNormalizedCode: catalog,
      expectedReleaseVersion: RELEASE,
    });
    const store = new Map<string, string>();
    let insertCalls = 0;
    let remainingInjectedFailures = 1;
    const writer = {
      async insertChunk(rows: readonly { code: string; locale: string; sourceId: string; terminologyVersion: string; provenance: string; labelRegister: string }[]) {
        insertCalls += 1;
        if (remainingInjectedFailures > 0 && insertCalls === 2) {
          remainingInjectedFailures -= 1;
          throw new Error("injected failure");
        }
        for (const row of rows) {
          store.set(`${row.code}|${row.locale}|${row.sourceId}|${row.terminologyVersion}`, row.code);
        }
        return { count: rows.length };
      },
      async updateRow() {
        throw new Error("updates not expected");
      },
      async supersedeChunk() {
        throw new Error("supersede not expected");
      },
    };
    await expect(
      applyLicensedImportPlanInChunks({ plan: first, writer, chunkSize: 5 }),
    ).rejects.toThrow(/INSERT_CHUNK_2_FAILED/);
    expect(store.size).toBe(5);

    const existingRows = [...store.keys()].map((key) => {
      const [code, locale, sourceId, terminologyVersion] = key.split("|");
      const row = first.acceptedInserts.find((r) => r.code === code)!;
      return {
        code: code!,
        locale: locale!,
        labelRegister: "CLINICIAN_PREFERRED",
        provenance: "LICENSED_VENDOR",
        sourceId: sourceId!,
        terminologyVersion: terminologyVersion!,
        preferredLabel: row.preferredLabel,
        exactness: row.exactness,
        sourcePriority: row.sourcePriority,
        status: row.status,
      };
    });
    const retry = buildLicensedIcd10TerminologyImportPlan({
      records,
      catalogByNormalizedCode: catalog,
      expectedReleaseVersion: RELEASE,
      existingRows,
    });
    expect(retry.report.UNCHANGED).toBe(5);
    expect(retry.acceptedInserts).toHaveLength(7);
    insertCalls = 0;
    const retryResult = await applyLicensedImportPlanInChunks({ plan: retry, writer, chunkSize: 5 });
    expect(retryResult.insertChunks).toBe(2);
    expect(retryResult.writeRoundTrips).toBe(2);
    expect(store.size).toBe(12);

    const second = buildLicensedIcd10TerminologyImportPlan({
      records,
      catalogByNormalizedCode: catalog,
      expectedReleaseVersion: RELEASE,
      existingRows: retry.acceptedInserts.concat(retry.unchanged).map((row) => ({
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
    });
    expect(second.report.UNCHANGED).toBe(12);
    expect(second.report.INSERTED).toBe(0);
    const secondApply = await applyLicensedImportPlanInChunks({ plan: second, writer, chunkSize: 5 });
    expect(secondApply.insertChunks).toBe(0);
    expect(secondApply.writeRoundTrips).toBe(0);
    expect(store.size).toBe(12);
  });
});

function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}
