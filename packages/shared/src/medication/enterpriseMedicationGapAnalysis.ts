/**
 * MEDUI.MEDICATION.ENTERPRISE_MEDICATION_GAP_ANALYSIS.1
 * Audit-only enterprise medication census and gap analysis.
 *
 * Does NOT activate medications, modify provider-ordering registries,
 * MAR workflows, or billing mappings.
 */

import { canonicalMedicationFamilyKey } from "./medicationCanonicalNormalization.js";
import { certifyProviderSearchCollisions } from "./providerSearchCanonicalization.js";
import { buildActivationGovernanceRecord } from "./medicationActivationGovernance.js";
import { resolveMedicationBillingReadiness } from "./medicationActivationBillingReadiness.js";
import { buildUnifiedOrderabilityMap } from "./medicationOrderabilityCertification.js";
import type { MedicationOrderabilityRecord } from "./medicationOrderabilityGovernance.js";
import {
  buildEnterpriseDomainCoverageReport,
  buildEnterpriseFormularyRoadmapReport,
  buildTopMissingMedicationReport,
  type EnterpriseCareDomain,
} from "./enterpriseFormularyGapAnalysis.js";
import { getActiveProviderOrderableCatalogCodes } from "./providerOrderableCatalogCodesRegistry.js";
import { listActiveTranche2ProviderOrderingCatalogCodes } from "./tranche2ProviderOrderingActivation.js";
import { listActiveAnticoagulationProviderOrderingCatalogCodes } from "./anticoagulationProviderOrderingActivation.js";
import { listActiveInsulinDiabetesProviderOrderingCatalogCodes } from "./insulinDiabetesProviderOrderingActivation.js";
import { listActiveVaccineProviderOrderingCatalogCodes } from "./vaccineProviderOrderingActivation.js";
import { listActiveCriticalCareProviderOrderingCatalogCodes } from "./criticalCareProviderOrderingActivation.js";
import {
  listActiveNeurologyProviderOrderingCatalogCodes,
  listActiveInfectiousDiseaseProviderOrderingCatalogCodes,
} from "./neurologyInfectiousDiseaseProviderOrderingActivation.js";
import { listActiveCardiologyProviderOrderingCatalogCodes } from "./cardiologyProviderOrderingActivation.js";
import { listActiveIvFluidsProviderOrderingCatalogCodes } from "./ivFluidsProviderOrderingActivation.js";
import { listActiveObgynProviderOrderingCatalogCodes } from "./obgynProviderOrderingActivation.js";
import { listActivePsychiatryProviderOrderingCatalogCodes } from "./psychiatryProviderOrderingActivation.js";
import { listActiveGastroenterologyProviderOrderingCatalogCodes } from "./gastroenterologyProviderOrderingActivation.js";
import { listActivePediatricsProviderOrderingCatalogCodes } from "./pediatricsProviderOrderingActivation.js";
import { listActiveSurgeryPerioperativeProviderOrderingCatalogCodes } from "./surgeryPerioperativeProviderOrderingActivation.js";
import { listActivePainManagementProviderOrderingCatalogCodes } from "./painManagementProviderOrderingActivation.js";
import { listActiveControlledSubstanceProviderOrderingCatalogCodes } from "./controlledSubstanceProviderOrderingActivation.js";
import { listActiveTranche1PilotCatalogCodes } from "./tranche1PilotUiApiWiring.js";

export type EnterpriseMedicationGapDecision = "ENTERPRISE_MEDICATION_GAP_ANALYSIS_COMPLETE";

export type EnterpriseMedicationActivationReadiness =
  | "READY_FOR_PROVIDER_ORDERING"
  | "MISSING_BILLING"
  | "MISSING_MAR_SUPPORT"
  | "MISSING_INVENTORY"
  | "MISSING_CATALOG"
  | "CONTROLLED_SUBSTANCE_REVIEW"
  | "CHEMOTHERAPY_REVIEW";

export type EnterpriseMedicationCensusRow = {
  catalogCode: string;
  medicationName: string;
  displayNameEn: string;
  displayNameFr: string;
  department: string;
  route: string;
  form: string;
  strength: string;
  clinicalFrequency: "HIGH" | "MEDIUM" | "LOW";
  billingStatus: "READY" | "MISSING";
  marStatus: "READY" | "MISSING";
  inventoryStatus: "READY" | "MISSING";
  providerOrderingStatus: "ACTIVE" | "INACTIVE";
  activationDomain: string | null;
  activationReadiness: EnterpriseMedicationActivationReadiness;
};

export type EnterpriseMedicationCoverageReport = {
  totalMedicationCount: number;
  totalActiveProviderOrderableCount: number;
  totalCatalogRows: number;
  totalCanonicalFamilies: number;
  totalInactiveCatalogRows: number;
  domainActiveCounts: Record<string, number>;
  averageDepartmentCoveragePercent: number;
};

export type EnterpriseMedicationGapRow = {
  catalogCode: string;
  medicationName: string;
  department: string;
  clinicalFrequency: "HIGH" | "MEDIUM" | "LOW";
  billingStatus: "READY" | "MISSING";
  marStatus: "READY" | "MISSING";
  inventoryStatus: "READY" | "MISSING";
  providerOrderingStatus: "ACTIVE" | "INACTIVE";
  activationReadiness: EnterpriseMedicationActivationReadiness;
  blockers: string[];
};

export type EnterpriseMedicationGapReport = {
  totalMissingCount: number;
  rows: EnterpriseMedicationGapRow[];
};

export type DepartmentMissingMedicationReport = {
  department: string;
  expectedMedications: string[];
  missingMedications: string[];
  gapRows: EnterpriseMedicationGapRow[];
};

export type DuplicateMedicationReport = {
  duplicateCatalogCodes: number;
  duplicateCanonicalFamiliesAmongActive: number;
  duplicateDisplayNameCollisions: number;
  rows: Array<{ kind: string; key: string; catalogCodes: string[] }>;
};

export type Top100HighestPriorityMissingMedicationReport = {
  rows: Array<{
    rank: number;
    medication: string;
    department: string;
    route: string;
    score: number;
    activationReadiness: EnterpriseMedicationActivationReadiness;
    blockers: string[];
  }>;
};

export type EnterpriseMedicationRoadmapReport = {
  recommendedNextPhase: string;
  rows: Array<{
    rank: number;
    phase: string;
    rationale: string;
    estimatedCoverageGain: number;
  }>;
};

export type EnterpriseMedicationGapAnalysisReport = {
  ticket: "MEDUI.MEDICATION.ENTERPRISE_MEDICATION_GAP_ANALYSIS.1";
  coverage: EnterpriseMedicationCoverageReport;
  gap: EnterpriseMedicationGapReport;
  missingEmergencyDepartment: DepartmentMissingMedicationReport;
  missingHospitalMedicine: DepartmentMissingMedicationReport;
  missingIcu: DepartmentMissingMedicationReport;
  missingCardiology: DepartmentMissingMedicationReport;
  missingNeurology: DepartmentMissingMedicationReport;
  missingInfectiousDisease: DepartmentMissingMedicationReport;
  missingPsychiatry: DepartmentMissingMedicationReport;
  missingObgyn: DepartmentMissingMedicationReport;
  missingPediatrics: DepartmentMissingMedicationReport;
  missingSurgery: DepartmentMissingMedicationReport;
  missingGastroenterology: DepartmentMissingMedicationReport;
  missingPainManagement: DepartmentMissingMedicationReport;
  missingControlledSubstance: DepartmentMissingMedicationReport;
  missingMarSupport: EnterpriseMedicationGapReport;
  missingBillingCertification: EnterpriseMedicationGapReport;
  missingInventoryCertification: EnterpriseMedicationGapReport;
  duplicates: DuplicateMedicationReport;
  top100Missing: Top100HighestPriorityMissingMedicationReport;
  roadmap: EnterpriseMedicationRoadmapReport;
  compatibility: {
    activationChanged: false;
    providerSearchChanged: false;
    marBehaviorChanged: false;
    billingChanged: false;
    inventoryChanged: false;
    migrationsRequired: false;
  };
  finalDecision: EnterpriseMedicationGapDecision;
};

const CHEMO_TERMS = ["methotrexate", "cyclophosphamide", "doxorubicin", "cisplatin", "carboplatin", "bleomycin"];
const CONTROLLED_TERMS = ["morphine", "fentanyl", "hydromorphone", "oxycodone", "hydrocodone", "codeine", "lorazepam", "midazolam", "diazepam", "ketamine", "propofol"];

const DOMAIN_ACTIVATION_LISTS: Array<{ domain: string; list: () => readonly string[] }> = [
  { domain: "tranche1", list: listActiveTranche1PilotCatalogCodes },
  { domain: "tranche2", list: listActiveTranche2ProviderOrderingCatalogCodes },
  { domain: "anticoagulation", list: listActiveAnticoagulationProviderOrderingCatalogCodes },
  { domain: "insulinDiabetes", list: listActiveInsulinDiabetesProviderOrderingCatalogCodes },
  { domain: "vaccine", list: listActiveVaccineProviderOrderingCatalogCodes },
  { domain: "criticalCare", list: listActiveCriticalCareProviderOrderingCatalogCodes },
  { domain: "neurology", list: listActiveNeurologyProviderOrderingCatalogCodes },
  { domain: "infectiousDisease", list: listActiveInfectiousDiseaseProviderOrderingCatalogCodes },
  { domain: "cardiology", list: listActiveCardiologyProviderOrderingCatalogCodes },
  { domain: "ivFluids", list: listActiveIvFluidsProviderOrderingCatalogCodes },
  { domain: "obgyn", list: listActiveObgynProviderOrderingCatalogCodes },
  { domain: "psychiatry", list: listActivePsychiatryProviderOrderingCatalogCodes },
  { domain: "gastroenterology", list: listActiveGastroenterologyProviderOrderingCatalogCodes },
  { domain: "pediatrics", list: listActivePediatricsProviderOrderingCatalogCodes },
  { domain: "surgery", list: listActiveSurgeryPerioperativeProviderOrderingCatalogCodes },
  { domain: "painManagement", list: listActivePainManagementProviderOrderingCatalogCodes },
  { domain: "controlledSubstance", list: listActiveControlledSubstanceProviderOrderingCatalogCodes },
];

let censusCache: EnterpriseMedicationCensusRow[] | null = null;
let finalReportCache: EnterpriseMedicationGapAnalysisReport | null = null;

function records(): MedicationOrderabilityRecord[] {
  return [...buildUnifiedOrderabilityMap().values()];
}

function activeSet(): ReadonlySet<string> {
  return getActiveProviderOrderableCatalogCodes();
}

function blob(record: MedicationOrderabilityRecord): string {
  return [record.catalogCode, record.genericName, record.displayNameEn, record.displayNameFr, record.route, record.dosageForm, record.strength]
    .join(" ")
    .toLowerCase();
}

function isChemotherapy(record: MedicationOrderabilityRecord): boolean {
  return CHEMO_TERMS.some((term) => blob(record).includes(term));
}

function isControlled(record: MedicationOrderabilityRecord): boolean {
  return (
    Boolean(record.restrictedReason?.toLowerCase().includes("controlled")) ||
    CONTROLLED_TERMS.some((term) => blob(record).includes(term))
  );
}

function inferDepartment(record: MedicationOrderabilityRecord): string {
  const text = blob(record);
  if (text.includes("oncology") || isChemotherapy(record)) return "Oncology";
  if (isControlled(record)) return "Controlled Substances";
  if (text.includes("vaccine") || text.includes("vaccin")) return "Pediatrics";
  if (text.includes("insulin") || text.includes("metformin")) return "Endocrinology";
  if (text.includes("heparin") || text.includes("enoxaparin") || text.includes("warfarin")) return "Anticoagulation";
  if (text.includes("norepinephrine") || text.includes("vasopressin") || text.includes("propofol")) return "ICU / Critical Care";
  if (text.includes("obgyn") || text.includes("oxytocin") || text.includes("misoprostol")) return "OBGYN";
  return "Hospital Medicine";
}

function activationDomainFor(catalogCode: string): string | null {
  for (const { domain, list } of DOMAIN_ACTIVATION_LISTS) {
    if (list().includes(catalogCode)) return domain;
  }
  return null;
}

function classifyReadiness(input: {
  inCatalog: boolean;
  providerOrderingActive: boolean;
  billingReady: boolean;
  marReady: boolean;
  inventoryReady: boolean;
  isControlled: boolean;
  isChemotherapy: boolean;
}): EnterpriseMedicationActivationReadiness {
  if (!input.inCatalog) return "MISSING_CATALOG";
  if (input.isChemotherapy && !input.providerOrderingActive) return "CHEMOTHERAPY_REVIEW";
  if (input.isControlled && !input.providerOrderingActive) return "CONTROLLED_SUBSTANCE_REVIEW";
  if (input.providerOrderingActive && input.billingReady && input.marReady && input.inventoryReady) {
    return "READY_FOR_PROVIDER_ORDERING";
  }
  if (!input.billingReady) return "MISSING_BILLING";
  if (!input.marReady) return "MISSING_MAR_SUPPORT";
  if (!input.inventoryReady) return "MISSING_INVENTORY";
  return "MISSING_BILLING";
}

function buildCensusRows(): EnterpriseMedicationCensusRow[] {
  if (censusCache) return censusCache;
  const active = activeSet();
  censusCache = records().map((record) => {
    const activation = buildActivationGovernanceRecord(record);
    const billing = resolveMedicationBillingReadiness(record.catalogCode);
    const providerOrderingActive = active.has(record.catalogCode);
    const billingReady = billing.billingReady;
    const marReady = activation.marReady;
    const inventoryReady = billing.ndcReady || activation.inventoryReady;
    const controlled = isControlled(record);
    const chemotherapy = isChemotherapy(record);
    return {
      catalogCode: record.catalogCode,
      medicationName: record.displayNameEn || record.genericName,
      displayNameEn: record.displayNameEn,
      displayNameFr: record.displayNameFr,
      department: inferDepartment(record),
      route: record.route,
      form: record.dosageForm,
      strength: record.strength,
      clinicalFrequency: providerOrderingActive ? "HIGH" : controlled || chemotherapy ? "MEDIUM" : "LOW",
      billingStatus: billingReady ? "READY" : "MISSING",
      marStatus: marReady ? "READY" : "MISSING",
      inventoryStatus: inventoryReady ? "READY" : "MISSING",
      providerOrderingStatus: providerOrderingActive ? "ACTIVE" : "INACTIVE",
      activationDomain: activationDomainFor(record.catalogCode),
      activationReadiness: classifyReadiness({
        inCatalog: true,
        providerOrderingActive,
        billingReady,
        marReady,
        inventoryReady,
        isControlled: controlled,
        isChemotherapy: chemotherapy,
      }),
    };
  });
  return censusCache;
}

function toGapRow(row: EnterpriseMedicationCensusRow): EnterpriseMedicationGapRow {
  const blockers: string[] = [];
  if (row.billingStatus === "MISSING") blockers.push("MISSING_BILLING");
  if (row.marStatus === "MISSING") blockers.push("MISSING_MAR_SUPPORT");
  if (row.inventoryStatus === "MISSING") blockers.push("MISSING_INVENTORY");
  if (row.providerOrderingStatus === "INACTIVE") blockers.push("NOT_PROVIDER_ORDERABLE");
  return {
    catalogCode: row.catalogCode,
    medicationName: row.medicationName,
    department: row.department,
    clinicalFrequency: row.clinicalFrequency,
    billingStatus: row.billingStatus,
    marStatus: row.marStatus,
    inventoryStatus: row.inventoryStatus,
    providerOrderingStatus: row.providerOrderingStatus,
    activationReadiness: row.activationReadiness,
    blockers,
  };
}

function gapRows(filter: (row: EnterpriseMedicationCensusRow) => boolean): EnterpriseMedicationGapRow[] {
  return buildCensusRows()
    .filter(filter)
    .filter((row) => row.activationReadiness !== "READY_FOR_PROVIDER_ORDERING")
    .map(toGapRow);
}

export function buildEnterpriseMedicationCoverageReport(): EnterpriseMedicationCoverageReport {
  const census = buildCensusRows();
  const active = activeSet();
  const domainActiveCounts = Object.fromEntries(
    DOMAIN_ACTIVATION_LISTS.map(({ domain, list }) => [domain, list().length])
  );
  const domainCoverage = buildEnterpriseDomainCoverageReport();
  return {
    totalMedicationCount: census.length,
    totalActiveProviderOrderableCount: active.size,
    totalCatalogRows: census.length,
    totalCanonicalFamilies: new Set(census.map((row) => canonicalMedicationFamilyKey({ catalogCode: row.catalogCode, genericName: row.medicationName, displayNameEn: row.displayNameEn, displayNameFr: row.displayNameFr, route: row.route, dosageForm: row.form, strength: row.strength } as MedicationOrderabilityRecord))).size,
    totalInactiveCatalogRows: census.filter((row) => row.providerOrderingStatus === "INACTIVE").length,
    domainActiveCounts,
    averageDepartmentCoveragePercent: domainCoverage.averageCoveragePercent,
  };
}

export function buildEnterpriseMedicationGapReport(): EnterpriseMedicationGapReport {
  const rows = gapRows(() => true);
  return { totalMissingCount: rows.length, rows };
}

function buildDepartmentMissingReport(domain: EnterpriseCareDomain, label: string): DepartmentMissingMedicationReport {
  const domainRow = buildEnterpriseDomainCoverageReport().rows.find((row) => row.domain === domain);
  return {
    department: label,
    expectedMedications: [],
    missingMedications: domainRow?.missingMedications ?? [],
    gapRows: gapRows((row) =>
      (domainRow?.missingMedications ?? []).some((medication) =>
        row.medicationName.toLowerCase().includes(medication.toLowerCase().split(" ")[0] ?? "")
      )
    ).slice(0, 40),
  };
}

export function buildMissingEmergencyDepartmentMedicationReport(): DepartmentMissingMedicationReport {
  return buildDepartmentMissingReport("Emergency Department", "Emergency Department");
}

export function buildMissingHospitalMedicineMedicationReport(): DepartmentMissingMedicationReport {
  const medSurg = buildDepartmentMissingReport("Med-Surg", "Hospital Medicine");
  const hospitalist = buildDepartmentMissingReport("Hospitalist Medicine", "Hospital Medicine");
  return {
    department: "Hospital Medicine",
    expectedMedications: [],
    missingMedications: [...new Set([...medSurg.missingMedications, ...hospitalist.missingMedications])],
    gapRows: [...medSurg.gapRows, ...hospitalist.gapRows].slice(0, 50),
  };
}

export function buildMissingICUMedicationReport(): DepartmentMissingMedicationReport {
  return buildDepartmentMissingReport("ICU / Critical Care", "ICU / Critical Care");
}

export function buildMissingCardiologyMedicationReport(): DepartmentMissingMedicationReport {
  return buildDepartmentMissingReport("Cardiology", "Cardiology");
}

export function buildMissingNeurologyMedicationReport(): DepartmentMissingMedicationReport {
  return buildDepartmentMissingReport("Neurology", "Neurology");
}

export function buildMissingInfectiousDiseaseMedicationReport(): DepartmentMissingMedicationReport {
  return buildDepartmentMissingReport("Infectious Disease", "Infectious Disease");
}

export function buildMissingPsychiatryMedicationReport(): DepartmentMissingMedicationReport {
  return buildDepartmentMissingReport("Psychiatry", "Psychiatry");
}

export function buildMissingOBGYNMedicationReport(): DepartmentMissingMedicationReport {
  return buildDepartmentMissingReport("OBGYN", "OBGYN");
}

export function buildMissingPediatricsMedicationReport(): DepartmentMissingMedicationReport {
  return buildDepartmentMissingReport("Pediatrics", "Pediatrics");
}

export function buildMissingSurgeryMedicationReport(): DepartmentMissingMedicationReport {
  const surgery = buildDepartmentMissingReport("General Surgery", "Surgery / Perioperative");
  const ortho = buildDepartmentMissingReport("Orthopedics", "Surgery / Perioperative");
  return {
    department: "Surgery / Perioperative",
    expectedMedications: [],
    missingMedications: [...new Set([...surgery.missingMedications, ...ortho.missingMedications])],
    gapRows: [...surgery.gapRows, ...ortho.gapRows].slice(0, 50),
  };
}

export function buildMissingGastroenterologyMedicationReport(): DepartmentMissingMedicationReport {
  return buildDepartmentMissingReport("Gastroenterology", "Gastroenterology");
}

export function buildMissingPainManagementMedicationReport(): DepartmentMissingMedicationReport {
  return buildDepartmentMissingReport("Pain Management", "Pain Management");
}

export function buildMissingControlledSubstanceMedicationReport(): DepartmentMissingMedicationReport {
  return {
    department: "Controlled Substances",
    expectedMedications: [],
    missingMedications: gapRows((row) => row.activationReadiness === "CONTROLLED_SUBSTANCE_REVIEW")
      .slice(0, 20)
      .map((row) => row.medicationName),
    gapRows: gapRows((row) => row.activationReadiness === "CONTROLLED_SUBSTANCE_REVIEW").slice(0, 50),
  };
}

export function buildMissingMARSupportReport(): EnterpriseMedicationGapReport {
  const rows = gapRows((row) => row.marStatus === "MISSING");
  return { totalMissingCount: rows.length, rows: rows.slice(0, 100) };
}

export function buildMissingBillingCertificationReport(): EnterpriseMedicationGapReport {
  const rows = gapRows((row) => row.billingStatus === "MISSING");
  return { totalMissingCount: rows.length, rows: rows.slice(0, 100) };
}

export function buildMissingInventoryCertificationReport(): EnterpriseMedicationGapReport {
  const rows = gapRows((row) => row.inventoryStatus === "MISSING");
  return { totalMissingCount: rows.length, rows: rows.slice(0, 100) };
}

export function buildDuplicateMedicationReport(): DuplicateMedicationReport {
  const census = buildCensusRows();
  const active = activeSet();
  const byFamily = new Map<string, string[]>();
  const byDisplay = new Map<string, string[]>();
  for (const row of census) {
    const family = canonicalMedicationFamilyKey({
      catalogCode: row.catalogCode,
      genericName: row.medicationName,
      displayNameEn: row.displayNameEn,
      displayNameFr: row.displayNameFr,
      route: row.route,
      dosageForm: row.form,
      strength: row.strength,
    } as MedicationOrderabilityRecord);
    byFamily.set(family, [...(byFamily.get(family) ?? []), row.catalogCode]);
    const displayKey = row.displayNameEn.trim().toLowerCase();
    byDisplay.set(displayKey, [...(byDisplay.get(displayKey) ?? []), row.catalogCode]);
  }
  const collision = certifyProviderSearchCollisions();
  const duplicateRows = [
    ...[...byFamily.entries()].filter(([, codes]) => codes.length > 1).map(([key, catalogCodes]) => ({ kind: "canonical_family", key, catalogCodes })),
    ...[...byDisplay.entries()].filter(([, codes]) => codes.length > 1).map(([key, catalogCodes]) => ({ kind: "display_name", key, catalogCodes })),
  ];
  const duplicateCanonicalFamiliesAmongActive = [...byFamily.values()].filter(
    (codes) => codes.length > 1 && codes.some((code) => active.has(code))
  ).length;
  return {
    duplicateCatalogCodes: collision.duplicateFamilyRows ?? 0,
    duplicateCanonicalFamiliesAmongActive,
    duplicateDisplayNameCollisions: [...byDisplay.values()].filter((codes) => codes.length > 1).length,
    rows: duplicateRows.slice(0, 30),
  };
}

export function buildTop100HighestPriorityMissingMedicationReport(): Top100HighestPriorityMissingMedicationReport {
  const ranked = buildTopMissingMedicationReport().rows.slice(0, 100).map((row) => ({
    rank: row.rank,
    medication: row.medication,
    department: row.specialty,
    route: row.route,
    score: row.score,
    activationReadiness: (row.catalogGap
      ? "MISSING_CATALOG"
      : row.activationGap
        ? "MISSING_BILLING"
        : row.MARGap
          ? "MISSING_MAR_SUPPORT"
          : row.billingGap || row.inventoryGap
            ? "MISSING_BILLING"
            : "MISSING_INVENTORY") as EnterpriseMedicationActivationReadiness,
    blockers: [
      row.catalogGap ? "CATALOG_GAP" : "",
      row.activationGap ? "ACTIVATION_GAP" : "",
      row.MARGap ? "MAR_GAP" : "",
      row.billingGap ? "BILLING_GAP" : "",
      row.inventoryGap ? "INVENTORY_GAP" : "",
    ].filter(Boolean),
  }));
  return { rows: ranked };
}

export function buildEnterpriseMedicationRoadmapReport(): EnterpriseMedicationRoadmapReport {
  const roadmap = buildEnterpriseFormularyRoadmapReport();
  const coverage = buildEnterpriseMedicationCoverageReport();
  const top = buildTop100HighestPriorityMissingMedicationReport();
  const recommendedNextPhase =
    coverage.domainActiveCounts.neurology === 0
      ? "Neurology provider-ordering expansion"
      : coverage.domainActiveCounts.infectiousDisease === 0
        ? "Infectious Disease provider-ordering expansion"
        : top.rows[0]?.department === "Oncology"
          ? "Oncology governance (chemotherapy review only — no blind activation)"
          : "Thrombolytic / stroke governance with strict dual-control activation";
  return {
    recommendedNextPhase,
    rows: roadmap.rows.map((row) => ({
      rank: row.rank,
      phase: row.phase,
      rationale: row.rationale,
      estimatedCoverageGain: row.coverageGain,
    })),
  };
}

export function runEnterpriseMedicationGapAnalysisReport(): EnterpriseMedicationGapAnalysisReport {
  if (finalReportCache) return finalReportCache;
  finalReportCache = {
    ticket: "MEDUI.MEDICATION.ENTERPRISE_MEDICATION_GAP_ANALYSIS.1",
    coverage: buildEnterpriseMedicationCoverageReport(),
    gap: buildEnterpriseMedicationGapReport(),
    missingEmergencyDepartment: buildMissingEmergencyDepartmentMedicationReport(),
    missingHospitalMedicine: buildMissingHospitalMedicineMedicationReport(),
    missingIcu: buildMissingICUMedicationReport(),
    missingCardiology: buildMissingCardiologyMedicationReport(),
    missingNeurology: buildMissingNeurologyMedicationReport(),
    missingInfectiousDisease: buildMissingInfectiousDiseaseMedicationReport(),
    missingPsychiatry: buildMissingPsychiatryMedicationReport(),
    missingObgyn: buildMissingOBGYNMedicationReport(),
    missingPediatrics: buildMissingPediatricsMedicationReport(),
    missingSurgery: buildMissingSurgeryMedicationReport(),
    missingGastroenterology: buildMissingGastroenterologyMedicationReport(),
    missingPainManagement: buildMissingPainManagementMedicationReport(),
    missingControlledSubstance: buildMissingControlledSubstanceMedicationReport(),
    missingMarSupport: buildMissingMARSupportReport(),
    missingBillingCertification: buildMissingBillingCertificationReport(),
    missingInventoryCertification: buildMissingInventoryCertificationReport(),
    duplicates: buildDuplicateMedicationReport(),
    top100Missing: buildTop100HighestPriorityMissingMedicationReport(),
    roadmap: buildEnterpriseMedicationRoadmapReport(),
    compatibility: {
      activationChanged: false,
      providerSearchChanged: false,
      marBehaviorChanged: false,
      billingChanged: false,
      inventoryChanged: false,
      migrationsRequired: false,
    },
    finalDecision: "ENTERPRISE_MEDICATION_GAP_ANALYSIS_COMPLETE",
  };
  return finalReportCache;
}

export function resetEnterpriseMedicationGapAnalysisCaches(): void {
  censusCache = null;
  finalReportCache = null;
}
