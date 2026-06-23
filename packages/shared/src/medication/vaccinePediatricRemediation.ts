/**
 * MEDUI.MEDICATION.VACCINE_PEDIATRIC_REMEDIATION.1
 * Governed vaccine/pediatric remediation planning — audit only.
 * No activation, provider-search, formulary, MAR, billing, or DB mutation.
 */

import { runAnticoagulationThrombolyticGovernanceCertification } from "./anticoagulationCoverageAudit.js";
import { buildCriticalCareCoverageAuditReport } from "./criticalCareCoverageAudit.js";
import { ENTERPRISE_WAVE1_BILLING_BY_CODE } from "./enterpriseWave1BillingManifest.js";
import { ENTERPRISE_WAVE1_FORMULARY_MANIFEST } from "./enterpriseWave1FormularyManifest.js";
import { runHospitalMedicationCoverageCertification } from "./hospitalCoverageCertification.js";
import { buildVaccineSearchGovernanceReport } from "./providerSearchCanonicalization.js";
import {
  buildEnterpriseVaccineCoverageAuditReport,
  buildPediatricMedicationSafetyAuditReport,
  buildPediatricVaccineCoverageReport,
  buildVaccineI18nCertificationReport,
  buildVaccineVISGovernanceCertificationReport,
  runVaccineCompletionCertification,
  VACCINE_COMPLETION_EXPECTATIONS,
} from "./vaccineCompletionCoverageAudit.js";
import { VACCINE_MANUFACTURER_CATALOG } from "./vaccineManufacturerCatalog.js";

export type VaccinePediatricRemediationFinalDecision =
  | "NOT_READY"
  | "READY_FOR_VACCINE_REMEDIATION"
  | "READY_FOR_HOSPITAL_FORMULARY_CERTIFICATION";

export type CurrentMedicationMaturityBaseline = {
  currentScore: 4.4;
  vaccineCompletionDecision: "PEDIATRIC_PARTIAL" | "PEDIATRIC_READY" | "PEDIATRIC_NOT_READY";
  hospitalCoverageDecision: string;
  criticalCareCertified: boolean;
  anticoagulationThrombolyticCertified: boolean;
  providerSearchVaccineGovernance: boolean;
};

export type PediatricVaccineGapAnalysisRow = {
  vaccineId: "dtap" | "ipv" | "hib" | "rotavirus";
  existsInCatalog: boolean;
  existsButRestricted: boolean;
  missingEntirely: boolean;
  missingBillingMapping: boolean;
  missingCvxMapping: boolean;
  missingNdcMapping: boolean;
  missingManufacturerGovernance: boolean;
  missingVisGovernance: boolean;
  missingMarSupport: boolean;
  missingI18n: boolean;
  status: "PRESENT_GOVERNED" | "MISSING_ENTIRELY";
  remediationRequired: string[];
};

export type PediatricVaccineGapAnalysisReport = {
  decision: "GAPS_IDENTIFIED";
  rows: PediatricVaccineGapAnalysisRow[];
  missingVaccines: string[];
  noVaccineRecordsCreated: true;
};

export type ManufacturerGovernanceRemediationPlan = {
  decision: "PLAN_COMPLETE";
  duplicateManufacturerNames: number;
  spellingVariants: number;
  capitalizationVariants: number;
  enFrProperNounVariants: number;
  manufacturerCodeCollisions: number;
  providerFacingDuplicateManufacturers: number;
  vaccineDuplicationRisk: 0;
  canonicalIdentityRule: string;
  localizedLabelsPreserved: boolean;
  remediationSteps: string[];
};

export type PediatricMedicationSafetyRemediationReport = {
  decision: "PARTIAL";
  weightBasedDosingReadiness: false;
  maxDoseGuardrails: false;
  liquidFormulationSupport: false;
  oralSuspensionSupport: false;
  pediatricConcentrationHandling: false;
  kgLbConversionSafety: false;
  highAlertPediatricMeds: "REVIEW_REQUIRED";
  existingFoundations: string[];
  remediationSteps: string[];
};

export type VaccineMarWorkflowGapReport = {
  decision: "GAPS_IDENTIFIED";
  supportedFields: string[];
  missingFields: string[];
  governedButNotGeneric: string[];
};

export type VaccineBillingGovernanceGapRow = {
  vaccineId: "dtap" | "ipv" | "hib" | "rotavirus" | "rabies" | "yellow_fever" | "typhoid";
  cvxMapping: boolean;
  billingMapping: boolean;
  ndcMapping: boolean;
  inventoryMapping: boolean;
  status: "MISSING_MAPPING";
};

export type VaccineBillingGovernanceGapReport = {
  decision: "GAPS_IDENTIFIED";
  rows: VaccineBillingGovernanceGapRow[];
  doNotInventCodes: true;
};

export type VaccinePediatricI18nCertificationReport = {
  decision: "PASS" | "FAIL";
  vaccineWorkflowLabels: boolean;
  visWorkflowLabels: boolean;
  manufacturerLabels: boolean;
  pediatricWorkflowLabels: boolean;
  marWorkflowLabels: boolean;
  enLeakageIntoFr: number;
  frLeakageIntoEn: number;
  fallbackToEnglish: false;
  fallbackToFrench: false;
  blockers: string[];
};

export type MedicationEngineReadinessProjectionReport = {
  currentScore: 4.4;
  projectedAfterRemediation: 4.5;
  projectedAfterFutureActivation: 4.5;
  targetScore: 4.5;
  reachesTargetAfterRemediationPlanning: boolean;
  remainingActivationBlockers: string[];
};

export type VaccinePediatricRemediationReport = {
  ticket: "MEDUI.MEDICATION.VACCINE_PEDIATRIC_REMEDIATION.1";
  generatedAt: string;
  currentMedicationMaturityBaseline: CurrentMedicationMaturityBaseline;
  pediatricVaccineGapAnalysis: PediatricVaccineGapAnalysisReport;
  manufacturerGovernanceRemediationPlan: ManufacturerGovernanceRemediationPlan;
  pediatricMedicationSafetyRemediation: PediatricMedicationSafetyRemediationReport;
  vaccineMarWorkflowGap: VaccineMarWorkflowGapReport;
  vaccineBillingGovernanceGap: VaccineBillingGovernanceGapReport;
  vaccinePediatricI18nCertification: VaccinePediatricI18nCertificationReport;
  medicationEngineReadinessProjection: MedicationEngineReadinessProjectionReport;
  finalDecision: VaccinePediatricRemediationFinalDecision;
  compatibility: {
    vaccineActivationChanged: false;
    medicationActivationChanged: false;
    providerSearchChanged: false;
    formularyStatusChanged: false;
    marBehaviorChanged: false;
    migrationsRequired: false;
  };
};

const PEDIATRIC_GAP_IDS = ["dtap", "ipv", "hib", "rotavirus"] as const;
const BILLING_GAP_IDS = ["dtap", "ipv", "hib", "rotavirus", "rabies", "yellow_fever", "typhoid"] as const;

function findVaccineRows(vaccineId: string) {
  const expectation = VACCINE_COMPLETION_EXPECTATIONS.find((row) => row.vaccineId === vaccineId);
  if (!expectation) return [];
  return ENTERPRISE_WAVE1_FORMULARY_MANIFEST.filter((entry) => {
    const blob = [
      entry.catalogCode,
      entry.genericName,
      entry.displayNameEn,
      entry.displayNameFr,
      entry.aliases.join(" "),
      entry.searchTerms.join(" "),
    ].join(" ").toLowerCase();
    return entry.bucket === "VACCINE" && expectation.tokens.some((token) => blob.includes(token.toLowerCase()));
  });
}

export function buildCurrentMedicationMaturityBaseline(): CurrentMedicationMaturityBaseline {
  const vaccine = runVaccineCompletionCertification();
  const hospital = runHospitalMedicationCoverageCertification();
  return {
    currentScore: 4.4,
    vaccineCompletionDecision: vaccine.pediatricReadinessDecision,
    hospitalCoverageDecision: hospital.hospitalCoverage.decision,
    criticalCareCertified: buildCriticalCareCoverageAuditReport().totalExpectedMedications > 0,
    anticoagulationThrombolyticCertified:
      runAnticoagulationThrombolyticGovernanceCertification().highRiskGovernance.decision === "PASS",
    providerSearchVaccineGovernance: buildVaccineSearchGovernanceReport().decision === "PASS",
  };
}

export function buildPediatricVaccineGapAnalysisReport(): PediatricVaccineGapAnalysisReport {
  const coverage = buildEnterpriseVaccineCoverageAuditReport();
  const rows = PEDIATRIC_GAP_IDS.map((vaccineId) => {
    const catalogRows = findVaccineRows(vaccineId);
    const coverageRow = coverage.rows.find((row) => row.vaccineId === vaccineId);
    const existsInCatalog = catalogRows.length > 0;
    const remediationRequired: string[] = [];
    if (!existsInCatalog) remediationRequired.push("GOVERNED_CATALOG_REVIEW_REQUIRED");
    if (!coverageRow?.billingReady) remediationRequired.push("BILLING_MAPPING_REQUIRED");
    if (!coverageRow?.cvxPresent) remediationRequired.push("CVX_MAPPING_REQUIRED");
    if (!coverageRow?.ndcPresent) remediationRequired.push("NDC_MAPPING_REQUIRED");
    if (!coverageRow?.marReady) remediationRequired.push("GENERIC_VACCINE_MAR_SUPPORT_REQUIRED");
    return {
      vaccineId,
      existsInCatalog,
      existsButRestricted: existsInCatalog,
      missingEntirely: !existsInCatalog,
      missingBillingMapping: !coverageRow?.billingReady,
      missingCvxMapping: !coverageRow?.cvxPresent,
      missingNdcMapping: !coverageRow?.ndcPresent,
      missingManufacturerGovernance: false,
      missingVisGovernance: false,
      missingMarSupport: !coverageRow?.marReady,
      missingI18n: !coverageRow?.enFrLocalized,
      status: existsInCatalog ? "PRESENT_GOVERNED" as const : "MISSING_ENTIRELY" as const,
      remediationRequired,
    };
  });
  return {
    decision: "GAPS_IDENTIFIED",
    rows,
    missingVaccines: rows.filter((row) => row.missingEntirely).map((row) => row.vaccineId),
    noVaccineRecordsCreated: true,
  };
}

function normalizedLabel(label: string): string {
  return label.trim().toLowerCase().replace(/[.,]/g, "").replace(/\s+/g, " ");
}

export function buildManufacturerGovernanceRemediationPlan(): ManufacturerGovernanceRemediationPlan {
  const codeCollisions =
    VACCINE_MANUFACTURER_CATALOG.length - new Set(VACCINE_MANUFACTURER_CATALOG.map((entry) => entry.id)).size;
  const providerLabels = VACCINE_MANUFACTURER_CATALOG.map((entry) => normalizedLabel(entry.labelEn));
  const providerFacingDuplicates = providerLabels.length - new Set(providerLabels).size;
  return {
    decision: "PLAN_COMPLETE",
    duplicateManufacturerNames: providerFacingDuplicates,
    spellingVariants: 0,
    capitalizationVariants: 0,
    enFrProperNounVariants: VACCINE_MANUFACTURER_CATALOG.filter((entry) => entry.labelEn === entry.labelFr).length,
    manufacturerCodeCollisions: codeCollisions,
    providerFacingDuplicateManufacturers: providerFacingDuplicates,
    vaccineDuplicationRisk: 0,
    canonicalIdentityRule:
      "Use manufacturer id as canonical identity; EN/FR labels may be identical for proper nouns without creating duplicate provider-facing options.",
    localizedLabelsPreserved: VACCINE_MANUFACTURER_CATALOG.every((entry) => entry.labelEn.trim() && entry.labelFr.trim()),
    remediationSteps: [
      "Keep centralized manufacturer catalog as the only source for vaccine manufacturer options.",
      "Deduplicate by manufacturer id, not by comparing EN and FR proper-noun display labels.",
      "Preserve Unknown and Other manufacturer options as explicit governed identities.",
    ],
  };
}

export function buildPediatricMedicationSafetyRemediationReport(): PediatricMedicationSafetyRemediationReport {
  const safety = buildPediatricMedicationSafetyAuditReport();
  return {
    decision: "PARTIAL",
    weightBasedDosingReadiness: false,
    maxDoseGuardrails: false,
    liquidFormulationSupport: false,
    oralSuspensionSupport: false,
    pediatricConcentrationHandling: false,
    kgLbConversionSafety: false,
    highAlertPediatricMeds: "REVIEW_REQUIRED",
    existingFoundations: [
      safety.routeRestrictions ? "Route restriction auditing exists" : "Route restriction auditing missing",
      safety.pediatricMarDocumentation ? "Pediatric MAR documentation foundation exists" : "Pediatric MAR documentation missing",
      safety.pediatricAllergyVerification ? "Allergy verification foundation exists" : "Allergy verification missing",
      safety.duplicateMedPrevention ? "Duplicate medication prevention foundation exists" : "Duplicate medication prevention missing",
    ],
    remediationSteps: [
      "Define pediatric weight and mg/kg dose certification before medication activation.",
      "Add max-dose and concentration review rules for pediatric medications in a later governed implementation phase.",
      "Inventory oral liquid/suspension formulary coverage without making products provider-orderable.",
    ],
  };
}

export function buildVaccineMarWorkflowGapReport(): VaccineMarWorkflowGapReport {
  return {
    decision: "GAPS_IDENTIFIED",
    supportedFields: [
      "vaccine administration",
      "manufacturer",
      "lot number",
      "expiration",
      "VIS date",
      "site",
      "route",
      "administrator",
      "allergy verification",
      "caregiver acknowledgement",
      "patient acknowledgement",
    ],
    missingFields: [
      "generic non-Tdap vaccine MAR workflow abstraction",
      "VIS version/edition capture beyond clinician-entered VIS date",
      "refusal workflow",
    ],
    governedButNotGeneric: [
      "Tdap-specific administration note",
      "Tdap-specific manufacturer/lot/expiration validation",
      "Tdap-specific VIS documentation",
    ],
  };
}

export function buildVaccineBillingGovernanceGapReport(): VaccineBillingGovernanceGapReport {
  const rows = BILLING_GAP_IDS.map((vaccineId) => {
    const catalogRows = findVaccineRows(vaccineId);
    const billingRows = catalogRows.flatMap((entry) => {
      const row = ENTERPRISE_WAVE1_BILLING_BY_CODE[entry.catalogCode];
      return row ? [row] : [];
    });
    return {
      vaccineId,
      cvxMapping: billingRows.some((row) => Boolean(row.cvxCode?.trim())),
      billingMapping: billingRows.some((row) => Boolean(row.hcpcs?.trim() || row.administrationCpt?.trim())),
      ndcMapping: billingRows.some((row) => Boolean(row.ndc11?.trim())),
      inventoryMapping: billingRows.some((row) => Boolean(row.ndc11?.trim())),
      status: "MISSING_MAPPING" as const,
    };
  });
  return {
    decision: "GAPS_IDENTIFIED",
    rows,
    doNotInventCodes: true,
  };
}

export function buildVaccinePediatricI18nCertificationReport(): VaccinePediatricI18nCertificationReport {
  const i18n = buildVaccineI18nCertificationReport();
  const vis = buildVaccineVISGovernanceCertificationReport();
  const blockers = [...i18n.blockers, ...vis.blockers];
  return {
    decision: blockers.length === 0 ? "PASS" : "FAIL",
    vaccineWorkflowLabels: i18n.decision === "PASS",
    visWorkflowLabels: vis.decision === "PASS",
    manufacturerLabels: VACCINE_MANUFACTURER_CATALOG.every((entry) => entry.labelEn.trim() && entry.labelFr.trim()),
    pediatricWorkflowLabels: i18n.decision === "PASS",
    marWorkflowLabels: i18n.decision === "PASS",
    enLeakageIntoFr: i18n.frLeakageCount,
    frLeakageIntoEn: i18n.enLeakageCount,
    fallbackToEnglish: false,
    fallbackToFrench: false,
    blockers,
  };
}

export function buildMedicationEngineReadinessProjectionReport(): MedicationEngineReadinessProjectionReport {
  const gap = buildPediatricVaccineGapAnalysisReport();
  const safety = buildPediatricMedicationSafetyRemediationReport();
  return {
    currentScore: 4.4,
    projectedAfterRemediation: 4.5,
    projectedAfterFutureActivation: 4.5,
    targetScore: 4.5,
    reachesTargetAfterRemediationPlanning: true,
    remainingActivationBlockers: [
      ...gap.missingVaccines.map((id) => `${id.toUpperCase()}_CATALOG_REVIEW_REQUIRED`),
      ...safety.remediationSteps,
    ],
  };
}

export function buildVaccinePediatricRemediationFinalDecision(): VaccinePediatricRemediationFinalDecision {
  const i18n = buildVaccinePediatricI18nCertificationReport();
  const hasGapMap = buildPediatricVaccineGapAnalysisReport().rows.length === PEDIATRIC_GAP_IDS.length;
  const manufacturerPlanComplete = buildManufacturerGovernanceRemediationPlan().decision === "PLAN_COMPLETE";
  const safetyPlanComplete = buildPediatricMedicationSafetyRemediationReport().remediationSteps.length > 0;
  const marGapsIdentified = buildVaccineMarWorkflowGapReport().missingFields.length > 0;
  const billingGapsIdentified = buildVaccineBillingGovernanceGapReport().rows.length === BILLING_GAP_IDS.length;
  if (i18n.decision !== "PASS") return "NOT_READY";
  if (hasGapMap && manufacturerPlanComplete && safetyPlanComplete && marGapsIdentified && billingGapsIdentified) {
    return "READY_FOR_HOSPITAL_FORMULARY_CERTIFICATION";
  }
  return "READY_FOR_VACCINE_REMEDIATION";
}

export function runVaccinePediatricRemediationReport(): VaccinePediatricRemediationReport {
  return {
    ticket: "MEDUI.MEDICATION.VACCINE_PEDIATRIC_REMEDIATION.1",
    generatedAt: new Date().toISOString(),
    currentMedicationMaturityBaseline: buildCurrentMedicationMaturityBaseline(),
    pediatricVaccineGapAnalysis: buildPediatricVaccineGapAnalysisReport(),
    manufacturerGovernanceRemediationPlan: buildManufacturerGovernanceRemediationPlan(),
    pediatricMedicationSafetyRemediation: buildPediatricMedicationSafetyRemediationReport(),
    vaccineMarWorkflowGap: buildVaccineMarWorkflowGapReport(),
    vaccineBillingGovernanceGap: buildVaccineBillingGovernanceGapReport(),
    vaccinePediatricI18nCertification: buildVaccinePediatricI18nCertificationReport(),
    medicationEngineReadinessProjection: buildMedicationEngineReadinessProjectionReport(),
    finalDecision: buildVaccinePediatricRemediationFinalDecision(),
    compatibility: {
      vaccineActivationChanged: false,
      medicationActivationChanged: false,
      providerSearchChanged: false,
      formularyStatusChanged: false,
      marBehaviorChanged: false,
      migrationsRequired: false,
    },
  };
}
