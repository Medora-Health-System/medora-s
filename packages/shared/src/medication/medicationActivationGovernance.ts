/**
 * MEDUI.MEDICATION.GOVERNED_ACTIVATION_FRAMEWORK.1
 * Universal medication activation governance model (shared TypeScript only — no DB migration).
 */

import type { MedicationCareSetting, MedicationOrderabilityRecord } from "./medicationOrderabilityGovernance.js";
import { resolveMedicationBillingReadiness } from "./medicationActivationBillingReadiness.js";
import type { EnterpriseWave1FormularyEntry } from "./enterpriseWave1Types.js";
import { ENTERPRISE_WAVE1_FORMULARY_BY_CODE } from "./enterpriseWave1FormularyManifest.js";
import { ENTERPRISE_WAVE2_FORMULARY_BY_CODE } from "./enterpriseWave2FormularyManifest.js";
import { ENTERPRISE_WAVE3_FORMULARY_BY_CODE } from "./enterpriseWave3FormularyManifest.js";
import { ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_BY_CODE } from "./enterpriseWave4EdHospitalFormularyManifest.js";
import { ENTERPRISE_ONCOLOGY_FORMULARY_BY_CODE } from "./enterpriseOncologyFormularyManifest.js";
import { ENTERPRISE_NEUROLOGY_INFECTIOUS_DISEASE_FORMULARY_BY_CODE } from "./enterpriseNeurologyInfectiousDiseaseFormularyManifest.js";
import { ENTERPRISE_CARDIOLOGY_FORMULARY_BY_CODE } from "./enterpriseCardiologyFormularyManifest.js";
import { ENTERPRISE_IV_FLUIDS_FORMULARY_BY_CODE } from "./enterpriseIvFluidsFormularyManifest.js";
import { ENTERPRISE_OBGYN_FORMULARY_BY_CODE } from "./enterpriseObgynFormularyManifest.js";
import { ENTERPRISE_PSYCHIATRY_FORMULARY_BY_CODE } from "./enterprisePsychiatryFormularyManifest.js";
import { ENTERPRISE_GASTROENTEROLOGY_FORMULARY_BY_CODE } from "./enterpriseGastroenterologyFormularyManifest.js";
import { ENTERPRISE_PEDIATRICS_FORMULARY_BY_CODE } from "./enterprisePediatricsFormularyManifest.js";
import { ENTERPRISE_SURGERY_PERIOPERATIVE_FORMULARY_BY_CODE } from "./enterpriseSurgeryPerioperativeFormularyManifest.js";
import { ENTERPRISE_CONTROLLED_SUBSTANCE_FORMULARY_BY_CODE } from "./enterpriseControlledSubstanceFormularyManifest.js";
import { isPulmonaryMarEligibleCatalogCode } from "./pulmonaryMarWorkflowGovernance.js";

/** Universal activation governance status (enterprise framework). */
export type MedicationActivationGovernanceStatus =
  | "ORDERABLE"
  | "RESTRICTED"
  | "NEEDS_PHARMACY_REVIEW"
  | "NEEDS_CLINICAL_REVIEW"
  | "CATALOG_ONLY"
  | "NOT_ORDERABLE";

export type MedicationActivationGovernanceRecord = {
  catalogCode: string;
  displayNameEn: string;
  displayNameFr: string;
  strength: string;
  doseForm: string;
  route: string;
  status: MedicationActivationGovernanceStatus;
  restrictedReason: string | null;
  reviewReason: string | null;
  highRiskFlag: boolean;
  controlledSubstanceFlag: boolean;
  vaccineFlag: boolean;
  requiresPharmacyReview: boolean;
  requiresClinicalReview: boolean;
  inventoryReady: boolean;
  billingReady: boolean;
  ndcReady: boolean;
  marReady: boolean;
  orderSearchReady: boolean;
  allowedCareSettings: MedicationCareSetting[];
  catalogSource: "haiti" | "enterprise" | "both";
  enterpriseWave: "wave1" | "wave2" | "wave3" | "wave4" | null;
};

type EnterpriseFormularyLike = Pick<
  EnterpriseWave1FormularyEntry,
  "catalogCode" | "governance" | "bucket" | "administrationType"
>;

function resolveEnterpriseWave(catalogCode: string): EnterpriseFormularyLike | null {
  return (
    ENTERPRISE_WAVE1_FORMULARY_BY_CODE[catalogCode] ??
    ENTERPRISE_WAVE2_FORMULARY_BY_CODE[catalogCode] ??
    ENTERPRISE_WAVE3_FORMULARY_BY_CODE[catalogCode] ??
    ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_BY_CODE[catalogCode] ??
    ENTERPRISE_ONCOLOGY_FORMULARY_BY_CODE[catalogCode] ??
    ENTERPRISE_NEUROLOGY_INFECTIOUS_DISEASE_FORMULARY_BY_CODE[catalogCode] ??
    ENTERPRISE_CARDIOLOGY_FORMULARY_BY_CODE[catalogCode] ??
    ENTERPRISE_IV_FLUIDS_FORMULARY_BY_CODE[catalogCode] ??
    ENTERPRISE_OBGYN_FORMULARY_BY_CODE[catalogCode] ??
    ENTERPRISE_PSYCHIATRY_FORMULARY_BY_CODE[catalogCode] ??
    ENTERPRISE_GASTROENTEROLOGY_FORMULARY_BY_CODE[catalogCode] ??
    ENTERPRISE_PEDIATRICS_FORMULARY_BY_CODE[catalogCode] ??
    ENTERPRISE_SURGERY_PERIOPERATIVE_FORMULARY_BY_CODE[catalogCode] ??
    ENTERPRISE_CONTROLLED_SUBSTANCE_FORMULARY_BY_CODE[catalogCode] ??
    null
  );
}

function resolveEnterpriseWaveLabel(catalogCode: string): MedicationActivationGovernanceRecord["enterpriseWave"] {
  if (ENTERPRISE_WAVE1_FORMULARY_BY_CODE[catalogCode]) return "wave1";
  if (ENTERPRISE_WAVE2_FORMULARY_BY_CODE[catalogCode]) return "wave2";
  if (ENTERPRISE_WAVE3_FORMULARY_BY_CODE[catalogCode]) return "wave3";
  if (ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_BY_CODE[catalogCode]) return "wave4";
  return null;
}

const SAFE_MAR_ADMIN_TYPES = new Set(["ORAL", "IM", "SQ", "PUSH", "INFUSION", "IV", "TOPICAL", "TRANSDERMAL"]);

export function mapLegacyOrderabilityToActivationStatus(
  record: MedicationOrderabilityRecord,
  enterprise: EnterpriseFormularyLike | null
): MedicationActivationGovernanceStatus {
  if (record.orderabilityStatus === "ORDERABLE_READY" && record.orderSearchEnabled) {
    return "ORDERABLE";
  }
  if (record.orderabilityStatus === "RESTRICTED_WITH_REASON") {
    if (record.requiresClinicalReview && enterprise?.governance.isControlled) {
      return "RESTRICTED";
    }
    if (record.requiresClinicalReview) return "NEEDS_CLINICAL_REVIEW";
    if (record.requiresPharmacyReview) return "NEEDS_PHARMACY_REVIEW";
    return "RESTRICTED";
  }
  if (record.orderabilityStatus === "NEEDS_CLINICAL_REVIEW") return "NEEDS_CLINICAL_REVIEW";
  if (record.orderabilityStatus === "CATALOG_ONLY_NOT_ORDERABLE") return "CATALOG_ONLY";
  if (record.requiresPharmacyReview && !record.orderSearchEnabled) return "NEEDS_PHARMACY_REVIEW";
  if (record.requiresClinicalReview && !record.orderSearchEnabled) return "NEEDS_CLINICAL_REVIEW";
  return "NOT_ORDERABLE";
}

export function buildActivationGovernanceRecord(
  record: MedicationOrderabilityRecord
): MedicationActivationGovernanceRecord {
  const enterprise = resolveEnterpriseWave(record.catalogCode);
  const billing = resolveMedicationBillingReadiness(record.catalogCode);
  const vaccineFlag = enterprise?.bucket === "VACCINE";
  const highRiskFlag = Boolean(enterprise?.governance.isHighAlert);
  const controlledSubstanceFlag = Boolean(
    enterprise?.governance.isControlled ||
      (record.restrictedReason?.toLowerCase().includes("controlled") ?? false)
  );
  const marPathwayExists =
    record.marEnabled ||
    Boolean(enterprise?.administrationType && SAFE_MAR_ADMIN_TYPES.has(enterprise.administrationType)) ||
    isPulmonaryMarEligibleCatalogCode(record.catalogCode) ||
    record.source === "haiti";

  const status = mapLegacyOrderabilityToActivationStatus(record, enterprise);

  const reviewReason =
    status === "NEEDS_PHARMACY_REVIEW"
      ? "Pharmacy review visible during ordering and MAR workflow"
      : status === "NEEDS_CLINICAL_REVIEW"
        ? "Clinical / high-alert review required before activation"
        : null;

  return {
    catalogCode: record.catalogCode,
    displayNameEn: record.displayNameEn,
    displayNameFr: record.displayNameFr,
    strength: record.strength,
    doseForm: record.dosageForm,
    route: record.route,
    status,
    restrictedReason: record.restrictedReason,
    reviewReason: reviewReason ?? record.notOrderableReason,
    highRiskFlag,
    controlledSubstanceFlag,
    vaccineFlag,
    requiresPharmacyReview: record.requiresPharmacyReview,
    requiresClinicalReview: record.requiresClinicalReview,
    inventoryReady: billing.ndcReady || record.inventoryNdcLinked,
    billingReady: billing.billingReady,
    ndcReady: billing.ndcReady,
    marReady: marPathwayExists,
    orderSearchReady: record.orderSearchEnabled && status === "ORDERABLE",
    allowedCareSettings: record.allowedCareSettings,
    catalogSource: record.source,
    enterpriseWave: resolveEnterpriseWaveLabel(record.catalogCode),
  };
}
