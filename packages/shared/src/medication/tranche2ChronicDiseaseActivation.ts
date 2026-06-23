/**
 * MEDUI.MEDICATION.EXPANSION_TRANCHE_2_CHRONIC_DISEASE.1
 * Governed Tranche 2 chronic disease activation — audit, duplicate safety, and simulation only.
 * Does NOT modify production order search or persist activation state.
 */

import {
  certifyMedicationActivation,
  runGovernedActivationFramework,
  type PerMedicationActivationCertification,
} from "./medicationActivationCertification.js";
import { buildActivationGovernanceRecord, type MedicationActivationGovernanceRecord } from "./medicationActivationGovernance.js";
import { resolveMedicationBillingReadiness } from "./medicationActivationBillingReadiness.js";
import {
  classifyTrancheV2,
  isSafeForActivationWithoutEngineering,
} from "./medicationActivationExpansionRoadmapV2.js";
import { certifyMedicationI18nSafety } from "./medicationActivationI18nCertification.js";
import { buildUnifiedOrderabilityMap } from "./medicationOrderabilityCertification.js";
import type { MedicationOrderabilityRecord } from "./medicationOrderabilityGovernance.js";
import { buildMedicationEngineMaturityReport } from "./providerMedicationCatalogMaturityAudit.js";
import { certifyTdapGovernance } from "./tdapGovernanceCertification.js";
import {
  looksEnglishFormText,
  looksFrenchLocalizedText,
} from "./medicationLocalizationValidation.js";
import { medicationInnFromCatalogCode } from "./medicationOrderIdentity.js";
import { ENTERPRISE_WAVE1_FORMULARY_BY_CODE } from "./enterpriseWave1FormularyManifest.js";
import { ENTERPRISE_WAVE2_FORMULARY_BY_CODE } from "./enterpriseWave2FormularyManifest.js";
import { ENTERPRISE_WAVE3_FORMULARY_BY_CODE } from "./enterpriseWave3FormularyManifest.js";
import { ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_BY_CODE } from "./enterpriseWave4EdHospitalFormularyManifest.js";
import {
  buildMedicationEngineMaturityProjectionReport as buildTranche1MaturityProjection,
  simulateTranche1Activation,
} from "./tranche1GovernedActivation.js";
import { TDAP_CATALOG_CODE } from "./tdapVaccineAdministration.js";

export type Tranche2EligibilityResult = "PASS" | "FAIL";

export type ChronicDiseaseDomainId =
  | "HYPERTENSION"
  | "HEART_FAILURE_MAINTENANCE"
  | "HYPERLIPIDEMIA"
  | "TYPE_2_DIABETES_NON_INSULIN"
  | "THYROID"
  | "GERD"
  | "COPD_MAINTENANCE"
  | "ASTHMA_MAINTENANCE"
  | "CKD_MAINTENANCE"
  | "OSTEOPOROSIS"
  | "GOUT_MAINTENANCE"
  | "ALLERGY_RHINITIS"
  | "UNCLASSIFIED_CHRONIC";

export type ChronicDiseaseDomainStatus = "READY" | "PARTIAL" | "REVIEW_REQUIRED" | "MISSING";

export type DuplicateActivationRiskClass =
  | "SAFE_DISTINCT"
  | "TRUE_DUPLICATE_BLOCK"
  | "ALIAS_COLLISION_REVIEW"
  | "ALREADY_ORDERABLE_EQUIVALENT_BLOCK"
  | "VALID_MULTI_STRENGTH_ALLOW"
  | "VALID_MULTI_ROUTE_ALLOW"
  | "NEEDS_PHARMACY_REVIEW";

export type Tranche2CandidateDiscoveryReport = {
  totalCandidates: number;
  byDiseaseDomain: Record<ChronicDiseaseDomainId, number>;
  alreadyOrderable: number;
  potentiallyActivatable: number;
  excludedHighRisk: number;
  excludedDuplicate: number;
  excludedMissingRouteFormStrength: number;
  excludedMissingI18n: number;
  excludedMissingBillingInventory: number;
  candidates: Tranche2DiscoveryRow[];
};

export type Tranche2DiscoveryRow = {
  catalogCode: string;
  displayNameEn: string;
  diseaseDomains: ChronicDiseaseDomainId[];
  currentStatus: string;
  alreadyOrderable: boolean;
  potentiallyActivatable: boolean;
  exclusionReasons: string[];
};

export type DuplicateActivationRiskRow = {
  catalogCode: string;
  displayNameEn: string;
  normalizedMedicationKey: string;
  normalizedGenericStrengthRouteKey: string;
  classification: DuplicateActivationRiskClass;
  relatedCatalogCodes: string[];
  notes: string;
  blocksActivation: boolean;
};

export type DuplicateActivationRiskReport = {
  totalAudited: number;
  byClassification: Record<DuplicateActivationRiskClass, number>;
  activationBlockedCount: number;
  rows: DuplicateActivationRiskRow[];
};

export type Tranche2EligibilityCertificationRow = {
  catalogCode: string;
  displayNameEn: string;
  result: Tranche2EligibilityResult;
  blockers: string[];
};

export type Tranche2EligibilityCertificationReport = {
  totalEvaluated: number;
  passCount: number;
  failCount: number;
  passCohort: Tranche2EligibilityCertificationRow[];
  failCohort: Tranche2EligibilityCertificationRow[];
  blockerReasonCounts: Record<string, number>;
};

export type Tranche2ActivationSimulationRow = {
  catalogCode: string;
  displayNameEn: string;
  before: { orderSearchEnabled: false };
  after: { orderSearchEnabled: true };
};

export type Tranche2ActivationSimulationReport = {
  simulatedCount: number;
  rows: Tranche2ActivationSimulationRow[];
  warnings: string[];
  note: string;
};

export type ProviderSearchSafetyCertificationReport = {
  blockedCategories: string[];
  wouldExposeBlockedMed: boolean;
  wouldExposeDuplicateEquivalent: boolean;
  exposedBlockedMeds: string[];
  exposedDuplicateEquivalents: string[];
  decision: "SAFE" | "UNSAFE";
};

export type ChronicDiseaseCoverageDomainRow = {
  domain: ChronicDiseaseDomainId;
  beforeOrderableCount: number;
  afterSimulatedOrderableCount: number;
  stillMissing: number;
  stillRestricted: number;
  maturityImpact: string;
  status: ChronicDiseaseDomainStatus;
};

export type ChronicDiseaseCoverageImpactReport = {
  domains: ChronicDiseaseCoverageDomainRow[];
};

export type Tranche2I18nCertificationReport = {
  decision: "PASS" | "FAIL";
  blockers: string[];
  candidateRows: {
    catalogCode: string;
    displayNameEn: string;
    displayNameFr: string;
    enNoFrLeakage: boolean;
    frNoEnLeakage: boolean;
  }[];
};

export type Tranche2OperationalReadinessRow = {
  catalogCode: string;
  displayNameEn: string;
  billingReady: boolean;
  ndcReady: boolean;
  inventoryReady: boolean;
  marReady: boolean;
  route: string;
  pass: boolean;
  blockers: string[];
};

export type Tranche2OperationalReadinessReport = {
  totalCandidates: number;
  passCount: number;
  failCount: number;
  rows: Tranche2OperationalReadinessRow[];
};

export type Tranche2MaturityProjectionReport = {
  baselineAfterTranche1: number;
  postTranche2Maturity: number;
  targetMaturity: number;
  gapRemaining: number;
  orderableAfterTranche1: number;
  orderableAfterTranche2Projected: number;
  remainingBlockers: string[];
};

export type Tranche2CertificationDecision =
  | "READY_FOR_GOVERNED_ACTIVATION"
  | "READY_FOR_PROVIDER_ORDERING_WITH_PHARMACY_REVIEW_VISIBILITY"
  | "NOT_READY";

export type Tranche2CertificationReport = {
  ticket: "MEDUI.MEDICATION.EXPANSION_TRANCHE_2_CHRONIC_DISEASE.1";
  generatedAt: string;
  candidateDiscovery: Tranche2CandidateDiscoveryReport;
  duplicateRisk: DuplicateActivationRiskReport;
  eligibilityCertification: Tranche2EligibilityCertificationReport;
  activationSimulation: Tranche2ActivationSimulationReport;
  providerSearchSafety: ProviderSearchSafetyCertificationReport;
  chronicDiseaseCoverage: ChronicDiseaseCoverageImpactReport;
  i18nCertification: Tranche2I18nCertificationReport;
  operationalReadiness: Tranche2OperationalReadinessReport;
  maturityProjection: Tranche2MaturityProjectionReport;
  decision: Tranche2CertificationDecision;
  decisionBlockers: string[];
};

const TRANCHE2_BLOCKED_TOKENS = [
  "morphine",
  "fentanyl",
  "oxycodone",
  "hydromorphone",
  "lorazepam",
  "midazolam",
  "diazepam",
  "alprazolam",
  "clonazepam",
  "alteplase",
  "tenecteplase",
  "norepinephrine",
  "epinephrine",
  "phenylephrine",
  "vasopressin",
  "dopamine",
  "dobutamine",
  "rocuronium",
  "vecuronium",
  "succinylcholine",
  "warfarin",
  "heparin",
  "enoxaparin",
  "apixaban",
  "rivaroxaban",
  "dabigatran",
  "edoxaban",
  "cyclophosphamide",
  "doxorubicin",
  "methotrexate",
  "propofol",
  "ketamine",
  "insulin drip",
  "insulin infusion",
  "semaglutide",
  "tirzepatide",
  "liraglutide",
  "dulaglutide",
] as const;

const PROVIDER_SEARCH_BLOCKED_CATEGORIES = [
  "duplicates",
  "controlled substances",
  "high-risk meds",
  "pressors",
  "thrombolytics",
  "anticoagulants requiring monitoring",
  "insulin infusions",
  "sedatives",
  "paralytics",
  "vaccines",
  "chemotherapy",
] as const;

const DOMAIN_TOKEN_MAP: Record<Exclude<ChronicDiseaseDomainId, "UNCLASSIFIED_CHRONIC">, string[]> = {
  HYPERTENSION: [
    "lisinopril",
    "losartan",
    "amlodipine",
    "hydrochlorothiazide",
    "metoprolol",
    "carvedilol",
    "atenolol",
    "bisoprolol",
    "diltiazem",
    "verapamil",
    "valsartan",
    "enalapril",
    "ramipril",
    "nifedipine",
    "labetalol",
  ],
  HEART_FAILURE_MAINTENANCE: [
    "carvedilol",
    "metoprolol",
    "lisinopril",
    "losartan",
    "spironolactone",
    "furosemide",
    "torsemide",
    "sacubitril",
    "empagliflozin",
    "dapagliflozin",
  ],
  HYPERLIPIDEMIA: ["simvastatin", "atorvastatin", "rosuvastatin", "pravastatin", "ezetimibe", "fenofibrate"],
  TYPE_2_DIABETES_NON_INSULIN: [
    "metformin",
    "glipizide",
    "glyburide",
    "glimepiride",
    "sitagliptin",
    "empagliflozin",
    "dapagliflozin",
    "pioglitazone",
    "acarbose",
  ],
  THYROID: ["levothyroxine", "methimazole", "propylthiouracil"],
  GERD: ["omeprazole", "pantoprazole", "famotidine", "ranitidine", "lansoprazole", "esomeprazole", "sucralfate"],
  COPD_MAINTENANCE: [
    "tiotropium",
    "umeclidinium",
    "budesonide",
    "beclometasone",
    "fluticasone",
    "ipratropium",
    "salmeterol",
    "formoterol",
  ],
  ASTHMA_MAINTENANCE: [
    "budesonide",
    "beclometasone",
    "fluticasone",
    "montelukast",
    "salbutamol",
    "albuterol",
    "ipratropium",
  ],
  CKD_MAINTENANCE: [
    "lisinopril",
    "losartan",
    "sevelamer",
    "calcium carbonate",
    "sodium bicarbonate",
    "ergocalciferol",
    "cholecalciferol",
  ],
  OSTEOPOROSIS: ["calcium", "cholecalciferol", "ergocalciferol", "alendronate", "risedronate", "ibandronate"],
  GOUT_MAINTENANCE: ["allopurinol", "febuxostat", "colchicine"],
  ALLERGY_RHINITIS: ["cetirizine", "loratadine", "fexofenadine", "fluticasone nasal", "mometasone"],
};

const GLP1_INJECTION_CERTIFIED = false;

function normalizeToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeStrength(strength: string): string {
  return strength.trim().toLowerCase().replace(/\s+/g, "");
}

function normalizeRoute(route: string): string {
  const r = normalizeToken(route);
  if (r === "orale" || r === "oral" || r === "po") return "oral";
  if (r.includes("intravenous") || r === "iv") return "intravenous";
  if (r.includes("inhal")) return "inhalation";
  if (r.includes("inject")) return "injectable";
  return r;
}

function normalizeDoseForm(form: string): string {
  const f = normalizeToken(form);
  if (f.includes("comprim") || f.includes("tablet")) return "tablet";
  if (f.includes("gelule") || f.includes("capsule")) return "capsule";
  if (f.includes("suspension") || f.includes("sirop")) return "liquid";
  if (f.includes("inject")) return "injectable";
  return f;
}

export function extractGenericName(
  record: MedicationActivationGovernanceRecord,
  legacyByCode?: Map<string, MedicationOrderabilityRecord>
): string {
  const wave1 = ENTERPRISE_WAVE1_FORMULARY_BY_CODE[record.catalogCode];
  if (wave1?.genericName?.trim()) return normalizeToken(wave1.genericName);
  const legacy =
    legacyByCode?.get(record.catalogCode) ?? governanceContext().legacyByCode.get(record.catalogCode);
  if (legacy?.genericName?.trim()) return normalizeToken(legacy.genericName);
  const inn = medicationInnFromCatalogCode(record.catalogCode);
  return inn ? normalizeToken(inn) : normalizeToken(record.displayNameEn);
}

export function normalizedMedicationKey(record: MedicationActivationGovernanceRecord): string {
  return [
    normalizeToken(record.displayNameEn),
    normalizeStrength(record.strength),
    normalizeDoseForm(record.doseForm),
    normalizeRoute(record.route),
  ].join("|");
}

export function normalizedGenericStrengthRouteKey(
  record: MedicationActivationGovernanceRecord,
  legacyByCode?: Map<string, MedicationOrderabilityRecord>
): string {
  return [
    extractGenericName(record, legacyByCode),
    normalizeStrength(record.strength),
    normalizeDoseForm(record.doseForm),
    normalizeRoute(record.route),
  ].join("|");
}

function buildGovernanceContextInner() {
  const legacyMap = buildUnifiedOrderabilityMap();
  const records = [...legacyMap.values()].map(buildActivationGovernanceRecord);
  const certifications = records.map(certifyMedicationActivation);
  const certByCode = new Map(certifications.map((c) => [c.catalogCode, c]));
  const recordByCode = new Map(records.map((r) => [r.catalogCode, r]));
  const legacyByCode = new Map([...legacyMap.entries()]);
  return { records, certifications, certByCode, recordByCode, legacyByCode, legacyMap };
}

let governanceContextCache: ReturnType<typeof buildGovernanceContextInner> | null = null;

function governanceContext() {
  if (!governanceContextCache) governanceContextCache = buildGovernanceContextInner();
  return governanceContextCache;
}

/** Clears in-memory governance cache (tests only). */
export function resetTranche2GovernanceContextCache(): void {
  governanceContextCache = null;
}

function tranche2Pool(records: MedicationActivationGovernanceRecord[]): MedicationActivationGovernanceRecord[] {
  return records.filter((r) => classifyTrancheV2(r) === "TRANCHE_2_CHRONIC_DISEASE");
}

function tranche2ActivationCandidates(records: MedicationActivationGovernanceRecord[]): MedicationActivationGovernanceRecord[] {
  return tranche2Pool(records).filter((r) => r.status !== "ORDERABLE");
}

function recordBlob(record: MedicationActivationGovernanceRecord): string {
  return [record.displayNameEn, record.displayNameFr, record.catalogCode, record.route, record.doseForm]
    .join(" ")
    .toLowerCase();
}

function matchesBlockedToken(blob: string): string | null {
  for (const token of TRANCHE2_BLOCKED_TOKENS) {
    if (blob.includes(token)) return token;
  }
  return null;
}

export function classifyChronicDiseaseDomains(record: MedicationActivationGovernanceRecord): ChronicDiseaseDomainId[] {
  const blob = recordBlob(record);
  const domains: ChronicDiseaseDomainId[] = [];
  for (const [domain, tokens] of Object.entries(DOMAIN_TOKEN_MAP) as [
    Exclude<ChronicDiseaseDomainId, "UNCLASSIFIED_CHRONIC">,
    string[],
  ][]) {
    if (tokens.some((t) => blob.includes(t))) domains.push(domain);
  }
  if (domains.length === 0) domains.push("UNCLASSIFIED_CHRONIC");
  return domains;
}

function isGlp1Injection(record: MedicationActivationGovernanceRecord): boolean {
  const blob = recordBlob(record);
  const injectable =
    record.route.toLowerCase().includes("inject") || record.doseForm.toLowerCase().includes("inject");
  return injectable && ["semaglutide", "tirzepatide", "liraglutide", "dulaglutide"].some((t) => blob.includes(t));
}

function isAnticoagulantRequiringMonitoring(record: MedicationActivationGovernanceRecord): boolean {
  const blob = recordBlob(record);
  const tokens = ["warfarin", "apixaban", "rivaroxaban", "dabigatran", "edoxaban", "heparin", "enoxaparin"];
  return tokens.some((t) => blob.includes(t)) || record.requiresClinicalReview && record.highRiskFlag;
}

type EnterpriseAliasValue = string | { text: string };
type EnterpriseAliasEntry = { aliases?: readonly EnterpriseAliasValue[] };

function aliasTexts(entry: EnterpriseAliasEntry | undefined): string[] {
  return (entry?.aliases ?? []).map((alias) => normalizeToken(typeof alias === "string" ? alias : alias.text));
}

function brandAliasesFor(record: MedicationActivationGovernanceRecord): string[] {
  return [
    ...aliasTexts(ENTERPRISE_WAVE1_FORMULARY_BY_CODE[record.catalogCode]),
    ...aliasTexts(ENTERPRISE_WAVE2_FORMULARY_BY_CODE[record.catalogCode] as EnterpriseAliasEntry | undefined),
    ...aliasTexts(ENTERPRISE_WAVE3_FORMULARY_BY_CODE[record.catalogCode] as EnterpriseAliasEntry | undefined),
    ...aliasTexts(ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_BY_CODE[record.catalogCode] as EnterpriseAliasEntry | undefined),
  ];
}

function ndcFor(record: MedicationActivationGovernanceRecord): string | null {
  return resolveMedicationBillingReadiness(record.catalogCode).ndc11;
}

function duplicateBlocksActivation(classification: DuplicateActivationRiskClass): boolean {
  return classification === "TRUE_DUPLICATE_BLOCK" || classification === "ALREADY_ORDERABLE_EQUIVALENT_BLOCK";
}

export function auditMedicationDuplicateActivationRisk(
  candidates?: MedicationActivationGovernanceRecord[]
): DuplicateActivationRiskReport {
  const { records, legacyByCode } = governanceContext();
  const pool = candidates ?? tranche2ActivationCandidates(records);
  const allRecords = records;
  const orderableByGsr = new Map<string, MedicationActivationGovernanceRecord[]>();
  const allByGsr = new Map<string, MedicationActivationGovernanceRecord[]>();
  const allByMedKey = new Map<string, MedicationActivationGovernanceRecord[]>();
  const ndcToCodes = new Map<string, string[]>();

  for (const record of allRecords) {
    const gsr = normalizedGenericStrengthRouteKey(record, legacyByCode);
    const medKey = normalizedMedicationKey(record);
    allByGsr.set(gsr, [...(allByGsr.get(gsr) ?? []), record]);
    allByMedKey.set(medKey, [...(allByMedKey.get(medKey) ?? []), record]);
    if (record.status === "ORDERABLE") {
      orderableByGsr.set(gsr, [...(orderableByGsr.get(gsr) ?? []), record]);
    }
    const ndc = ndcFor(record);
    if (ndc) ndcToCodes.set(ndc, [...(ndcToCodes.get(ndc) ?? []), record.catalogCode]);
  }

  const codeCounts = new Map<string, number>();
  for (const r of pool) codeCounts.set(r.catalogCode, (codeCounts.get(r.catalogCode) ?? 0) + 1);

  const rows: DuplicateActivationRiskRow[] = pool.map((candidate) => {
    const gsr = normalizedGenericStrengthRouteKey(candidate, legacyByCode);
    const medKey = normalizedMedicationKey(candidate);
    const gsrPeers = (allByGsr.get(gsr) ?? []).filter((p) => p.catalogCode !== candidate.catalogCode);
    const medKeyPeers = (allByMedKey.get(medKey) ?? []).filter((p) => p.catalogCode !== candidate.catalogCode);
    const orderablePeers = (orderableByGsr.get(gsr) ?? []).filter((p) => p.catalogCode !== candidate.catalogCode);
    const related = new Set<string>();

    let classification: DuplicateActivationRiskClass = "SAFE_DISTINCT";
    let notes = "No duplicate activation risk detected";

    if ((codeCounts.get(candidate.catalogCode) ?? 0) > 1) {
      classification = "TRUE_DUPLICATE_BLOCK";
      notes = "Exact duplicate catalog code in candidate pool";
      related.add(candidate.catalogCode);
    } else if (candidate.catalogSource === "both") {
      classification = "ALREADY_ORDERABLE_EQUIVALENT_BLOCK";
      related.add(candidate.catalogCode);
      notes = "Haiti + Enterprise overlap for the same catalog row must not be double-activated";
    } else if (orderablePeers.length > 0) {
      classification = "ALREADY_ORDERABLE_EQUIVALENT_BLOCK";
      orderablePeers.forEach((p) => related.add(p.catalogCode));
      notes = "Equivalent generic/strength/form/route already orderable";
    } else if (gsrPeers.length > 0) {
      const sameStrengthPeers = gsrPeers.filter(
        (p) =>
          normalizeStrength(p.strength) === normalizeStrength(candidate.strength) &&
          normalizeDoseForm(p.doseForm) === normalizeDoseForm(candidate.doseForm) &&
          normalizeRoute(p.route) === normalizeRoute(candidate.route)
      );
      if (sameStrengthPeers.length > 0) {
        const haitiEnterpriseOverlap = sameStrengthPeers.some(
          (p) =>
            (candidate.catalogSource === "both" || p.catalogSource === "both") &&
            candidate.catalogSource !== p.catalogSource
        );
        sameStrengthPeers.forEach((p) => related.add(p.catalogCode));
        if (haitiEnterpriseOverlap) {
          classification = "TRUE_DUPLICATE_BLOCK";
          notes = "Haiti + Enterprise equivalent row exists for same generic/strength/form/route";
        } else {
          classification = "TRUE_DUPLICATE_BLOCK";
          notes = "Same generic + strength + form + route with different catalog code";
        }
      }
    } else if (medKeyPeers.length > 0) {
      medKeyPeers.forEach((p) => related.add(p.catalogCode));
      classification = "TRUE_DUPLICATE_BLOCK";
      notes = "Same EN display + strength + form + route with different catalog code";
    }

    const ndc = ndcFor(candidate);
    if (ndc) {
      const ndcPeers = (ndcToCodes.get(ndc) ?? []).filter((c) => c !== candidate.catalogCode);
      const orderableNdc = ndcPeers.filter((c) => recordByCodeFrom(allRecords, c)?.status === "ORDERABLE");
      if (orderableNdc.length > 0 && classification === "SAFE_DISTINCT") {
        classification = "ALREADY_ORDERABLE_EQUIVALENT_BLOCK";
        orderableNdc.forEach((c) => related.add(c));
        notes = "Same NDC linked to orderable catalog row";
      } else if (ndcPeers.length > 0 && classification === "SAFE_DISTINCT") {
        classification = "TRUE_DUPLICATE_BLOCK";
        ndcPeers.forEach((c) => related.add(c));
        notes = "Same NDC linked to multiple catalog rows";
      }
    }

    const aliases = brandAliasesFor(candidate);
    if (classification === "SAFE_DISTINCT" && aliases.length > 0) {
      const aliasHits = allRecords.filter((r) => {
        if (r.catalogCode === candidate.catalogCode) return false;
        const otherAliases = brandAliasesFor(r);
        const otherGeneric = extractGenericName(r, legacyByCode);
        return aliases.some((a) => a === otherGeneric || otherAliases.includes(a));
      });
      if (aliasHits.length > 0) {
        const sameGsr = aliasHits.filter((h) => normalizedGenericStrengthRouteKey(h) === gsr);
        if (sameGsr.length > 0) {
          classification = "ALIAS_COLLISION_REVIEW";
          sameGsr.forEach((h) => related.add(h.catalogCode));
          notes = "Brand/generic alias collision with equivalent row";
        }
      }
    }

    if (classification === "SAFE_DISTINCT") {
      const generic = extractGenericName(candidate, legacyByCode);
      const sameGeneric = allRecords.filter(
        (r) =>
          r.catalogCode !== candidate.catalogCode &&
          extractGenericName(r, legacyByCode) === generic &&
          normalizeRoute(r.route) !== normalizeRoute(candidate.route)
      );
      if (sameGeneric.length > 0) {
        classification = "VALID_MULTI_ROUTE_ALLOW";
        sameGeneric.forEach((r) => related.add(r.catalogCode));
        notes = "Same generic with different route — distinct activation allowed";
      } else {
        const sameGenericDiffStrength = allRecords.filter(
          (r) =>
            r.catalogCode !== candidate.catalogCode &&
            extractGenericName(r, legacyByCode) === generic &&
            normalizeRoute(r.route) === normalizeRoute(candidate.route) &&
            normalizeStrength(r.strength) !== normalizeStrength(candidate.strength)
        );
        if (sameGenericDiffStrength.length > 0) {
          classification = "VALID_MULTI_STRENGTH_ALLOW";
          sameGenericDiffStrength.forEach((r) => related.add(r.catalogCode));
          notes = "Same generic with different valid strength — distinct activation allowed";
        }
      }
    }

    if (classification === "SAFE_DISTINCT" && candidate.requiresPharmacyReview) {
      classification = "NEEDS_PHARMACY_REVIEW";
      notes = "Pharmacy review flag present — distinct but requires review";
    }

    return {
      catalogCode: candidate.catalogCode,
      displayNameEn: candidate.displayNameEn,
      normalizedMedicationKey: medKey,
      normalizedGenericStrengthRouteKey: gsr,
      classification,
      relatedCatalogCodes: [...related],
      notes,
      blocksActivation: duplicateBlocksActivation(classification),
    };
  });

  const byClassification = {} as Record<DuplicateActivationRiskClass, number>;
  for (const c of [
    "SAFE_DISTINCT",
    "TRUE_DUPLICATE_BLOCK",
    "ALIAS_COLLISION_REVIEW",
    "ALREADY_ORDERABLE_EQUIVALENT_BLOCK",
    "VALID_MULTI_STRENGTH_ALLOW",
    "VALID_MULTI_ROUTE_ALLOW",
    "NEEDS_PHARMACY_REVIEW",
  ] as DuplicateActivationRiskClass[]) {
    byClassification[c] = rows.filter((r) => r.classification === c).length;
  }

  return {
    totalAudited: rows.length,
    byClassification,
    activationBlockedCount: rows.filter((r) => r.blocksActivation).length,
    rows,
  };
}

function recordByCodeFrom(
  records: MedicationActivationGovernanceRecord[],
  code: string
): MedicationActivationGovernanceRecord | undefined {
  return records.find((r) => r.catalogCode === code);
}

function duplicateBlockSet(report: DuplicateActivationRiskReport): Set<string> {
  return new Set(report.rows.filter((r) => r.blocksActivation).map((r) => r.catalogCode));
}

export function certifyTranche2ChronicDiseaseEligibility(
  record: MedicationActivationGovernanceRecord,
  cert: PerMedicationActivationCertification,
  duplicateBlocked: Set<string>
): Tranche2EligibilityCertificationRow {
  const blockers: string[] = [];
  const blob = recordBlob(record);

  if (classifyTrancheV2(record) !== "TRANCHE_2_CHRONIC_DISEASE") blockers.push("NOT_TRANCHE_2_CHRONIC_DISEASE");
  if (record.status === "ORDERABLE") blockers.push("ALREADY_ORDERABLE");
  if (duplicateBlocked.has(record.catalogCode)) blockers.push("DUPLICATE_ACTIVATION_BLOCKED");

  if (!record.catalogCode.trim()) blockers.push("CATALOG_ROW_MISSING");
  if (!record.displayNameEn.trim()) blockers.push("DISPLAY_NAME_EN_MISSING");
  if (!record.displayNameFr.trim()) blockers.push("DISPLAY_NAME_FR_MISSING");
  if (looksFrenchLocalizedText(record.displayNameEn)) blockers.push("EN_FR_LEAKAGE");
  if (looksEnglishFormText(record.displayNameFr) && !looksFrenchLocalizedText(record.displayNameFr)) {
    blockers.push("FR_EN_LEAKAGE");
  }
  if (!record.strength.trim()) blockers.push("STRENGTH_MISSING");
  if (!record.doseForm.trim()) blockers.push("DOSE_FORM_MISSING");
  if (!record.route.trim()) blockers.push("ROUTE_MISSING");

  if (record.enterpriseWave && (!record.billingReady || !record.ndcReady)) blockers.push("BILLING_NOT_READY");
  if (record.enterpriseWave && !record.inventoryReady) blockers.push("INVENTORY_NOT_COMPATIBLE");
  if (!record.marReady) blockers.push("MAR_NOT_READY");

  if (record.controlledSubstanceFlag) blockers.push("CONTROLLED_SUBSTANCE");
  if (record.highRiskFlag) blockers.push("HIGH_ALERT");
  if (record.vaccineFlag) blockers.push("VACCINE");
  if (record.requiresClinicalReview && record.highRiskFlag) blockers.push("CLINICAL_REVIEW_REQUIRED");

  const blockedToken = matchesBlockedToken(blob);
  if (blockedToken) blockers.push(`BLOCKED_CATEGORY:${blockedToken}`);
  if (isAnticoagulantRequiringMonitoring(record)) blockers.push("ANTICOAGULANT_MONITORING_REQUIRED");
  if (isGlp1Injection(record) && !GLP1_INJECTION_CERTIFIED) blockers.push("GLP1_INJECTION_NOT_CERTIFIED");

  if (!isSafeForActivationWithoutEngineering(record, cert)) {
    blockers.push("SAFE_ACTIVATION_PRECONDITIONS_NOT_MET");
  }

  return {
    catalogCode: record.catalogCode,
    displayNameEn: record.displayNameEn,
    result: blockers.length === 0 ? "PASS" : "FAIL",
    blockers,
  };
}

export function buildTranche2CandidateDiscoveryReport(): Tranche2CandidateDiscoveryReport {
  const { records, certByCode } = governanceContext();
  const pool = tranche2Pool(records);
  const duplicateReport = auditMedicationDuplicateActivationRisk(tranche2ActivationCandidates(records));
  const duplicateBlocked = duplicateBlockSet(duplicateReport);

  const byDiseaseDomain = Object.keys(DOMAIN_TOKEN_MAP).reduce(
    (acc, key) => {
      acc[key as ChronicDiseaseDomainId] = 0;
      return acc;
    },
    { UNCLASSIFIED_CHRONIC: 0 } as Record<ChronicDiseaseDomainId, number>
  );

  let alreadyOrderable = 0;
  let potentiallyActivatable = 0;
  let excludedHighRisk = 0;
  let excludedDuplicate = 0;
  let excludedMissingRouteFormStrength = 0;
  let excludedMissingI18n = 0;
  let excludedMissingBillingInventory = 0;

  const candidates: Tranche2DiscoveryRow[] = pool.map((record) => {
    const domains = classifyChronicDiseaseDomains(record);
    for (const d of domains) byDiseaseDomain[d] += 1;

    const exclusionReasons: string[] = [];
    const isOrderable = record.status === "ORDERABLE";
    if (isOrderable) alreadyOrderable += 1;

    if (record.highRiskFlag || record.controlledSubstanceFlag) {
      excludedHighRisk += 1;
      exclusionReasons.push("HIGH_RISK_OR_CONTROLLED");
    }
    if (duplicateBlocked.has(record.catalogCode)) {
      excludedDuplicate += 1;
      exclusionReasons.push("DUPLICATE_BLOCKED");
    }
    if (!record.strength.trim() || !record.doseForm.trim() || !record.route.trim()) {
      excludedMissingRouteFormStrength += 1;
      exclusionReasons.push("MISSING_ROUTE_FORM_STRENGTH");
    }
    if (!record.displayNameEn.trim() || !record.displayNameFr.trim()) {
      excludedMissingI18n += 1;
      exclusionReasons.push("MISSING_I18N");
    }
    if (record.enterpriseWave && (!record.billingReady || !record.ndcReady || !record.inventoryReady)) {
      excludedMissingBillingInventory += 1;
      exclusionReasons.push("MISSING_BILLING_INVENTORY");
    }

    const cert = certByCode.get(record.catalogCode)!;
    const eligibility = certifyTranche2ChronicDiseaseEligibility(record, cert, duplicateBlocked);
    const activatable = eligibility.result === "PASS";
    if (activatable) potentiallyActivatable += 1;

    return {
      catalogCode: record.catalogCode,
      displayNameEn: record.displayNameEn,
      diseaseDomains: domains,
      currentStatus: record.status,
      alreadyOrderable: isOrderable,
      potentiallyActivatable: activatable,
      exclusionReasons,
    };
  });

  return {
    totalCandidates: pool.length,
    byDiseaseDomain,
    alreadyOrderable,
    potentiallyActivatable,
    excludedHighRisk,
    excludedDuplicate,
    excludedMissingRouteFormStrength,
    excludedMissingI18n,
    excludedMissingBillingInventory,
    candidates,
  };
}

export function buildTranche2EligibilityCertificationReport(): Tranche2EligibilityCertificationReport {
  const { records, certByCode } = governanceContext();
  const pool = tranche2ActivationCandidates(records);
  const duplicateReport = auditMedicationDuplicateActivationRisk(pool);
  const duplicateBlocked = duplicateBlockSet(duplicateReport);

  const rows = pool.map((r) =>
    certifyTranche2ChronicDiseaseEligibility(r, certByCode.get(r.catalogCode)!, duplicateBlocked)
  );
  const passCohort = rows.filter((r) => r.result === "PASS");
  const failCohort = rows.filter((r) => r.result === "FAIL");

  const blockerReasonCounts: Record<string, number> = {};
  for (const row of failCohort) {
    for (const b of row.blockers) blockerReasonCounts[b] = (blockerReasonCounts[b] ?? 0) + 1;
  }

  return {
    totalEvaluated: rows.length,
    passCount: passCohort.length,
    failCount: failCohort.length,
    passCohort,
    failCohort,
    blockerReasonCounts,
  };
}

export function simulateTranche2Activation(): Tranche2ActivationSimulationReport {
  const eligibility = buildTranche2EligibilityCertificationReport();
  const warnings: string[] = [];
  const duplicateReport = auditMedicationDuplicateActivationRisk();

  if (duplicateReport.activationBlockedCount > 0) {
    warnings.push(`${duplicateReport.activationBlockedCount} candidates blocked by duplicate audit`);
  }

  const rows: Tranche2ActivationSimulationRow[] = eligibility.passCohort.map((r) => ({
    catalogCode: r.catalogCode,
    displayNameEn: r.displayNameEn,
    before: { orderSearchEnabled: false },
    after: { orderSearchEnabled: true },
  }));

  return {
    simulatedCount: rows.length,
    rows,
    warnings,
    note: "Simulation only — no persistence, no production orderSearchEnabled mutation, no formulary mutation",
  };
}

export function buildProviderSearchSafetyCertificationReport(): ProviderSearchSafetyCertificationReport {
  const simulation = simulateTranche2Activation();
  const { recordByCode } = governanceContext();
  const duplicateReport = auditMedicationDuplicateActivationRisk();
  const exposedBlockedMeds: string[] = [];
  const exposedDuplicateEquivalents: string[] = [];

  const blockedTokens: Record<string, string[]> = {
    "controlled substances": ["lorazepam", "midazolam", "diazepam"],
    "high-risk meds": ["warfarin", "apixaban"],
    "pressors": ["norepinephrine", "epinephrine", "dopamine"],
    thrombolytics: ["alteplase", "tenecteplase"],
    "anticoagulants requiring monitoring": ["warfarin", "apixaban", "rivaroxaban", "heparin"],
    "insulin infusions": ["insulin drip", "insulin infusion"],
    sedatives: ["midazolam", "propofol"],
    paralytics: ["rocuronium", "succinylcholine"],
    vaccines: ["tdap", "vaccine"],
    chemotherapy: ["methotrexate", "doxorubicin"],
  };

  for (const row of simulation.rows) {
    const record = recordByCode.get(row.catalogCode)!;
    const blob = recordBlob(record);

    for (const [category, tokens] of Object.entries(blockedTokens)) {
      if (tokens.some((t) => blob.includes(t))) {
        exposedBlockedMeds.push(`${row.catalogCode} (${category})`);
      }
    }

    if (record.controlledSubstanceFlag) exposedBlockedMeds.push(`${row.catalogCode} (controlled substances)`);
    if (record.highRiskFlag) exposedBlockedMeds.push(`${row.catalogCode} (high-risk meds)`);
    if (record.vaccineFlag) exposedBlockedMeds.push(`${row.catalogCode} (vaccines)`);
    if (!record.strength.trim() || !record.route.trim() || !record.doseForm.trim()) {
      exposedBlockedMeds.push(`${row.catalogCode} (missing dose/route/form)`);
    }
    if (!record.displayNameEn.trim() || !record.displayNameFr.trim()) {
      exposedBlockedMeds.push(`${row.catalogCode} (missing EN/FR display)`);
    }

    const dup = duplicateReport.rows.find((d) => d.catalogCode === row.catalogCode);
    if (dup && dup.blocksActivation) {
      exposedDuplicateEquivalents.push(row.catalogCode);
    }

    const gsr = normalizedGenericStrengthRouteKey(record);
    const simPeers = simulation.rows.filter((s) => {
      if (s.catalogCode === row.catalogCode) return false;
      const peer = recordByCode.get(s.catalogCode)!;
      return normalizedGenericStrengthRouteKey(peer) === gsr;
    });
    if (simPeers.length > 0) {
      exposedDuplicateEquivalents.push(`${row.catalogCode}~${simPeers.map((p) => p.catalogCode).join(",")}`);
    }
  }

  const uniqueDuplicates = [...new Set(exposedDuplicateEquivalents)];
  const decision =
    exposedBlockedMeds.length === 0 && uniqueDuplicates.length === 0 ? "SAFE" : "UNSAFE";

  return {
    blockedCategories: [...PROVIDER_SEARCH_BLOCKED_CATEGORIES],
    wouldExposeBlockedMed: exposedBlockedMeds.length > 0,
    wouldExposeDuplicateEquivalent: uniqueDuplicates.length > 0,
    exposedBlockedMeds,
    exposedDuplicateEquivalents: uniqueDuplicates,
    decision,
  };
}

function domainStatus(
  before: number,
  totalInDomain: number,
  after: number,
  restricted: number
): ChronicDiseaseDomainStatus {
  if (totalInDomain === 0) return "MISSING";
  if (after >= totalInDomain) return "READY";
  if (restricted > 0 && after === before) return "REVIEW_REQUIRED";
  if (after > before) return "PARTIAL";
  return "PARTIAL";
}

export function buildChronicDiseaseCoverageImpactReport(): ChronicDiseaseCoverageImpactReport {
  const { records } = governanceContext();
  const pool = tranche2Pool(records);
  const simulation = simulateTranche2Activation();
  const simulatedCodes = new Set(simulation.rows.map((r) => r.catalogCode));

  const domainIds = [...Object.keys(DOMAIN_TOKEN_MAP), "UNCLASSIFIED_CHRONIC"] as ChronicDiseaseDomainId[];

  const domains = domainIds.map((domain) => {
    const inDomain = pool.filter((r) => classifyChronicDiseaseDomains(r).includes(domain));
    const beforeOrderable = inDomain.filter((r) => r.status === "ORDERABLE").length;
    const afterSimulated = inDomain.filter(
      (r) => r.status === "ORDERABLE" || simulatedCodes.has(r.catalogCode)
    ).length;
    const stillMissing = inDomain.length === 0 ? 0 : Math.max(0, inDomain.length - afterSimulated);
    const stillRestricted = inDomain.filter(
      (r) => r.status !== "ORDERABLE" && !simulatedCodes.has(r.catalogCode) && (r.highRiskFlag || r.controlledSubstanceFlag)
    ).length;
    const delta = afterSimulated - beforeOrderable;

    return {
      domain,
      beforeOrderableCount: beforeOrderable,
      afterSimulatedOrderableCount: afterSimulated,
      stillMissing,
      stillRestricted,
      maturityImpact: delta > 0 ? `+${delta} orderable` : "no change",
      status: domainStatus(beforeOrderable, inDomain.length, afterSimulated, stillRestricted),
    };
  });

  return { domains };
}

export function buildTranche2I18nCertificationReport(): Tranche2I18nCertificationReport {
  const simulation = simulateTranche2Activation();
  const { recordByCode } = governanceContext();
  const blockers: string[] = [];

  const candidateRows = simulation.rows.map((sim) => {
    const record = recordByCode.get(sim.catalogCode)!;
    const enNoFrLeakage = !looksFrenchLocalizedText(record.displayNameEn);
    const frNoEnLeakage =
      !looksEnglishFormText(record.displayNameFr) || looksFrenchLocalizedText(record.displayNameFr);
    if (!enNoFrLeakage) blockers.push(`${sim.catalogCode}: EN display has FR leakage`);
    if (!frNoEnLeakage) blockers.push(`${sim.catalogCode}: FR display has EN leakage`);
    return {
      catalogCode: sim.catalogCode,
      displayNameEn: record.displayNameEn,
      displayNameFr: record.displayNameFr,
      enNoFrLeakage,
      frNoEnLeakage,
    };
  });

  const workflow = certifyMedicationI18nSafety();
  if (workflow.decision === "FAIL") blockers.push(...workflow.blockers);

  return {
    decision: blockers.length === 0 ? "PASS" : "FAIL",
    blockers,
    candidateRows,
  };
}

export function buildTranche2OperationalReadinessReport(): Tranche2OperationalReadinessReport {
  const simulation = simulateTranche2Activation();
  const { recordByCode } = governanceContext();

  const rows: Tranche2OperationalReadinessRow[] = simulation.rows.map((sim) => {
    const record = recordByCode.get(sim.catalogCode)!;
    const billing = resolveMedicationBillingReadiness(sim.catalogCode);
    const blockers: string[] = [];
    if (record.enterpriseWave && !billing.billingReady) blockers.push("BILLING_NOT_READY");
    if (record.enterpriseWave && !billing.ndcReady) blockers.push("NDC_MISSING");
    if (!record.inventoryReady && record.enterpriseWave) blockers.push("INVENTORY_NOT_COMPATIBLE");
    if (!record.marReady) blockers.push("MAR_INCOMPATIBLE");
    if (!record.route.trim()) blockers.push("ROUTE_MISSING");
    const pass = blockers.length === 0;
    return {
      catalogCode: sim.catalogCode,
      displayNameEn: sim.displayNameEn,
      billingReady: record.enterpriseWave ? billing.billingReady : true,
      ndcReady: record.enterpriseWave ? billing.ndcReady : true,
      inventoryReady: record.inventoryReady,
      marReady: record.marReady,
      route: record.route,
      pass,
      blockers,
    };
  });

  const passCount = rows.filter((r) => r.pass).length;
  return {
    totalCandidates: rows.length,
    passCount,
    failCount: rows.length - passCount,
    rows,
  };
}

export function buildTranche2MaturityProjectionReport(
  activatedCount: number
): Tranche2MaturityProjectionReport {
  const tranche1SimCount = simulateTranche1Activation().simulatedCount;
  const postTranche1 = buildTranche1MaturityProjection(tranche1SimCount);
  const framework = runGovernedActivationFramework();
  const baselineAfterTranche1 = postTranche1.postTrancheMaturity;
  const orderableAfterTranche1 = postTranche1.orderableAfterProjected;

  const maturityRows = buildMedicationEngineMaturityReport();
  const updatedRows = maturityRows.map((row) => {
    if (row.domain === "Provider order search") {
      const boost = Math.min(0.4, activatedCount / 40);
      return { ...row, maturityScore: Math.min(5, row.maturityScore + boost) as typeof row.maturityScore };
    }
    if (row.domain === "Medication master/catalog") {
      return { ...row, maturityScore: Math.min(5, row.maturityScore + 0.3) as typeof row.maturityScore };
    }
    if (row.domain === "Formulary activation") {
      return { ...row, maturityScore: Math.min(5, row.maturityScore + 0.2) as typeof row.maturityScore };
    }
    return row;
  });

  const rawPostTranche2Maturity =
    activatedCount > 0
      ? Math.round((updatedRows.reduce((s, r) => s + r.maturityScore, 0) / updatedRows.length) * 10) / 10
      : baselineAfterTranche1;
  const postTranche2Maturity = Math.max(baselineAfterTranche1, rawPostTranche2Maturity);

  const targetMaturity = 4.5;
  const remainingBlockers = [
    ...framework.hospitalCoverageGap.filter((g) => g.status !== "READY").map((g) => `${g.group}: ${g.status}`),
    "Anticoagulants and high-alert chronic meds remain gated",
    "COPD/asthma inhaler MAR pathways incomplete for several enterprise rows",
    "Vaccine MAR wiring pending for Tdap",
  ];

  return {
    baselineAfterTranche1,
    postTranche2Maturity,
    targetMaturity,
    gapRemaining: Math.max(0, Math.round((targetMaturity - postTranche2Maturity) * 10) / 10),
    orderableAfterTranche1,
    orderableAfterTranche2Projected: orderableAfterTranche1 + activatedCount,
    remainingBlockers,
  };
}

function resolveTranche2Decision(
  report: Omit<Tranche2CertificationReport, "decision" | "decisionBlockers">
): { decision: Tranche2CertificationDecision; blockers: string[] } {
  const blockers: string[] = [];

  if (report.providerSearchSafety.decision === "UNSAFE") {
    blockers.push("Provider search safety certification failed");
  }
  if (report.i18nCertification.decision === "FAIL") {
    blockers.push("Tranche 2 i18n certification failed");
  }
  if (report.operationalReadiness.failCount > 0) {
    blockers.push(`Operational readiness failures: ${report.operationalReadiness.failCount}`);
  }
  if (report.activationSimulation.simulatedCount === 0) {
    blockers.push("No eligible Tranche 2 candidates for simulation");
  }
  if (report.duplicateRisk.rows.some((r) => r.blocksActivation && report.eligibilityCertification.passCohort.some((p) => p.catalogCode === r.catalogCode))) {
    blockers.push("Duplicate-blocked medication in eligible cohort");
  }

  if (blockers.length > 0) return { decision: "NOT_READY", blockers };

  const needsPharmacy = report.duplicateRisk.byClassification.NEEDS_PHARMACY_REVIEW > 0;
  if (needsPharmacy) {
    return { decision: "READY_FOR_PROVIDER_ORDERING_WITH_PHARMACY_REVIEW_VISIBILITY", blockers: [] };
  }

  return { decision: "READY_FOR_GOVERNED_ACTIVATION", blockers: [] };
}

export function runTranche2Certification(): Tranche2CertificationReport {
  const candidateDiscovery = buildTranche2CandidateDiscoveryReport();
  const duplicateRisk = auditMedicationDuplicateActivationRisk();
  const eligibilityCertification = buildTranche2EligibilityCertificationReport();
  const activationSimulation = simulateTranche2Activation();
  const providerSearchSafety = buildProviderSearchSafetyCertificationReport();
  const chronicDiseaseCoverage = buildChronicDiseaseCoverageImpactReport();
  const i18nCertification = buildTranche2I18nCertificationReport();
  const operationalReadiness = buildTranche2OperationalReadinessReport();
  const maturityProjection = buildTranche2MaturityProjectionReport(activationSimulation.simulatedCount);

  const partial = {
    ticket: "MEDUI.MEDICATION.EXPANSION_TRANCHE_2_CHRONIC_DISEASE.1" as const,
    generatedAt: new Date().toISOString(),
    candidateDiscovery,
    duplicateRisk,
    eligibilityCertification,
    activationSimulation,
    providerSearchSafety,
    chronicDiseaseCoverage,
    i18nCertification,
    operationalReadiness,
    maturityProjection,
  };

  const { decision, blockers } = resolveTranche2Decision(partial);
  return { ...partial, decision, decisionBlockers: blockers };
}

/** Test helper — build duplicate audit row for a single synthetic candidate against live catalog. */
export function classifyDuplicateRiskForCandidate(
  candidate: MedicationActivationGovernanceRecord
): DuplicateActivationRiskRow {
  return auditMedicationDuplicateActivationRisk([candidate]).rows[0]!;
}

/** Test helper — expose legacy orderability row for Haiti/enterprise overlap assertions. */
export function legacyOrderabilityRow(catalogCode: string): MedicationOrderabilityRecord | undefined {
  return buildUnifiedOrderabilityMap().get(catalogCode);
}

/** Test helper — Tdap remains restricted under Tranche 2 certification scope. */
export function tdapRemainsRestrictedForTranche2(): boolean {
  const { recordByCode } = governanceContext();
  const tdap = recordByCode.get(TDAP_CATALOG_CODE);
  return Boolean(tdap && tdap.status !== "ORDERABLE" && !tdap.orderSearchReady);
}
