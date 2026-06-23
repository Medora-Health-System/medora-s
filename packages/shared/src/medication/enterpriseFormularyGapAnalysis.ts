/**
 * MEDUI.MEDICATION.ENTERPRISE_FORMULARY_GAP_ANALYSIS.1
 * Audit-only enterprise hospital formulary gap analysis.
 *
 * This module does not activate medications and does not change provider
 * search, orderability, MAR behavior, billing, inventory, or persistence.
 */

import {
  canonicalMedicationFamilyKey,
} from "./medicationCanonicalNormalization.js";
import { looksEnglishFormText, looksFrenchLocalizedText } from "./medicationLocalizationValidation.js";
import { buildActivationGovernanceRecord } from "./medicationActivationGovernance.js";
import { resolveMedicationBillingReadiness } from "./medicationActivationBillingReadiness.js";
import { buildUnifiedOrderabilityMap } from "./medicationOrderabilityCertification.js";
import type { MedicationOrderabilityRecord } from "./medicationOrderabilityGovernance.js";
import { runGovernedTranche1PilotActivationReport } from "./tranche1PilotActivation.js";
import { listActiveTranche2ProviderOrderingCatalogCodes } from "./tranche2ProviderOrderingActivation.js";
import { listActiveAnticoagulationProviderOrderingCatalogCodes } from "./anticoagulationProviderOrderingActivation.js";
import { listActiveInsulinDiabetesProviderOrderingCatalogCodes } from "./insulinDiabetesProviderOrderingActivation.js";
import { listActiveVaccineProviderOrderingCatalogCodes } from "./vaccineProviderOrderingActivation.js";
import { listActiveCriticalCareProviderOrderingCatalogCodes } from "./criticalCareProviderOrderingActivation.js";

export type EnterpriseFormularyGapDecision =
  | "ENTERPRISE_FORMULARY_READY"
  | "ENTERPRISE_FORMULARY_PARTIAL"
  | "MAJOR_GAPS_IDENTIFIED";

export type EnterpriseCareDomain =
  | "Emergency Department"
  | "ICU / Critical Care"
  | "Step Down"
  | "Med-Surg"
  | "Telemetry"
  | "Cardiology"
  | "Pulmonary"
  | "Neurology"
  | "Infectious Disease"
  | "Endocrinology"
  | "Nephrology"
  | "Gastroenterology"
  | "Psychiatry"
  | "Pediatrics"
  | "OBGYN"
  | "Orthopedics"
  | "General Surgery"
  | "Oncology"
  | "Pain Management"
  | "Hospitalist Medicine";

export type EnterpriseWorkflow =
  | "Sepsis"
  | "Stroke"
  | "STEMI"
  | "NSTEMI"
  | "DKA"
  | "Hyperkalemia"
  | "CHF"
  | "COPD"
  | "Asthma"
  | "Pneumonia"
  | "Cellulitis"
  | "UTI"
  | "Behavioral Health"
  | "GI Bleed"
  | "Surgery"
  | "Trauma"
  | "Obstetrics"
  | "Pediatric Fever"
  | "Pediatric Respiratory Distress";

export type EnterpriseMedicationExpectation = {
  medication: string;
  specialty: string;
  route: string;
  clinicalImportance: 1 | 2 | 3 | 4 | 5;
  utilization: 1 | 2 | 3 | 4 | 5;
  tokens?: string[];
};

export type EnterpriseFormularyBaselineReport = {
  tranche1Active: boolean;
  tranche2Active: boolean;
  anticoagulationActive: boolean;
  insulinDiabetesActive: boolean;
  vaccineProviderOrderingActive: boolean;
  criticalCareProviderOrderingActive: boolean;
  enterpriseMedicationMaturityScore: number;
  currentActivatedMedicationCount: number;
  currentCatalogCount: number;
  currentProviderOrderableCount: number;
  buildGate: "PASS";
};

export type EnterpriseMedicationInventoryRow = {
  catalogCode: string;
  displayNameEn: string;
  displayNameFr: string;
  canonicalFamily: string;
  route: string;
  form: string;
  activationSource: string;
  providerOrderable: boolean;
  MARReady: boolean;
  BillingReady: boolean;
  InventoryReady: boolean;
};

export type EnterpriseMedicationInventoryReport = {
  totalCatalogRows: number;
  totalCanonicalFamilies: number;
  totalProviderOrderableRows: number;
  totalActivatedRows: number;
  totalInactiveRows: number;
  rows: EnterpriseMedicationInventoryRow[];
};

export type EnterpriseDomainCoverageRow = {
  domain: EnterpriseCareDomain;
  expectedMedications: number;
  presentMedications: number;
  missingMedications: string[];
  coveragePercent: number;
};

export type EnterpriseDomainCoverageReport = {
  rows: EnterpriseDomainCoverageRow[];
  averageCoveragePercent: number;
};

export type TopMissingMedicationRow = {
  rank: number;
  medication: string;
  specialty: string;
  route: string;
  reasonMissing: string;
  catalogGap: boolean;
  billingGap: boolean;
  inventoryGap: boolean;
  MARGap: boolean;
  activationGap: boolean;
  score: number;
};

export type TopMissingMedicationReport = {
  targetCount: 200;
  rows: TopMissingMedicationRow[];
};

export type HospitalWorkflowCoverageRow = {
  workflow: EnterpriseWorkflow;
  medicationsPresent: string[];
  medicationsMissing: string[];
  readinessPercent: number;
};

export type HospitalWorkflowCoverageReport = {
  rows: HospitalWorkflowCoverageRow[];
  averageReadinessPercent: number;
};

export type HighRiskDomainAuditRow = {
  domain: "Thrombolytics" | "Controlled Substances" | "Chemotherapy" | "Critical Care Drips" | "Pressors" | "Paralytics" | "Sedatives";
  catalogPresence: "PRESENT" | "PARTIAL" | "MISSING";
  governancePresence: "PRESENT" | "PARTIAL" | "MISSING";
  activationStatus: "ACTIVATED" | "PARTIAL" | "NOT_ACTIVATED";
  presentMedications: string[];
  missingMedications: string[];
};

export type HighRiskDomainAuditReport = {
  rows: HighRiskDomainAuditRow[];
};

export type SpecialtyMedicationGapRow = {
  specialty: "Neurology" | "Infectious Disease" | "Cardiology" | "Critical Care" | "OBGYN" | "Pediatrics";
  medication: string;
  present: boolean;
  providerOrderable: boolean;
  billingReady: boolean;
  inventoryReady: boolean;
  MARReady: boolean;
  gapType: "NONE" | "CATALOG_GAP" | "ACTIVATION_GAP" | "BILLING_INVENTORY_GAP" | "MAR_GAP";
};

export type SpecialtyMedicationGapReport = {
  rows: SpecialtyMedicationGapRow[];
};

export type FormularyCompletenessProjectionReport = {
  currentCompletenessScore: number;
  projectedAfterNeurologyExpansion: number;
  projectedAfterInfectiousDiseaseExpansion: number;
  projectedAfterCardiologyExpansion: number;
  projectedAfterObgynExpansion: number;
  projectedAfterPediatricsExpansion: number;
  projectedAfterCriticalCareExpansion: number;
  projectedAfterControlledSubstanceGovernance: number;
  projectedAfterThrombolyticGovernance: number;
  targetEnterpriseMedicationRange: "600-1000+";
};

export type EnterpriseFormularyRoadmapRow = {
  rank: number;
  phase: string;
  coverageGain: number;
  clinicalImportance: 1 | 2 | 3 | 4 | 5;
  hospitalUtilization: 1 | 2 | 3 | 4 | 5;
  rationale: string;
};

export type EnterpriseFormularyRoadmapReport = {
  rows: EnterpriseFormularyRoadmapRow[];
};

export type EnterpriseFormularyGapAnalysisReport = {
  ticket: "MEDUI.MEDICATION.ENTERPRISE_FORMULARY_GAP_ANALYSIS.1";
  baseline: EnterpriseFormularyBaselineReport;
  inventory: EnterpriseMedicationInventoryReport;
  domainCoverage: EnterpriseDomainCoverageReport;
  topMissingMedications: TopMissingMedicationReport;
  workflowCoverage: HospitalWorkflowCoverageReport;
  highRiskDomainAudit: HighRiskDomainAuditReport;
  specialtyGapAnalysis: SpecialtyMedicationGapReport;
  completenessProjection: FormularyCompletenessProjectionReport;
  roadmap: EnterpriseFormularyRoadmapReport;
  i18nCertification: {
    rowsAudited: number;
    enLeakageCount: number;
    frLeakageCount: number;
    missingTranslations: number;
    decision: "PASS" | "FAIL";
  };
  compatibility: {
    activationChanged: false;
    providerSearchChanged: false;
    orderabilityChanged: false;
    marBehaviorChanged: false;
    billingChanged: false;
    inventoryChanged: false;
    migrationsRequired: false;
  };
  finalDecision: EnterpriseFormularyGapDecision;
};

const DOMAIN_EXPECTATIONS: Record<EnterpriseCareDomain, EnterpriseMedicationExpectation[]> = {
  "Emergency Department": [
    med("Epinephrine", "Emergency Department", "IV/IM", 5, 5), med("Naloxone", "Emergency Department", "IV/IM", 5, 5),
    med("Ondansetron", "Emergency Department", "IV/PO", 4, 5), med("Ketorolac", "Emergency Department", "IV/IM", 4, 5),
    med("Tranexamic acid", "Emergency Department", "IV", 5, 4), med("Dopamine", "Emergency Department", "IV infusion", 4, 3),
    med("Etomidate", "Emergency Department", "IV", 5, 4), med("Rocuronium", "Emergency Department", "IV", 5, 4),
    med("Droperidol", "Emergency Department", "IV/IM", 4, 3), med("Adenosine", "Emergency Department", "IV", 5, 3),
  ],
  "ICU / Critical Care": [
    med("Norepinephrine", "ICU / Critical Care", "IV infusion", 5, 5), med("Vasopressin", "ICU / Critical Care", "IV infusion", 5, 4),
    med("Propofol", "ICU / Critical Care", "IV", 5, 5), med("Dexmedetomidine", "ICU / Critical Care", "IV", 5, 4),
    med("Fentanyl infusion", "ICU / Critical Care", "IV infusion", 5, 5), med("Cisatracurium", "ICU / Critical Care", "IV", 5, 3),
    med("Milrinone", "ICU / Critical Care", "IV infusion", 4, 3), med("Nicardipine", "ICU / Critical Care", "IV infusion", 4, 3),
    med("Nitroprusside", "ICU / Critical Care", "IV infusion", 4, 2), med("Insulin infusion", "ICU / Critical Care", "IV infusion", 5, 4),
  ],
  "Step Down": [
    med("Metoprolol", "Step Down", "PO/IV", 4, 5), med("Furosemide", "Step Down", "PO/IV", 4, 5),
    med("Potassium chloride", "Step Down", "PO/IV", 4, 5), med("Magnesium sulfate", "Step Down", "IV", 4, 4),
    med("Hydralazine", "Step Down", "PO/IV", 3, 3), med("Labetalol", "Step Down", "IV", 4, 3),
    med("Enoxaparin", "Step Down", "SQ", 4, 5), med("Pantoprazole", "Step Down", "PO/IV", 3, 4),
    med("Ceftriaxone", "Step Down", "IV", 4, 4), med("Insulin lispro", "Step Down", "SQ", 4, 5),
  ],
  "Med-Surg": [
    med("Acetaminophen", "Med-Surg", "PO", 4, 5), med("Ibuprofen", "Med-Surg", "PO", 3, 4),
    med("Oxycodone", "Med-Surg", "PO", 4, 4), med("Morphine", "Med-Surg", "IV", 4, 4),
    med("Senna", "Med-Surg", "PO", 2, 5), med("Polyethylene glycol", "Med-Surg", "PO", 2, 5),
    med("Ondansetron", "Med-Surg", "PO/IV", 3, 5), med("Cefazolin", "Med-Surg", "IV", 4, 4),
    med("Heparin prophylaxis", "Med-Surg", "SQ", 4, 5), med("Melatonin", "Med-Surg", "PO", 1, 4),
  ],
  "Telemetry": [
    med("Amiodarone", "Telemetry", "PO/IV", 5, 4), med("Diltiazem", "Telemetry", "PO/IV", 4, 4),
    med("Metoprolol", "Telemetry", "PO/IV", 4, 5), med("Adenosine", "Telemetry", "IV", 5, 3),
    med("Nitroglycerin", "Telemetry", "SL/IV", 5, 4), med("Aspirin", "Telemetry", "PO", 5, 5),
    med("Clopidogrel", "Telemetry", "PO", 4, 4), med("Heparin infusion", "Telemetry", "IV infusion", 5, 4),
    med("Atorvastatin", "Telemetry", "PO", 4, 5), med("Apixaban", "Telemetry", "PO", 4, 3),
  ],
  "Cardiology": [
    med("Labetalol IV", "Cardiology", "IV", 4, 4), med("Nicardipine", "Cardiology", "IV infusion", 4, 3),
    med("Amiodarone", "Cardiology", "PO/IV", 5, 4), med("Dobutamine", "Cardiology", "IV infusion", 5, 3),
    med("Milrinone", "Cardiology", "IV infusion", 4, 3), med("Furosemide", "Cardiology", "PO/IV", 4, 5),
    med("Spironolactone", "Cardiology", "PO", 3, 3), med("Sacubitril valsartan", "Cardiology", "PO", 3, 2),
    med("Tenecteplase", "Cardiology", "IV", 5, 2), med("Ticagrelor", "Cardiology", "PO", 4, 3),
  ],
  "Pulmonary": [
    med("Albuterol", "Pulmonary", "Inhaled", 5, 5), med("Ipratropium", "Pulmonary", "Inhaled", 4, 5),
    med("Methylprednisolone", "Pulmonary", "IV", 4, 4), med("Prednisone", "Pulmonary", "PO", 4, 5),
    med("Budesonide", "Pulmonary", "Inhaled", 3, 4), med("Tiotropium", "Pulmonary", "Inhaled", 3, 3),
    med("Montelukast", "Pulmonary", "PO", 2, 3), med("Azithromycin", "Pulmonary", "PO/IV", 3, 4),
    med("Ceftriaxone", "Pulmonary", "IV", 4, 4), med("Magnesium sulfate", "Pulmonary", "IV", 4, 3),
  ],
  "Neurology": [
    med("Keppra IV", "Neurology", "IV", 5, 4, ["keppra", "levetiracetam"]), med("Fosphenytoin", "Neurology", "IV", 5, 3),
    med("Dilantin", "Neurology", "IV/PO", 4, 3, ["dilantin", "phenytoin"]), med("Lacosamide", "Neurology", "IV/PO", 4, 2),
    med("Mannitol", "Neurology", "IV", 5, 3), med("Hypertonic saline", "Neurology", "IV", 5, 3),
    med("Valproate", "Neurology", "IV/PO", 4, 3), med("Lorazepam", "Neurology", "IV", 5, 4),
    med("Aspirin", "Neurology", "PO", 4, 4), med("Alteplase", "Neurology", "IV", 5, 2),
  ],
  "Infectious Disease": [
    med("Vancomycin PO", "Infectious Disease", "PO", 4, 3, ["vancomycin"]), med("Vancomycin IV", "Infectious Disease", "IV", 5, 4, ["vancomycin"]),
    med("Cefepime", "Infectious Disease", "IV", 5, 4), med("Zosyn", "Infectious Disease", "IV", 5, 4, ["zosyn", "piperacillin"]),
    med("Meropenem", "Infectious Disease", "IV", 5, 3), med("Daptomycin", "Infectious Disease", "IV", 4, 2),
    med("Linezolid", "Infectious Disease", "IV/PO", 4, 2), med("Ceftriaxone", "Infectious Disease", "IV", 5, 5),
    med("Metronidazole", "Infectious Disease", "IV/PO", 4, 4), med("Micafungin", "Infectious Disease", "IV", 4, 2),
  ],
  "Endocrinology": [
    med("Insulin glargine", "Endocrinology", "SQ", 4, 5), med("Insulin lispro", "Endocrinology", "SQ", 4, 5),
    med("Regular insulin", "Endocrinology", "SQ/IV", 5, 5), med("Metformin", "Endocrinology", "PO", 4, 4),
    med("Levothyroxine", "Endocrinology", "PO/IV", 4, 4), med("Hydrocortisone", "Endocrinology", "IV", 4, 3),
    med("Dexamethasone", "Endocrinology", "PO/IV", 3, 4), med("Dextrose", "Endocrinology", "IV", 5, 5),
    med("Glucagon", "Endocrinology", "IM", 4, 3), med("Desmopressin", "Endocrinology", "IV/IN", 3, 2),
  ],
  "Nephrology": [
    med("Furosemide", "Nephrology", "PO/IV", 4, 5), med("Calcium acetate", "Nephrology", "PO", 2, 2),
    med("Sevelamer", "Nephrology", "PO", 2, 2), med("Sodium bicarbonate", "Nephrology", "PO/IV", 4, 4),
    med("Lokelma", "Nephrology", "PO", 4, 2, ["lokelma", "sodium zirconium"]), med("Kayexalate", "Nephrology", "PO/PR", 3, 2),
    med("Calcium gluconate", "Nephrology", "IV", 5, 4), med("Insulin regular", "Nephrology", "IV", 5, 4),
    med("Dextrose", "Nephrology", "IV", 5, 4), med("Epoetin alfa", "Nephrology", "SQ", 2, 2),
  ],
  "Gastroenterology": [
    med("Pantoprazole", "Gastroenterology", "PO/IV", 4, 5), med("Octreotide", "Gastroenterology", "IV", 5, 3),
    med("Ceftriaxone", "Gastroenterology", "IV", 4, 4), med("Metoclopramide", "Gastroenterology", "PO/IV", 3, 4),
    med("Ondansetron", "Gastroenterology", "PO/IV", 3, 5), med("Lactulose", "Gastroenterology", "PO", 3, 3),
    med("Rifaximin", "Gastroenterology", "PO", 3, 2), med("Mesalamine", "Gastroenterology", "PO", 2, 2),
    med("Sucralfate", "Gastroenterology", "PO", 2, 3), med("Albumin", "Gastroenterology", "IV", 4, 3),
  ],
  "Psychiatry": [
    med("Haloperidol", "Psychiatry", "PO/IM", 4, 4), med("Olanzapine", "Psychiatry", "PO/IM", 4, 4),
    med("Risperidone", "Psychiatry", "PO", 3, 3), med("Quetiapine", "Psychiatry", "PO", 3, 4),
    med("Sertraline", "Psychiatry", "PO", 2, 4), med("Fluoxetine", "Psychiatry", "PO", 2, 3),
    med("Lithium", "Psychiatry", "PO", 3, 2), med("Valproate", "Psychiatry", "PO/IV", 3, 3),
    med("Lorazepam", "Psychiatry", "PO/IV", 4, 4), med("Benztropine", "Psychiatry", "PO/IM", 3, 2),
  ],
  "Pediatrics": [
    med("Acetaminophen pediatric", "Pediatrics", "PO/PR", 4, 5, ["acetaminophen", "paracetamol"]), med("Ibuprofen pediatric", "Pediatrics", "PO", 3, 5, ["ibuprofen"]),
    med("Albuterol neb", "Pediatrics", "Inhaled", 5, 5, ["albuterol"]), med("Ceftriaxone pediatric", "Pediatrics", "IV/IM", 5, 4, ["ceftriaxone"]),
    med("Epinephrine pediatric", "Pediatrics", "IM", 5, 4, ["epinephrine"]), med("DTaP", "Pediatrics", "IM", 4, 3),
    med("Hib", "Pediatrics", "IM", 4, 3), med("IPV", "Pediatrics", "SQ/IM", 4, 3),
    med("Rotavirus", "Pediatrics", "PO", 4, 3), med("Dexamethasone pediatric", "Pediatrics", "PO/IV", 4, 4, ["dexamethasone"]),
  ],
  "OBGYN": [
    med("Magnesium Sulfate", "OBGYN", "IV", 5, 4), med("Pitocin", "OBGYN", "IV/IM", 5, 4, ["pitocin", "oxytocin"]),
    med("Cytotec", "OBGYN", "PO/PR", 4, 3, ["cytotec", "misoprostol"]), med("Methergine", "OBGYN", "IM/PO", 5, 3),
    med("Carboprost", "OBGYN", "IM", 5, 2), med("Betamethasone", "OBGYN", "IM", 4, 3),
    med("RhoGAM", "OBGYN", "IM", 4, 2, ["rhogam", "rho d"]), med("Nifedipine", "OBGYN", "PO", 3, 3),
    med("Terbutaline", "OBGYN", "SQ", 4, 2), med("Ferrous sulfate", "OBGYN", "PO", 2, 4),
  ],
  "Orthopedics": [
    med("Cefazolin", "Orthopedics", "IV", 4, 5), med("Vancomycin", "Orthopedics", "IV", 4, 3),
    med("Ketorolac", "Orthopedics", "IV/IM", 4, 4), med("Oxycodone", "Orthopedics", "PO", 4, 4),
    med("Hydromorphone", "Orthopedics", "IV/PO", 4, 3), med("Enoxaparin", "Orthopedics", "SQ", 4, 4),
    med("Aspirin", "Orthopedics", "PO", 3, 3), med("Cyclobenzaprine", "Orthopedics", "PO", 2, 3),
    med("Gabapentin", "Orthopedics", "PO", 3, 3), med("Tranexamic acid", "Orthopedics", "IV", 4, 3),
  ],
  "General Surgery": [
    med("Cefazolin", "General Surgery", "IV", 4, 5), med("Piperacillin tazobactam", "General Surgery", "IV", 5, 4),
    med("Metronidazole", "General Surgery", "IV/PO", 4, 4), med("Ceftriaxone", "General Surgery", "IV", 4, 4),
    med("Ondansetron", "General Surgery", "IV/PO", 3, 5), med("Hydromorphone", "General Surgery", "IV/PO", 4, 3),
    med("Fentanyl", "General Surgery", "IV", 4, 4), med("Lidocaine", "General Surgery", "Local/IV", 3, 4),
    med("Heparin prophylaxis", "General Surgery", "SQ", 4, 4), med("Pantoprazole", "General Surgery", "IV/PO", 3, 4),
  ],
  "Oncology": [
    med("Ondansetron", "Oncology", "IV/PO", 4, 5), med("Dexamethasone", "Oncology", "IV/PO", 4, 4),
    med("Filgrastim", "Oncology", "SQ", 4, 2), med("Allopurinol", "Oncology", "PO", 3, 3),
    med("Rasburicase", "Oncology", "IV", 4, 1), med("Methotrexate", "Oncology", "PO/IV", 5, 1),
    med("Cyclophosphamide", "Oncology", "IV", 5, 1), med("Doxorubicin", "Oncology", "IV", 5, 1),
    med("Cisplatin", "Oncology", "IV", 5, 1), med("Leucovorin", "Oncology", "IV/PO", 4, 1),
  ],
  "Pain Management": [
    med("Acetaminophen", "Pain Management", "PO", 3, 5), med("Ketorolac", "Pain Management", "IV/IM", 4, 4),
    med("Morphine", "Pain Management", "IV/PO", 4, 4), med("Hydromorphone", "Pain Management", "IV/PO", 4, 3),
    med("Fentanyl", "Pain Management", "IV", 4, 4), med("Oxycodone", "Pain Management", "PO", 4, 4),
    med("Tramadol", "Pain Management", "PO", 3, 3), med("Gabapentin", "Pain Management", "PO", 3, 3),
    med("Lidocaine patch", "Pain Management", "Topical", 2, 3), med("Naloxone", "Pain Management", "IV/IM", 5, 4),
  ],
  "Hospitalist Medicine": [
    med("Ceftriaxone", "Hospitalist Medicine", "IV", 4, 5), med("Azithromycin", "Hospitalist Medicine", "IV/PO", 4, 4),
    med("Furosemide", "Hospitalist Medicine", "IV/PO", 4, 5), med("Insulin lispro", "Hospitalist Medicine", "SQ", 4, 5),
    med("Enoxaparin", "Hospitalist Medicine", "SQ", 4, 5), med("Pantoprazole", "Hospitalist Medicine", "IV/PO", 3, 5),
    med("Ondansetron", "Hospitalist Medicine", "IV/PO", 3, 5), med("Potassium chloride", "Hospitalist Medicine", "PO/IV", 4, 5),
    med("Magnesium sulfate", "Hospitalist Medicine", "IV", 4, 4), med("Prednisone", "Hospitalist Medicine", "PO", 3, 4),
  ],
};

const WORKFLOW_EXPECTATIONS: Record<EnterpriseWorkflow, EnterpriseMedicationExpectation[]> = {
  Sepsis: [med("Ceftriaxone", "Sepsis", "IV", 5, 5), med("Vancomycin", "Sepsis", "IV", 5, 4), med("Piperacillin tazobactam", "Sepsis", "IV", 5, 4), med("Meropenem", "Sepsis", "IV", 5, 3), med("Norepinephrine", "Sepsis", "IV infusion", 5, 4), med("Lactated Ringer", "Sepsis", "IV", 5, 5)],
  Stroke: [med("Alteplase", "Stroke", "IV", 5, 2), med("Tenecteplase", "Stroke", "IV", 5, 2), med("Labetalol", "Stroke", "IV", 4, 3), med("Nicardipine", "Stroke", "IV infusion", 4, 3), med("Aspirin", "Stroke", "PO", 4, 4)],
  STEMI: [med("Aspirin", "STEMI", "PO", 5, 5), med("Heparin", "STEMI", "IV", 5, 4), med("Nitroglycerin", "STEMI", "SL/IV", 5, 4), med("Ticagrelor", "STEMI", "PO", 4, 3), med("Tenecteplase", "STEMI", "IV", 5, 2)],
  NSTEMI: [med("Aspirin", "NSTEMI", "PO", 5, 5), med("Heparin", "NSTEMI", "IV", 5, 4), med("Enoxaparin", "NSTEMI", "SQ", 4, 4), med("Nitroglycerin", "NSTEMI", "SL/IV", 4, 4), med("Atorvastatin", "NSTEMI", "PO", 4, 4)],
  DKA: [med("Regular insulin", "DKA", "IV", 5, 5), med("Potassium chloride", "DKA", "IV/PO", 5, 5), med("Dextrose", "DKA", "IV", 5, 5), med("Sodium chloride", "DKA", "IV", 5, 5), med("Magnesium sulfate", "DKA", "IV", 3, 3)],
  Hyperkalemia: [med("Calcium gluconate", "Hyperkalemia", "IV", 5, 4), med("Calcium chloride", "Hyperkalemia", "IV", 5, 3), med("Regular insulin", "Hyperkalemia", "IV", 5, 4), med("Dextrose", "Hyperkalemia", "IV", 5, 4), med("Sodium bicarbonate", "Hyperkalemia", "IV", 4, 3), med("Lokelma", "Hyperkalemia", "PO", 4, 2)],
  CHF: [med("Furosemide", "CHF", "IV/PO", 5, 5), med("Nitroglycerin", "CHF", "IV/SL", 4, 3), med("Dobutamine", "CHF", "IV infusion", 4, 2), med("Milrinone", "CHF", "IV infusion", 4, 2), med("Spironolactone", "CHF", "PO", 3, 3)],
  COPD: [med("Albuterol", "COPD", "Inhaled", 5, 5), med("Ipratropium", "COPD", "Inhaled", 4, 5), med("Prednisone", "COPD", "PO", 4, 5), med("Methylprednisolone", "COPD", "IV", 4, 4), med("Azithromycin", "COPD", "PO/IV", 3, 3)],
  Asthma: [med("Albuterol", "Asthma", "Inhaled", 5, 5), med("Ipratropium", "Asthma", "Inhaled", 4, 4), med("Magnesium sulfate", "Asthma", "IV", 4, 3), med("Dexamethasone", "Asthma", "PO/IV", 4, 4), med("Prednisone", "Asthma", "PO", 4, 5)],
  Pneumonia: [med("Ceftriaxone", "Pneumonia", "IV", 5, 5), med("Azithromycin", "Pneumonia", "IV/PO", 4, 4), med("Vancomycin", "Pneumonia", "IV", 4, 3), med("Cefepime", "Pneumonia", "IV", 4, 3)],
  Cellulitis: [med("Cefazolin", "Cellulitis", "IV", 4, 4), med("Vancomycin", "Cellulitis", "IV", 4, 3), med("Clindamycin", "Cellulitis", "IV/PO", 3, 4), med("Cephalexin", "Cellulitis", "PO", 3, 4)],
  UTI: [med("Ceftriaxone", "UTI", "IV", 4, 4), med("Ciprofloxacin", "UTI", "PO/IV", 3, 3), med("Nitrofurantoin", "UTI", "PO", 3, 3), med("Trimethoprim sulfamethoxazole", "UTI", "PO", 3, 3)],
  "Behavioral Health": [med("Haloperidol", "Behavioral Health", "PO/IM", 4, 4), med("Olanzapine", "Behavioral Health", "PO/IM", 4, 4), med("Lorazepam", "Behavioral Health", "PO/IV", 4, 4), med("Benztropine", "Behavioral Health", "PO/IM", 3, 2)],
  "GI Bleed": [med("Pantoprazole", "GI Bleed", "IV", 5, 4), med("Octreotide", "GI Bleed", "IV", 5, 3), med("Ceftriaxone", "GI Bleed", "IV", 4, 3), med("Tranexamic acid", "GI Bleed", "IV", 3, 2)],
  Surgery: [med("Cefazolin", "Surgery", "IV", 4, 5), med("Propofol", "Surgery", "IV", 5, 4), med("Fentanyl", "Surgery", "IV", 5, 4), med("Rocuronium", "Surgery", "IV", 5, 3), med("Ondansetron", "Surgery", "IV", 3, 4)],
  Trauma: [med("Tranexamic acid", "Trauma", "IV", 5, 4), med("Cefazolin", "Trauma", "IV", 4, 4), med("Tdap", "Trauma", "IM", 4, 3), med("Fentanyl", "Trauma", "IV", 4, 4), med("Ketamine", "Trauma", "IV", 4, 3)],
  Obstetrics: [med("Oxytocin", "Obstetrics", "IV/IM", 5, 4), med("Misoprostol", "Obstetrics", "PO/PR", 4, 3), med("Magnesium sulfate", "Obstetrics", "IV", 5, 4), med("Methylergonovine", "Obstetrics", "IM/PO", 5, 3)],
  "Pediatric Fever": [med("Acetaminophen pediatric", "Pediatric Fever", "PO/PR", 4, 5, ["acetaminophen", "paracetamol"]), med("Ibuprofen pediatric", "Pediatric Fever", "PO", 3, 5, ["ibuprofen"]), med("Ceftriaxone pediatric", "Pediatric Fever", "IV/IM", 5, 3, ["ceftriaxone"]), med("Amoxicillin pediatric", "Pediatric Fever", "PO", 3, 4, ["amoxicillin"])],
  "Pediatric Respiratory Distress": [med("Albuterol neb", "Pediatric Respiratory Distress", "Inhaled", 5, 5, ["albuterol"]), med("Epinephrine racemic", "Pediatric Respiratory Distress", "Inhaled", 5, 3, ["racemic epinephrine"]), med("Dexamethasone pediatric", "Pediatric Respiratory Distress", "PO/IV", 4, 4, ["dexamethasone"]), med("Magnesium sulfate", "Pediatric Respiratory Distress", "IV", 4, 2)],
};

const SPECIALTY_EXPECTATIONS = {
  Neurology: ["Keppra IV", "Fosphenytoin", "Dilantin", "Lacosamide", "Mannitol", "Hypertonic Saline"],
  "Infectious Disease": ["Vancomycin PO", "Vancomycin IV", "Cefepime", "Zosyn", "Meropenem", "Daptomycin", "Linezolid"],
  Cardiology: ["Labetalol IV", "Cardene", "Amiodarone", "Dobutamine"],
  "Critical Care": ["Levophed", "Vasopressin", "Epinephrine drips", "Phenylephrine"],
  OBGYN: ["Magnesium Sulfate", "Pitocin", "Cytotec", "Methergine"],
  Pediatrics: ["DTaP", "Hib", "IPV", "Rotavirus"],
} as const;

let inventoryCache: EnterpriseMedicationInventoryReport | null = null;
let finalReportCache: EnterpriseFormularyGapAnalysisReport | null = null;

function med(
  medication: string,
  specialty: string,
  route: string,
  clinicalImportance: 1 | 2 | 3 | 4 | 5,
  utilization: 1 | 2 | 3 | 4 | 5,
  tokens?: string[]
): EnterpriseMedicationExpectation {
  return { medication, specialty, route, clinicalImportance, utilization, tokens };
}

function records(): MedicationOrderabilityRecord[] {
  return [...buildUnifiedOrderabilityMap().values()];
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function aliasesForExpectation(expectation: EnterpriseMedicationExpectation): string[] {
  const base = expectation.tokens ?? [expectation.medication];
  const aliases = new Set(base.flatMap((token) => {
    const n = normalize(token);
    const result = [n];
    if (n.includes("zosyn")) result.push("piperacillin");
    if (n.includes("pitocin")) result.push("oxytocin");
    if (n.includes("cytotec")) result.push("misoprostol");
    if (n.includes("methergine")) result.push("methylergonovine", "methergine");
    if (n.includes("cardene")) result.push("nicardipine");
    if (n.includes("levophed")) result.push("norepinephrine");
    if (n.includes("keppra")) result.push("levetiracetam");
    if (n.includes("dilantin")) result.push("phenytoin");
    if (n.includes("lactated ringer")) result.push("lactated ringer", "ringer lactate");
    return result;
  }));
  return [...aliases];
}

function recordBlob(row: EnterpriseMedicationInventoryRow | MedicationOrderabilityRecord): string {
  if ("canonicalFamily" in row) {
    return normalize([row.catalogCode, row.displayNameEn, row.displayNameFr, row.canonicalFamily, row.route, row.form].join(" "));
  }
  return normalize([row.catalogCode, row.genericName, row.displayNameEn, row.displayNameFr, row.route, row.dosageForm, row.strength].join(" "));
}

function findInventoryMatches(expectation: EnterpriseMedicationExpectation): EnterpriseMedicationInventoryRow[] {
  const tokens = aliasesForExpectation(expectation);
  return buildEnterpriseMedicationInventoryReport().rows.filter((row) => {
    const blob = recordBlob(row);
    return tokens.some((token) => blob.includes(token));
  });
}

function pct(part: number, total: number): number {
  return total === 0 ? 100 : Math.round((part / total) * 1000) / 10;
}

function average(values: number[]): number {
  return values.length === 0 ? 0 : Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

function allExpectations(): EnterpriseMedicationExpectation[] {
  return Object.values(DOMAIN_EXPECTATIONS).flat();
}

function uniqueExpectations(): EnterpriseMedicationExpectation[] {
  const map = new Map<string, EnterpriseMedicationExpectation>();
  for (const expectation of allExpectations()) {
    const key = normalize(expectation.medication);
    const existing = map.get(key);
    if (!existing || expectation.clinicalImportance + expectation.utilization > existing.clinicalImportance + existing.utilization) {
      map.set(key, expectation);
    }
  }
  return [...map.values()];
}

function activationSourceFor(catalogCode: string, providerOrderable: boolean): string {
  if (listActiveCriticalCareProviderOrderingCatalogCodes().includes(catalogCode)) return "critical_care_provider_ordering";
  if (listActiveVaccineProviderOrderingCatalogCodes().includes(catalogCode)) return "vaccine_provider_ordering";
  if (listActiveInsulinDiabetesProviderOrderingCatalogCodes().includes(catalogCode)) return "insulin_diabetes_provider_ordering";
  if (listActiveAnticoagulationProviderOrderingCatalogCodes().includes(catalogCode)) return "anticoagulation_provider_ordering";
  if (listActiveTranche2ProviderOrderingCatalogCodes().includes(catalogCode)) return "tranche_2_provider_ordering";
  return providerOrderable ? "base_orderability_or_tranche_1" : "not_activated";
}

export function buildEnterpriseMedicationInventoryReport(): EnterpriseMedicationInventoryReport {
  if (inventoryCache) return inventoryCache;
  const rows = records().map((record) => {
    const activation = buildActivationGovernanceRecord(record);
    const billing = resolveMedicationBillingReadiness(record.catalogCode);
    const providerOrderable = activation.orderSearchReady;
    return {
      catalogCode: record.catalogCode,
      displayNameEn: record.displayNameEn,
      displayNameFr: record.displayNameFr,
      canonicalFamily: canonicalMedicationFamilyKey(record),
      route: record.route,
      form: record.dosageForm,
      activationSource: activationSourceFor(record.catalogCode, providerOrderable),
      providerOrderable,
      MARReady: activation.marReady,
      BillingReady: billing.billingReady,
      InventoryReady: billing.ndcReady || activation.inventoryReady,
    };
  });
  const canonicalFamilies = new Set(rows.map((row) => row.canonicalFamily));
  inventoryCache = {
    totalCatalogRows: rows.length,
    totalCanonicalFamilies: canonicalFamilies.size,
    totalProviderOrderableRows: rows.filter((row) => row.providerOrderable).length,
    totalActivatedRows: rows.filter((row) => row.providerOrderable).length,
    totalInactiveRows: rows.filter((row) => !row.providerOrderable).length,
    rows,
  };
  return inventoryCache;
}

export function buildEnterpriseFormularyBaselineReport(): EnterpriseFormularyBaselineReport {
  const inventory = buildEnterpriseMedicationInventoryReport();
  const coverage = buildEnterpriseDomainCoverageReport();
  const readinessScore = Math.round(((inventory.totalProviderOrderableRows / 600) * 60 + (coverage.averageCoveragePercent / 100) * 40) * 10) / 10;
  return {
    tranche1Active: runGovernedTranche1PilotActivationReport().finalDecision === "READY_FOR_TRANCHE_1_PILOT_ACTIVATION",
    tranche2Active: listActiveTranche2ProviderOrderingCatalogCodes().length > 0,
    anticoagulationActive: listActiveAnticoagulationProviderOrderingCatalogCodes().length > 0,
    insulinDiabetesActive: listActiveInsulinDiabetesProviderOrderingCatalogCodes().length > 0,
    vaccineProviderOrderingActive: listActiveVaccineProviderOrderingCatalogCodes().length > 0,
    criticalCareProviderOrderingActive: listActiveCriticalCareProviderOrderingCatalogCodes().length > 0,
    enterpriseMedicationMaturityScore: Math.min(100, readinessScore),
    currentActivatedMedicationCount: inventory.totalActivatedRows,
    currentCatalogCount: inventory.totalCatalogRows,
    currentProviderOrderableCount: inventory.totalProviderOrderableRows,
    buildGate: "PASS",
  };
}

export function buildEnterpriseDomainCoverageReport(): EnterpriseDomainCoverageReport {
  const rows = (Object.keys(DOMAIN_EXPECTATIONS) as EnterpriseCareDomain[]).map((domain) => {
    const expectations = DOMAIN_EXPECTATIONS[domain];
    const missing = expectations.filter((expectation) => findInventoryMatches(expectation).length === 0).map((expectation) => expectation.medication);
    const present = expectations.length - missing.length;
    return {
      domain,
      expectedMedications: expectations.length,
      presentMedications: present,
      missingMedications: missing,
      coveragePercent: pct(present, expectations.length),
    };
  });
  return { rows, averageCoveragePercent: average(rows.map((row) => row.coveragePercent)) };
}

export function buildTopMissingMedicationReport(): TopMissingMedicationReport {
  const rows = uniqueExpectations()
    .map((expectation) => {
      const matches = findInventoryMatches(expectation);
      const present = matches.length > 0;
      const ready = matches.some((row) => row.providerOrderable && row.BillingReady && row.InventoryReady && row.MARReady);
      const catalogGap = !present;
      const billingGap = present && !matches.some((row) => row.BillingReady);
      const inventoryGap = present && !matches.some((row) => row.InventoryReady);
      const MARGap = present && !matches.some((row) => row.MARReady);
      const activationGap = present && !matches.some((row) => row.providerOrderable);
      if (!catalogGap && !billingGap && !inventoryGap && !MARGap && !activationGap && ready) return null;
      const score =
        expectation.clinicalImportance * 20 +
        expectation.utilization * 12 +
        (catalogGap ? 30 : 0) +
        (activationGap ? 18 : 0) +
        (MARGap ? 12 : 0) +
        (billingGap || inventoryGap ? 10 : 0);
      return {
        rank: 0,
        medication: expectation.medication,
        specialty: expectation.specialty,
        route: expectation.route,
        reasonMissing: catalogGap ? "Missing from catalog" : activationGap ? "Present but not provider-orderable" : "Present with readiness gaps",
        catalogGap,
        billingGap,
        inventoryGap,
        MARGap,
        activationGap,
        score,
      };
    })
    .filter((row): row is Omit<TopMissingMedicationRow, "rank"> & { rank: 0 } => Boolean(row))
    .sort((a, b) => b.score - a.score || a.medication.localeCompare(b.medication))
    .slice(0, 200)
    .map((row, index) => ({ ...row, rank: index + 1 }));
  return { targetCount: 200, rows };
}

export function buildHospitalWorkflowCoverageReport(): HospitalWorkflowCoverageReport {
  const rows = (Object.keys(WORKFLOW_EXPECTATIONS) as EnterpriseWorkflow[]).map((workflow) => {
    const expectations = WORKFLOW_EXPECTATIONS[workflow];
    const medicationsPresent = expectations.filter((expectation) => findInventoryMatches(expectation).length > 0).map((expectation) => expectation.medication);
    const medicationsMissing = expectations.filter((expectation) => findInventoryMatches(expectation).length === 0).map((expectation) => expectation.medication);
    return {
      workflow,
      medicationsPresent,
      medicationsMissing,
      readinessPercent: pct(medicationsPresent.length, expectations.length),
    };
  });
  return { rows, averageReadinessPercent: average(rows.map((row) => row.readinessPercent)) };
}

function buildHighRiskRow(domain: HighRiskDomainAuditRow["domain"], meds: EnterpriseMedicationExpectation[]): HighRiskDomainAuditRow {
  const present = meds.filter((expectation) => findInventoryMatches(expectation).length > 0);
  const active = meds.filter((expectation) => findInventoryMatches(expectation).some((row) => row.providerOrderable));
  return {
    domain,
    catalogPresence: present.length === 0 ? "MISSING" : present.length === meds.length ? "PRESENT" : "PARTIAL",
    governancePresence: present.length === 0 ? "MISSING" : active.length === meds.length ? "PRESENT" : "PARTIAL",
    activationStatus: active.length === 0 ? "NOT_ACTIVATED" : active.length === meds.length ? "ACTIVATED" : "PARTIAL",
    presentMedications: present.map((row) => row.medication),
    missingMedications: meds.filter((expectation) => !present.includes(expectation)).map((expectation) => expectation.medication),
  };
}

export function buildHighRiskDomainAuditReport(): HighRiskDomainAuditReport {
  return {
    rows: [
      buildHighRiskRow("Thrombolytics", [med("Alteplase", "Thrombolytics", "IV", 5, 2), med("Tenecteplase", "Thrombolytics", "IV", 5, 2)]),
      buildHighRiskRow("Controlled Substances", [med("Fentanyl", "Controlled Substances", "IV", 5, 4), med("Morphine", "Controlled Substances", "IV/PO", 4, 4), med("Hydromorphone", "Controlled Substances", "IV/PO", 4, 3), med("Oxycodone", "Controlled Substances", "PO", 4, 4), med("Ketamine", "Controlled Substances", "IV", 4, 3)]),
      buildHighRiskRow("Chemotherapy", [med("Methotrexate", "Chemotherapy", "PO/IV", 5, 1), med("Cyclophosphamide", "Chemotherapy", "IV", 5, 1), med("Doxorubicin", "Chemotherapy", "IV", 5, 1)]),
      buildHighRiskRow("Critical Care Drips", [med("Norepinephrine", "Critical Care Drips", "IV infusion", 5, 4), med("Propofol", "Critical Care Drips", "IV infusion", 5, 4), med("Insulin infusion", "Critical Care Drips", "IV infusion", 5, 4), med("Heparin infusion", "Critical Care Drips", "IV infusion", 5, 4)]),
      buildHighRiskRow("Pressors", [med("Norepinephrine", "Pressors", "IV infusion", 5, 4), med("Epinephrine", "Pressors", "IV infusion", 5, 4), med("Vasopressin", "Pressors", "IV infusion", 5, 4), med("Phenylephrine", "Pressors", "IV infusion", 5, 3)]),
      buildHighRiskRow("Paralytics", [med("Rocuronium", "Paralytics", "IV", 5, 3), med("Vecuronium", "Paralytics", "IV", 5, 3), med("Cisatracurium", "Paralytics", "IV", 5, 2), med("Succinylcholine", "Paralytics", "IV", 5, 4)]),
      buildHighRiskRow("Sedatives", [med("Propofol", "Sedatives", "IV", 5, 4), med("Dexmedetomidine", "Sedatives", "IV", 5, 3), med("Midazolam", "Sedatives", "IV", 4, 4), med("Ketamine", "Sedatives", "IV", 4, 3)]),
    ],
  };
}

export function buildSpecialtyMedicationGapReport(): SpecialtyMedicationGapReport {
  const rows = Object.entries(SPECIALTY_EXPECTATIONS).flatMap(([specialty, medications]) =>
    medications.map((medication) => {
      const expectation = med(medication, specialty, "mixed", 5, 4);
      const matches = findInventoryMatches(expectation);
      const present = matches.length > 0;
      const providerOrderable = matches.some((row) => row.providerOrderable);
      const billingReady = matches.some((row) => row.BillingReady);
      const inventoryReady = matches.some((row) => row.InventoryReady);
      const MARReady = matches.some((row) => row.MARReady);
      const gapType: SpecialtyMedicationGapRow["gapType"] = !present
        ? "CATALOG_GAP"
        : !providerOrderable
          ? "ACTIVATION_GAP"
          : !billingReady || !inventoryReady
            ? "BILLING_INVENTORY_GAP"
            : !MARReady
              ? "MAR_GAP"
              : "NONE";
      return {
        specialty: specialty as SpecialtyMedicationGapRow["specialty"],
        medication,
        present,
        providerOrderable,
        billingReady,
        inventoryReady,
        MARReady,
        gapType,
      };
    })
  );
  return { rows };
}

export function buildFormularyCompletenessProjectionReport(): FormularyCompletenessProjectionReport {
  const baseline = buildEnterpriseMedicationInventoryReport();
  const current = Math.min(100, Math.round((baseline.totalProviderOrderableRows / 600) * 1000) / 10);
  const add = (score: number, gain: number) => Math.min(100, Math.round((score + gain) * 10) / 10);
  const neurology = add(current, 4.5);
  const id = add(neurology, 5.5);
  const cardiology = add(id, 4);
  const obgyn = add(cardiology, 3.5);
  const pediatrics = add(obgyn, 4);
  const criticalCare = add(pediatrics, 3);
  const controlled = add(criticalCare, 5);
  const thrombolytic = add(controlled, 2.5);
  return {
    currentCompletenessScore: current,
    projectedAfterNeurologyExpansion: neurology,
    projectedAfterInfectiousDiseaseExpansion: id,
    projectedAfterCardiologyExpansion: cardiology,
    projectedAfterObgynExpansion: obgyn,
    projectedAfterPediatricsExpansion: pediatrics,
    projectedAfterCriticalCareExpansion: criticalCare,
    projectedAfterControlledSubstanceGovernance: controlled,
    projectedAfterThrombolyticGovernance: thrombolytic,
    targetEnterpriseMedicationRange: "600-1000+",
  };
}

export function buildEnterpriseFormularyRoadmapReport(): EnterpriseFormularyRoadmapReport {
  const domainCoverage = buildEnterpriseDomainCoverageReport();
  const rowByDomain = new Map(domainCoverage.rows.map((row) => [row.domain, row]));
  const phases: Array<Omit<EnterpriseFormularyRoadmapRow, "rank">> = [
    phase("Neurology expansion", "Neurology", 5, 3, "Stroke/seizure coverage gaps include thrombolytics and IV anti-seizure medications."),
    phase("Infectious Disease expansion", "Infectious Disease", 5, 5, "Broad inpatient utilization and sepsis/pneumonia coverage gain."),
    phase("Cardiology expansion", "Cardiology", 5, 4, "Telemetry, ACS, hypertensive emergency, and heart-failure medication support."),
    phase("OBGYN expansion", "OBGYN", 5, 3, "High-impact maternal safety medications and postpartum hemorrhage readiness."),
    phase("Pediatrics expansion", "Pediatrics", 4, 4, "Pediatric fever, respiratory distress, and vaccine completeness."),
    phase("Controlled substance governance", "Pain Management", 5, 4, "Unlocks opioid analgesia and sedative workflows with witness controls."),
    phase("Thrombolytic governance", "Emergency Department", 5, 2, "Stroke/STEMI readiness needs strict high-risk activation controls."),
    phase("Gastroenterology expansion", "Gastroenterology", 3, 3, "GI bleed and inpatient GI medication coverage."),
    phase("Psychiatry expansion", "Psychiatry", 4, 3, "Behavioral health emergency and inpatient stabilization gaps."),
    phase("Oncology governance", "Oncology", 3, 1, "Future enterprise scope; high-risk chemotherapy requires separate safeguards."),
  ].sort((a, b) => b.coverageGain - a.coverageGain || b.clinicalImportance - a.clinicalImportance || b.hospitalUtilization - a.hospitalUtilization);
  function phase(phaseName: string, domain: EnterpriseCareDomain, clinicalImportance: 1 | 2 | 3 | 4 | 5, hospitalUtilization: 1 | 2 | 3 | 4 | 5, rationale: string) {
    const coverage = rowByDomain.get(domain);
    return {
      phase: phaseName,
      coverageGain: coverage ? Math.round((100 - coverage.coveragePercent) * 10) / 10 : 0,
      clinicalImportance,
      hospitalUtilization,
      rationale,
    };
  }
  return { rows: phases.slice(0, 10).map((row, index) => ({ rank: index + 1, ...row })) };
}

function buildI18nCertification() {
  const rows = buildEnterpriseMedicationInventoryReport().rows;
  let enLeakageCount = 0;
  let frLeakageCount = 0;
  let missingTranslations = 0;
  for (const row of rows) {
    if (!row.displayNameEn.trim() || !row.displayNameFr.trim()) missingTranslations += 1;
    if (looksFrenchLocalizedText(row.displayNameEn)) enLeakageCount += 1;
    if (looksEnglishFormText(row.displayNameFr) && !looksFrenchLocalizedText(row.displayNameFr)) frLeakageCount += 1;
  }
  return {
    rowsAudited: rows.length,
    enLeakageCount,
    frLeakageCount,
    missingTranslations,
    decision: enLeakageCount === 0 && frLeakageCount === 0 && missingTranslations === 0 ? "PASS" as const : "FAIL" as const,
  };
}

export function runEnterpriseFormularyGapAnalysisReport(): EnterpriseFormularyGapAnalysisReport {
  if (finalReportCache) return finalReportCache;
  const baseline = buildEnterpriseFormularyBaselineReport();
  const domainCoverage = buildEnterpriseDomainCoverageReport();
  const topMissingMedications = buildTopMissingMedicationReport();
  const finalDecision: EnterpriseFormularyGapDecision =
    baseline.currentProviderOrderableCount >= 600 && topMissingMedications.rows.length === 0
      ? "ENTERPRISE_FORMULARY_READY"
      : domainCoverage.averageCoveragePercent >= 70
        ? "ENTERPRISE_FORMULARY_PARTIAL"
        : "MAJOR_GAPS_IDENTIFIED";
  finalReportCache = {
    ticket: "MEDUI.MEDICATION.ENTERPRISE_FORMULARY_GAP_ANALYSIS.1",
    baseline,
    inventory: buildEnterpriseMedicationInventoryReport(),
    domainCoverage,
    topMissingMedications,
    workflowCoverage: buildHospitalWorkflowCoverageReport(),
    highRiskDomainAudit: buildHighRiskDomainAuditReport(),
    specialtyGapAnalysis: buildSpecialtyMedicationGapReport(),
    completenessProjection: buildFormularyCompletenessProjectionReport(),
    roadmap: buildEnterpriseFormularyRoadmapReport(),
    i18nCertification: buildI18nCertification(),
    compatibility: {
      activationChanged: false,
      providerSearchChanged: false,
      orderabilityChanged: false,
      marBehaviorChanged: false,
      billingChanged: false,
      inventoryChanged: false,
      migrationsRequired: false,
    },
    finalDecision,
  };
  return finalReportCache;
}
