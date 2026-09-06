import { fy2027EsGapIngestGate, ICD10_FY2027_ES_COMBINED_ARTIFACT_SHA256 } from "@medora/shared";
import { parseFy2027EsTerminologyArgs } from "./build-fy2027-es-terminology";

describe("FY2027 ES terminology CLI approval stages", () => {
  it("treats --approve-structurally-passing as structural export, not ingest approval", () => {
    const options = parseFy2027EsTerminologyArgs([
      "--release=FY2027",
      "--approve-structurally-passing",
      "--apply-local",
    ]);
    expect(options.approveStructurallyPassing).toBe(true);
    expect(options.approveSemanticallyCertified).toBe(false);
    expect(fy2027EsGapIngestGate(options)).toEqual({ allowed: false, reason: "REFUSING_STRUCTURAL_INGEST" });
  });

  it("requires --approve-semantically-certified before local ingest", () => {
    const blocked = parseFy2027EsTerminologyArgs(["--release=FY2027", "--apply-local"]);
    expect(fy2027EsGapIngestGate(blocked)).toEqual({ allowed: false, reason: "REFUSING_INGEST" });
    const allowed = parseFy2027EsTerminologyArgs([
      "--release=FY2027",
      "--certify-semantics",
      "--approve-semantically-certified",
      "--apply-local",
      "--dry-run",
    ]);
    expect(allowed.dryRun).toBe(true);
    expect(fy2027EsGapIngestGate(allowed)).toEqual({ allowed: true });
  });

  it("parses source-file emit flags without requiring a database", () => {
    const options = parseFy2027EsTerminologyArgs([
      "--release=FY2027",
      "--emit-from-sources",
      "--cie10es=/secure/path/Diagnosticos_Tabla_Referencia_CIE10ES_2026.xlsx",
      "--fy2026-us=/secure/path/icd10cm-order-2026.txt",
      "--fy2027-us=/secure/path/icd10cm-order-2027.txt",
      "--combined-out=/secure/path/medora-p3f8-es-fy2027-combined.jsonl",
      "--certify-semantics",
      "--approve-semantically-certified",
    ]);
    expect(options.emitFromSources).toBe(true);
    expect(options.applyLocal).toBe(false);
    expect(options.cie10es).toContain("CIE10ES_2026.xlsx");
    expect(options.combinedOut).toContain("medora-p3f8-es-fy2027-combined.jsonl");
  });

  it("pins a 64-character SHA-256 for the source-emitted FY2027 combined JSONL", () => {
    expect(ICD10_FY2027_ES_COMBINED_ARTIFACT_SHA256).toMatch(/^[a-f0-9]{64}$/);
    expect(ICD10_FY2027_ES_COMBINED_ARTIFACT_SHA256).toBe(
      "9445fd10dba09f3d234c136ddfa05b002f4d9f00e41036b6ec5b49be0a7a4ecc",
    );
  });
});
