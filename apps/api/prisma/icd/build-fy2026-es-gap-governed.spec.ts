import { fy2026EsGapIngestGate } from "@medora/shared";
import { parseFy2026EsGapGovernedArgs } from "./build-fy2026-es-gap-governed";

describe("FY2026 ES gap governed CLI approval stages", () => {
  it("treats --approve-structurally-passing as structural export, not ingest approval", () => {
    const options = parseFy2026EsGapGovernedArgs([
      "--release=FY2026",
      "--approve-structurally-passing",
      "--apply-local",
    ]);
    expect(options.approveStructurallyPassing).toBe(true);
    expect(options.approveSemanticallyCertified).toBe(false);
    expect(fy2026EsGapIngestGate(options)).toEqual({ allowed: false, reason: "REFUSING_STRUCTURAL_INGEST" });
  });

  it("accepts --export-structural-candidates as the non-approval alias", () => {
    const options = parseFy2026EsGapGovernedArgs(["--release=FY2026", "--export-structural-candidates"]);
    expect(options.approveStructurallyPassing).toBe(true);
    expect(options.applyLocal).toBe(false);
    expect(fy2026EsGapIngestGate(options)).toEqual({ allowed: true });
  });

  it("requires --approve-semantically-certified before local ingest", () => {
    const blocked = parseFy2026EsGapGovernedArgs(["--release=FY2026", "--apply-local"]);
    expect(fy2026EsGapIngestGate(blocked)).toEqual({ allowed: false, reason: "REFUSING_INGEST" });
    const allowed = parseFy2026EsGapGovernedArgs([
      "--release=FY2026",
      "--certify-semantics",
      "--approve-semantically-certified",
      "--apply-local",
    ]);
    expect(allowed.certifySemantics).toBe(true);
    expect(allowed.approveSemanticallyCertified).toBe(true);
    expect(fy2026EsGapIngestGate(allowed)).toEqual({ allowed: true });
  });
});
