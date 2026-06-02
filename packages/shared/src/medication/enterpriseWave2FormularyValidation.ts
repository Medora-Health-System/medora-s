/**
 * M1.6D — Enterprise Wave 2 formulary manifest validation.
 */

import { assertEnterpriseWave2BillingManifest } from "./enterpriseWave2BillingValidation.js";
import {
  ENTERPRISE_WAVE2_BILLING_BY_CODE,
  ENTERPRISE_WAVE2_BILLING_MANIFEST,
} from "./enterpriseWave2BillingManifest.js";
import {
  ENTERPRISE_WAVE2_FORMULARY_BY_CODE,
  ENTERPRISE_WAVE2_FORMULARY_MANIFEST,
} from "./enterpriseWave2FormularyManifest.js";
import { ENTERPRISE_WAVE1_FORMULARY_BY_CODE } from "./enterpriseWave1FormularyManifest.js";
import type { EnterpriseWave2FormularyEntry } from "./enterpriseWave2Types.js";

export function validateEnterpriseWave2FormularyManifest(): string[] {
  const errors: string[] = [];
  const codes = new Set<string>();

  for (const entry of ENTERPRISE_WAVE2_FORMULARY_MANIFEST) {
    if (codes.has(entry.catalogCode)) {
      errors.push(`duplicate catalogCode ${entry.catalogCode}`);
    }
    codes.add(entry.catalogCode);
    if (ENTERPRISE_WAVE1_FORMULARY_BY_CODE[entry.catalogCode]) {
      errors.push(`${entry.catalogCode}: overlaps Wave 1 manifest`);
    }
    if (!entry.genericName.trim()) errors.push(`${entry.catalogCode}: missing genericName`);
    if (!entry.aliases.length) errors.push(`${entry.catalogCode}: requires at least one alias`);
    if (!entry.searchTerms.length) errors.push(`${entry.catalogCode}: requires searchTerms`);
    if (!ENTERPRISE_WAVE2_BILLING_BY_CODE[entry.catalogCode]) {
      errors.push(`${entry.catalogCode}: missing billing manifest entry`);
    }
    if (entry.bucket === "ANTICOAGULATION" && !entry.governance.isHighAlert) {
      errors.push(`${entry.catalogCode}: anticoag must be high-alert`);
    }
    if (entry.governance.isControlled && !entry.governance.controlledSchedule?.trim()) {
      errors.push(`${entry.catalogCode}: controlled requires schedule`);
    }
  }

  if (ENTERPRISE_WAVE2_BILLING_MANIFEST.length !== ENTERPRISE_WAVE2_FORMULARY_MANIFEST.length) {
    errors.push("formulary/billing manifest length mismatch");
  }

  if (ENTERPRISE_WAVE2_FORMULARY_MANIFEST.length < 75) {
    errors.push(`wave2 manifest below minimum size (${ENTERPRISE_WAVE2_FORMULARY_MANIFEST.length} < 75)`);
  }

  try {
    assertEnterpriseWave2BillingManifest();
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }

  return errors;
}

export function assertEnterpriseWave2FormularyManifest(): void {
  const errors = validateEnterpriseWave2FormularyManifest();
  if (errors.length > 0) {
    throw new Error(`[wave2-formulary] manifest invalid: ${errors.join("; ")}`);
  }
}

export function wave2ConceptCodeForGeneric(genericName: string): string {
  const slug = genericName
    .toUpperCase()
    .replace(/\s*\+\s*/g, "_")
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return `ENT_W2_${slug || "UNKNOWN"}`;
}

export function wave2PackageCodeForProduct(productCode: string): string {
  return `${productCode.trim()}_PKG_DEFAULT`;
}

export function isWave2FormularyEntry(entry: EnterpriseWave2FormularyEntry): boolean {
  return ENTERPRISE_WAVE2_FORMULARY_BY_CODE[entry.catalogCode] != null;
}
