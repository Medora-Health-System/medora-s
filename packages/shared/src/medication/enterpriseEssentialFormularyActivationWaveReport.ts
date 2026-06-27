/**
 * MEDUI.MEDS.ENTERPRISE_FORMULARY_ACTIVATION_WAVE.1 — audit reports (post-registry).
 */

import { evaluateNonBlockingPharmacyWorkflow } from "./nonBlockingPharmacyReviewPolicy.js";
import { buildActivationGovernanceRecord } from "./medicationActivationGovernance.js";
import { HAITI_MEDICATION_FORMULARY_CATALOG } from "./haitiMedicationFormularyCatalog.js";
import { legacyOrderabilityRow } from "./tranche2ChronicDiseaseActivation.js";
import { buildEnterpriseMedicationInventoryReport } from "./enterpriseFormularyGapAnalysis.js";
import {
  CONTROLLED_SUBSTANCE_GOVERNANCE_HOLD_CODES,
  TMP_SMX_CATALOG_CODES,
  buildEnterpriseEssentialFormularyActivationWaveRegistry,
  isActiveEnterpriseEssentialFormularyWaveMedication,
  listActiveEnterpriseEssentialFormularyWaveCatalogCodes,
  type EssentialFormularyFocusArea,
} from "./enterpriseEssentialFormularyActivationWaveRegistry.js";

export type FormularyActivationAuditReport = ReturnType<typeof buildFormularyActivationAuditReport>;
export type TmpSmxImplementationReport = ReturnType<typeof buildTmpSmxImplementationReport>;
export type EssentialActivationWaveReport = ReturnType<typeof buildEssentialActivationWaveReport>;
export type ControlledSubstanceGovernanceHoldReport = ReturnType<typeof buildControlledSubstanceGovernanceHoldReport>;
export type ProviderOrderableMarReadinessReport = ReturnType<typeof buildProviderOrderableMarReadinessReport>;

export function buildFormularyActivationAuditReport() {
  const inventory = buildEnterpriseMedicationInventoryReport();
  const orderableNotMarReady = inventory.rows.filter((row) => row.providerOrderable && !row.MARReady).length;
  return {
    ticket: "MEDUI.MEDS.ENTERPRISE_FORMULARY_ACTIVATION_WAVE.1" as const,
    totalCatalogMedications: inventory.totalCatalogRows,
    providerOrderableInInventory: inventory.totalProviderOrderableRows,
    activeWaveCatalogCodes: listActiveEnterpriseEssentialFormularyWaveCatalogCodes().length,
    providerOrderableButNotMarReady: orderableNotMarReady,
  };
}

export function buildTmpSmxImplementationReport() {
  const active = listActiveEnterpriseEssentialFormularyWaveCatalogCodes();
  const rows = TMP_SMX_CATALOG_CODES.map((catalogCode) => {
    const legacy = legacyOrderabilityRow(catalogCode);
    const governance = legacy ? buildActivationGovernanceRecord(legacy) : null;
    const haiti = HAITI_MEDICATION_FORMULARY_CATALOG.find((row) => row.code === catalogCode);
    return {
      catalogCode,
      catalogPresent: Boolean(legacy),
      providerOrderable: active.includes(catalogCode),
      marReady: governance?.marReady ?? false,
      aliases: haiti?.commonAliases ?? [],
      displayNameEn: haiti?.displayNameEn ?? legacy?.displayNameEn ?? null,
      therapeuticClass: haiti?.therapeuticClass ?? "Antibiotique",
    };
  });
  return {
    decision: rows.every((row) => row.catalogPresent && row.providerOrderable && row.marReady)
      ? ("TMP_SMX_READY" as const)
      : ("TMP_SMX_BLOCKED" as const),
    rows,
  };
}

export function buildEssentialActivationWaveReport() {
  const registry = buildEnterpriseEssentialFormularyActivationWaveRegistry();
  const byFocus = registry.entries.reduce<Record<EssentialFormularyFocusArea, string[]>>(
    (acc, entry) => {
      acc[entry.focusArea] = [...(acc[entry.focusArea] ?? []), entry.catalogCode];
      return acc;
    },
    {} as Record<EssentialFormularyFocusArea, string[]>
  );
  return {
    activatedCount: registry.entries.length,
    byFocusArea: byFocus,
    workflow: evaluateNonBlockingPharmacyWorkflow({ requiresPharmacyReview: true }),
  };
}

export function buildControlledSubstanceGovernanceHoldReport() {
  const rows = CONTROLLED_SUBSTANCE_GOVERNANCE_HOLD_CODES.map((catalogCode) => ({
    catalogCode,
    heldForGovernanceReview: true,
    newlyActivatedByWave: isActiveEnterpriseEssentialFormularyWaveMedication(catalogCode),
  }));
  return {
    heldCount: rows.length,
    newlyActivatedControlledSubstances: rows.filter((row) => row.newlyActivatedByWave).map((row) => row.catalogCode),
    rows,
  };
}

export function buildProviderOrderableMarReadinessReport() {
  const inventory = buildEnterpriseMedicationInventoryReport();
  const orderableNotMarReady = inventory.rows.filter((row) => row.providerOrderable && !row.MARReady);
  const waveCodes = listActiveEnterpriseEssentialFormularyWaveCatalogCodes();
  const waveMarReady = waveCodes.every((code) => {
    const row = inventory.rows.find((candidate) => candidate.catalogCode === code);
    return row?.MARReady === true;
  });
  return {
    providerOrderableButNotMarReadyCount: orderableNotMarReady.length,
    waveMedicationsMarReady: waveMarReady,
    waveActivatedCount: waveCodes.length,
    orderableNotMarReadyCatalogCodes: orderableNotMarReady.map((row) => row.catalogCode),
  };
}

export function runEnterpriseEssentialFormularyActivationWaveReport() {
  const hold = buildControlledSubstanceGovernanceHoldReport();
  const mar = buildProviderOrderableMarReadinessReport();
  const blockers: string[] = [];
  if (hold.newlyActivatedControlledSubstances.length > 0) {
    blockers.push("CONTROLLED_SUBSTANCE_ACTIVATED_BY_WAVE");
  }
  if (mar.providerOrderableButNotMarReadyCount > 0) {
    blockers.push("PROVIDER_ORDERABLE_NOT_MAR_READY_REGRESSION");
  }
  if (buildTmpSmxImplementationReport().decision !== "TMP_SMX_READY") {
    blockers.push("TMP_SMX_NOT_READY");
  }
  return {
    FormularyActivationAuditReport: buildFormularyActivationAuditReport(),
    TmpSmxImplementationReport: buildTmpSmxImplementationReport(),
    EssentialActivationWaveReport: buildEssentialActivationWaveReport(),
    ControlledSubstanceGovernanceHoldReport: hold,
    ProviderOrderableMarReadinessReport: mar,
    FinalDecision:
      blockers.length === 0
        ? ("ENTERPRISE_FORMULARY_ACTIVATION_WAVE_READY" as const)
        : ("ENTERPRISE_FORMULARY_ACTIVATION_WAVE_BLOCKED" as const),
    blockers,
    RecommendedCommitMessage: "feat(meds): activate essential formulary medications",
  };
}
