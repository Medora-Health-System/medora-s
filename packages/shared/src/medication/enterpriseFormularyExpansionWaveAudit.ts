/**
 * MEDUI.MEDS.ENTERPRISE_FORMULARY_EXPANSION_WAVES_AUDIT.1
 * Audit-only enterprise medication catalog expansion roadmap.
 * Does not activate, seed, or modify catalog data.
 */

import { canonicalMedicationFamilyKey } from "./medicationCanonicalNormalization.js";
import { buildActivationGovernanceRecord } from "./medicationActivationGovernance.js";
import { buildUnifiedOrderabilityMap } from "./medicationOrderabilityCertification.js";
import {
  buildEnterpriseMedicationInventoryReport,
  resetEnterpriseFormularyGapAnalysisCaches,
  type EnterpriseMedicationInventoryRow,
} from "./enterpriseFormularyGapAnalysis.js";
import {
  CONTROLLED_SUBSTANCE_GOVERNANCE_HOLD_CODES,
} from "./enterpriseEssentialFormularyActivationWaveRegistry.js";
import { HAITI_MEDICATION_FORMULARY_CATALOG } from "./haitiMedicationFormularyCatalog.js";
import { ENTERPRISE_WAVE1_FORMULARY_MANIFEST } from "./enterpriseWave1FormularyManifest.js";
import { ENTERPRISE_WAVE2_FORMULARY_MANIFEST } from "./enterpriseWave2FormularyManifest.js";
import { ENTERPRISE_WAVE3_FORMULARY_MANIFEST } from "./enterpriseWave3FormularyManifest.js";
import { ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST } from "./enterpriseWave4EdHospitalFormularyManifest.js";
import { prewarmProviderOrderableCatalogCodesRegistry } from "./providerOrderableCatalogCodesRegistry.js";

export type ExpansionWaveId = "WAVE_1" | "WAVE_2" | "WAVE_3" | "WAVE_4";

export type TherapeuticArea =
  | "Emergency / ACLS"
  | "Critical Care / ICU"
  | "Infectious Disease / Antibiotics"
  | "Cardiology"
  | "Neurology"
  | "Endocrine / Diabetes"
  | "Pulmonary"
  | "Gastrointestinal"
  | "Renal / Electrolytes"
  | "Hematology / Anticoagulation"
  | "Psychiatry"
  | "Pain / Analgesia"
  | "Pediatrics"
  | "OB/GYN"
  | "Orthopedics"
  | "Dermatology"
  | "ENT / Ophthalmology"
  | "Urology"
  | "Oncology supportive care"
  | "Rheumatology / Immunology";

export type ActivationSafetyStatus =
  | "SAFE_TO_ACTIVATE_NOW"
  | "NEEDS_METADATA_FIX"
  | "NEEDS_GOVERNANCE_REVIEW"
  | "NEEDS_CATALOG_ADDITION"
  | "DEFER_CONTROLLED_SUBSTANCE";

export type WaveExpansionCandidate = {
  candidateKey: string;
  label: string;
  therapeuticArea: TherapeuticArea;
  wave: ExpansionWaveId;
  catalogExists: boolean;
  matchedCatalogCodes: string[];
  providerOrderable: boolean;
  marReady: boolean;
  missingFormsStrengthsRoutes: string[];
  governance: {
    controlledSubstance: boolean;
    highAlert: boolean;
    lasa: boolean;
    pediatricCaution: boolean;
    renalAdjustment: boolean;
    obCaution: boolean;
    infusionRequired: boolean;
    prnGovernance: boolean;
  };
  activationSafety: ActivationSafetyStatus;
  seedRequired: boolean;
  migrationRequired: false;
  testsRequired: string[];
};

export type CurrentMedicationReadinessCounts = {
  totalCatalogMedications: number;
  providerOrderableMedications: number;
  marReadyMedications: number;
  presentButNotProviderOrderable: number;
  providerOrderableButNotMarReady: number;
  missingRoute: number;
  missingStrength: number;
  missingSearchAliases: number;
  duplicateNearDuplicateFamilies: number;
  controlledSubstancesNotGoverned: number;
  highAlertNotGoverned: number;
  ivpbMissingInfusionMetadata: number;
  prnMissingSupport: number;
  pediatricMissingLiquidWeightVariants: number;
};

export type TherapeuticAreaCoverageRow = {
  therapeuticArea: TherapeuticArea;
  catalogRows: number;
  providerOrderable: number;
  marReady: number;
  activationCandidates: number;
  safeToActivateNow: number;
  blocked: number;
};

export type WaveExpansionPlan = {
  wave: ExpansionWaveId;
  title: string;
  goalProviderOrderableMarReady: string;
  focusAreas: TherapeuticArea[];
  currentProviderOrderableInFocus: number;
  currentMarReadyInFocus: number;
  safeActivationCandidates: number;
  metadataFixCandidates: number;
  governanceReviewCandidates: number;
  catalogAdditionCandidates: number;
  deferredControlledSubstances: number;
  candidates: WaveExpansionCandidate[];
  seedRequired: boolean;
  migrationRequired: false;
  testsRequired: string[];
};

export type EnterpriseFormularyExpansionWaveAuditBundle = {
  ticket: "MEDUI.MEDS.ENTERPRISE_FORMULARY_EXPANSION_WAVES_AUDIT.1";
  generatedAt: string;
  currentMedicationReadinessCounts: CurrentMedicationReadinessCounts;
  therapeuticAreaCoverageMatrix: TherapeuticAreaCoverageRow[];
  wave1EmergencyInpatientCorePlan: WaveExpansionPlan;
  wave2HospitalCorePlan: WaveExpansionPlan;
  wave3SpecialtyExpansionPlan: WaveExpansionPlan;
  wave4AdvancedEnterprisePlan: WaveExpansionPlan;
  controlledSubstanceGovernanceHoldReport: {
    heldCatalogCodes: string[];
    heldCount: number;
    activatedControlledSubstances: string[];
    notGovernedControlledInCatalog: string[];
  };
  highAlertAndLasaGovernanceReport: {
    highAlertNotOrderable: string[];
    highAlertOrderableWithoutWitness: string[];
    lasaGroupedFamilies: Array<{ lasaGroupId: string; catalogCodes: string[] }>;
  };
  pediatricMedicationReadinessReport: {
    pediatricCatalogRows: number;
    missingLiquidOrWeightBasedVariants: string[];
    providerOrderablePediatric: number;
  };
  ivpbAndContinuousInfusionReadinessReport: {
    ivpbCatalogRows: number;
    ivpbMissingInfusionMetadata: string[];
    continuousInfusionCandidates: string[];
    missingLifecycleGovernance: string[];
  };
  providerOrderableMarReadinessInvariantReport: {
    providerOrderableButNotMarReadyCount: number;
    providerOrderableButNotMarReadyCatalogCodes: string[];
    invariantPass: boolean;
  };
  seedAndMigrationForecast: {
    migrationRequired: false;
    seedRequiredForWaveActivation: boolean;
    localSeedCommand: string;
    localMigrationCommand: string;
    productionSeedCommand: string;
    productionMigrationCommand: string;
  };
  finalDecision: "ENTERPRISE_FORMULARY_EXPANSION_AUDIT_COMPLETE" | "ENTERPRISE_FORMULARY_EXPANSION_AUDIT_BLOCKED";
  blockers: string[];
  recommendedNextImplementationPrompt: string;
};

const WAVE_FOCUS: Record<ExpansionWaveId, { title: string; goal: string; areas: TherapeuticArea[] }> = {
  WAVE_1: {
    title: "Emergency / Inpatient Core Stabilization",
    goal: "600+ provider-orderable and MAR-ready medications",
    areas: [
      "Emergency / ACLS",
      "Critical Care / ICU",
      "Infectious Disease / Antibiotics",
      "Renal / Electrolytes",
      "Pain / Analgesia",
      "Hematology / Anticoagulation",
    ],
  },
  WAVE_2: {
    title: "Full Inpatient Hospital Core",
    goal: "850–950 provider-orderable and MAR-ready medications",
    areas: [
      "Endocrine / Diabetes",
      "Gastrointestinal",
      "Pulmonary",
      "Neurology",
      "Cardiology",
      "Psychiatry",
      "OB/GYN",
      "Pediatrics",
      "Orthopedics",
    ],
  },
  WAVE_3: {
    title: "Specialty Expansion",
    goal: "1,100–1,300 provider-orderable and MAR-ready medications",
    areas: [
      "Dermatology",
      "ENT / Ophthalmology",
      "Urology",
      "Rheumatology / Immunology",
      "Oncology supportive care",
    ],
  },
  WAVE_4: {
    title: "Academic / Advanced Enterprise Coverage",
    goal: "1,500+ governed medications",
    areas: [
      "Oncology supportive care",
      "Rheumatology / Immunology",
      "Pediatrics",
      "Critical Care / ICU",
    ],
  },
};

const WAVE_CLINICAL_ANCHORS: Record<ExpansionWaveId, Array<{ label: string; area: TherapeuticArea; tokens: string[] }>> = {
  WAVE_1: [
    { label: "Epinephrine", area: "Emergency / ACLS", tokens: ["epinephrine", "adrenaline", "adrénaline"] },
    { label: "Norepinephrine infusion", area: "Critical Care / ICU", tokens: ["norepinephrine", "levophed"] },
    { label: "Vancomycin IV", area: "Infectious Disease / Antibiotics", tokens: ["vancomycin"] },
    { label: "Piperacillin-tazobactam IVPB", area: "Infectious Disease / Antibiotics", tokens: ["piperacillin", "zosyn"] },
    { label: "Potassium chloride IV", area: "Renal / Electrolytes", tokens: ["potassium chloride", "potassium"] },
    { label: "Enoxaparin", area: "Hematology / Anticoagulation", tokens: ["enoxaparin", "lovenox"] },
    { label: "Acetaminophen", area: "Pain / Analgesia", tokens: ["acetaminophen", "paracetamol"] },
    { label: "Ondansetron", area: "Gastrointestinal", tokens: ["ondansetron", "zofran"] },
    { label: "Propofol infusion", area: "Critical Care / ICU", tokens: ["propofol"] },
    { label: "Ceftriaxone", area: "Infectious Disease / Antibiotics", tokens: ["ceftriaxone"] },
  ],
  WAVE_2: [
    { label: "Insulin glargine", area: "Endocrine / Diabetes", tokens: ["insulin glargine", "lantus"] },
    { label: "Metformin", area: "Endocrine / Diabetes", tokens: ["metformin"] },
    { label: "Pantoprazole", area: "Gastrointestinal", tokens: ["pantoprazole", "protonix"] },
    { label: "Albuterol", area: "Pulmonary", tokens: ["albuterol", "salbutamol"] },
    { label: "Levetiracetam IV", area: "Neurology", tokens: ["levetiracetam", "keppra"] },
    { label: "Metoprolol", area: "Cardiology", tokens: ["metoprolol"] },
    { label: "Haloperidol", area: "Psychiatry", tokens: ["haloperidol"] },
    { label: "Magnesium sulfate OB", area: "OB/GYN", tokens: ["magnesium sulfate"] },
    { label: "Amoxicillin suspension pediatric", area: "Pediatrics", tokens: ["amoxicillin", "suspension"] },
    { label: "Cefazolin", area: "Orthopedics", tokens: ["cefazolin"] },
  ],
  WAVE_3: [
    { label: "Betamethasone topical", area: "Dermatology", tokens: ["betamethasone", "topical", "crème"] },
    { label: "Prednisolone ophthalmic", area: "ENT / Ophthalmology", tokens: ["prednisolone", "ophthalmic", "ophtalmique"] },
    { label: "Tamsulosin", area: "Urology", tokens: ["tamsulosin", "flomax"] },
    { label: "Methotrexate", area: "Rheumatology / Immunology", tokens: ["methotrexate"] },
    { label: "Filgrastim", area: "Oncology supportive care", tokens: ["filgrastim", "neupogen"] },
    { label: "Linezolid", area: "Infectious Disease / Antibiotics", tokens: ["linezolid"] },
  ],
  WAVE_4: [
    { label: "Rasburicase", area: "Oncology supportive care", tokens: ["rasburicase"] },
    { label: "Infliximab", area: "Rheumatology / Immunology", tokens: ["infliximab", "remicade"] },
    { label: "Dobutamine infusion", area: "Critical Care / ICU", tokens: ["dobutamine"] },
    { label: "Neonatal caffeine citrate", area: "Pediatrics", tokens: ["caffeine citrate"] },
    { label: "Cyclophosphamide", area: "Oncology supportive care", tokens: ["cyclophosphamide"] },
  ],
};

const THERAPEUTIC_AREA_RULES: Array<{ area: TherapeuticArea; keywords: string[] }> = [
  { area: "Emergency / ACLS", keywords: ["epinephrine", "adrenaline", "adenosine", "atropine", "amiodarone", "naloxone", "acls", "urgence", "emergency", "lidocaine iv"] },
  { area: "Critical Care / ICU", keywords: ["norepinephrine", "vasopressin", "propofol", "dexmedetomidine", "milrinone", "nicardipine", "nitroprusside", "pressor", "sedation", "cisatracurium", "rocuronium"] },
  { area: "Infectious Disease / Antibiotics", keywords: ["antibiot", "vancomycin", "cefepime", "piperacillin", "meropenem", "ceftriaxone", "azithromycin", "metronidazole", "daptomycin", "linezolid", "antiviral", "acyclovir"] },
  { area: "Cardiology", keywords: ["cardio", "metoprolol", "amlodipine", "atenolol", "carvedilol", "diltiazem", "antiarythm", "antiaryth", "clopidogrel", "ticagrelor", "statin", "atorvastatin", "sacubitril"] },
  { area: "Neurology", keywords: ["levetiracetam", "phenytoin", "fosphenytoin", "lacosamide", "valproate", "mannitol", "hypertonic saline", "alteplase", "tenecteplase", "seizure"] },
  { area: "Endocrine / Diabetes", keywords: ["insulin", "metformin", "levothyroxine", "hydrocortisone", "dexamethasone", "glucagon", "desmopressin", "diabetes", "endocrin"] },
  { area: "Pulmonary", keywords: ["albuterol", "salbutamol", "ipratropium", "budesonide", "tiotropium", "montelukast", "inhal", "copd", "asthma", "pulmonary"] },
  { area: "Gastrointestinal", keywords: ["pantoprazole", "omeprazole", "ondansetron", "metoclopramide", "lactulose", "rifaximin", "mesalamine", "sucralfate", "octreotide", "antiemetic", "gastro"] },
  { area: "Renal / Electrolytes", keywords: ["furosemide", "potassium", "magnesium", "calcium gluconate", "sodium bicarbonate", "lokelma", "kayexalate", "sevelamer", "electrolyte", "dialysis", "nephro"] },
  { area: "Hematology / Anticoagulation", keywords: ["heparin", "enoxaparin", "warfarin", "apixaban", "rivaroxaban", "fondaparinux", "anticoag", "tranexamic", "epoetin", "hematolog"] },
  { area: "Psychiatry", keywords: ["haloperidol", "olanzapine", "risperidone", "quetiapine", "sertraline", "fluoxetine", "lithium", "benztropine", "psychiatr"] },
  { area: "Pain / Analgesia", keywords: ["acetaminophen", "paracetamol", "ibuprofen", "ketorolac", "morphine", "hydromorphone", "fentanyl", "oxycodone", "tramadol", "analges", "opioid"] },
  { area: "Pediatrics", keywords: ["pediatric", "pédiatrique", "suspension buvable", "rotavirus", "dtap", "hib", "ipv", "neonatal", "infant"] },
  { area: "OB/GYN", keywords: ["oxytocin", "pitocin", "misoprostol", "cytotec", "methylergonovine", "methergine", "carboprost", "betamethasone", "rhogam", "obstet", "ob gyn", "terbutaline", "nifedipine"] },
  { area: "Orthopedics", keywords: ["orthop", "cyclobenzaprine", "gabapentin", "bone", "fracture"] },
  { area: "Dermatology", keywords: ["dermat", "topical", "crème", "lotion", "betamethasone", "mupirocin", "clotrimazole"] },
  { area: "ENT / Ophthalmology", keywords: ["ophthalm", "ophtalm", "otic", "nasal spray", "eye drop", "ear drop", "ent "] },
  { area: "Urology", keywords: ["tamsulosin", "finasteride", "oxybutynin", "urolog"] },
  { area: "Oncology supportive care", keywords: ["filgrastim", "rasburicase", "allopurinol", "leucovorin", "ondansetron chemo", "methotrexate", "cyclophosphamide", "doxorubicin", "cisplatin", "oncolog"] },
  { area: "Rheumatology / Immunology", keywords: ["methotrexate", "infliximab", "adalimumab", "hydroxychloroquine", "rheumat", "immunolog", "biologic"] },
];

function aliasTexts(raw: readonly (string | { text: string })[] | undefined): string[] {
  if (!raw) return [];
  return raw.map((item) => (typeof item === "string" ? item : item.text)).filter(Boolean);
}

const ALIAS_LOOKUP = new Map<string, string[]>();
for (const row of HAITI_MEDICATION_FORMULARY_CATALOG) {
  ALIAS_LOOKUP.set(row.code, aliasTexts(row.commonAliases));
}
for (const entry of [
  ...ENTERPRISE_WAVE1_FORMULARY_MANIFEST,
  ...ENTERPRISE_WAVE2_FORMULARY_MANIFEST,
  ...ENTERPRISE_WAVE3_FORMULARY_MANIFEST,
  ...ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST,
]) {
  ALIAS_LOOKUP.set(entry.catalogCode, [...aliasTexts(entry.aliases), ...aliasTexts(entry.searchTerms)]);
}

let auditCache: EnterpriseFormularyExpansionWaveAuditBundle | null = null;

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function blob(row: EnterpriseMedicationInventoryRow): string {
  return normalize([row.catalogCode, row.displayNameEn, row.displayNameFr, row.canonicalFamily, row.route, row.form].join(" "));
}

function classifyTherapeuticArea(row: EnterpriseMedicationInventoryRow): TherapeuticArea {
  const text = blob(row);
  for (const rule of THERAPEUTIC_AREA_RULES) {
    if (rule.keywords.some((keyword) => text.includes(normalize(keyword)))) {
      return rule.area;
    }
  }
  return "Gastrointestinal";
}

function waveForArea(area: TherapeuticArea): ExpansionWaveId {
  for (const [wave, config] of Object.entries(WAVE_FOCUS) as Array<[ExpansionWaveId, (typeof WAVE_FOCUS)[ExpansionWaveId]]>) {
    if (config.areas.includes(area)) return wave;
  }
  return "WAVE_4";
}

function matchInventory(tokens: string[], rows: EnterpriseMedicationInventoryRow[]): EnterpriseMedicationInventoryRow[] {
  const normalizedTokens = tokens.map(normalize).filter(Boolean);
  return rows.filter((row) => {
    const haystack = blob(row);
    return normalizedTokens.some((token) => haystack.includes(token));
  });
}

function missingMetadata(row: EnterpriseMedicationInventoryRow | undefined): string[] {
  if (!row) return ["catalog row missing"];
  const gaps: string[] = [];
  if (!row.route.trim()) gaps.push("route");
  if (!row.form.trim()) gaps.push("dosage form");
  const orderability = buildUnifiedOrderabilityMap().get(row.catalogCode);
  if (orderability && !orderability.strength.trim()) gaps.push("strength");
  return gaps;
}

function aliasCount(catalogCode: string): number {
  return (ALIAS_LOOKUP.get(catalogCode) ?? []).filter((alias) => alias.trim().length > 0).length;
}

function isIvpbRow(row: EnterpriseMedicationInventoryRow): boolean {
  const text = blob(row);
  return text.includes("ivpb") || text.includes("perfusion") || (text.includes("injectable") && text.includes("piperacillin"));
}

function isPediatricRow(row: EnterpriseMedicationInventoryRow): boolean {
  const text = blob(row);
  return text.includes("pediatric") || text.includes("suspension buvable") || text.includes("pédiatrique") || text.includes("neonatal");
}

function isPrnAppropriate(row: EnterpriseMedicationInventoryRow): boolean {
  const text = blob(row);
  return text.includes("acetaminophen") || text.includes("paracetamol") || text.includes("ondansetron") || text.includes("morphine") || text.includes("hydromorphone");
}

function buildGovernanceFlags(catalogCode: string | null) {
  if (!catalogCode) {
    return {
      controlledSubstance: false,
      highAlert: false,
      lasa: false,
      pediatricCaution: false,
      renalAdjustment: false,
      obCaution: false,
      infusionRequired: false,
      prnGovernance: false,
    };
  }
  const record = buildUnifiedOrderabilityMap().get(catalogCode);
  if (!record) {
    return {
      controlledSubstance: false,
      highAlert: false,
      lasa: false,
      pediatricCaution: false,
      renalAdjustment: false,
      obCaution: false,
      infusionRequired: false,
      prnGovernance: false,
    };
  }
  const governance = buildActivationGovernanceRecord(record);
  const text = normalize([record.catalogCode, record.genericName, record.displayNameEn].join(" "));
  return {
    controlledSubstance: governance.controlledSubstanceFlag,
    highAlert: governance.highRiskFlag,
    lasa: Boolean(record.restrictedReason?.toLowerCase().includes("lasa")),
    pediatricCaution: text.includes("pediatric") || text.includes("suspension"),
    renalAdjustment: text.includes("renal") || text.includes("dialysis") || text.includes("furosemide"),
    obCaution: text.includes("oxytocin") || text.includes("misoprostol") || text.includes("magnesium"),
    infusionRequired: (record.route.toLowerCase().includes("intrave") && record.dosageForm.toLowerCase().includes("inject")) || text.includes("infusion"),
    prnGovernance: isPrnAppropriate({ catalogCode, displayNameEn: record.displayNameEn, displayNameFr: record.displayNameFr, canonicalFamily: "", route: record.route, form: record.dosageForm, activationSource: "", providerOrderable: false, MARReady: false, BillingReady: false, InventoryReady: false }),
  };
}

function classifyActivationSafety(
  matches: EnterpriseMedicationInventoryRow[],
  anchorLabel: string
): ActivationSafetyStatus {
  if (matches.length === 0) return "NEEDS_CATALOG_ADDITION";
  const primary = matches[0]!;
  const governance = buildGovernanceFlags(primary.catalogCode);
  const metadataGaps = missingMetadata(primary);
  if (governance.controlledSubstance) {
    if (CONTROLLED_SUBSTANCE_GOVERNANCE_HOLD_CODES.includes(primary.catalogCode as (typeof CONTROLLED_SUBSTANCE_GOVERNANCE_HOLD_CODES)[number])) {
      return "DEFER_CONTROLLED_SUBSTANCE";
    }
    if (!primary.providerOrderable) return "NEEDS_GOVERNANCE_REVIEW";
  }
  if (governance.highAlert && !primary.providerOrderable) return "NEEDS_GOVERNANCE_REVIEW";
  if (metadataGaps.length > 0) return "NEEDS_METADATA_FIX";
  if (primary.providerOrderable && primary.MARReady) return "SAFE_TO_ACTIVATE_NOW";
  if (primary.MARReady && !primary.providerOrderable) return "SAFE_TO_ACTIVATE_NOW";
  if (!primary.MARReady) return "NEEDS_METADATA_FIX";
  return "NEEDS_GOVERNANCE_REVIEW";
}

function testsForCandidate(status: ActivationSafetyStatus, area: TherapeuticArea): string[] {
  const base = [`enterpriseFormularyExpansionWaveAudit: ${area}`];
  switch (status) {
    case "SAFE_TO_ACTIVATE_NOW":
      return [...base, "providerOrderableMarReadiness invariant", "activation registry collision check"];
    case "NEEDS_METADATA_FIX":
      return [...base, "catalog metadata validation", "MAR readiness gate"];
    case "NEEDS_GOVERNANCE_REVIEW":
      return [...base, "high-alert/controlled governance review", "witness/double-sign policy"];
    case "NEEDS_CATALOG_ADDITION":
      return [...base, "haiti-medications seed row", "formulary manifest validation"];
    case "DEFER_CONTROLLED_SUBSTANCE":
      return [...base, "controlledSubstanceProviderOrderingActivation", "DEA witness workflow"];
  }
}

function buildCandidate(
  wave: ExpansionWaveId,
  anchor: { label: string; area: TherapeuticArea; tokens: string[] },
  inventoryRows: EnterpriseMedicationInventoryRow[]
): WaveExpansionCandidate {
  const matches = matchInventory(anchor.tokens, inventoryRows);
  const primary = matches[0];
  const activationSafety = classifyActivationSafety(matches, anchor.label);
  const governance = buildGovernanceFlags(primary?.catalogCode ?? null);
  return {
    candidateKey: `${wave}:${normalize(anchor.label)}`,
    label: anchor.label,
    therapeuticArea: anchor.area,
    wave,
    catalogExists: matches.length > 0,
    matchedCatalogCodes: matches.map((row) => row.catalogCode),
    providerOrderable: matches.some((row) => row.providerOrderable),
    marReady: matches.some((row) => row.MARReady),
    missingFormsStrengthsRoutes: primary ? missingMetadata(primary) : ["catalog row missing"],
    governance,
    activationSafety,
    seedRequired: activationSafety === "NEEDS_CATALOG_ADDITION" || activationSafety === "NEEDS_METADATA_FIX",
    migrationRequired: false,
    testsRequired: testsForCandidate(activationSafety, anchor.area),
  };
}

export function resetEnterpriseFormularyExpansionWaveAuditCaches(): void {
  auditCache = null;
  resetEnterpriseFormularyGapAnalysisCaches();
}

export function buildCurrentMedicationReadinessCounts(): CurrentMedicationReadinessCounts {
  const inventory = buildEnterpriseMedicationInventoryReport();
  const orderability = buildUnifiedOrderabilityMap();
  const familyCounts = new Map<string, number>();
  for (const row of inventory.rows) {
    familyCounts.set(row.canonicalFamily, (familyCounts.get(row.canonicalFamily) ?? 0) + 1);
  }
  const duplicateFamilies = [...familyCounts.values()].filter((count) => count > 4).length;

  let controlledNotGoverned = 0;
  let highAlertNotGoverned = 0;
  let ivpbMissingMeta = 0;
  let prnMissing = 0;
  let pediatricMissingVariants = 0;
  let missingRoute = 0;
  let missingStrength = 0;
  let missingAliases = 0;

  for (const row of inventory.rows) {
    if (!row.route.trim()) missingRoute += 1;
    const record = orderability.get(row.catalogCode);
    if (record && !record.strength.trim()) missingStrength += 1;
    if (aliasCount(row.catalogCode) < 2) missingAliases += 1;

    const governance = record ? buildActivationGovernanceRecord(record) : null;
    if (governance?.controlledSubstanceFlag && !governance.orderSearchReady && !CONTROLLED_SUBSTANCE_GOVERNANCE_HOLD_CODES.includes(row.catalogCode as never)) {
      controlledNotGoverned += 1;
    }
    if (governance?.highRiskFlag && !governance.orderSearchReady && !governance.controlledSubstanceFlag) {
      highAlertNotGoverned += 1;
    }
    if (isIvpbRow(row)) {
      const adminType = (record as { administrationType?: string | null } | undefined)?.administrationType;
      const haiti = HAITI_MEDICATION_FORMULARY_CATALOG.find((h) => h.code === row.catalogCode);
      const hasInfusionMeta = Boolean(adminType === "INFUSION" || haiti?.administrationType === "INFUSION" || row.route.toLowerCase().includes("perfusion"));
      if (!hasInfusionMeta) ivpbMissingMeta += 1;
    }
    if (isPrnAppropriate(row) && row.providerOrderable && !row.MARReady) prnMissing += 1;
    if (isPediatricRow(row) && !blob(row).includes("suspension") && !blob(row).includes("mg/kg")) {
      pediatricMissingVariants += 1;
    }
  }

  const providerOrderableButNotMarReady = inventory.rows.filter((row) => row.providerOrderable && !row.MARReady).length;

  return {
    totalCatalogMedications: inventory.totalCatalogRows,
    providerOrderableMedications: inventory.totalProviderOrderableRows,
    marReadyMedications: inventory.rows.filter((row) => row.MARReady).length,
    presentButNotProviderOrderable: inventory.totalInactiveRows,
    providerOrderableButNotMarReady,
    missingRoute,
    missingStrength,
    missingSearchAliases: missingAliases,
    duplicateNearDuplicateFamilies: duplicateFamilies,
    controlledSubstancesNotGoverned: controlledNotGoverned,
    highAlertNotGoverned: highAlertNotGoverned,
    ivpbMissingInfusionMetadata: ivpbMissingMeta,
    prnMissingSupport: prnMissing,
    pediatricMissingLiquidWeightVariants: pediatricMissingVariants,
  };
}

export function buildTherapeuticAreaCoverageMatrix(): TherapeuticAreaCoverageRow[] {
  const inventory = buildEnterpriseMedicationInventoryReport();
  const areas = THERAPEUTIC_AREA_RULES.map((rule) => rule.area);
  return areas.map((area) => {
    const rows = inventory.rows.filter((row) => classifyTherapeuticArea(row) === area);
    const candidates = rows.filter((row) => !row.providerOrderable && row.MARReady);
    const safe = candidates.filter((row) => {
      const governance = buildGovernanceFlags(row.catalogCode);
      return !governance.controlledSubstance && !governance.highAlert;
    });
    return {
      therapeuticArea: area,
      catalogRows: rows.length,
      providerOrderable: rows.filter((row) => row.providerOrderable).length,
      marReady: rows.filter((row) => row.MARReady).length,
      activationCandidates: candidates.length,
      safeToActivateNow: safe.length,
      blocked: candidates.length - safe.length,
    };
  });
}

function buildWavePlan(wave: ExpansionWaveId): WaveExpansionPlan {
  const inventory = buildEnterpriseMedicationInventoryReport();
  const config = WAVE_FOCUS[wave];
  const focusRows = inventory.rows.filter((row) => config.areas.includes(classifyTherapeuticArea(row)));
  const anchors = WAVE_CLINICAL_ANCHORS[wave];
  const candidates = anchors.map((anchor) => buildCandidate(wave, anchor, inventory.rows));

  const countBy = (status: ActivationSafetyStatus) => candidates.filter((c) => c.activationSafety === status).length;

  return {
    wave,
    title: config.title,
    goalProviderOrderableMarReady: config.goal,
    focusAreas: config.areas,
    currentProviderOrderableInFocus: focusRows.filter((row) => row.providerOrderable).length,
    currentMarReadyInFocus: focusRows.filter((row) => row.MARReady).length,
    safeActivationCandidates: countBy("SAFE_TO_ACTIVATE_NOW"),
    metadataFixCandidates: countBy("NEEDS_METADATA_FIX"),
    governanceReviewCandidates: countBy("NEEDS_GOVERNANCE_REVIEW"),
    catalogAdditionCandidates: countBy("NEEDS_CATALOG_ADDITION"),
    deferredControlledSubstances: countBy("DEFER_CONTROLLED_SUBSTANCE"),
    candidates,
    seedRequired: candidates.some((c) => c.seedRequired),
    migrationRequired: false,
    testsRequired: [
      "enterpriseFormularyExpansionWaveAudit.test.ts",
      "enterpriseFormularyGapAnalysis.test.ts",
      "providerOrderableMarReadiness invariant",
      wave === "WAVE_1" ? "criticalCareProviderOrderingActivation.test.ts" : "domain-specific activation tests",
    ],
  };
}

export function runEnterpriseFormularyExpansionWaveAudit(): EnterpriseFormularyExpansionWaveAuditBundle {
  if (auditCache) return auditCache;

  prewarmProviderOrderableCatalogCodesRegistry();
  const counts = buildCurrentMedicationReadinessCounts();
  const inventory = buildEnterpriseMedicationInventoryReport();
  const orderability = buildUnifiedOrderabilityMap();

  const heldSet = new Set<string>(CONTROLLED_SUBSTANCE_GOVERNANCE_HOLD_CODES);
  const activatedControlled = inventory.rows
    .filter((row) => row.providerOrderable && heldSet.has(row.catalogCode))
    .map((row) => row.catalogCode);
  const notGovernedControlled = inventory.rows
    .filter((row) => {
      const record = orderability.get(row.catalogCode);
      if (!record) return false;
      const gov = buildActivationGovernanceRecord(record);
      return gov.controlledSubstanceFlag && !gov.orderSearchReady && !heldSet.has(row.catalogCode);
    })
    .map((row) => row.catalogCode);

  const highAlertNotOrderable: string[] = [];
  const highAlertOrderableWithoutWitness: string[] = [];
  for (const row of inventory.rows) {
    const record = orderability.get(row.catalogCode);
    if (!record) continue;
    const gov = buildActivationGovernanceRecord(record);
    if (!gov.highRiskFlag) continue;
    if (!row.providerOrderable) highAlertNotOrderable.push(row.catalogCode);
    if (row.providerOrderable && !gov.controlledSubstanceFlag && !record.requiresPharmacyReview) {
      highAlertOrderableWithoutWitness.push(row.catalogCode);
    }
  }

  const lasaMap = new Map<string, string[]>();
  for (const entry of [...ENTERPRISE_WAVE1_FORMULARY_MANIFEST, ...ENTERPRISE_WAVE2_FORMULARY_MANIFEST]) {
    const lasa = entry.governance.lasaGroupId;
    if (!lasa) continue;
    const list = lasaMap.get(lasa) ?? [];
    list.push(entry.catalogCode);
    lasaMap.set(lasa, list);
  }

  const pediatricRows = inventory.rows.filter(isPediatricRow);
  const pediatricMissing = pediatricRows
    .filter((row) => !blob(row).includes("suspension") && !blob(row).includes("mg/kg"))
    .map((row) => row.catalogCode)
    .slice(0, 50);

  const ivpbRows = inventory.rows.filter(isIvpbRow);
  const ivpbMissing = ivpbRows
    .filter((row) => {
      const haiti = HAITI_MEDICATION_FORMULARY_CATALOG.find((h) => h.code === row.catalogCode);
      return !(haiti?.administrationType === "INFUSION" || row.route.toLowerCase().includes("perfusion"));
    })
    .map((row) => row.catalogCode);

  const continuousCandidates = inventory.rows
    .filter((row) => blob(row).includes("infusion") || blob(row).includes("norepinephrine") || blob(row).includes("propofol"))
    .map((row) => row.catalogCode)
    .slice(0, 40);

  const orderableNotMar = inventory.rows.filter((row) => row.providerOrderable && !row.MARReady);

  const blockers: string[] = [];
  if (counts.providerOrderableButNotMarReady > 0) {
    blockers.push("PROVIDER_ORDERABLE_NOT_MAR_READY_REGRESSION");
  }

  auditCache = {
    ticket: "MEDUI.MEDS.ENTERPRISE_FORMULARY_EXPANSION_WAVES_AUDIT.1",
    generatedAt: new Date().toISOString(),
    currentMedicationReadinessCounts: counts,
    therapeuticAreaCoverageMatrix: buildTherapeuticAreaCoverageMatrix(),
    wave1EmergencyInpatientCorePlan: buildWavePlan("WAVE_1"),
    wave2HospitalCorePlan: buildWavePlan("WAVE_2"),
    wave3SpecialtyExpansionPlan: buildWavePlan("WAVE_3"),
    wave4AdvancedEnterprisePlan: buildWavePlan("WAVE_4"),
    controlledSubstanceGovernanceHoldReport: {
      heldCatalogCodes: [...CONTROLLED_SUBSTANCE_GOVERNANCE_HOLD_CODES],
      heldCount: CONTROLLED_SUBSTANCE_GOVERNANCE_HOLD_CODES.length,
      activatedControlledSubstances: activatedControlled,
      notGovernedControlledInCatalog: notGovernedControlled.slice(0, 100),
    },
    highAlertAndLasaGovernanceReport: {
      highAlertNotOrderable: highAlertNotOrderable.slice(0, 100),
      highAlertOrderableWithoutWitness: highAlertOrderableWithoutWitness.slice(0, 50),
      lasaGroupedFamilies: [...lasaMap.entries()].map(([lasaGroupId, catalogCodes]) => ({ lasaGroupId, catalogCodes })),
    },
    pediatricMedicationReadinessReport: {
      pediatricCatalogRows: pediatricRows.length,
      missingLiquidOrWeightBasedVariants: pediatricMissing,
      providerOrderablePediatric: pediatricRows.filter((row) => row.providerOrderable).length,
    },
    ivpbAndContinuousInfusionReadinessReport: {
      ivpbCatalogRows: ivpbRows.length,
      ivpbMissingInfusionMetadata: ivpbMissing.slice(0, 50),
      continuousInfusionCandidates: continuousCandidates,
      missingLifecycleGovernance: continuousCandidates.filter((code) => !orderability.get(code)?.marEnabled).slice(0, 30),
    },
    providerOrderableMarReadinessInvariantReport: {
      providerOrderableButNotMarReadyCount: orderableNotMar.length,
      providerOrderableButNotMarReadyCatalogCodes: orderableNotMar.map((row) => row.catalogCode),
      invariantPass: orderableNotMar.length === 0,
    },
    seedAndMigrationForecast: {
      migrationRequired: false,
      seedRequiredForWaveActivation: true,
      localSeedCommand: "pnpm --filter @medora/api run prisma:seed-catalogs",
      localMigrationCommand:
        "pnpm --filter @medora/api exec prisma migrate dev --name enterprise_formulary_expansion_wave",
      productionSeedCommand:
        "railway run --service medora-s --environment production -- sh -c 'export DATABASE_URL=\"$DATABASE_PUBLIC_URL\" && pnpm --filter @medora/api run prisma:seed-catalogs'",
      productionMigrationCommand:
        "railway run --service medora-s --environment production -- sh -c 'export DATABASE_URL=\"$DATABASE_PUBLIC_URL\" && pnpm --filter @medora/api exec prisma migrate deploy'",
    },
    finalDecision:
      blockers.length === 0
        ? "ENTERPRISE_FORMULARY_EXPANSION_AUDIT_COMPLETE"
        : "ENTERPRISE_FORMULARY_EXPANSION_AUDIT_BLOCKED",
    blockers,
    recommendedNextImplementationPrompt:
      "MEDUI.MEDS.ENTERPRISE_FORMULARY_EXPANSION_WAVE_1_ACTIVATION.1 — activate SAFE_TO_ACTIVATE_NOW catalog rows in Wave 1 focus areas only; no controlled substances; preserve provider-orderable-not-MAR-ready invariant at 0.",
  };

  return auditCache;
}

export function formatEnterpriseFormularyExpansionWaveAuditMarkdown(
  audit: EnterpriseFormularyExpansionWaveAuditBundle = runEnterpriseFormularyExpansionWaveAudit()
): string {
  const c = audit.currentMedicationReadinessCounts;
  const lines: string[] = [
    "# Enterprise Formulary Expansion Wave Audit",
    "",
    `**Ticket:** ${audit.ticket}`,
    `**Generated:** ${audit.generatedAt}`,
    `**Final decision:** ${audit.finalDecision}`,
    "",
    "## Current readiness counts",
    "",
    "| Metric | Count |",
    "|---|---:|",
    `| Total catalog medications | ${c.totalCatalogMedications} |`,
    `| Provider-orderable | ${c.providerOrderableMedications} |`,
    `| MAR-ready | ${c.marReadyMedications} |`,
    `| Present but not provider-orderable | ${c.presentButNotProviderOrderable} |`,
    `| Provider-orderable but not MAR-ready | ${c.providerOrderableButNotMarReady} |`,
    `| Missing route | ${c.missingRoute} |`,
    `| Missing strength | ${c.missingStrength} |`,
    `| Missing search aliases (<2) | ${c.missingSearchAliases} |`,
    `| Duplicate/near-duplicate families (>4 variants) | ${c.duplicateNearDuplicateFamilies} |`,
    `| Controlled substances not governed | ${c.controlledSubstancesNotGoverned} |`,
    `| High-alert not governed | ${c.highAlertNotGoverned} |`,
    `| IVPB missing infusion metadata | ${c.ivpbMissingInfusionMetadata} |`,
    "",
    "## Wave plans",
    "",
  ];

  for (const plan of [
    audit.wave1EmergencyInpatientCorePlan,
    audit.wave2HospitalCorePlan,
    audit.wave3SpecialtyExpansionPlan,
    audit.wave4AdvancedEnterprisePlan,
  ]) {
    lines.push(`### ${plan.wave} — ${plan.title}`);
    lines.push("");
    lines.push(`**Goal:** ${plan.goalProviderOrderableMarReady}`);
    lines.push(`**Focus provider-orderable / MAR-ready in focus:** ${plan.currentProviderOrderableInFocus} / ${plan.currentMarReadyInFocus}`);
    lines.push(`**Safe / metadata / governance / catalog-add / deferred CS:** ${plan.safeActivationCandidates} / ${plan.metadataFixCandidates} / ${plan.governanceReviewCandidates} / ${plan.catalogAdditionCandidates} / ${plan.deferredControlledSubstances}`);
    lines.push("");
    lines.push("| Candidate | Area | Catalog | Orderable | MAR | Safety |");
    lines.push("|---|---|:---:|:---:|:---:|---|");
    for (const candidate of plan.candidates) {
      lines.push(
        `| ${candidate.label} | ${candidate.therapeuticArea} | ${candidate.catalogExists ? "yes" : "no"} | ${candidate.providerOrderable ? "yes" : "no"} | ${candidate.marReady ? "yes" : "no"} | ${candidate.activationSafety} |`
      );
    }
    lines.push("");
  }

  lines.push("## Therapeutic area coverage");
  lines.push("");
  lines.push("| Area | Catalog | Orderable | MAR-ready | Safe candidates | Blocked |");
  lines.push("|---|---:|---:|---:|---:|---:|");
  for (const row of audit.therapeuticAreaCoverageMatrix) {
    lines.push(
      `| ${row.therapeuticArea} | ${row.catalogRows} | ${row.providerOrderable} | ${row.marReady} | ${row.safeToActivateNow} | ${row.blocked} |`
    );
  }

  lines.push("");
  lines.push("## Safety invariants");
  lines.push("");
  lines.push(`- Provider-orderable but not MAR-ready: **${audit.providerOrderableMarReadinessInvariantReport.providerOrderableButNotMarReadyCount}** (${audit.providerOrderableMarReadinessInvariantReport.invariantPass ? "PASS" : "FAIL"})`);
  lines.push(`- Controlled substance holds: **${audit.controlledSubstanceGovernanceHoldReport.heldCount}**`);
  lines.push(`- Activated controlled substances (must be 0): **${audit.controlledSubstanceGovernanceHoldReport.activatedControlledSubstances.length}**`);
  lines.push("");
  lines.push("## Seed / migration forecast");
  lines.push("");
  lines.push("- Migration required: **no** (audit-only; future waves may need seed)");
  lines.push("- Seed required when activating catalog additions: **yes**");
  lines.push(`- Local seed: \`${audit.seedAndMigrationForecast.localSeedCommand}\``);
  lines.push("");
  lines.push("## Recommended next prompt");
  lines.push("");
  lines.push(audit.recommendedNextImplementationPrompt);

  if (audit.blockers.length > 0) {
    lines.push("");
    lines.push("## Blockers");
    for (const blocker of audit.blockers) {
      lines.push(`- ${blocker}`);
    }
  }

  return lines.join("\n");
}
