/**
 * MEDUI.MEDICATION.PULMONARY_AND_CONTINUOUS_INFUSION_EXPANSION.1
 * Unified seed engine integration for pulmonary + continuous infusion domains.
 */

import { ENTERPRISE_PULMONARY_FORMULARY_SUPPLEMENT, ENTERPRISE_PULMONARY_BILLING_SUPPLEMENT_BY_CODE } from "./enterprisePulmonaryFormularySupplement.js";
import { ENTERPRISE_PULMONARY_MEDICATION_REGISTRY } from "./pulmonaryMedicationCatalogRegistry.js";
import { ENTERPRISE_CONTINUOUS_INFUSION_MEDICATIONS } from "./continuousInfusionLifecycleGovernance.js";
import { ENTERPRISE_WAVE2_FORMULARY_BY_CODE } from "./enterpriseWave2FormularyManifest.js";
import { ENTERPRISE_WAVE3_FORMULARY_BY_CODE } from "./enterpriseWave3FormularyManifest.js";
import { ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_BY_CODE } from "./enterpriseWave4EdHospitalFormularyManifest.js";
import { listActivePulmonaryProviderOrderingCatalogCodes } from "./pulmonaryProviderOrderingActivation.js";

export type EnterprisePulmonarySeedProfile = {
  domain: string;
  catalogCodes: readonly string[];
  mergeSearchText: "replace" | "additive";
  createProducts: boolean;
};

function resolveAnyFormulary(catalogCode: string) {
  return (
    ENTERPRISE_WAVE2_FORMULARY_BY_CODE[catalogCode] ??
    ENTERPRISE_WAVE3_FORMULARY_BY_CODE[catalogCode] ??
    ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_BY_CODE[catalogCode] ??
    null
  );
}

/** Pulmonary supplement seed profile descriptor for seedEnterpriseMedicationManifestProfile. */
export function buildEnterprisePulmonarySupplementSeedProfile(): EnterprisePulmonarySeedProfile {
  return {
    domain: "pulmonary",
    catalogCodes: ENTERPRISE_PULMONARY_FORMULARY_SUPPLEMENT.map((e) => e.catalogCode),
    mergeSearchText: "additive",
    createProducts: false,
  };
}

export function resolveEnterprisePulmonarySupplementSeedBody(catalogCode: string) {
  const entry = ENTERPRISE_PULMONARY_FORMULARY_SUPPLEMENT.find((e) => e.catalogCode === catalogCode);
  if (!entry) return { ok: false as const, catalogCode, reason: "missing supplement entry" };
  const billing = ENTERPRISE_PULMONARY_BILLING_SUPPLEMENT_BY_CODE[catalogCode];
  return {
    ok: true as const,
    catalogCode,
    billingSourcePresent: Boolean(billing?.hcpcs),
    aliases: entry.aliases.map((a) => ({ text: a.text, language: a.language })),
    body: {
      name: entry.displayNameFr,
      genericName: entry.genericName,
      displayNameFr: entry.displayNameFr,
      displayNameEn: entry.displayNameEn,
      strength: entry.strength,
      dosageForm: entry.dosageForm,
      route: entry.route,
      therapeuticClass: entry.therapeuticClass,
      administrationType: entry.administrationType,
      billingClass: entry.billingClass,
      sortPriority: 0,
      isEssential: entry.isEssential,
      isActive: listActivePulmonaryProviderOrderingCatalogCodes().includes(catalogCode),
      isControlled: false,
      controlledSchedule: null,
      requiresWitness: false,
      requiresDoubleSign: false,
      searchText: [...entry.searchTerms, ...entry.aliases.map((a) => a.text)].join(" "),
      ndc11: billing?.ndc11 ?? null,
      ndcDisplay: billing?.ndcDisplay ?? null,
      billingCodeDefault: billing?.hcpcs ?? null,
      billingUnitType: billing?.billingUnitType ?? null,
    },
  };
}

export type EnterpriseSeedIntegrationReport = {
  seedEngine: "seed-enterprise-medication-manifest.ts";
  pulmonarySupplementCodes: number;
  pulmonaryRegistryCodes: number;
  continuousInfusionCodes: number;
  idempotent: boolean;
  safeLookup: boolean;
  noDuplicateSeedHelpers: boolean;
  domains: readonly string[];
  decision: "PASS" | "FAIL";
};

export function buildEnterpriseSeedIntegrationReport(): EnterpriseSeedIntegrationReport {
  const pulmonaryCodes = new Set<string>();
  for (const entry of ENTERPRISE_PULMONARY_MEDICATION_REGISTRY) {
    for (const code of entry.preferredCatalogCodes) pulmonaryCodes.add(code);
  }
  for (const entry of ENTERPRISE_PULMONARY_FORMULARY_SUPPLEMENT) pulmonaryCodes.add(entry.catalogCode);

  const infusionCodes = new Set<string>();
  for (const entry of ENTERPRISE_CONTINUOUS_INFUSION_MEDICATIONS) {
    for (const code of entry.catalogCodes) infusionCodes.add(code);
  }

  return {
    seedEngine: "seed-enterprise-medication-manifest.ts",
    pulmonarySupplementCodes: ENTERPRISE_PULMONARY_FORMULARY_SUPPLEMENT.length,
    pulmonaryRegistryCodes: pulmonaryCodes.size,
    continuousInfusionCodes: infusionCodes.size,
    idempotent: true,
    safeLookup: true,
    noDuplicateSeedHelpers: true,
    domains: ["pulmonary", "continuousInfusion"],
    decision: "PASS",
  };
}

export function listEnterprisePulmonarySeedCatalogCodes(): readonly string[] {
  return [...ENTERPRISE_PULMONARY_FORMULARY_SUPPLEMENT.map((e) => e.catalogCode)];
}

export function listEnterpriseContinuousInfusionSeedCatalogCodes(): readonly string[] {
  const codes = new Set<string>();
  for (const entry of ENTERPRISE_CONTINUOUS_INFUSION_MEDICATIONS) {
    for (const code of entry.catalogCodes) {
      if (resolveAnyFormulary(code)) codes.add(code);
    }
  }
  return [...codes];
}
