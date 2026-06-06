/**
 * M1.8B.4A.2 — Hybrid high-alert class resolution for MAR governance.
 * Profile-first; manifest APPLY fallback; catalog heuristic for insulin/anticoagulant.
 */

import { HIGH_ALERT_MEDICATION_GOVERNANCE_MANIFEST } from "./highAlertMedicationGovernanceManifest.js";
import {
  catalogRowMatchesHighAlertGovernanceEntry,
  type CatalogRowForHighAlertMatch,
} from "./highAlertMedicationGovernanceValidation.js";
import type { SafetyRequirementCode } from "./medicationSafetyClassifiers.js";

export type MarHighAlertCatalogGovernanceInput = {
  code?: string | null;
  genericName?: string | null;
  displayNameEn?: string | null;
  strength?: string | null;
  dosageForm?: string | null;
};

export type MarHighAlertClassificationSource =
  | "SAFETY_PROFILE"
  | "MANIFEST"
  | "CATALOG_HEURISTIC";

export type ResolvedMarHighAlertClassification = {
  highAlertClass: string;
  safetyRequirementCodes: string[];
  source: MarHighAlertClassificationSource;
};

const INSULIN_SAFETY_CODES: SafetyRequirementCode[] = [
  "REQUIRES_INDEPENDENT_DOUBLE_CHECK",
  "REQUIRES_MAR_VERIFICATION",
];

const ANTICOAG_SAFETY_CODES: SafetyRequirementCode[] = [
  "REQUIRES_INDEPENDENT_DOUBLE_CHECK",
  "REQUIRES_MAR_VERIFICATION",
];

function trimOrNull(v: string | null | undefined): string | null {
  const t = v?.trim();
  return t ? t : null;
}

function normalizeMatchText(v: string): string {
  return v.trim().toLowerCase().replace(/\s+/g, " ");
}

function toCatalogRowForMatch(
  catalog: MarHighAlertCatalogGovernanceInput
): CatalogRowForHighAlertMatch | null {
  const code = trimOrNull(catalog.code);
  if (!code) return null;
  return {
    id: code,
    code,
    genericName: catalog.genericName ?? null,
    strength: catalog.strength ?? null,
    dosageForm: catalog.dosageForm ?? null,
    displayNameEn: catalog.displayNameEn ?? null,
  };
}

function resolveFromManifest(
  catalog: MarHighAlertCatalogGovernanceInput
): ResolvedMarHighAlertClassification | null {
  const row = toCatalogRowForMatch(catalog);
  if (!row) return null;

  for (const entry of HIGH_ALERT_MEDICATION_GOVERNANCE_MANIFEST) {
    if (entry.governanceStatus !== "APPLY") continue;
    if (!catalogRowMatchesHighAlertGovernanceEntry(row, entry)) continue;
    return {
      highAlertClass: entry.highAlertClass,
      safetyRequirementCodes: [...entry.safetyRequirementCodes],
      source: "MANIFEST",
    };
  }
  return null;
}

function resolveFromCatalogHeuristic(
  catalog: MarHighAlertCatalogGovernanceInput
): ResolvedMarHighAlertClassification | null {
  const code = (catalog.code ?? "").toUpperCase();
  const generic = normalizeMatchText(catalog.genericName ?? "");
  const display = normalizeMatchText(catalog.displayNameEn ?? "");
  const hay = `${code} ${generic} ${display}`;

  if (
    code.includes("INSULIN") ||
    generic.includes("insulin") ||
    display.includes("insulin") ||
    display.includes("insuline")
  ) {
    return {
      highAlertClass: "HIGH_ALERT_INSULIN",
      safetyRequirementCodes: [...INSULIN_SAFETY_CODES],
      source: "CATALOG_HEURISTIC",
    };
  }

  if (code.includes("HEPARIN") || generic === "heparin" || display.includes("heparin")) {
    return {
      highAlertClass: "HIGH_ALERT_ANTICOAGULANT",
      safetyRequirementCodes: [...ANTICOAG_SAFETY_CODES],
      source: "CATALOG_HEURISTIC",
    };
  }

  if (code.includes("ENOXAPARIN") || generic.includes("enoxaparin")) {
    return {
      highAlertClass: "HIGH_ALERT_ANTICOAGULANT",
      safetyRequirementCodes: [...ANTICOAG_SAFETY_CODES],
      source: "CATALOG_HEURISTIC",
    };
  }

  return null;
}

/**
 * Resolves MAR high-alert class for enforcement when safety profile may be absent or unseeded.
 * Does not mutate profiles — runtime classification only.
 */
export function resolveMarHighAlertClassification(input: {
  profileHighAlertClass?: string | null;
  profileSafetyRequirementCodes?: string[] | null;
  catalog?: MarHighAlertCatalogGovernanceInput | null;
}): ResolvedMarHighAlertClassification | null {
  const profileClass = trimOrNull(input.profileHighAlertClass);
  if (profileClass && profileClass !== "HIGH_ALERT_NONE") {
    return {
      highAlertClass: profileClass,
      safetyRequirementCodes: [...(input.profileSafetyRequirementCodes ?? [])],
      source: "SAFETY_PROFILE",
    };
  }

  const catalog = input.catalog;
  if (!catalog) return null;

  return resolveFromManifest(catalog) ?? resolveFromCatalogHeuristic(catalog);
}
