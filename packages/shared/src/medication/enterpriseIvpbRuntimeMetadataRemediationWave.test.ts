import { beforeAll, describe, expect, it } from "vitest";
import {
  buildIvpbRuntimeCertificationReport,
  buildIvpbRuntimeMetadataRemediationReport,
  buildIvpbRuntimeMetadataSafetyRegressionReport,
  buildIvpbRuntimeReconciliationTable,
  buildIvpbRuntimeVsManifestReconciliationReport,
  resetIvpbRuntimeMetadataRemediationCachesForTests,
} from "./enterpriseIvpbRuntimeMetadataRemediationWave.js";
import {
  buildIvpbEnterpriseGovernanceAuditReport,
  buildIvpbRemainingBlockersReport,
} from "./enterpriseIvpbInfusionGovernanceWave.js";
import {
  getActiveProviderOrderableCatalogCodes,
  prewarmProviderOrderableCatalogCodesRegistry,
  resetProviderOrderableCatalogCodesRegistryForTests,
} from "./providerOrderableCatalogCodesRegistry.js";

describe("MEDUI.MEDS.ENTERPRISE_IVPB_RUNTIME_METADATA_REMEDIATION_WAVE.1", () => {
  beforeAll(() => {
    resetProviderOrderableCatalogCodesRegistryForTests();
    resetIvpbRuntimeMetadataRemediationCachesForTests();
    prewarmProviderOrderableCatalogCodesRegistry();
  });

  it("Phase 1 — reconciles all 74 IVPB medications", () => {
    const table = buildIvpbRuntimeReconciliationTable();
    expect(table.length).toBe(74);
    for (const row of table) {
      expect(row.catalogCode.length).toBeGreaterThan(0);
      expect(row.classification).toBeDefined();
    }
  });

  it("Phase 2 — runtime metadata blocker eliminated (0 missing expansion-audit metadata)", () => {
    const report = buildIvpbRuntimeMetadataRemediationReport();
    expect(report.runtimeMetadataMissing).toBe(0);
    expect(report.finalDecision).toBe("ENTERPRISE_IVPB_RUNTIME_METADATA_REMEDIATION_COMPLETE");
    const governance = buildIvpbEnterpriseGovernanceAuditReport();
    expect(governance.expansionAuditMissingInfusionMetadataCount).toBe(0);
  });

  it("Phase 3 — READY_FOR_ACTIVATION IVPB rows pass runtime certification", () => {
    const cert = buildIvpbRuntimeCertificationReport();
    expect(cert.expansionAuditMissingInfusionMetadata).toBe(0);
    expect(cert.providerOrderableMissingRuntimeMetadata).toBe(0);
    expect(cert.readyRowsCertified).toBe(cert.readyRowsTotal);
    expect(cert.decision).toBe("PASS");
  });

  it("Phase 4 — provider-orderable count unchanged (no activation)", () => {
    const before = getActiveProviderOrderableCatalogCodes().size;
    buildIvpbRuntimeMetadataRemediationReport();
    expect(getActiveProviderOrderableCatalogCodes().size).toBe(before);
    expect(before).toBeGreaterThanOrEqual(250);
  });

  it("Phase 5 — safety regression report passes", () => {
    const safety = buildIvpbRuntimeMetadataSafetyRegressionReport();
    expect(safety.decision).toBe("PASS");
    expect(safety.zosynActive).toBe(true);
    expect(safety.potassiumPoActive).toBe(true);
    expect(safety.providerOrderableCountUnchanged).toBe(true);
    expect(safety.marInvariantPreserved).toBe(true);
  });

  it("Phase 6 — readiness report counts", () => {
    const report = buildIvpbRuntimeMetadataRemediationReport();
    const reconciliation = buildIvpbRuntimeVsManifestReconciliationReport();
    expect(report.runtimeMetadataComplete).toBe(reconciliation.readyRuntime.length);
    expect(report.readyForActivationCount).toBeGreaterThanOrEqual(30);
    expect(report.remainingBlockers).not.toContain("EXPANSION_AUDIT_MISSING_INFUSION_METADATA");
    expect(report.remainingBlockers).not.toContain("PROVIDER_ORDERABLE_MISSING_RUNTIME_METADATA");
  });

  it("governance deferrals remain for high-alert / pharmacy (not metadata)", () => {
    const blockers = buildIvpbRemainingBlockersReport();
    expect(blockers.needsInfusionMetadata.length).toBe(0);
    expect(blockers.needsProviderGovernance.length).toBeGreaterThan(0);
  });
});
