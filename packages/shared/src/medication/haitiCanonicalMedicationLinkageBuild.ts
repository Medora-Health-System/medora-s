/**
 * M1.5D — Build Haiti canonical linkage manifest entries from formulary source.
 */

import { CONTROLLED_SUBSTANCE_GOVERNANCE_MANIFEST } from "./controlledSubstanceGovernanceManifest.js";
import { HIGH_ALERT_MEDICATION_GOVERNANCE_MANIFEST } from "./highAlertMedicationGovernanceManifest.js";
import { LASA_MEDICATION_GOVERNANCE_MANIFEST } from "./lasaMedicationGovernanceManifest.js";
import { isBillableCatalogMedicationRow } from "./medicationBillingMappingManifest.js";
import { MEDICATION_BILLING_MAPPING_BY_CODE } from "./medicationBillingMappingManifest.js";
import { MEDICATION_BILLING_NDC_BY_CATALOG_CODE } from "./medicationBillingNdcByCatalogCode.js";
import { deriveMedicationCatalogCode } from "./medicationCatalogCodeDerive.js";
import {
  proposedConceptCodeForGeneric,
  proposedPackageCodeForProduct,
} from "./haitiCanonicalMedicationMatching.js";
import type {
  HaitiCanonicalMedicationLinkageEntry,
  HaitiLinkageBillingFlags,
  HaitiLinkageConfidence,
  HaitiLinkageSafetyFlags,
  HaitiLinkageStatus,
  HaitiLinkageTranche,
  HaitiMedicationFormularyRow,
} from "./haitiCanonicalMedicationLinkageTypes.js";

const OPIOID_GENERIC_PATTERN =
  /\b(morphine|fentanyl|hydromorphone|tramadol|codeine|oxycodone|hydrocodone|methadone)\b/i;
const ANTICOAG_GENERIC_PATTERN = /\b(heparin|warfarin|enoxaparin|apixaban|rivaroxaban)\b/i;
const INSULIN_GENERIC_PATTERN = /\binsulin\b/i;
const PEDIATRIC_FORM_PATTERN = /\b(sirop|suppositoire|suspension|pediatr|pédiatr|pediatric)\b/i;

/** Shared clinical shortcut aliases (M1.5B audit). */
export const HAITI_SHARED_ALIAS_COLLISIONS: ReadonlyArray<{ alias: string; minMedCount: number }> = [
  { alias: "rsi", minMedCount: 2 },
  { alias: "sédation", minMedCount: 2 },
  { alias: "sedation", minMedCount: 2 },
  { alias: "intubation", minMedCount: 2 },
  { alias: "acetaminophen", minMedCount: 2 },
  { alias: "antibiotique urgence", minMedCount: 2 },
  { alias: "glucophage", minMedCount: 2 },
  { alias: "ativan", minMedCount: 2 },
];

const GOVERNANCE_MANIFEST_CODES = new Set<string>();

for (const e of CONTROLLED_SUBSTANCE_GOVERNANCE_MANIFEST) {
  if (e.catalogCode?.trim()) GOVERNANCE_MANIFEST_CODES.add(e.catalogCode.trim().toUpperCase());
}
for (const e of HIGH_ALERT_MEDICATION_GOVERNANCE_MANIFEST) {
  if (e.catalogCode?.trim()) GOVERNANCE_MANIFEST_CODES.add(e.catalogCode.trim().toUpperCase());
}
for (const e of LASA_MEDICATION_GOVERNANCE_MANIFEST) {
  if (e.catalogCode?.trim()) GOVERNANCE_MANIFEST_CODES.add(e.catalogCode.trim().toUpperCase());
}

function norm(value: string): string {
  return value.trim().toLowerCase();
}

export function hasSharedAliasCollision(row: HaitiMedicationFormularyRow): boolean {
  const aliases = row.commonAliases.map((a) => norm(a));
  return HAITI_SHARED_ALIAS_COLLISIONS.some((rule) => aliases.some((a) => a.includes(rule.alias)));
}

export function hasGovernanceManifestCodeDrift(catalogMedicationCode: string): boolean {
  const code = catalogMedicationCode.trim().toUpperCase();
  for (const manifestCode of GOVERNANCE_MANIFEST_CODES) {
    if (manifestCode === code) continue;
    if (manifestCode.includes(code.slice(0, 12)) || code.includes(manifestCode.slice(0, 12))) {
      const similar =
        manifestCode.replace(/_PER_|_MG_|_ML_|_MCG_|_UI_/g, "") ===
        code.replace(/_PER_|_MG_|_ML_|_MCG_|_UI_/g, "");
      if (!similar && manifestCode.split("_")[0] === code.split("_")[0]) return true;
    }
  }
  return [...GOVERNANCE_MANIFEST_CODES].some(
    (mc) => mc !== code && mc.split("_")[0] === code.split("_")[0] && mc !== code
  ) && !GOVERNANCE_MANIFEST_CODES.has(code);
}

export function computeSafetyFlags(row: HaitiMedicationFormularyRow): HaitiLinkageSafetyFlags {
  const generic = norm(row.genericName);
  const code = row.code.trim().toUpperCase();
  const controlled =
    row.isControlled ||
    CONTROLLED_SUBSTANCE_GOVERNANCE_MANIFEST.some(
      (e) =>
        e.governanceStatus === "APPLY" &&
        (e.catalogCode?.trim().toUpperCase() === code ||
          norm(e.genericName) === generic)
    );
  const highAlert = HIGH_ALERT_MEDICATION_GOVERNANCE_MANIFEST.some(
    (e) =>
      e.governanceStatus === "APPLY" &&
      (e.catalogCode?.trim().toUpperCase() === code || norm(e.genericName) === generic)
  );
  const lasa = LASA_MEDICATION_GOVERNANCE_MANIFEST.some(
    (e) =>
      e.governanceStatus === "APPLY" &&
      (e.catalogCode?.trim().toUpperCase() === code || norm(e.genericName) === generic)
  );
  return {
    controlled,
    highAlert,
    lasa,
    pediatricRisk: PEDIATRIC_FORM_PATTERN.test(`${row.dosageForm} ${row.route} ${row.commonAliases.join(" ")}`),
    anticoagulant: ANTICOAG_GENERIC_PATTERN.test(row.genericName),
    opioid: OPIOID_GENERIC_PATTERN.test(row.genericName),
    insulin: INSULIN_GENERIC_PATTERN.test(row.genericName),
  };
}

export function computeBillingFlags(
  catalogMedicationCode: string,
  row: HaitiMedicationFormularyRow,
  billingCodeDefault?: string | null
): HaitiLinkageBillingFlags {
  const hasHcpcs = Boolean(MEDICATION_BILLING_MAPPING_BY_CODE[catalogMedicationCode]);
  const hasNdc = Boolean(MEDICATION_BILLING_NDC_BY_CATALOG_CODE[catalogMedicationCode]);
  const hasDefault = Boolean(billingCodeDefault?.trim());
  const billable = isBillableCatalogMedicationRow(row);
  const billingReady = billable ? hasHcpcs : true;
  return {
    hasNdc,
    hasHcpcs,
    hasBillingCodeDefault: hasDefault,
    billingReady,
  };
}

export function assignTranche(
  row: HaitiMedicationFormularyRow,
  safety: HaitiLinkageSafetyFlags
): HaitiLinkageTranche {
  if (isBillableCatalogMedicationRow(row)) return "T1";
  if (safety.controlled || safety.highAlert || safety.lasa || safety.opioid) return "T3";
  if (norm(row.therapeuticClass).includes("antibiot")) return "T2";
  if (row.isEssential) return "T4";
  return "T5";
}

export function resolveLinkageStatusAndConfidence(
  row: HaitiMedicationFormularyRow,
  catalogMedicationCode: string,
  safety: HaitiLinkageSafetyFlags,
  billing: HaitiLinkageBillingFlags
): { linkageStatus: HaitiLinkageStatus; confidence: HaitiLinkageConfidence; reviewerRequired: boolean } {
  const aliasCollision = hasSharedAliasCollision(row);
  const governanceDrift = hasGovernanceManifestCodeDrift(catalogMedicationCode);
  const derived = deriveMedicationCatalogCode(row);
  const derivationOk = derived === catalogMedicationCode;

  const reviewerRequired =
    safety.controlled ||
    safety.highAlert ||
    safety.lasa ||
    safety.opioid ||
    safety.insulin ||
    safety.anticoagulant ||
    aliasCollision ||
    governanceDrift ||
    (billing.billingReady === false && isBillableCatalogMedicationRow(row));

  if (reviewerRequired) {
    return {
      linkageStatus: "MANUAL_REVIEW",
      confidence: governanceDrift || aliasCollision ? "MEDIUM" : "HIGH",
      reviewerRequired: true,
    };
  }

  return {
    linkageStatus: "MISSING_CANONICAL_TARGET",
    confidence: derivationOk ? "EXACT" : "LOW",
    reviewerRequired: false,
  };
}

export function buildHaitiCanonicalLinkageEntry(
  row: HaitiMedicationFormularyRow,
  options?: { billingCodeDefault?: string | null }
): HaitiCanonicalMedicationLinkageEntry {
  const catalogMedicationCode = row.code.trim();
  const proposedProductCode = catalogMedicationCode;
  const proposedConceptCode = proposedConceptCodeForGeneric(row.genericName);
  const proposedPackageCode = proposedPackageCodeForProduct(proposedProductCode);
  const safetyFlags = computeSafetyFlags(row);
  const billingFlags = computeBillingFlags(catalogMedicationCode, row, options?.billingCodeDefault);
  const { linkageStatus, confidence, reviewerRequired } = resolveLinkageStatusAndConfidence(
    row,
    catalogMedicationCode,
    safetyFlags,
    billingFlags
  );
  const tranche = assignTranche(row, safetyFlags);

  const rationaleParts = [
    linkageStatus === "MISSING_CANONICAL_TARGET"
      ? "No safe existing canonical product; M1.5E will create concept/product/package"
      : "Requires clinical/pharmacy review before M1.5E apply",
    `tranche ${tranche}`,
  ];
  if (hasGovernanceManifestCodeDrift(catalogMedicationCode)) {
    rationaleParts.push("M1.3 governance manifest code may differ from derived catalog code");
  }
  if (hasSharedAliasCollision(row)) {
    rationaleParts.push("shared clinical alias collision risk");
  }

  return {
    catalogMedicationCode,
    genericName: row.genericName,
    displayName: row.displayNameFr,
    displayNameEn: row.displayNameEn,
    strength: row.strength,
    route: row.route,
    form: row.dosageForm,
    proposedConceptCode,
    proposedProductCode,
    proposedPackageCode,
    linkageStatus,
    confidence,
    safetyFlags,
    billingFlags,
    rationale: rationaleParts.join("; "),
    sourcePhase: "M1.5D",
    reviewerRequired,
    matchRule: "DERIVED_CODE",
    tranche,
  };
}

export function buildHaitiCanonicalLinkageManifest(
  rows: HaitiMedicationFormularyRow[]
): HaitiCanonicalMedicationLinkageEntry[] {
  const byCode = new Map<string, HaitiMedicationFormularyRow>();
  for (const row of rows) {
    const code = row.code.trim();
    if (!byCode.has(code)) byCode.set(code, row);
  }
  return [...byCode.values()]
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((row) => buildHaitiCanonicalLinkageEntry(row));
}
