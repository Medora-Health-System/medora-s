/**
 * M1.7C — Enterprise Wave 4 ED/Hospital formulary manifest validation (strict M1.7A.2 + M1.7A.4).
 */

import { resolveMedicationCatalogPrimaryLabel } from "../orders/orderItemDisplayLabels.js";
import { assertEnterpriseWave4EdHospitalBillingManifest } from "./enterpriseWave4EdHospitalBillingValidation.js";
import {
  ENTERPRISE_WAVE4_ED_HOSPITAL_BILLING_BY_CODE,
  ENTERPRISE_WAVE4_ED_HOSPITAL_BILLING_MANIFEST,
} from "./enterpriseWave4EdHospitalBillingManifest.js";
import {
  ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_BY_CODE,
  ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST,
} from "./enterpriseWave4EdHospitalFormularyManifest.js";
import { ENTERPRISE_WAVE1_FORMULARY_BY_CODE } from "./enterpriseWave1FormularyManifest.js";
import { ENTERPRISE_WAVE2_FORMULARY_BY_CODE } from "./enterpriseWave2FormularyManifest.js";
import { ENTERPRISE_WAVE3_FORMULARY_BY_CODE } from "./enterpriseWave3FormularyManifest.js";
import type { EnterpriseWave4EdHospitalFormularyEntry } from "./enterpriseWave4EdHospitalTypes.js";
import type { MedicationLocalizationContract } from "./medicationLocalizationTypes.js";
import {
  validateEnterpriseWaveFormularyLocalizationReady,
} from "./medicationLocalizationValidation.js";
import { validateWave4SearchHardening } from "./enterpriseWave4EdHospitalSearchValidation.js";
import {
  validateWave4ClinicalReviewQueue,
  validateWave4MarAdministrationTypePolicy,
} from "./wave4AdministrationTypeRemediation.js";
import { isApprovedElectrolyteIvpbMedication } from "./electrolyteIvpbGovernance.js";

export function wave4EdHospitalFormularyEntryToLocalizationContract(
  entry: EnterpriseWave4EdHospitalFormularyEntry
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

export function validateWave4LabelIntegrity(entry: EnterpriseWave4EdHospitalFormularyEntry): string[] {
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

/** M1.7B.2 regression — hydromorphone IV push remains warning-only (no double RN). */
export function validateWave4HydromorphoneDoubleRnPolicy(): string[] {
  const errors: string[] = [];
  for (const entry of ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST) {
    if (entry.genericName.toLowerCase() !== "hydromorphone") continue;
    if (entry.governance.requiresDoubleSign) {
      errors.push(`${entry.catalogCode}: hydromorphone must not require double RN (M1.7B.2)`);
    }
  }
  return errors;
}

/** Double RN for insulin, heparin infusion, blood products, PCA/continuous opioid, approved electrolyte IVPB. */
export function validateWave4DoubleRnPolicy(): string[] {
  const errors: string[] = [];
  for (const entry of ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST) {
    if (!entry.governance.requiresDoubleSign) continue;
    const g = entry.governance;
    const allowed =
      g.isInsulin === true ||
      g.isBloodProduct === true ||
      g.isContinuousInfusion === true ||
      (g.isAnticoagulantInfusion === true &&
        entry.genericName.toLowerCase() === "heparin" &&
        (entry.dosageForm.toLowerCase().includes("perfusion") ||
          entry.administrationType === "INFUSION")) ||
      isApprovedElectrolyteIvpbMedication({
        catalogCode: entry.catalogCode,
        genericName: entry.genericName,
        administrationType: entry.administrationType,
        dosageForm: entry.dosageForm,
      });
    if (!allowed) {
      errors.push(
        `${entry.catalogCode}: requiresDoubleSign set but not in approved double-RN category`
      );
    }
  }
  return errors;
}

export function validateEnterpriseWave4EdHospitalFormularyManifest(): string[] {
  const errors: string[] = [];
  const codes = new Set<string>();

  for (const entry of ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST) {
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
      if (ENTERPRISE_WAVE3_FORMULARY_BY_CODE[entry.catalogCode]) {
        errors.push(`${entry.catalogCode}: CREATE overlaps Wave 3`);
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
    if (!ENTERPRISE_WAVE4_ED_HOSPITAL_BILLING_BY_CODE[entry.catalogCode]) {
      errors.push(`${entry.catalogCode}: missing billing manifest entry`);
    }
    if (entry.governance.isControlled && !entry.governance.controlledSchedule?.trim()) {
      errors.push(`${entry.catalogCode}: controlled requires schedule`);
    }
    if (entry.governance.isInsulin && !entry.governance.isHighAlert) {
      errors.push(`${entry.catalogCode}: insulin SKU should be high-alert`);
    }
    if (entry.governance.isRsiParalytic && !entry.governance.isHighAlert) {
      errors.push(`${entry.catalogCode}: RSI paralytic should be high-alert`);
    }
    if (entry.governance.isThrombolytic && !entry.governance.isHighAlert) {
      errors.push(`${entry.catalogCode}: thrombolytic should be high-alert`);
    }
    errors.push(...validateWave4LabelIntegrity(entry));
  }

  if (
    ENTERPRISE_WAVE4_ED_HOSPITAL_BILLING_MANIFEST.length !==
    ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST.length
  ) {
    errors.push("formulary/billing manifest length mismatch");
  }

  if (ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST.length < 150) {
    errors.push(
      `wave4 manifest below minimum size (${ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST.length} < 150)`
    );
  }

  try {
    assertEnterpriseWave4EdHospitalBillingManifest();
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }

  const contracts = ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST.map(
    wave4EdHospitalFormularyEntryToLocalizationContract
  );
  const localization = validateEnterpriseWaveFormularyLocalizationReady(contracts);
  for (const i of localization.issues.filter((x) => x.severity === "blocking")) {
    errors.push(`${i.catalogCode}: ${i.message}`);
  }

  errors.push(...validateWave4HydromorphoneDoubleRnPolicy());
  errors.push(...validateWave4DoubleRnPolicy());
  errors.push(...validateWave4SearchHardening(ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST));
  errors.push(...validateWave4MarAdministrationTypePolicy(ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST));
  errors.push(...validateWave4ClinicalReviewQueue(ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST));

  return errors;
}

export function assertEnterpriseWave4EdHospitalFormularyManifest(): void {
  const errors = validateEnterpriseWave4EdHospitalFormularyManifest();
  if (errors.length > 0) {
    throw new Error(`[wave4-ed-hospital-formulary] manifest invalid: ${errors.join("; ")}`);
  }
}

export function wave4ConceptCodeForGeneric(genericName: string): string {
  const slug = genericName
    .toUpperCase()
    .replace(/\s*\+\s*/g, "_")
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return `ENT_W4_${slug || "UNKNOWN"}`;
}

export function wave4PackageCodeForProduct(productCode: string): string {
  return `${productCode.trim()}_PKG_DEFAULT`;
}

export function isWave4EdHospitalFormularyEntry(
  entry: EnterpriseWave4EdHospitalFormularyEntry
): boolean {
  return ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_BY_CODE[entry.catalogCode] != null;
}

export function countWave4GovernanceMarkers(): {
  highAlertCount: number;
  controlledCount: number;
  doubleSignCount: number;
  rsiParalyticCount: number;
  thrombolyticCount: number;
  vasopressorCount: number;
  antidoteCount: number;
  insulinCount: number;
  byBucket: Record<string, number>;
} {
  const byBucket: Record<string, number> = {};
  let highAlertCount = 0;
  let controlledCount = 0;
  let doubleSignCount = 0;
  let rsiParalyticCount = 0;
  let thrombolyticCount = 0;
  let vasopressorCount = 0;
  let antidoteCount = 0;
  let insulinCount = 0;
  for (const e of ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST) {
    byBucket[e.bucket] = (byBucket[e.bucket] ?? 0) + 1;
    if (e.governance.isHighAlert) highAlertCount += 1;
    if (e.governance.isControlled) controlledCount += 1;
    if (e.governance.requiresDoubleSign) doubleSignCount += 1;
    if (e.governance.isRsiParalytic) rsiParalyticCount += 1;
    if (e.governance.isThrombolytic) thrombolyticCount += 1;
    if (e.governance.isVasopressor) vasopressorCount += 1;
    if (e.governance.isAntidote) antidoteCount += 1;
    if (e.governance.isInsulin) insulinCount += 1;
  }
  return {
    highAlertCount,
    controlledCount,
    doubleSignCount,
    rsiParalyticCount,
    thrombolyticCount,
    vasopressorCount,
    antidoteCount,
    insulinCount,
    byBucket,
  };
}
