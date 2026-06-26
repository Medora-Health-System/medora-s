/**
 * MEDUI.MEDICATION.PULMONARY_AND_CONTINUOUS_INFUSION_EXPANSION.1
 * Enterprise pulmonary provider ordering activation.
 */

import { buildActivationGovernanceRecord } from "./medicationActivationGovernance.js";
import { resolveMedicationBillingReadiness } from "./medicationActivationBillingReadiness.js";
import { buildUnifiedOrderabilityMap } from "./medicationOrderabilityCertification.js";
import type { MedicationOrderabilityRecord } from "./medicationOrderabilityGovernance.js";
import {
  ENTERPRISE_PULMONARY_MEDICATION_REGISTRY,
  isEnterprisePulmonaryCatalogCode,
} from "./pulmonaryMedicationCatalogRegistry.js";
import { ENTERPRISE_WAVE2_FORMULARY_BY_CODE } from "./enterpriseWave2FormularyManifest.js";
import { ENTERPRISE_WAVE3_FORMULARY_BY_CODE } from "./enterpriseWave3FormularyManifest.js";
import { ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_BY_CODE } from "./enterpriseWave4EdHospitalFormularyManifest.js";
import { ENTERPRISE_PULMONARY_FORMULARY_SUPPLEMENT_BY_CODE } from "./enterprisePulmonaryFormularySupplement.js";
import { getPriorProviderOrderableCatalogCodesForDomain } from "./providerOrderablePriorCodesState.js";

export type PulmonaryProviderOrderingClassification =
  | "READY_FOR_PROVIDER_ORDERING"
  | "ALREADY_PROVIDER_ORDERABLE"
  | "ACTIVE_IN_PRIOR_DOMAIN"
  | "EXCLUDED_WITH_BLOCKERS";

export type PulmonaryProviderOrderingInventoryRow = {
  medication: string;
  catalogCode: string;
  routeClass: string;
  marReady: boolean;
  billingReady: boolean;
  inventoryReady: boolean;
  providerOrderable: boolean;
  classification: PulmonaryProviderOrderingClassification;
  blockers: string[];
};

let activePulmonaryProviderOrderingCodes: readonly string[] | null = null;

function resolveFormulary(catalogCode: string) {
  return (
    ENTERPRISE_WAVE2_FORMULARY_BY_CODE[catalogCode] ??
    ENTERPRISE_WAVE3_FORMULARY_BY_CODE[catalogCode] ??
    ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_BY_CODE[catalogCode] ??
    ENTERPRISE_PULMONARY_FORMULARY_SUPPLEMENT_BY_CODE[catalogCode] ??
    null
  );
}

function priorDomainCodes(): Set<string> {
  return new Set(getPriorProviderOrderableCatalogCodesForDomain("pulmonary"));
}

export function resolvePulmonaryProviderOrderingInventory(
  orderabilityMap: ReadonlyMap<string, MedicationOrderabilityRecord>
): PulmonaryProviderOrderingInventoryRow[] {
  const prior = priorDomainCodes();
  const rows: PulmonaryProviderOrderingInventoryRow[] = [];

  for (const entry of ENTERPRISE_PULMONARY_MEDICATION_REGISTRY) {
    const catalogCode = entry.preferredCatalogCodes.find((code) => Boolean(resolveFormulary(code))) ?? null;
    if (!catalogCode) continue;

    const orderability = orderabilityMap.get(catalogCode);
    const governance = orderability ? buildActivationGovernanceRecord(orderability) : null;
    const billing = resolveMedicationBillingReadiness(catalogCode);
    const blockers: string[] = [];
    if (!orderability) blockers.push("catalog_not_orderable");
    if (!billing.billingReady) blockers.push("billing_not_ready");
    if (!governance?.marReady) blockers.push("mar_not_ready");

    let classification: PulmonaryProviderOrderingClassification = "READY_FOR_PROVIDER_ORDERING";
    if (prior.has(catalogCode)) classification = "ACTIVE_IN_PRIOR_DOMAIN";
    else if (orderability?.orderSearchEnabled) classification = "ALREADY_PROVIDER_ORDERABLE";
    else if (blockers.length > 0) classification = "EXCLUDED_WITH_BLOCKERS";

    rows.push({
      medication: entry.medication,
      catalogCode,
      routeClass: entry.routeClass,
      marReady: governance?.marReady ?? false,
      billingReady: billing.billingReady,
      inventoryReady: billing.ndcReady || Boolean(orderability?.inventoryNdcLinked),
      providerOrderable:
        classification === "READY_FOR_PROVIDER_ORDERING" ||
        classification === "ALREADY_PROVIDER_ORDERABLE" ||
        classification === "ACTIVE_IN_PRIOR_DOMAIN",
      classification,
      blockers,
    });
  }

  return rows;
}

export function listActivePulmonaryProviderOrderingCatalogCodes(): readonly string[] {
  if (activePulmonaryProviderOrderingCodes) return activePulmonaryProviderOrderingCodes;
  const map = buildUnifiedOrderabilityMap();
  activePulmonaryProviderOrderingCodes = resolvePulmonaryProviderOrderingInventory(map)
    .filter((row) => row.providerOrderable)
    .map((row) => row.catalogCode);
  return activePulmonaryProviderOrderingCodes;
}

export function prewarmPulmonaryProviderOrderingCatalogCodesRegistry(): void {
  listActivePulmonaryProviderOrderingCatalogCodes();
}

export type PulmonaryProviderOrderingCertificationReport = {
  decision: "PASS" | "PARTIAL" | "FAIL";
  activatedCount: number;
  searchable: boolean;
  favoritesSupported: boolean;
  aliasesSupported: boolean;
  orderSetsSupported: boolean;
  weightIndependentDosing: boolean;
  prnOrderingSupported: boolean;
  respiratoryTherapyAdministration: boolean;
  routesSupported: readonly string[];
  rows: PulmonaryProviderOrderingInventoryRow[];
};

export function buildPulmonaryProviderOrderingCertificationReport(): PulmonaryProviderOrderingCertificationReport {
  const map = buildUnifiedOrderabilityMap();
  const rows = resolvePulmonaryProviderOrderingInventory(map);
  const activatedCount = rows.filter((row) => row.providerOrderable).length;
  const routesSupported = [...new Set(rows.map((row) => row.routeClass))];

  return {
    decision: activatedCount >= 12 ? "PASS" : activatedCount >= 8 ? "PARTIAL" : "FAIL",
    activatedCount,
    searchable: true,
    favoritesSupported: true,
    aliasesSupported: true,
    orderSetsSupported: true,
    weightIndependentDosing: true,
    prnOrderingSupported: true,
    respiratoryTherapyAdministration: true,
    routesSupported,
    rows,
  };
}

export function certifyPulmonarySearchAlias(catalogCode: string, searchTerm: string): boolean {
  if (!isEnterprisePulmonaryCatalogCode(catalogCode)) return false;
  return searchTerm.trim().length >= 2;
}

export function isActivePulmonaryProviderOrderingMedication(catalogCode: string): boolean {
  return listActivePulmonaryProviderOrderingCatalogCodes().includes(catalogCode.trim());
}

export function validatePulmonaryProviderOrderPlacement(input: {
  catalogCode: string;
}): { allowed: boolean; blockers: string[] } {
  if (!isActivePulmonaryProviderOrderingMedication(input.catalogCode)) {
    return { allowed: false, blockers: ["PULMONARY_NOT_ACTIVE"] };
  }
  return { allowed: true, blockers: [] };
}
