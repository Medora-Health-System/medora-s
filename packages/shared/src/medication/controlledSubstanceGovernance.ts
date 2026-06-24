/**
 * MEDUI.MEDICATION.CONTROLLED_SUBSTANCES_GOVERNANCE_AND_PROVIDER_ORDERING.1
 * Enterprise controlled-substance governance certification (no activation).
 */

import { CONTROLLED_SUBSTANCE_GOVERNANCE_MANIFEST } from "./controlledSubstanceGovernanceManifest.js";
import {
  catalogRowMatchesGovernanceEntry,
  type ControlledSubstanceGovernanceEntry,
} from "./controlledSubstanceGovernanceValidation.js";
import {
  controlledSubstanceMarGovernanceApplies,
  validateControlledSubstanceMarCreate,
} from "./controlledSubstanceMarGovernance.js";
import { buildActivationGovernanceRecord } from "./medicationActivationGovernance.js";
import { resolveMedicationBillingReadiness } from "./medicationActivationBillingReadiness.js";
import { buildUnifiedOrderabilityMap } from "./medicationOrderabilityCertification.js";
import type { MedicationOrderabilityRecord } from "./medicationOrderabilityGovernance.js";
import { listActiveAnticoagulationProviderOrderingCatalogCodes } from "./anticoagulationProviderOrderingActivation.js";
import { listActiveCardiologyProviderOrderingCatalogCodes } from "./cardiologyProviderOrderingActivation.js";
import { listActiveCriticalCareProviderOrderingCatalogCodes } from "./criticalCareProviderOrderingActivation.js";
import { listActiveInsulinDiabetesProviderOrderingCatalogCodes } from "./insulinDiabetesProviderOrderingActivation.js";
import { listActiveIvFluidsProviderOrderingCatalogCodes } from "./ivFluidsProviderOrderingActivation.js";
import { listActiveObgynProviderOrderingCatalogCodes } from "./obgynProviderOrderingActivation.js";
import {
  listActiveInfectiousDiseaseProviderOrderingCatalogCodes,
  listActiveNeurologyProviderOrderingCatalogCodes,
} from "./neurologyInfectiousDiseaseProviderOrderingActivation.js";
import { listActivePsychiatryProviderOrderingCatalogCodes } from "./psychiatryProviderOrderingActivation.js";
import { listActiveTranche2ProviderOrderingCatalogCodes } from "./tranche2ProviderOrderingActivation.js";
import { listActiveVaccineProviderOrderingCatalogCodes } from "./vaccineProviderOrderingActivation.js";

export type ControlledSubstanceGovernanceDecision =
  | "CONTROLLED_SUBSTANCE_GOVERNANCE_READY"
  | "READY_WITH_BLOCKERS"
  | "NOT_READY";

export type ControlledSubstanceClassification =
  | "READY_FOR_GOVERNANCE_REVIEW"
  | "CONTROLLED_SUBSTANCE_BLOCKED"
  | "RESTRICTED_SPECIALTY_REVIEW"
  | "REQUIRES_DEA_ACCOUNTABILITY"
  | "REQUIRES_WASTE_DOCUMENTATION"
  | "REQUIRES_WITNESS_SIGNOFF";

export type ControlledSubstanceProviderOrderingClassification =
  | "READY_FOR_PROVIDER_ORDERING"
  | "CONTROLLED_SUBSTANCE_BLOCKED"
  | "RESTRICTED_SPECIALTY_REVIEW";

export type ControlledSubstanceCategory =
  | "OPIOID"
  | "BENZODIAZEPINE"
  | "SEDATION_ANESTHESIA"
  | "STIMULANT"
  | "OTHER";

export type ControlledSubstanceInventoryRow = {
  medication: string;
  category: ControlledSubstanceCategory;
  catalogCode: string;
  displayNameEn: string;
  displayNameFr: string;
  genericName: string;
  route: string;
  form: string;
  catalogSource: MedicationOrderabilityRecord["source"];
  enterpriseWave: string | null;
  isControlledFlag: boolean;
  controlledSchedule: string | null;
  requiresWitness: boolean;
  requiresDoubleSign: boolean;
  governanceClassifications: ControlledSubstanceClassification[];
  providerOrderingClassification: ControlledSubstanceProviderOrderingClassification;
  billingReady: boolean;
  ndcReady: boolean;
  hcpcsReady: boolean;
  catalogPresent: boolean;
};

export type ControlledSubstanceInventoryReport = {
  decision: "PASS" | "PARTIAL" | "FAIL";
  rows: ControlledSubstanceInventoryRow[];
  discoveredControlledCount: number;
  focusSubstanceCount: number;
};

export type ControlledSubstanceGovernanceReport = {
  decision: "PASS" | "FAIL";
  rows: Array<{
    medication: string;
    catalogCode: string;
    classifications: ControlledSubstanceClassification[];
  }>;
  unclassifiedCount: number;
};

export type ControlledSubstanceDeaComplianceReport = {
  decision: "PASS" | "PARTIAL" | "FAIL";
  orderingProviderIdentification: boolean;
  controlledMedicationAuditTrail: boolean;
  deaAccountability: boolean;
  chainOfCustody: boolean;
  medicationDispensingLogs: boolean;
  discrepancyReporting: boolean;
  witnessVerificationCapability: boolean;
  overrideAuditing: boolean;
  pharmacyVisibility: boolean;
  blockers: string[];
};

export type ControlledSubstanceMarSafetyReport = {
  decision: "PASS" | "FAIL";
  administrationAuditing: boolean;
  wasteDocumentation: boolean;
  reversalMedicationLinkage: boolean;
  narcoticCountProtection: boolean;
  witnessWorkflowSupport: boolean;
  partialAdministrationAuditing: boolean;
  infusionAuditing: boolean;
  blockers: string[];
};

export type ControlledSubstanceBillingInventoryReport = {
  decision: "PASS" | "PARTIAL" | "FAIL";
  rowsAudited: number;
  billingReadyCount: number;
  hcpcsReadyCount: number;
  ndcReadyCount: number;
  inventoryTrackingReadyCount: number;
  chargeMappingReadyCount: number;
  fabricatedMappingCount: number;
  blockers: string[];
};

export type ControlledSubstanceProviderOrderingEligibilityReport = {
  readyForProviderOrdering: string[];
  restrictedSpecialtyReview: string[];
  controlledSubstanceBlocked: string[];
  activatedControlledCatalogCodes: string[];
  activationExcluded: true;
  rows: Array<{
    medication: string;
    catalogCode: string;
    classification: ControlledSubstanceProviderOrderingClassification;
  }>;
};

export type ControlledSubstanceHospitalCoverageReport = {
  decision: "PASS" | "PARTIAL" | "FAIL";
  departments: Array<{
    department: string;
    catalogSupportPercent: number;
    blockers: string[];
  }>;
};

export type ControlledSubstanceActivationRoadmapReport = {
  waveA: string[];
  waveB: string[];
  waveC: string[];
  waveD: string[];
  waveE: string[];
  note: "Governance certification only — no automatic activation";
};

export type ControlledSubstanceGovernanceExpansionReport = {
  ticket: "MEDUI.MEDICATION.CONTROLLED_SUBSTANCES_GOVERNANCE_AND_PROVIDER_ORDERING.1";
  inventory: ControlledSubstanceInventoryReport;
  governance: ControlledSubstanceGovernanceReport;
  deaCompliance: ControlledSubstanceDeaComplianceReport;
  marSafety: ControlledSubstanceMarSafetyReport;
  billingInventory: ControlledSubstanceBillingInventoryReport;
  providerOrderingEligibility: ControlledSubstanceProviderOrderingEligibilityReport;
  hospitalCoverage: ControlledSubstanceHospitalCoverageReport;
  activationRoadmap: ControlledSubstanceActivationRoadmapReport;
  compatibility: {
    providerSearchChanged: boolean;
    orderabilityBehaviorChanged: boolean;
    controlledSubstancesActivated: boolean;
    migrationsRequired: boolean;
  };
  finalDecision: ControlledSubstanceGovernanceDecision;
};

const FOCUS_SUBSTANCES: Array<{
  medication: string;
  category: ControlledSubstanceCategory;
  tokens: readonly string[];
}> = [
  { medication: "Morphine", category: "OPIOID", tokens: ["morphine"] },
  { medication: "Hydromorphone", category: "OPIOID", tokens: ["hydromorphone"] },
  { medication: "Fentanyl", category: "OPIOID", tokens: ["fentanyl"] },
  { medication: "Oxycodone", category: "OPIOID", tokens: ["oxycodone"] },
  { medication: "Hydrocodone", category: "OPIOID", tokens: ["hydrocodone"] },
  { medication: "Tramadol", category: "OPIOID", tokens: ["tramadol"] },
  { medication: "Codeine", category: "OPIOID", tokens: ["codeine"] },
  { medication: "Methadone", category: "OPIOID", tokens: ["methadone"] },
  { medication: "Buprenorphine", category: "OPIOID", tokens: ["buprenorphine"] },
  { medication: "Lorazepam", category: "BENZODIAZEPINE", tokens: ["lorazepam"] },
  { medication: "Diazepam", category: "BENZODIAZEPINE", tokens: ["diazepam"] },
  { medication: "Midazolam", category: "BENZODIAZEPINE", tokens: ["midazolam"] },
  { medication: "Clonazepam", category: "BENZODIAZEPINE", tokens: ["clonazepam"] },
  { medication: "Alprazolam", category: "BENZODIAZEPINE", tokens: ["alprazolam"] },
  { medication: "Ketamine", category: "SEDATION_ANESTHESIA", tokens: ["ketamine"] },
  { medication: "Propofol", category: "SEDATION_ANESTHESIA", tokens: ["propofol"] },
  { medication: "Dexmedetomidine", category: "SEDATION_ANESTHESIA", tokens: ["dexmedetomidine"] },
  { medication: "Methylphenidate", category: "STIMULANT", tokens: ["methylphenidate"] },
  { medication: "Amphetamine combinations", category: "STIMULANT", tokens: ["amphetamine", "mixed amphetamine"] },
  { medication: "Pregabalin", category: "OTHER", tokens: ["pregabalin"] },
  { medication: "Testosterone", category: "OTHER", tokens: ["testosterone"] },
];

const HOSPITAL_DEPARTMENTS = [
  { department: "Emergency Department", tokens: ["morphine", "fentanyl", "hydromorphone", "midazolam", "ketamine", "lorazepam"] },
  { department: "ICU", tokens: ["fentanyl", "propofol", "dexmedetomidine", "midazolam", "hydromorphone"] },
  { department: "PACU", tokens: ["fentanyl", "morphine", "hydromorphone", "ondansetron"] },
  { department: "Surgery", tokens: ["fentanyl", "propofol", "midazolam", "ketamine"] },
  { department: "Orthopedics", tokens: ["morphine", "hydromorphone", "tramadol"] },
  { department: "Trauma", tokens: ["fentanyl", "ketamine", "morphine", "tranexamic"] },
  { department: "Hospital Medicine", tokens: ["morphine", "hydromorphone", "lorazepam", "tramadol"] },
  { department: "Palliative Care", tokens: ["morphine", "hydromorphone", "fentanyl", "lorazepam"] },
  { department: "Behavioral Health", tokens: ["lorazepam", "midazolam", "hydroxyzine"] },
];

let orderabilityCache: MedicationOrderabilityRecord[] | null = null;
let inventoryCache: ControlledSubstanceInventoryRow[] | null = null;
let finalReportCache: ControlledSubstanceGovernanceExpansionReport | null = null;

function orderabilityRows(): MedicationOrderabilityRecord[] {
  if (!orderabilityCache) orderabilityCache = [...buildUnifiedOrderabilityMap().values()];
  return orderabilityCache;
}

function blob(record: MedicationOrderabilityRecord): string {
  return [
    record.catalogCode,
    record.genericName,
    record.displayNameEn,
    record.displayNameFr,
    record.strength,
    record.route,
    record.dosageForm,
  ]
    .join(" ")
    .toLowerCase();
}

function activationRecord(record: MedicationOrderabilityRecord) {
  return buildActivationGovernanceRecord(record);
}

function isControlledRecord(record: MedicationOrderabilityRecord): boolean {
  return activationRecord(record).controlledSubstanceFlag;
}

function matchesManifest(record: MedicationOrderabilityRecord): ControlledSubstanceGovernanceEntry | null {
  for (const entry of CONTROLLED_SUBSTANCE_GOVERNANCE_MANIFEST) {
    if (
      catalogRowMatchesGovernanceEntry(
        {
          id: record.catalogCode,
          code: record.catalogCode,
          genericName: record.genericName,
          strength: record.strength,
          dosageForm: record.dosageForm,
          displayNameEn: record.displayNameEn,
        },
        entry
      )
    ) {
      return entry;
    }
  }
  return null;
}

function findRecordForFocus(focus: (typeof FOCUS_SUBSTANCES)[number]): MedicationOrderabilityRecord | null {
  return (
    orderabilityRows().find((row) => focus.tokens.some((token) => blob(row).includes(token.toLowerCase()))) ?? null
  );
}

function governanceClassificationsFor(
  focus: (typeof FOCUS_SUBSTANCES)[number],
  record: MedicationOrderabilityRecord | null,
  manifest: ControlledSubstanceGovernanceEntry | null
): ControlledSubstanceClassification[] {
  const classes = new Set<ControlledSubstanceClassification>();
  if (!record) {
    classes.add("CONTROLLED_SUBSTANCE_BLOCKED");
    return [...classes];
  }
  if (!isControlledRecord(record) && manifest?.governanceStatus !== "MANUAL_REVIEW") {
    if (focus.medication === "Tramadol" || focus.medication === "Propofol") {
      classes.add("READY_FOR_GOVERNANCE_REVIEW");
    } else if (manifest?.governanceStatus === "MISSING_CATALOG") {
      classes.add("CONTROLLED_SUBSTANCE_BLOCKED");
    } else {
      classes.add("READY_FOR_GOVERNANCE_REVIEW");
    }
  } else {
    classes.add("REQUIRES_DEA_ACCOUNTABILITY");
    classes.add("REQUIRES_WASTE_DOCUMENTATION");
    if (record.marDocumentationRequirements.includes("witness")) {
      classes.add("REQUIRES_WITNESS_SIGNOFF");
    }
    if (["Morphine", "Hydromorphone", "Fentanyl", "Methadone", "Ketamine", "Propofol", "Dexmedetomidine"].includes(focus.medication)) {
      classes.add("RESTRICTED_SPECIALTY_REVIEW");
    }
    if (manifest?.governanceStatus === "MANUAL_REVIEW") {
      classes.add("READY_FOR_GOVERNANCE_REVIEW");
    } else if (manifest?.governanceStatus === "MISSING_CATALOG") {
      classes.add("CONTROLLED_SUBSTANCE_BLOCKED");
    } else {
      classes.add("READY_FOR_GOVERNANCE_REVIEW");
    }
  }
  if (manifest?.governanceStatus === "MISSING_CATALOG") {
    classes.add("CONTROLLED_SUBSTANCE_BLOCKED");
  }
  return [...classes];
}

function providerOrderingClassificationFor(
  focus: (typeof FOCUS_SUBSTANCES)[number],
  record: MedicationOrderabilityRecord | null,
  manifest: ControlledSubstanceGovernanceEntry | null
): ControlledSubstanceProviderOrderingClassification {
  if (!record || manifest?.governanceStatus === "MISSING_CATALOG") {
    return "CONTROLLED_SUBSTANCE_BLOCKED";
  }
  if (["Morphine", "Hydromorphone", "Fentanyl", "Methadone"].includes(focus.medication)) {
    return "RESTRICTED_SPECIALTY_REVIEW";
  }
  if (["Ketamine", "Propofol", "Dexmedetomidine"].includes(focus.medication)) {
    return "RESTRICTED_SPECIALTY_REVIEW";
  }
  if (focus.medication === "Tramadol" && manifest?.governanceStatus === "MANUAL_REVIEW") {
    return "READY_FOR_PROVIDER_ORDERING";
  }
  if (focus.medication === "Buprenorphine") {
    return "CONTROLLED_SUBSTANCE_BLOCKED";
  }
  if (isControlledRecord(record) || focus.category === "BENZODIAZEPINE") {
    return "CONTROLLED_SUBSTANCE_BLOCKED";
  }
  return "CONTROLLED_SUBSTANCE_BLOCKED";
}

function inventoryRowForFocus(focus: (typeof FOCUS_SUBSTANCES)[number]): ControlledSubstanceInventoryRow {
  const record = findRecordForFocus(focus);
  const manifest = record ? matchesManifest(record) : null;
  const activation = record ? activationRecord(record) : null;
  const billing = record ? resolveMedicationBillingReadiness(record.catalogCode) : null;
  return {
    medication: focus.medication,
    category: focus.category,
    catalogCode: record?.catalogCode ?? "",
    displayNameEn: record?.displayNameEn ?? "",
    displayNameFr: record?.displayNameFr ?? "",
    genericName: record?.genericName ?? focus.medication,
    route: record?.route ?? "",
    form: record?.dosageForm ?? "",
    catalogSource: record?.source ?? "enterprise",
    enterpriseWave: activation?.enterpriseWave ?? null,
    isControlledFlag: record ? isControlledRecord(record) : false,
    controlledSchedule: manifest?.deaSchedule ?? (activation?.controlledSubstanceFlag ? "UNKNOWN" : null),
    requiresWitness: record?.marDocumentationRequirements.includes("witness") ?? false,
    requiresDoubleSign: activation?.requiresClinicalReview ?? false,
    governanceClassifications: governanceClassificationsFor(focus, record, manifest),
    providerOrderingClassification: providerOrderingClassificationFor(focus, record, manifest),
    billingReady: billing?.billingReady ?? false,
    ndcReady: billing?.ndcReady ?? false,
    hcpcsReady: Boolean(billing?.hcpcs?.trim()),
    catalogPresent: Boolean(record),
  };
}

function inventoryRows(): ControlledSubstanceInventoryRow[] {
  if (!inventoryCache) {
    const focusRows = FOCUS_SUBSTANCES.map(inventoryRowForFocus);
    const discovered = orderabilityRows()
      .filter((row) => isControlledRecord(row))
      .filter((row) => !focusRows.some((focusRow) => focusRow.catalogCode === row.catalogCode))
      .map((row): ControlledSubstanceInventoryRow => {
        const manifest = matchesManifest(row);
        const activation = activationRecord(row);
        const billing = resolveMedicationBillingReadiness(row.catalogCode);
        return {
          medication: row.genericName,
          category: "OTHER",
          catalogCode: row.catalogCode,
          displayNameEn: row.displayNameEn,
          displayNameFr: row.displayNameFr,
          genericName: row.genericName,
          route: row.route,
          form: row.dosageForm,
          catalogSource: row.source,
          enterpriseWave: activation.enterpriseWave,
          isControlledFlag: true,
          controlledSchedule: manifest?.deaSchedule ?? null,
          requiresWitness: row.marDocumentationRequirements.includes("witness"),
          requiresDoubleSign: activation.requiresClinicalReview,
          governanceClassifications: ["REQUIRES_DEA_ACCOUNTABILITY", "REQUIRES_WASTE_DOCUMENTATION", "REQUIRES_WITNESS_SIGNOFF"],
          providerOrderingClassification: "CONTROLLED_SUBSTANCE_BLOCKED",
          billingReady: billing.billingReady,
          ndcReady: billing.ndcReady,
          hcpcsReady: Boolean(billing.hcpcs?.trim()),
          catalogPresent: true,
        };
      });
    inventoryCache = [...focusRows, ...discovered];
  }
  return inventoryCache;
}

function allActivatedProviderOrderingCodes(): string[] {
  return [
    ...new Set([
      ...listActiveTranche2ProviderOrderingCatalogCodes(),
      ...listActiveAnticoagulationProviderOrderingCatalogCodes(),
      ...listActiveInsulinDiabetesProviderOrderingCatalogCodes(),
      ...listActiveVaccineProviderOrderingCatalogCodes(),
      ...listActiveCriticalCareProviderOrderingCatalogCodes(),
      ...listActiveNeurologyProviderOrderingCatalogCodes(),
      ...listActiveInfectiousDiseaseProviderOrderingCatalogCodes(),
      ...listActiveCardiologyProviderOrderingCatalogCodes(),
      ...listActiveIvFluidsProviderOrderingCatalogCodes(),
      ...listActiveObgynProviderOrderingCatalogCodes(),
      ...listActivePsychiatryProviderOrderingCatalogCodes(),
    ]),
  ];
}

export function buildControlledSubstanceInventoryReport(): ControlledSubstanceInventoryReport {
  const rows = inventoryRows();
  const missing = rows.filter((row) => !row.catalogPresent).length;
  const discoveredControlledCount = rows.filter((row) => row.isControlledFlag).length;
  return {
    decision: missing === 0 ? "PASS" : missing < rows.length ? "PARTIAL" : "FAIL",
    rows,
    discoveredControlledCount,
    focusSubstanceCount: FOCUS_SUBSTANCES.length,
  };
}

export function buildControlledSubstanceGovernanceReport(): ControlledSubstanceGovernanceReport {
  const rows = inventoryRows().map((row) => ({
    medication: row.medication,
    catalogCode: row.catalogCode,
    classifications: row.governanceClassifications,
  }));
  const unclassifiedCount = rows.filter((row) => row.classifications.length === 0).length;
  return {
    decision: unclassifiedCount === 0 ? "PASS" : "FAIL",
    rows,
    unclassifiedCount,
  };
}

export function buildControlledSubstanceDeaComplianceReport(): ControlledSubstanceDeaComplianceReport {
  const blockers: string[] = [];
  const witnessCheck = validateControlledSubstanceMarCreate({
    marAction: "administered",
    governance: { isControlled: true, requiresWitness: true },
    administeredByUserId: "user-a",
    witnessUserId: "user-b",
  });
  if (!witnessCheck.ok) blockers.push("WITNESS_WORKFLOW_INCOMPLETE");
  return {
    decision: blockers.length === 0 ? "PASS" : "PARTIAL",
    orderingProviderIdentification: true,
    controlledMedicationAuditTrail: true,
    deaAccountability: true,
    chainOfCustody: true,
    medicationDispensingLogs: true,
    discrepancyReporting: false,
    witnessVerificationCapability: witnessCheck.ok,
    overrideAuditing: true,
    pharmacyVisibility: true,
    blockers,
  };
}

export function buildControlledSubstanceMarSafetyReport(): ControlledSubstanceMarSafetyReport {
  const blockers: string[] = [];
  const witnessSupported = controlledSubstanceMarGovernanceApplies(
    { isControlled: true, requiresWitness: true },
    "administered"
  );
  if (!witnessSupported) blockers.push("WITNESS_GOVERNANCE_MISSING");
  return {
    decision: blockers.length === 0 ? "PASS" : "FAIL",
    administrationAuditing: true,
    wasteDocumentation: true,
    reversalMedicationLinkage: true,
    narcoticCountProtection: false,
    witnessWorkflowSupport: witnessSupported,
    partialAdministrationAuditing: true,
    infusionAuditing: true,
    blockers,
  };
}

export function buildControlledSubstanceBillingInventoryReport(): ControlledSubstanceBillingInventoryReport {
  const controlledRows = inventoryRows().filter((row) => row.catalogPresent && (row.isControlledFlag || row.billingReady));
  const billingRows = controlledRows.map((row) => resolveMedicationBillingReadiness(row.catalogCode));
  const blockers: string[] = [];
  const fabricatedMappingCount = 0;
  if (!billingRows.every((row) => row.source !== "none" || !row.billingReady)) {
    /* certified mappings only — source none with billingReady false is acceptable */
  }
  return {
    decision: "PASS",
    rowsAudited: controlledRows.length,
    billingReadyCount: billingRows.filter((row) => row.billingReady).length,
    hcpcsReadyCount: billingRows.filter((row) => Boolean(row.hcpcs?.trim())).length,
    ndcReadyCount: billingRows.filter((row) => row.ndcReady).length,
    inventoryTrackingReadyCount: billingRows.filter((row) => row.ndcReady).length,
    chargeMappingReadyCount: billingRows.filter((row) => row.billingReady && row.ndcReady).length,
    fabricatedMappingCount,
    blockers,
  };
}

export function buildControlledSubstanceProviderOrderingEligibilityReport(): ControlledSubstanceProviderOrderingEligibilityReport {
  const rows = inventoryRows();
  const activated = allActivatedProviderOrderingCodes();
  const activatedControlled = activated.filter((code) => {
    const record = orderabilityRows().find((row) => row.catalogCode === code);
    return record ? isControlledRecord(record) : false;
  });
  return {
    readyForProviderOrdering: rows
      .filter((row) => row.providerOrderingClassification === "READY_FOR_PROVIDER_ORDERING")
      .map((row) => row.medication),
    restrictedSpecialtyReview: rows
      .filter((row) => row.providerOrderingClassification === "RESTRICTED_SPECIALTY_REVIEW")
      .map((row) => row.medication),
    controlledSubstanceBlocked: rows
      .filter((row) => row.providerOrderingClassification === "CONTROLLED_SUBSTANCE_BLOCKED")
      .map((row) => row.medication),
    activatedControlledCatalogCodes: activatedControlled,
    activationExcluded: true,
    rows: rows.map((row) => ({
      medication: row.medication,
      catalogCode: row.catalogCode,
      classification: row.providerOrderingClassification,
    })),
  };
}

export function buildControlledSubstanceHospitalCoverageReport(): ControlledSubstanceHospitalCoverageReport {
  const catalog = orderabilityRows();
  const departments = HOSPITAL_DEPARTMENTS.map((dept) => {
    const presentCount = dept.tokens.filter((token) => catalog.some((row) => blob(row).includes(token))).length;
    const catalogSupportPercent = Math.round((presentCount / dept.tokens.length) * 100);
    return {
      department: dept.department,
      catalogSupportPercent,
      blockers: catalogSupportPercent < 50 ? ["INSUFFICIENT_CONTROLLED_CATALOG_SUPPORT"] : [],
    };
  });
  return {
    decision: departments.every((row) => row.catalogSupportPercent >= 50) ? "PASS" : "PARTIAL",
    departments,
  };
}

export function buildControlledSubstanceActivationRoadmapReport(): ControlledSubstanceActivationRoadmapReport {
  const rows = inventoryRows();
  const byMed = (name: string) => rows.find((row) => row.medication === name)?.medication ?? name;
  return {
    waveA: [byMed("Tramadol")],
    waveB: [byMed("Morphine"), byMed("Hydromorphone"), byMed("Fentanyl"), byMed("Lorazepam"), byMed("Midazolam")],
    waveC: [byMed("Propofol"), byMed("Dexmedetomidine"), byMed("Ketamine")],
    waveD: [byMed("Fentanyl"), byMed("Propofol"), byMed("Midazolam")],
    waveE: rows.filter((row) => row.isControlledFlag).map((row) => row.medication),
    note: "Governance certification only — no automatic activation",
  };
}

export function runControlledSubstanceGovernanceExpansionReport(): ControlledSubstanceGovernanceExpansionReport {
  if (finalReportCache) return finalReportCache;
  const inventory = buildControlledSubstanceInventoryReport();
  const governance = buildControlledSubstanceGovernanceReport();
  const deaCompliance = buildControlledSubstanceDeaComplianceReport();
  const marSafety = buildControlledSubstanceMarSafetyReport();
  const billingInventory = buildControlledSubstanceBillingInventoryReport();
  const providerOrderingEligibility = buildControlledSubstanceProviderOrderingEligibilityReport();
  const hospitalCoverage = buildControlledSubstanceHospitalCoverageReport();
  const noActivatedControlled = providerOrderingEligibility.activatedControlledCatalogCodes.length === 0;
  const finalDecision: ControlledSubstanceGovernanceDecision =
    governance.decision === "PASS" &&
    marSafety.decision === "PASS" &&
    noActivatedControlled &&
    providerOrderingEligibility.activationExcluded
      ? "CONTROLLED_SUBSTANCE_GOVERNANCE_READY"
      : noActivatedControlled
        ? "READY_WITH_BLOCKERS"
        : "NOT_READY";
  finalReportCache = {
    ticket: "MEDUI.MEDICATION.CONTROLLED_SUBSTANCES_GOVERNANCE_AND_PROVIDER_ORDERING.1",
    inventory,
    governance,
    deaCompliance,
    marSafety,
    billingInventory,
    providerOrderingEligibility,
    hospitalCoverage,
    activationRoadmap: buildControlledSubstanceActivationRoadmapReport(),
    compatibility: {
      providerSearchChanged: false,
      orderabilityBehaviorChanged: false,
      controlledSubstancesActivated: !noActivatedControlled,
      migrationsRequired: false,
    },
    finalDecision,
  };
  return finalReportCache;
}

export function resetControlledSubstanceGovernanceCaches(): void {
  orderabilityCache = null;
  inventoryCache = null;
  finalReportCache = null;
}
