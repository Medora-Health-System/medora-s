import { beforeAll, describe, expect, it } from "vitest";
import { buildUnifiedOrderabilityMap } from "./medicationOrderabilityCertification.js";
import { buildActivationGovernanceRecord } from "./medicationActivationGovernance.js";
import { buildEnterpriseMedicationInventoryReport, resetEnterpriseFormularyGapAnalysisCaches } from "./enterpriseFormularyGapAnalysis.js";
import {
  buildWave1ExpansionActivationCandidateTable,
  buildWave1ExpansionActivationReport,
  buildWave1ExpansionActivationRegistry,
  ENTERPRISE_FORMULARY_WAVE_1_ACTIVATION_SPECS,
  listActiveWave1ExpansionProviderOrderingCatalogCodes,
  resetWave1ExpansionActivationRegistryForTests,
  WAVE_1_GOVERNANCE_DEFER_CATALOG_CODES,
} from "./enterpriseFormularyExpansionWave1ActivationRegistry.js";
import {
  buildWave1SearchQueryExpansions,
  certifyWave1SearchAlias,
} from "./enterpriseFormularyWave1SearchAliasManifest.js";
import {
  getActiveProviderOrderableCatalogCodes,
  isActiveProviderOrderableCatalogCode,
  prewarmProviderOrderableCatalogCodesRegistry,
  resetProviderOrderableCatalogCodesRegistryForTests,
} from "./providerOrderableCatalogCodesRegistry.js";
import { CONTROLLED_SUBSTANCE_GOVERNANCE_HOLD_CODES } from "./enterpriseEssentialFormularyActivationWaveRegistry.js";
import { buildEnterpriseMedicationSearchQueryExpansions } from "./enterpriseMedicationSearchExpansion.js";

const ZOSYN_3375 = "PIPERACILLIN_TAZOBACTAM_3_375_G_INJECTABLE_INJECTABLE";
const POTASSIUM_PO_20 = "POTASSIUM_CHLORIDE_20_MEQ_COMPRIME_ORALE";

describe("MEDUI.MEDS.ENTERPRISE_FORMULARY_EXPANSION_WAVE_1_ACTIVATION.1", () => {
  beforeAll(() => {
    resetProviderOrderableCatalogCodesRegistryForTests();
    resetWave1ExpansionActivationRegistryForTests();
    resetEnterpriseFormularyGapAnalysisCaches();
    prewarmProviderOrderableCatalogCodesRegistry();
  });

  it("1 — Wave 1 registry includes only SAFE_TO_ACTIVATE_NOW candidates", () => {
    const registry = buildWave1ExpansionActivationRegistry();
    const candidates = buildWave1ExpansionActivationCandidateTable();
    expect(registry.entries.length).toBeGreaterThanOrEqual(30);
    expect(registry.entries.length).toBeLessThanOrEqual(75);
    for (const entry of registry.entries) {
      const candidate = candidates.find((row) => row.catalogCode === entry.catalogCode);
      expect(candidate?.activationDecision).toBe("SAFE_TO_ACTIVATE_NOW");
      expect(entry.marReady).toBe(true);
    }
  });

  it("2 — no controlled substances newly activated", () => {
    const activated = listActiveWave1ExpansionProviderOrderingCatalogCodes();
    const holdSet = new Set<string>(CONTROLLED_SUBSTANCE_GOVERNANCE_HOLD_CODES);
    for (const code of activated) {
      expect(holdSet.has(code)).toBe(false);
      const record = buildUnifiedOrderabilityMap().get(code);
      expect(record).toBeDefined();
      const governance = buildActivationGovernanceRecord(record!);
      expect(governance.controlledSubstanceFlag).toBe(false);
    }
  });

  it("3 — no high-alert medications activated without governance", () => {
    const activated = listActiveWave1ExpansionProviderOrderingCatalogCodes();
    for (const code of activated) {
      const governance = buildActivationGovernanceRecord(buildUnifiedOrderabilityMap().get(code)!);
      expect(governance.highRiskFlag).toBe(false);
    }
  });

  it("4 — every newly activated medication is MAR-ready", () => {
    for (const code of listActiveWave1ExpansionProviderOrderingCatalogCodes()) {
      const governance = buildActivationGovernanceRecord(buildUnifiedOrderabilityMap().get(code)!);
      expect(governance.marReady).toBe(true);
    }
  });

  it("5 — provider-orderable-not-MAR-ready remains 0", () => {
    const inventory = buildEnterpriseMedicationInventoryReport();
    const orderableNotMar = inventory.rows.filter((row) => row.providerOrderable && !row.MARReady);
    expect(orderableNotMar.length).toBe(0);
    const active = [...getActiveProviderOrderableCatalogCodes()];
    for (const code of active) {
      const record = buildUnifiedOrderabilityMap().get(code);
      if (!record) continue;
      expect(buildActivationGovernanceRecord(record).marReady).toBe(true);
    }
  });

  it("6 — activated medications appear in provider registry", () => {
    const activated = listActiveWave1ExpansionProviderOrderingCatalogCodes();
    expect(activated.length).toBeGreaterThan(0);
    for (const code of activated) {
      expect(isActiveProviderOrderableCatalogCode(code)).toBe(true);
    }
  });

  it("7 — search aliases work for activated meds", () => {
    const expansions = buildWave1SearchQueryExpansions();
    expect(expansions.unasyn).toContain("ampicillin sulbactam");
    expect(expansions.primaxin).toContain("imipenem cilastatin");
    expect(certifyWave1SearchAlias("ERTAPENEM_1_G_POUDRE_INTRAVEINEUSE", "invanz")).toBe(true);
    expect(buildEnterpriseMedicationSearchQueryExpansions().invanz).toContain("ertapenem");
  });

  it("8 — IVPB activated meds have infusion metadata (IVPB without metadata deferred)", () => {
    const candidates = buildWave1ExpansionActivationCandidateTable();
    const activated = listActiveWave1ExpansionProviderOrderingCatalogCodes();
    const activatedIvpb = candidates.filter(
      (row) => row.ivpb && activated.includes(row.catalogCode)
    );
    for (const row of activatedIvpb) {
      expect(row.infusionMetadataPresent).toBe(true);
    }
    const report = buildWave1ExpansionActivationReport();
    expect(report.deferredIvpbMetadataCount).toBe(3);
    expect(
      candidates.filter((row) => row.activationDecision === "NEEDS_IVPB_METADATA").map((row) => row.catalogCode)
    ).toEqual([
      "ACETAMINOPHEN_1000_MG_100_ML_PERFUSION_INTRAVEINEUSE",
      "CIPROFLOXACIN_400_MG_200_ML_PERFUSION_INTRAVEINEUSE",
      "LEVOFLOXACIN_750_MG_150_ML_PERFUSION_INTRAVEINEUSE",
    ]);
  });

  it("9 — existing Zosyn ordering remains active", () => {
    expect(isActiveProviderOrderableCatalogCode(ZOSYN_3375)).toBe(true);
  });

  it("10 — existing potassium PO ordering remains active", () => {
    expect(isActiveProviderOrderableCatalogCode(POTASSIUM_PO_20)).toBe(true);
  });

  it("11 — activation report counts are consistent", () => {
    const before = getActiveProviderOrderableCatalogCodes().size - listActiveWave1ExpansionProviderOrderingCatalogCodes().length;
    const report = buildWave1ExpansionActivationReport({ previousProviderOrderableCount: before });
    expect(report.newActivationsCount).toBe(listActiveWave1ExpansionProviderOrderingCatalogCodes().length);
    expect(report.totalProviderOrderableCount).toBe(getActiveProviderOrderableCatalogCodes().size);
    expect(report.finalDecision).toBe("ENTERPRISE_FORMULARY_WAVE_1_ACTIVATION_READY");
    expect(report.blockers).toEqual([]);
  });

  it("12 — governance-first defer list is not activated", () => {
    for (const code of WAVE_1_GOVERNANCE_DEFER_CATALOG_CODES) {
      expect(listActiveWave1ExpansionProviderOrderingCatalogCodes()).not.toContain(code);
    }
  });

  it("13 — allow-list size within Wave 1 batch cap", () => {
    expect(ENTERPRISE_FORMULARY_WAVE_1_ACTIVATION_SPECS.length).toBeGreaterThanOrEqual(30);
    expect(ENTERPRISE_FORMULARY_WAVE_1_ACTIVATION_SPECS.length).toBeLessThanOrEqual(75);
  });
});
