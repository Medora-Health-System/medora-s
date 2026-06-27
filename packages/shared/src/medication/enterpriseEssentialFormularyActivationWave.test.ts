import { beforeAll, describe, expect, it } from "vitest";
import { buildActivationGovernanceRecord } from "./medicationActivationGovernance.js";
import { buildUnifiedOrderabilityMap } from "./medicationOrderabilityCertification.js";
import { HAITI_MEDICATION_FORMULARY_CATALOG } from "./haitiMedicationFormularyCatalog.js";
import {
  CONTROLLED_SUBSTANCE_GOVERNANCE_HOLD_CODES,
  TMP_SMX_CATALOG_CODES,
  isActiveEnterpriseEssentialFormularyWaveMedication,
  listActiveEnterpriseEssentialFormularyWaveCatalogCodes,
  resetEnterpriseEssentialFormularyActivationWaveRegistryForTests,
} from "./enterpriseEssentialFormularyActivationWaveRegistry.js";
import {
  buildControlledSubstanceGovernanceHoldReport,
  buildProviderOrderableMarReadinessReport,
  buildTmpSmxImplementationReport,
  runEnterpriseEssentialFormularyActivationWaveReport,
} from "./enterpriseEssentialFormularyActivationWaveReport.js";
import {
  getActiveProviderOrderableCatalogCodes,
  isActiveProviderOrderableCatalogCode,
  prewarmProviderOrderableCatalogCodesRegistry,
  resetProviderOrderableCatalogCodesRegistryForTests,
} from "./providerOrderableCatalogCodesRegistry.js";

describe("MEDUI.MEDS.ENTERPRISE_FORMULARY_ACTIVATION_WAVE.1", () => {
  beforeAll(() => {
    resetProviderOrderableCatalogCodesRegistryForTests();
    resetEnterpriseEssentialFormularyActivationWaveRegistryForTests();
    prewarmProviderOrderableCatalogCodesRegistry();
  });

  it("TMP-SMX catalog rows include search aliases and antibiotic class", () => {
    const allAliases = new Set<string>();
    for (const code of TMP_SMX_CATALOG_CODES) {
      const row = HAITI_MEDICATION_FORMULARY_CATALOG.find((entry) => entry.code === code);
      expect(row).toBeDefined();
      expect(row?.therapeuticClass).toBe("Antibiotique");
      expect(row?.displayNameEn).toBe("Trimethoprim-sulfamethoxazole");
      for (const alias of row?.commonAliases ?? []) allAliases.add(alias.toLowerCase());
    }
    for (const alias of ["bactrim", "bactrim forte", "septra", "trimethoprim", "sulfamethoxazole", "tmp-smx"]) {
      expect(allAliases.has(alias)).toBe(true);
    }
  });

  it("TMP-SMX is provider-orderable via essential activation wave and MAR-ready", () => {
    const report = buildTmpSmxImplementationReport();
    expect(report.decision).toBe("TMP_SMX_READY");
    for (const code of TMP_SMX_CATALOG_CODES) {
      expect(isActiveEnterpriseEssentialFormularyWaveMedication(code)).toBe(true);
      expect(isActiveProviderOrderableCatalogCode(code)).toBe(true);
      const record = buildUnifiedOrderabilityMap().get(code);
      expect(record).toBeDefined();
      expect(buildActivationGovernanceRecord(record!).marReady).toBe(true);
    }
  });

  it("essential wave activates safe catalog codes with MAR readiness", () => {
    const active = listActiveEnterpriseEssentialFormularyWaveCatalogCodes();
    expect(active.length).toBeGreaterThan(10);
    for (const code of active) {
      expect(isActiveProviderOrderableCatalogCode(code)).toBe(true);
      const record = buildUnifiedOrderabilityMap().get(code);
      expect(record, code).toBeDefined();
      expect(buildActivationGovernanceRecord(record!).marReady).toBe(true);
    }
    expect(isActiveProviderOrderableCatalogCode("EPINEPHRINE_1_MG_1_ML_IM_INJECTABLE_INTRAMUSCULAIRE")).toBe(true);
    expect(isActiveProviderOrderableCatalogCode("VANCOMYCIN_1_G_INJECTABLE_INTRAVENOUS")).toBe(true);
    expect(isActiveProviderOrderableCatalogCode("POTASSIUM_CHLORIDE_20_MEQ_PER_10_ML_INJECTABLE_INTRAVENOUS")).toBe(true);
  });

  it("does not newly activate controlled substances held for governance", () => {
    const hold = buildControlledSubstanceGovernanceHoldReport();
    expect(hold.newlyActivatedControlledSubstances).toEqual([]);
    for (const code of CONTROLLED_SUBSTANCE_GOVERNANCE_HOLD_CODES) {
      expect(isActiveEnterpriseEssentialFormularyWaveMedication(code)).toBe(false);
    }
  });

  it("preserves provider-orderable but not MAR-ready count at zero in inventory audit", () => {
    const mar = buildProviderOrderableMarReadinessReport();
    expect(mar.providerOrderableButNotMarReadyCount).toBe(0);
    expect(mar.waveMedicationsMarReady).toBe(true);
  });

  it("full activation wave report is ready", () => {
    const report = runEnterpriseEssentialFormularyActivationWaveReport();
    expect(report.FinalDecision).toBe("ENTERPRISE_FORMULARY_ACTIVATION_WAVE_READY");
    expect(report.RecommendedCommitMessage).toBe("feat(meds): activate essential formulary medications");
    expect(getActiveProviderOrderableCatalogCodes().size).toBeGreaterThan(198);
  });
});
