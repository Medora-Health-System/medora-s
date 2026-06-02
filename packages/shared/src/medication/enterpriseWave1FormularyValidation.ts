/**
 * M1.6B — Enterprise Wave 1 formulary manifest validation.
 */

import { assertEnterpriseWave1BillingManifest } from "./enterpriseWave1BillingValidation.js";
import {
  ENTERPRISE_WAVE1_BILLING_BY_CODE,
  ENTERPRISE_WAVE1_BILLING_MANIFEST,
} from "./enterpriseWave1BillingManifest.js";
import {
  ENTERPRISE_WAVE1_FORMULARY_BY_CODE,
  ENTERPRISE_WAVE1_FORMULARY_MANIFEST,
} from "./enterpriseWave1FormularyManifest.js";
import type { EnterpriseWave1FormularyEntry } from "./enterpriseWave1Types.js";

export function validateEnterpriseWave1FormularyManifest(): string[] {
  const errors: string[] = [];
  const codes = new Set<string>();

  for (const entry of ENTERPRISE_WAVE1_FORMULARY_MANIFEST) {
    if (codes.has(entry.catalogCode)) {
      errors.push(`duplicate catalogCode ${entry.catalogCode}`);
    }
    codes.add(entry.catalogCode);
    if (!entry.genericName.trim()) errors.push(`${entry.catalogCode}: missing genericName`);
    if (!entry.aliases.length) errors.push(`${entry.catalogCode}: requires at least one alias`);
    if (!entry.searchTerms.length) errors.push(`${entry.catalogCode}: requires searchTerms`);
    if (!ENTERPRISE_WAVE1_BILLING_BY_CODE[entry.catalogCode]) {
      errors.push(`${entry.catalogCode}: missing billing manifest entry`);
    }
    if (entry.bucket === "ANTICOAGULATION" && !entry.governance.isHighAlert) {
      errors.push(`${entry.catalogCode}: anticoag must be high-alert`);
    }
    if (entry.bucket === "VACCINE" && !entry.governance.requiresPharmacyVerification) {
      errors.push(`${entry.catalogCode}: vaccine requires pharmacy verification`);
    }
  }

  if (ENTERPRISE_WAVE1_BILLING_MANIFEST.length !== ENTERPRISE_WAVE1_FORMULARY_MANIFEST.length) {
    errors.push("formulary/billing manifest length mismatch");
  }

  errors.push(...validateWave1BillingManifest());
  return errors;
}

function validateWave1BillingManifest(): string[] {
  try {
    assertEnterpriseWave1BillingManifest();
    return [];
  } catch (e) {
    return [e instanceof Error ? e.message : String(e)];
  }
}

export function assertEnterpriseWave1FormularyManifest(): void {
  const errors = validateEnterpriseWave1FormularyManifest();
  if (errors.length > 0) {
    throw new Error(`[wave1-formulary] manifest invalid: ${errors.join("; ")}`);
  }
}

export function wave1ConceptCodeForGeneric(genericName: string): string {
  const slug = genericName
    .toUpperCase()
    .replace(/\s*\+\s*/g, "_")
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return `ENT_W1_${slug || "UNKNOWN"}`;
}

export function wave1PackageCodeForProduct(productCode: string): string {
  return `${productCode.trim()}_PKG_DEFAULT`;
}

export function isWave1FormularyEntry(entry: EnterpriseWave1FormularyEntry): boolean {
  return ENTERPRISE_WAVE1_FORMULARY_BY_CODE[entry.catalogCode] != null;
}
