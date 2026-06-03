/**
 * M1.7B — Enterprise Wave 3 formulary manifest validation (strict M1.7A.2 + M1.7A.4).
 */

import { resolveMedicationCatalogPrimaryLabel } from "../orders/orderItemDisplayLabels.js";
import { assertEnterpriseWave3BillingManifest } from "./enterpriseWave3BillingValidation.js";
import {
  ENTERPRISE_WAVE3_BILLING_BY_CODE,
  ENTERPRISE_WAVE3_BILLING_MANIFEST,
} from "./enterpriseWave3BillingManifest.js";
import {
  ENTERPRISE_WAVE3_FORMULARY_BY_CODE,
  ENTERPRISE_WAVE3_FORMULARY_MANIFEST,
} from "./enterpriseWave3FormularyManifest.js";
import { ENTERPRISE_WAVE1_FORMULARY_BY_CODE } from "./enterpriseWave1FormularyManifest.js";
import { ENTERPRISE_WAVE2_FORMULARY_BY_CODE } from "./enterpriseWave2FormularyManifest.js";
import type { EnterpriseWave3FormularyEntry } from "./enterpriseWave3Types.js";
import type { MedicationLocalizationContract } from "./medicationLocalizationTypes.js";
import {
  assertEnterpriseWaveFormularyLocalizationReady,
  validateEnterpriseWaveFormularyLocalizationReady,
} from "./medicationLocalizationValidation.js";

export function wave3FormularyEntryToLocalizationContract(
  entry: EnterpriseWave3FormularyEntry
): MedicationLocalizationContract {
  return {
    catalogCode: entry.catalogCode,
    genericName: entry.genericName,
    displayNameFr: entry.displayNameFr,
    displayNameEn: entry.displayNameEn,
    aliases: entry.aliases,
    searchTerms: entry.searchTerms,
    strength: entry.strength,
    dosageForm: entry.dosageForm,
    route: entry.route,
    therapeuticClass: entry.therapeuticClass,
  };
}

export function validateWave3LabelIntegrity(entry: EnterpriseWave3FormularyEntry): string[] {
  const errors: string[] = [];
  const catalogMed = {
    code: entry.catalogCode,
    genericName: entry.genericName,
    displayNameFr: entry.displayNameFr,
    displayNameEn: entry.displayNameEn,
    name: entry.displayNameFr,
    strength: entry.strength,
  };
  const en = resolveMedicationCatalogPrimaryLabel("en", catalogMed, null);
  const fr = resolveMedicationCatalogPrimaryLabel("fr", catalogMed, null);
  if (!en || en.includes("label unavailable")) {
    errors.push(`${entry.catalogCode}: EN label integrity failed`);
  }
  if (!fr || fr.includes("label unavailable")) {
    errors.push(`${entry.catalogCode}: FR label integrity failed`);
  }
  return errors;
}

export function validateEnterpriseWave3FormularyManifest(): string[] {
  const errors: string[] = [];
  const codes = new Set<string>();

  for (const entry of ENTERPRISE_WAVE3_FORMULARY_MANIFEST) {
    if (codes.has(entry.catalogCode)) {
      errors.push(`duplicate catalogCode ${entry.catalogCode}`);
    }
    codes.add(entry.catalogCode);

    if (entry.mode === "CREATE") {
      if (ENTERPRISE_WAVE1_FORMULARY_BY_CODE[entry.catalogCode]) {
        errors.push(`${entry.catalogCode}: CREATE overlaps Wave 1`);
      }
      if (ENTERPRISE_WAVE2_FORMULARY_BY_CODE[entry.catalogCode]) {
        errors.push(`${entry.catalogCode}: CREATE overlaps Wave 2`);
      }
    }

    if (!entry.genericName.trim()) errors.push(`${entry.catalogCode}: missing genericName`);
    if (!entry.displayNameEn.trim()) errors.push(`${entry.catalogCode}: missing displayNameEn`);
    if (!entry.displayNameFr.trim()) errors.push(`${entry.catalogCode}: missing displayNameFr`);
    const enAliases = entry.aliases.filter((a) => a.language === "en");
    const frAliases = entry.aliases.filter((a) => a.language === "fr");
    if (!enAliases.length) errors.push(`${entry.catalogCode}: requires EN alias`);
    if (!frAliases.length) errors.push(`${entry.catalogCode}: requires FR alias`);
    if (!entry.searchTerms.length) errors.push(`${entry.catalogCode}: requires searchTerms`);
    if (!ENTERPRISE_WAVE3_BILLING_BY_CODE[entry.catalogCode]) {
      errors.push(`${entry.catalogCode}: missing billing manifest entry`);
    }
    if (entry.governance.isControlled && !entry.governance.controlledSchedule?.trim()) {
      errors.push(`${entry.catalogCode}: controlled requires schedule`);
    }
    if (entry.governance.isInsulin && !entry.governance.isHighAlert) {
      errors.push(`${entry.catalogCode}: insulin SKU should be high-alert`);
    }
    errors.push(...validateWave3LabelIntegrity(entry));
  }

  if (ENTERPRISE_WAVE3_BILLING_MANIFEST.length !== ENTERPRISE_WAVE3_FORMULARY_MANIFEST.length) {
    errors.push("formulary/billing manifest length mismatch");
  }

  if (ENTERPRISE_WAVE3_FORMULARY_MANIFEST.length < 100) {
    errors.push(
      `wave3 manifest below minimum size (${ENTERPRISE_WAVE3_FORMULARY_MANIFEST.length} < 100)`
    );
  }

  try {
    assertEnterpriseWave3BillingManifest();
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }

  const contracts = ENTERPRISE_WAVE3_FORMULARY_MANIFEST.map(wave3FormularyEntryToLocalizationContract);
  const localization = validateEnterpriseWaveFormularyLocalizationReady(contracts);
  for (const i of localization.issues.filter((x) => x.severity === "blocking")) {
    errors.push(`${i.catalogCode}: ${i.message}`);
  }

  return errors;
}

export function assertEnterpriseWave3FormularyManifest(): void {
  const errors = validateEnterpriseWave3FormularyManifest();
  if (errors.length > 0) {
    throw new Error(`[wave3-formulary] manifest invalid: ${errors.join("; ")}`);
  }
}

export function wave3ConceptCodeForGeneric(genericName: string): string {
  const slug = genericName
    .toUpperCase()
    .replace(/\s*\+\s*/g, "_")
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return `ENT_W3_${slug || "UNKNOWN"}`;
}

export function wave3PackageCodeForProduct(productCode: string): string {
  return `${productCode.trim()}_PKG_DEFAULT`;
}

export function isWave3FormularyEntry(entry: EnterpriseWave3FormularyEntry): boolean {
  return ENTERPRISE_WAVE3_FORMULARY_BY_CODE[entry.catalogCode] != null;
}

export function countWave3GovernanceMarkers(): {
  highAlertCount: number;
  controlledCount: number;
  dmardCount: number;
  biologicCount: number;
  insulinCount: number;
  byBucket: Record<string, number>;
} {
  const byBucket: Record<string, number> = {};
  let highAlertCount = 0;
  let controlledCount = 0;
  let dmardCount = 0;
  let biologicCount = 0;
  let insulinCount = 0;
  for (const e of ENTERPRISE_WAVE3_FORMULARY_MANIFEST) {
    byBucket[e.bucket] = (byBucket[e.bucket] ?? 0) + 1;
    if (e.governance.isHighAlert) highAlertCount += 1;
    if (e.governance.isControlled) controlledCount += 1;
    if (e.governance.isDmard) dmardCount += 1;
    if (e.governance.isBiologic) biologicCount += 1;
    if (e.governance.isInsulin) insulinCount += 1;
  }
  return { highAlertCount, controlledCount, dmardCount, biologicCount, insulinCount, byBucket };
}
