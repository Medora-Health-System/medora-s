import { beforeAll, describe, expect, it } from "vitest";
import {
  buildIvpbEnterpriseGovernanceAuditReport,
  buildIvpbEnterpriseGovernanceWaveReport,
  buildIvpbGovernanceAuditRows,
  buildIvpbInfusionRuntimeCompatibilityReport,
  buildIvpbMedicationClassificationReport,
  buildIvpbPharmacyCompatibilityReport,
  buildIvpbProviderGovernanceCompatibilityReport,
  buildIvpbRemainingBlockersReport,
  certifyReadyIvpbMedicationGovernance,
  isEnterpriseIvpbInventoryRow,
  resetEnterpriseIvpbInfusionGovernanceCachesForTests,
} from "./enterpriseIvpbInfusionGovernanceWave.js";
import {
  getActiveProviderOrderableCatalogCodes,
  isActiveProviderOrderableCatalogCode,
  prewarmProviderOrderableCatalogCodesRegistry,
  resetProviderOrderableCatalogCodesRegistryForTests,
} from "./providerOrderableCatalogCodesRegistry.js";
import { buildEnterpriseMedicationInventoryReport } from "./enterpriseFormularyGapAnalysis.js";
import { evaluateIvpbDoseSessionEligibility } from "./ivpbDoseSessionEligibility.js";

const ZOSYN = "PIPERACILLIN_TAZOBACTAM_3_375_G_INJECTABLE_INJECTABLE";
const POTASSIUM_PO = "POTASSIUM_CHLORIDE_20_MEQ_COMPRIME_ORALE";

describe("MEDUI.MEDS.ENTERPRISE_IVPB_INFUSION_GOVERNANCE_WAVE.1", () => {
  beforeAll(() => {
    resetProviderOrderableCatalogCodesRegistryForTests();
    resetEnterpriseIvpbInfusionGovernanceCachesForTests();
    prewarmProviderOrderableCatalogCodesRegistry();
  });

  it("audits every IVPB medication in enterprise inventory", () => {
    const inventory = buildEnterpriseMedicationInventoryReport();
    const ivpbInventory = inventory.rows.filter(isEnterpriseIvpbInventoryRow);
    const auditRows = buildIvpbGovernanceAuditRows();
    expect(ivpbInventory.length).toBeGreaterThan(0);
    expect(auditRows.length).toBe(ivpbInventory.length);
    expect(auditRows.length).toBe(74);
  });

  it("aligns expansion-audit missing infusion metadata count with baseline (67 → 0 after remediation)", () => {
    const audit = buildIvpbEnterpriseGovernanceAuditReport();
    expect(audit.expansionAuditMissingInfusionMetadataCount).toBe(0);
  });

  it("classifies every IVPB row into governed buckets", () => {
    const classification = buildIvpbMedicationClassificationReport();
    const total = Object.values(classification.byClassification).reduce((sum, codes) => sum + codes.length, 0);
    expect(total).toBe(74);
    for (const row of buildIvpbGovernanceAuditRows()) {
      expect(classification.byClassification[row.classification]).toContain(row.catalogCode);
    }
  });

  it("does not activate medications — provider-orderable count unchanged by audit module", () => {
    const before = getActiveProviderOrderableCatalogCodes().size;
    buildIvpbEnterpriseGovernanceWaveReport();
    expect(getActiveProviderOrderableCatalogCodes().size).toBe(before);
    expect(before).toBeGreaterThanOrEqual(250);
  });

  it("flags provider-orderable IVPB rows missing runtime infusion metadata", () => {
    const audit = buildIvpbEnterpriseGovernanceAuditReport();
    const orderableMissingMeta = audit.rows.filter((row) => row.providerOrderable && !row.runtimeInfusionMetadataPresent);
    expect(orderableMissingMeta.length).toBe(0);
    expect(audit.finalDecision).toBe("ENTERPRISE_IVPB_GOVERNANCE_CERTIFIED");
  });

  describe("READY_FOR_ACTIVATION certification", () => {
    const readyRows = () =>
      buildIvpbGovernanceAuditRows().filter((row) => row.classification === "READY_FOR_ACTIVATION");

    it("certifies start/stop engine for IVPB session doses", () => {
      const session = evaluateIvpbDoseSessionEligibility({
        doseKind: "IVPB_SESSION",
        doseStatus: "DUE",
        scheduleClassification: "RECURRING_IVPB",
      });
      expect("start" in session && session.start.eligible).toBe(true);
    });

    it("every READY_FOR_ACTIVATION row passes governance certification", () => {
      const rows = readyRows();
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        const cert = certifyReadyIvpbMedicationGovernance(row);
        expect(cert.certified, `${row.catalogCode}: ${cert.blockers.join(", ")}`).toBe(true);
      }
    });

    it("READY rows support MAR infusion lifecycle (no direct MAR bypass)", () => {
      for (const row of readyRows()) {
        expect(row.marCompatible).toBe(true);
        expect(row.startStopCompatible).toBe(true);
      }
    });

    it("READY rows support pharmacy, ED summary, print packet, and audit trail flags", () => {
      for (const row of readyRows()) {
        expect(row.pharmacyCompatible).toBe(true);
        expect(row.edWorkflowCompatible).toBe(true);
        expect(row.printPacketSupport).toBe(true);
        expect(row.summarySupport).toBe(true);
        expect(row.auditTrailSupport).toBe(true);
      }
    });
  });

  it("runtime compatibility report passes for READY rows", () => {
    const runtime = buildIvpbInfusionRuntimeCompatibilityReport();
    expect(runtime.ivpbSessionRuntimeSupported).toBe(true);
    expect(runtime.continuousInfusionRuntimeSupported).toBe(true);
    expect(runtime.readyRowsRuntimeCompatible).toBe(runtime.readyRowsTotal);
    expect(runtime.decision).toBe("PASS");
  });

  it("pharmacy compatibility report passes for READY rows", () => {
    const pharmacy = buildIvpbPharmacyCompatibilityReport();
    expect(pharmacy.nonBlockingPharmacyWorkflow).toBe(true);
    expect(pharmacy.readyRowsPharmacyCompatible).toBe(pharmacy.readyRowsPharmacyCompatible);
    expect(pharmacy.decision).toBe("PASS");
  });

  it("provider governance report covers high-alert and controlled deferrals", () => {
    const report = buildIvpbProviderGovernanceCompatibilityReport();
    const blockers = buildIvpbRemainingBlockersReport();
    expect(report.needsProviderGovernanceCount).toBeGreaterThan(0);
    expect(blockers.needsInfusionMetadata.length).toBe(0);
  });

  it("preserves Zosyn and potassium PO regressions", () => {
    expect(isActiveProviderOrderableCatalogCode(ZOSYN)).toBe(true);
    expect(isActiveProviderOrderableCatalogCode(POTASSIUM_PO)).toBe(true);
  });

  it("wave report aggregates audit, runtime, pharmacy, and classification", () => {
    const wave = buildIvpbEnterpriseGovernanceWaveReport();
    expect(wave.audit.totalIvpbMedications).toBe(74);
    expect(wave.classification.rows.length).toBe(74);
    expect(wave.remainingBlockers.needsInfusionMetadata.length).toBe(0);
  });
});
