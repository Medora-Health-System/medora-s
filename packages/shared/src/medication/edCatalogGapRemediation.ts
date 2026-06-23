/**
 * MEDUI.MEDICATION.TRANCHE_3_ED_CATALOG_GAP_REMEDIATION.1
 * ED catalog-support gap remediation — certification only.
 */

import { certifyMedicationActivationCollision } from "./medicationCanonicalNormalization.js";
import { resolveMedicationBillingReadiness } from "./medicationActivationBillingReadiness.js";
import { buildActivationGovernanceRecord } from "./medicationActivationGovernance.js";
import { buildUnifiedOrderabilityMap } from "./medicationOrderabilityCertification.js";
import { listActiveTranche1PilotCatalogCodes } from "./tranche1PilotUiApiWiring.js";
import { listActiveTranche2ProviderOrderingCatalogCodes } from "./tranche2ProviderOrderingActivation.js";
import {
  buildEDActivationGapAnalysisReport,
  type EDActivationGapAnalysisDecision,
} from "./tranche3EdActivationGapAnalysis.js";
import {
  buildEmergencyI18nCertificationReport,
  buildEmergencyProviderSearchSafetyReport,
  buildHighRiskExclusionRecertificationReport,
  buildTranche3EdInventoryRecertificationReport,
} from "./tranche3EdSafeActivationRecheck.js";
import {
  buildEmergencyWorkflowCompatibilityReport,
  certifyEmergencyMedicationPresence,
} from "./tranche3EmergencyMedicationReadiness.js";

export type EdCatalogGapRemediationDecision = "ED_CATALOG_GAPS_CLEARED" | "READY_WITH_BLOCKERS" | "NOT_READY";

export type EdCatalogGapRemediationBaselineReport = {
  tranche1Active: boolean;
  tranche2Active: boolean;
  edGapAnalysisDecision: "TRANCHE_3_PARTIAL_NEEDED";
  missingCatalogSupport: readonly ["CELLULITIS:Amoxicillin-Clavulanate", "WOUND_CARE:Povidone-Iodine"];
  buildGate: "PASS";
};

export type EdMedicationCatalogRootCause = {
  medication: "Amoxicillin-Clavulanate" | "Povidone-Iodine";
  catalogRecordExistsBeforeRemediation: boolean;
  canonicalFamilyExistsBeforeRemediation: boolean;
  routeFormExistsBeforeRemediation: boolean;
  strengthFormMissingBeforeRemediation: boolean;
  billingNdcMissingBeforeRemediation: boolean;
  marCompatibilityMissingBeforeRemediation: boolean;
  inventoryCompatibilityMissingBeforeRemediation: boolean;
  i18nMissingBeforeRemediation: boolean;
  duplicateConflictBeforeRemediation: boolean;
  rootCause: string;
};

export type EdCatalogGapRootCauseReport = {
  rows: [EdMedicationCatalogRootCause, EdMedicationCatalogRootCause];
};

export type EdMedicationGapRemediationReport = {
  medication: "Amoxicillin-Clavulanate" | "Povidone-Iodine";
  catalogCode: string;
  catalogSupportPresent: boolean;
  activated: false;
  route: string | null;
  form: string | null;
  canonicalFamily: string | null;
  billingReady: boolean;
  inventoryReady: boolean;
  marCompatible: boolean;
  i18nReady: boolean;
  duplicateProtection: "PASS" | "REVIEW_REQUIRED";
  providerExposureChanged: false;
  blockers: string[];
};

export type EdGapRecertificationReport = {
  edGapAnalysisDecision: EDActivationGapAnalysisDecision;
  missingCatalogSupportCount: number;
  missingCatalogSupport: string[];
  emergencyMedicationPresenceCertification: ReturnType<typeof certifyEmergencyMedicationPresence>["decision"];
  emergencyWorkflowCompatibilityReport: ReturnType<typeof buildEmergencyWorkflowCompatibilityReport>["decision"];
  emergencyProviderSearchSafetyReport: ReturnType<typeof buildEmergencyProviderSearchSafetyReport>["decision"];
  emergencyI18nCertificationReport: "PASS" | "FAIL";
};

export type EdHighRiskSafetyRegressionReport = {
  thrombolyticsNotActivated: boolean;
  anticoagulantsNotActivated: boolean;
  pressorsNotActivated: boolean;
  paralyticsNotActivated: boolean;
  sedativesNotActivated: boolean;
  rsiMedsNotActivated: boolean;
  criticalCareDripsNotActivated: boolean;
  controlledSubstancesNotActivated: boolean;
  chemotherapyNotActivated: boolean;
};

export type EdCatalogGapRemediationCertificationReport = {
  baseline: EdCatalogGapRemediationBaselineReport;
  rootCause: EdCatalogGapRootCauseReport;
  amoxicillinClavulanate: EdMedicationGapRemediationReport;
  povidoneIodine: EdMedicationGapRemediationReport;
  recertification: EdGapRecertificationReport;
  highRiskSafetyRegression: EdHighRiskSafetyRegressionReport;
  compatibility: {
    activationChanged: false;
    providerSearchChanged: false;
    marBehaviorChanged: false;
    billingBehaviorChanged: false;
    inventoryBehaviorChanged: false;
    migrationsRequired: false;
  };
  finalDecision: EdCatalogGapRemediationDecision;
};

function catalogRows() {
  return [...buildUnifiedOrderabilityMap().values()];
}

function rowBlob(row: ReturnType<typeof catalogRows>[number]): string {
  return [row.catalogCode, row.genericName, row.displayNameEn, row.displayNameFr, row.route, row.dosageForm, row.strength]
    .join(" ")
    .toLowerCase();
}

function findFirstByTokens(tokens: readonly string[]) {
  return catalogRows().find((row) => tokens.some((token) => rowBlob(row).includes(token.toLowerCase()))) ?? null;
}

function remediationRow(
  medication: "Amoxicillin-Clavulanate" | "Povidone-Iodine",
  tokens: readonly string[]
): EdMedicationGapRemediationReport {
  const row = findFirstByTokens(tokens);
  const activation = row ? buildActivationGovernanceRecord(row) : null;
  const billing = row ? resolveMedicationBillingReadiness(row.catalogCode) : null;
  const collision = row ? certifyMedicationActivationCollision([row.catalogCode]) : null;
  const blockers: string[] = [];
  if (!row) blockers.push("CATALOG_SUPPORT_MISSING");
  if (row && !activation?.marReady) blockers.push("MAR_NOT_READY");
  if (row && !billing?.billingReady) blockers.push("BILLING_NOT_READY");
  if (row && !billing?.ndcReady) blockers.push("INVENTORY_NOT_READY");
  if (row && (!row.displayNameEn.trim() || !row.displayNameFr.trim())) blockers.push("I18N_NOT_READY");
  return {
    medication,
    catalogCode: row?.catalogCode ?? "",
    catalogSupportPresent: Boolean(row),
    activated: false,
    route: row?.route ?? null,
    form: row?.dosageForm ?? null,
    canonicalFamily: row?.genericName.toLowerCase() ?? null,
    billingReady: Boolean(billing?.billingReady),
    inventoryReady: Boolean(billing?.ndcReady),
    marCompatible: Boolean(activation?.marReady),
    i18nReady: Boolean(row?.displayNameEn.trim() && row?.displayNameFr.trim()),
    duplicateProtection: collision?.decision === "SAFE" ? "PASS" : "REVIEW_REQUIRED",
    providerExposureChanged: false,
    blockers,
  };
}

export function buildEdCatalogGapRemediationBaselineReport(): EdCatalogGapRemediationBaselineReport {
  return {
    tranche1Active: listActiveTranche1PilotCatalogCodes().length > 0,
    tranche2Active: listActiveTranche2ProviderOrderingCatalogCodes().length > 0,
    edGapAnalysisDecision: "TRANCHE_3_PARTIAL_NEEDED",
    missingCatalogSupport: ["CELLULITIS:Amoxicillin-Clavulanate", "WOUND_CARE:Povidone-Iodine"],
    buildGate: "PASS",
  };
}

export function buildEdCatalogGapRootCauseReport(): EdCatalogGapRootCauseReport {
  return {
    rows: [
      {
        medication: "Amoxicillin-Clavulanate",
        catalogRecordExistsBeforeRemediation: true,
        canonicalFamilyExistsBeforeRemediation: true,
        routeFormExistsBeforeRemediation: true,
        strengthFormMissingBeforeRemediation: false,
        billingNdcMissingBeforeRemediation: false,
        marCompatibilityMissingBeforeRemediation: false,
        inventoryCompatibilityMissingBeforeRemediation: false,
        i18nMissingBeforeRemediation: false,
        duplicateConflictBeforeRemediation: false,
        rootCause: "ED workflow token expected clavulanate wording while catalog used clavulanic acid naming.",
      },
      {
        medication: "Povidone-Iodine",
        catalogRecordExistsBeforeRemediation: false,
        canonicalFamilyExistsBeforeRemediation: false,
        routeFormExistsBeforeRemediation: false,
        strengthFormMissingBeforeRemediation: true,
        billingNdcMissingBeforeRemediation: true,
        marCompatibilityMissingBeforeRemediation: true,
        inventoryCompatibilityMissingBeforeRemediation: true,
        i18nMissingBeforeRemediation: true,
        duplicateConflictBeforeRemediation: false,
        rootCause: "Wound-care antiseptic was absent from the static Haiti catalog.",
      },
    ],
  };
}

export function buildAmoxicillinClavulanateRemediationReport(): EdMedicationGapRemediationReport {
  return remediationRow("Amoxicillin-Clavulanate", ["clavulanic acid", "acide clavulanique"]);
}

export function buildPovidoneIodineRemediationReport(): EdMedicationGapRemediationReport {
  return remediationRow("Povidone-Iodine", ["povidone", "iodine"]);
}

export function buildEdGapRecertificationReport(): EdGapRecertificationReport {
  const gap = buildEDActivationGapAnalysisReport();
  const presence = certifyEmergencyMedicationPresence();
  const workflow = buildEmergencyWorkflowCompatibilityReport();
  const provider = buildEmergencyProviderSearchSafetyReport();
  const i18n = buildEmergencyI18nCertificationReport();
  const missing = gap.ED_PROVIDER_ORDERABLE_INVENTORY.filter((row) => row.bucket === "MISSING_CATALOG_SUPPORT");
  return {
    edGapAnalysisDecision: gap.finalDecision,
    missingCatalogSupportCount: missing.length,
    missingCatalogSupport: missing.map((row) => `${row.workflowId}:${row.medication}`),
    emergencyMedicationPresenceCertification: presence.decision,
    emergencyWorkflowCompatibilityReport: workflow.decision,
    emergencyProviderSearchSafetyReport: provider.decision,
    emergencyI18nCertificationReport: i18n.enLeakageIntoFr === 0 && i18n.frLeakageIntoEn === 0 ? "PASS" : "FAIL",
  };
}

export function buildEdHighRiskSafetyRegressionReport(): EdHighRiskSafetyRegressionReport {
  const report = buildHighRiskExclusionRecertificationReport();
  return {
    thrombolyticsNotActivated: report.thrombolyticsExcluded,
    anticoagulantsNotActivated: report.anticoagulantsExcluded,
    pressorsNotActivated: report.pressorsExcluded,
    paralyticsNotActivated: report.paralyticsExcluded,
    sedativesNotActivated: report.sedativesExcluded,
    rsiMedsNotActivated: report.rsiMedicationsExcluded,
    criticalCareDripsNotActivated: report.criticalCareDripsExcluded,
    controlledSubstancesNotActivated: report.controlledSubstancesExcluded,
    chemotherapyNotActivated: report.chemotherapyExcluded,
  };
}

export function runEdCatalogGapRemediationCertification(): EdCatalogGapRemediationCertificationReport {
  const amox = buildAmoxicillinClavulanateRemediationReport();
  const povidone = buildPovidoneIodineRemediationReport();
  const recert = buildEdGapRecertificationReport();
  const highRisk = buildEdHighRiskSafetyRegressionReport();
  const highRiskPass = Object.values(highRisk).every(Boolean);
  return {
    baseline: buildEdCatalogGapRemediationBaselineReport(),
    rootCause: buildEdCatalogGapRootCauseReport(),
    amoxicillinClavulanate: amox,
    povidoneIodine: povidone,
    recertification: recert,
    highRiskSafetyRegression: highRisk,
    compatibility: {
      activationChanged: false,
      providerSearchChanged: false,
      marBehaviorChanged: false,
      billingBehaviorChanged: false,
      inventoryBehaviorChanged: false,
      migrationsRequired: false,
    },
    finalDecision:
      recert.missingCatalogSupportCount === 0 && highRiskPass && amox.catalogSupportPresent && povidone.catalogSupportPresent
        ? "ED_CATALOG_GAPS_CLEARED"
        : recert.missingCatalogSupportCount === 0
          ? "READY_WITH_BLOCKERS"
          : "NOT_READY",
  };
}
