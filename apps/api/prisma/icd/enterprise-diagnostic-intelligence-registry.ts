/**
 * Enterprise diagnostic intelligence registry (Phase 19 Commit 2).
 * Master index of specialty phases, certifiers, scopes, and ownership priority.
 */
import { selectBitesContaminatedWoundsScopedCodes } from "./icd10-bites-contaminated-wounds-scope";
import { selectBlastPolytraumaScopedCodes } from "./icd10-blast-polytrauma-scope";
import { selectBurnScopedCodes } from "./icd10-burn-scope";
import {
  selectAmputationScopedCodes,
  selectCrushScopedCodes,
  selectForeignBodyScopedCodes,
} from "./icd10-crush-amputation-foreign-body-scope";
import { selectDermatologyScopedCodes } from "./icd10-dermatology-scope";
import { selectEntEmergenciesScopedCodes } from "./icd10-ent-emergencies-scope";
import { selectEnvironmentalExposureScopedCodes } from "./icd10-environmental-exposure-scope";
import { selectEyeEmergenciesScopedCodes } from "./icd10-eye-emergencies-scope";
import { selectHeadFacialTraumaScopedCodes } from "./icd10-head-facial-trauma-scope";
import { selectHumanBiteHighRiskWoundScopedCodes } from "./icd10-human-bite-high-risk-wound-scope";
import { selectObGynUrologyScopedCodes } from "./icd10-obgyn-urology-scope";
import { selectPenetratingTraumaScopedCodes } from "./icd10-penetrating-trauma-scope";
import { selectPsychiatricBehavioralScopedCodes } from "./icd10-psychiatric-behavioral-scope";
import { selectSoftTissueWoundInfectionsScopedCodes } from "./icd10-soft-tissue-wound-infections-scope";
import { selectSpineBackScopedCodes } from "./icd10-spine-back-scope";
import {
  LIGAMENT_SCOPE_FAMILIES,
  selectScopedCodes,
  TENDON_SCOPE_FAMILIES,
  type ScopedOfficialCode,
} from "./icd10-tendon-ligament-scope";
import { selectToxicologyEnvenomationScopedCodes } from "./icd10-toxicology-envenomation-scope";
import { ENTERPRISE_INJURY_ADAPTIVE_TEMPLATE_IDS, ENTERPRISE_SPECIALTY_ADAPTIVE_TEMPLATE_BATCHES } from "./enterprise-template-inventory-data";

export type EnterpriseSpecialtyPhase = {
  phase: number;
  key: string;
  name: string;
  coverageScriptId: string;
  scopeModulePath: string | null;
  routingCertifierPath: string;
  coverageSummaryFile: string;
  routingSummaryFile: string;
  searchSummaryFile: string;
  templateBatchIds: readonly string[];
  primaryOwnershipNotes: string;
};

type OfficialRow = Parameters<typeof selectScopedCodes>[0][number];

export type EnterpriseScopedCode = ScopedOfficialCode & {
  primaryOwner: string;
  primaryFamilyId: string;
};

/** Priority: more specific clinical ownership first (first match wins). */
export const ENTERPRISE_OWNERSHIP_PRIORITY: readonly string[] = [
  "toxicology_envenomation",
  "soft_tissue_wound_infections",
  "human_bite_high_risk_wound",
  "bites_contaminated_wounds",
  "blast_polytrauma",
  "penetrating_trauma",
  "burn",
  "crush_amputation_foreign_body",
  "tendon_ligament",
  "head_facial_trauma",
  "spine_back",
  "eye_emergencies",
  "ent_emergencies",
  "dermatology",
  "environmental_exposure",
  "obgyn_urology",
  "psychiatric_behavioral",
] as const;

export const ENTERPRISE_SPECIALTY_PHASES: EnterpriseSpecialtyPhase[] = [
  {
    phase: 5,
    key: "tendon_ligament",
    name: "Tendon / Ligament",
    coverageScriptId: "icd:coverage",
    scopeModulePath: "./icd10-tendon-ligament-scope",
    routingCertifierPath: "./certify-tendon-ligament-routing",
    coverageSummaryFile: "tendon-coverage.json",
    routingSummaryFile: "fy2026-tendon-ligament-routing-summary.json",
    searchSummaryFile: "fy2026-tendon-ligament-search-summary.json",
    templateBatchIds: ["tendon_injury_adult_complaint_v1", "ligament_injury_adult_complaint_v1"],
    primaryOwnershipNotes: "MSK tendon/ligament injury; distinct from generic sprain when family-specific.",
  },
  {
    phase: 6,
    key: "crush_amputation_foreign_body",
    name: "Crush / Amputation / Foreign Body",
    coverageScriptId: "icd:coverage:crush-amp-fb",
    scopeModulePath: "./icd10-crush-amputation-foreign-body-scope",
    routingCertifierPath: "./certify-crush-amputation-foreign-body-routing",
    coverageSummaryFile: "fy2026-crush-amputation-foreign-body-coverage-summary.json",
    routingSummaryFile: "fy2026-crush-amputation-foreign-body-routing-summary.json",
    searchSummaryFile: "fy2026-crush-amputation-foreign-body-search-summary.json",
    templateBatchIds: ["crush_injury_adult_complaint_v1", "traumatic_amputation_adult_complaint_v1", "foreign_body_adult_complaint_v1"],
    primaryOwnershipNotes: "Crush, amputation, retained FB — not bite or penetrating GSW families.",
  },
  {
    phase: 7,
    key: "burn",
    name: "Burn",
    coverageScriptId: "icd:coverage:burns",
    scopeModulePath: "./icd10-burn-scope",
    routingCertifierPath: "./certify-burn-routing",
    coverageSummaryFile: "fy2026-burn-coverage-summary.json",
    routingSummaryFile: "fy2026-burn-routing-summary.json",
    searchSummaryFile: "fy2026-burn-search-summary.json",
    templateBatchIds: ["burn_injury_adult_complaint_v1"],
    primaryOwnershipNotes: "Thermal/chemical/electrical burns; chemical tox (T54/T55) stays Phase 16.",
  },
  {
    phase: 8,
    key: "penetrating_trauma",
    name: "Penetrating Trauma",
    coverageScriptId: "icd:coverage:penetrating-trauma",
    scopeModulePath: "./icd10-penetrating-trauma-scope",
    routingCertifierPath: "./certify-penetrating-trauma-routing",
    coverageSummaryFile: "fy2026-penetrating-trauma-coverage-summary.json",
    routingSummaryFile: "fy2026-penetrating-trauma-routing-summary.json",
    searchSummaryFile: "fy2026-penetrating-trauma-search-summary.json",
    templateBatchIds: ["penetrating_trauma_adult_complaint_v1"],
    primaryOwnershipNotes: "GSW/stab; bite and blast remain separate provenance.",
  },
  {
    phase: 8,
    key: "human_bite_high_risk_wound",
    name: "Human Bite High-Risk Wound",
    coverageScriptId: "icd:coverage:human-bite",
    scopeModulePath: "./icd10-human-bite-high-risk-wound-scope",
    routingCertifierPath: "./certify-human-bite-high-risk-wound-routing",
    coverageSummaryFile: "fy2026-human-bite-high-risk-wound-coverage-summary.json",
    routingSummaryFile: "fy2026-human-bite-high-risk-wound-routing-summary.json",
    searchSummaryFile: "fy2026-human-bite-high-risk-wound-search-summary.json",
    templateBatchIds: ["human_bite_high_risk_wound_adult_complaint_v1"],
    primaryOwnershipNotes: "W50.3 fight bite; infection complication may overlap Phase 13 secondarily.",
  },
  {
    phase: 8,
    key: "bites_contaminated_wounds",
    name: "Bites / Contaminated Wounds",
    coverageScriptId: "icd:coverage:bites-contaminated-wounds",
    scopeModulePath: "./icd10-bites-contaminated-wounds-scope",
    routingCertifierPath: "./certify-bites-contaminated-wounds-routing",
    coverageSummaryFile: "fy2026-bites-contaminated-wounds-coverage-summary.json",
    routingSummaryFile: "fy2026-bites-contaminated-wounds-routing-summary.json",
    searchSummaryFile: "fy2026-bites-contaminated-wounds-search-summary.json",
    templateBatchIds: ["animal_bite_adult_complaint_v1"],
    primaryOwnershipNotes: "Animal bites W54/W55; human bite W50.3 excluded (dedicated phase).",
  },
  {
    phase: 8,
    key: "blast_polytrauma",
    name: "Blast / Polytrauma",
    coverageScriptId: "icd:coverage:blast-polytrauma",
    scopeModulePath: "./icd10-blast-polytrauma-scope",
    routingCertifierPath: "./certify-blast-polytrauma-routing",
    coverageSummaryFile: "fy2026-blast-polytrauma-coverage-summary.json",
    routingSummaryFile: "fy2026-blast-polytrauma-routing-summary.json",
    searchSummaryFile: "fy2026-blast-polytrauma-search-summary.json",
    templateBatchIds: ["blast_polytrauma_adult_complaint_v1"],
    primaryOwnershipNotes: "Blast mechanism X97–X98; component injuries retain anatomic owners.",
  },
  {
    phase: 9,
    key: "spine_back",
    name: "Spine / Back",
    coverageScriptId: "icd:coverage:spine-back",
    scopeModulePath: "./icd10-spine-back-scope",
    routingCertifierPath: "./certify-spine-back-routing",
    coverageSummaryFile: "fy2026-spine-back-coverage-summary.json",
    routingSummaryFile: "fy2026-spine-back-routing-summary.json",
    searchSummaryFile: "fy2026-spine-back-search-summary.json",
    templateBatchIds: ["spine_back_pain_adult_complaint_v1", "spinal_trauma_adult_complaint_v1"],
    primaryOwnershipNotes: "Spine emergencies; MSK back pain templates secondary for non-emergent strain.",
  },
  {
    phase: 10,
    key: "head_facial_trauma",
    name: "Head / Facial Trauma",
    coverageScriptId: "icd:coverage:head-facial-trauma",
    scopeModulePath: "./icd10-head-facial-trauma-scope",
    routingCertifierPath: "./certify-head-facial-trauma-routing",
    coverageSummaryFile: "fy2026-head-facial-trauma-coverage-summary.json",
    routingSummaryFile: "fy2026-head-facial-trauma-routing-summary.json",
    searchSummaryFile: "fy2026-head-facial-trauma-search-summary.json",
    templateBatchIds: ["head_injury_adult_complaint_v1", "facial_trauma_adult_complaint_v1"],
    primaryOwnershipNotes: "TBI/ICH/skull fracture; concussion S06.0X* before generic head injury.",
  },
  {
    phase: 11,
    key: "eye_emergencies",
    name: "Eye Emergencies",
    coverageScriptId: "icd:coverage:eye-emergencies",
    scopeModulePath: "./icd10-eye-emergencies-scope",
    routingCertifierPath: "./certify-eye-emergencies-routing",
    coverageSummaryFile: "fy2026-eye-emergencies-coverage-summary.json",
    routingSummaryFile: "fy2026-eye-emergencies-routing-summary.json",
    searchSummaryFile: "fy2026-eye-emergencies-search-summary.json",
    templateBatchIds: ["eye_complaint_adult_v1", "eye_trauma_adult_v1"],
    primaryOwnershipNotes: "Ophthalmic emergencies; preseptal L03.213 de-collided from generic cellulitis routing.",
  },
  {
    phase: 12,
    key: "ent_emergencies",
    name: "ENT Emergencies",
    coverageScriptId: "icd:coverage:ent-emergencies",
    scopeModulePath: "./icd10-ent-emergencies-scope",
    routingCertifierPath: "./certify-ent-emergencies-routing",
    coverageSummaryFile: "fy2026-ent-emergencies-coverage-summary.json",
    routingSummaryFile: "fy2026-ent-emergencies-routing-summary.json",
    searchSummaryFile: "fy2026-ent-emergencies-search-summary.json",
    templateBatchIds: ENTERPRISE_SPECIALTY_ADAPTIVE_TEMPLATE_BATCHES.batch22,
    primaryOwnershipNotes: "Deep neck, mastoiditis, epistaxis, airway FB — BATCH22 adaptive templates.",
  },
  {
    phase: 13,
    key: "soft_tissue_wound_infections",
    name: "Soft Tissue / Wound Infections",
    coverageScriptId: "icd:coverage:soft-tissue-wound-infections",
    scopeModulePath: "./icd10-soft-tissue-wound-infections-scope",
    routingCertifierPath: "./certify-soft-tissue-wound-infections-routing",
    coverageSummaryFile: "fy2026-soft-tissue-wound-infections-coverage-summary.json",
    routingSummaryFile: "fy2026-soft-tissue-wound-infections-routing-summary.json",
    searchSummaryFile: "fy2026-soft-tissue-wound-infections-search-summary.json",
    templateBatchIds: ENTERPRISE_SPECIALTY_ADAPTIVE_TEMPLATE_BATCHES.batch23,
    primaryOwnershipNotes: "N49.3 Fournier/NSTI primary before OB/uro N49* generic; M72.6/A48.0 NSTI.",
  },
  {
    phase: 14,
    key: "dermatology",
    name: "Dermatology Emergencies",
    coverageScriptId: "icd:coverage:dermatology",
    scopeModulePath: "./icd10-dermatology-scope",
    routingCertifierPath: "./certify-dermatology-routing",
    coverageSummaryFile: "fy2026-dermatology-coverage-summary.json",
    routingSummaryFile: "fy2026-dermatology-routing-summary.json",
    searchSummaryFile: "fy2026-dermatology-search-summary.json",
    templateBatchIds: ENTERPRISE_SPECIALTY_ADAPTIVE_TEMPLATE_BATCHES.batch24,
    primaryOwnershipNotes: "Bullous/SSSS/TEN; infective cellulitis abscess stays Phase 13.",
  },
  {
    phase: 15,
    key: "environmental_exposure",
    name: "Environmental Exposure",
    coverageScriptId: "icd:coverage:environmental-exposure",
    scopeModulePath: "./icd10-environmental-exposure-scope",
    routingCertifierPath: "./certify-environmental-exposure-routing",
    coverageSummaryFile: "fy2026-environmental-exposure-coverage-summary.json",
    routingSummaryFile: "fy2026-environmental-exposure-routing-summary.json",
    searchSummaryFile: "fy2026-environmental-exposure-search-summary.json",
    templateBatchIds: ENTERPRISE_SPECIALTY_ADAPTIVE_TEMPLATE_BATCHES.batch25,
    primaryOwnershipNotes: "Heat/cold/submersion/electrical; T58 CO stays Phase 16 tox before env.",
  },
  {
    phase: 16,
    key: "toxicology_envenomation",
    name: "Toxicology / Envenomation",
    coverageScriptId: "icd:coverage:toxicology-envenomation",
    scopeModulePath: "./icd10-toxicology-envenomation-scope",
    routingCertifierPath: "./certify-toxicology-envenomation-routing",
    coverageSummaryFile: "fy2026-toxicology-envenomation-coverage-summary.json",
    routingSummaryFile: "fy2026-toxicology-envenomation-routing-summary.json",
    searchSummaryFile: "fy2026-toxicology-envenomation-search-summary.json",
    templateBatchIds: ENTERPRISE_SPECIALTY_ADAPTIVE_TEMPLATE_BATCHES.batch26,
    primaryOwnershipNotes: "T36–T50 medication tox, T58 CO, T63 envenomation; intentional T40* mechanism ownership.",
  },
  {
    phase: 17,
    key: "obgyn_urology",
    name: "OB/GYN / Urology",
    coverageScriptId: "icd:coverage:obgyn-urology",
    scopeModulePath: "./icd10-obgyn-urology-scope",
    routingCertifierPath: "./certify-obgyn-urology-routing",
    coverageSummaryFile: "fy2026-obgyn-urology-coverage-summary.json",
    routingSummaryFile: "fy2026-obgyn-urology-routing-summary.json",
    searchSummaryFile: "fy2026-obgyn-urology-search-summary.json",
    templateBatchIds: ENTERPRISE_SPECIALTY_ADAPTIVE_TEMPLATE_BATCHES.batch27,
    primaryOwnershipNotes: "O00 ectopic, N20 stone, N44 torsion; N49.3 secondary to Phase 13 NSTI.",
  },
  {
    phase: 18,
    key: "psychiatric_behavioral",
    name: "Psychiatric / Behavioral",
    coverageScriptId: "icd:coverage:psychiatric-behavioral",
    scopeModulePath: "./icd10-psychiatric-behavioral-scope",
    routingCertifierPath: "./certify-psychiatric-behavioral-routing",
    coverageSummaryFile: "fy2026-psychiatric-behavioral-coverage-summary.json",
    routingSummaryFile: "fy2026-psychiatric-behavioral-routing-summary.json",
    searchSummaryFile: "fy2026-psychiatric-behavioral-search-summary.json",
    templateBatchIds: ENTERPRISE_SPECIALTY_ADAPTIVE_TEMPLATE_BATCHES.batch28,
    primaryOwnershipNotes:
      "F05 delirium (medical/neuro) not psychosis; F53 postpartum psych primary with OB secondary; R45.851/T14.91 suicide spectrum.",
  },
];

/** Static list of Phase injury → 28 adaptive template IDs (BATCH22–28 + injury MSK adaptive). */
export const ENTERPRISE_ADAPTIVE_TEMPLATE_IDS: readonly string[] = [
  ...ENTERPRISE_INJURY_ADAPTIVE_TEMPLATE_IDS,
  ...Object.values(ENTERPRISE_SPECIALTY_ADAPTIVE_TEMPLATE_BATCHES).flat(),
];

export const ENTERPRISE_SCOPE_SELECTORS: Record<
  string,
  (rows: OfficialRow[], opts?: { billableOnly?: boolean }) => ScopedOfficialCode[]
> = {
  toxicology_envenomation: selectToxicologyEnvenomationScopedCodes,
  soft_tissue_wound_infections: selectSoftTissueWoundInfectionsScopedCodes,
  human_bite_high_risk_wound: selectHumanBiteHighRiskWoundScopedCodes,
  bites_contaminated_wounds: selectBitesContaminatedWoundsScopedCodes,
  blast_polytrauma: selectBlastPolytraumaScopedCodes,
  penetrating_trauma: selectPenetratingTraumaScopedCodes,
  burn: selectBurnScopedCodes,
  crush_amputation_foreign_body: (rows, opts) => [
    ...selectCrushScopedCodes(rows, opts),
    ...selectAmputationScopedCodes(rows, opts),
    ...selectForeignBodyScopedCodes(rows, opts),
  ],
  tendon_ligament: (rows, opts) =>
    selectScopedCodes(rows, [...TENDON_SCOPE_FAMILIES, ...LIGAMENT_SCOPE_FAMILIES], opts),
  head_facial_trauma: selectHeadFacialTraumaScopedCodes,
  spine_back: selectSpineBackScopedCodes,
  eye_emergencies: selectEyeEmergenciesScopedCodes,
  ent_emergencies: selectEntEmergenciesScopedCodes,
  dermatology: selectDermatologyScopedCodes,
  environmental_exposure: selectEnvironmentalExposureScopedCodes,
  obgyn_urology: selectObGynUrologyScopedCodes,
  psychiatric_behavioral: selectPsychiatricBehavioralScopedCodes,
};

export function selectEnterpriseUniqueScopedBillableCodes(
  rows: OfficialRow[],
  opts?: { billableOnly?: boolean },
): EnterpriseScopedCode[] {
  const billableOnly = opts?.billableOnly ?? true;
  const byCode = new Map<string, EnterpriseScopedCode>();

  for (const ownerKey of ENTERPRISE_OWNERSHIP_PRIORITY) {
    const selector = ENTERPRISE_SCOPE_SELECTORS[ownerKey];
    if (!selector) continue;
    for (const row of selector(rows, { billableOnly })) {
      if (byCode.has(row.code)) continue;
      byCode.set(row.code, {
        ...row,
        primaryOwner: ownerKey,
        primaryFamilyId: row.familyId,
      });
    }
  }

  return [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code));
}

export function getEnterprisePhaseByKey(key: string): EnterpriseSpecialtyPhase | undefined {
  return ENTERPRISE_SPECIALTY_PHASES.find((phase) => phase.key === key);
}

export function countEnterpriseScopedBySpecialty(
  rows: OfficialRow[],
  opts?: { billableOnly?: boolean },
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const ownerKey of ENTERPRISE_OWNERSHIP_PRIORITY) {
    const selector = ENTERPRISE_SCOPE_SELECTORS[ownerKey];
    counts[ownerKey] = selector ? selector(rows, opts).length : 0;
  }
  return counts;
}

/** High-risk ownership probes (Part 5). */
export type EnterpriseOwnershipProbe = {
  id: string;
  codePattern: string;
  match: "exact" | "prefix";
  expectedPrimaryOwner: string;
  expectedFamilyId?: string;
  forbiddenFamilyIds?: string[];
  notes?: string;
};

export const ENTERPRISE_OWNERSHIP_PROBES: EnterpriseOwnershipProbe[] = [
  {
    id: "fournier_n493",
    codePattern: "N49.3",
    match: "prefix",
    expectedPrimaryOwner: "soft_tissue_wound_infections",
    expectedFamilyId: "sti_fournier",
    notes: "Fournier → soft_tissue / nsti before OB/uro N49*",
  },
  {
    id: "kidney_stone_n20",
    codePattern: "N20",
    match: "prefix",
    expectedPrimaryOwner: "obgyn_urology",
    expectedFamilyId: "ob_uro_n20",
    notes: "N20 → urology/kidney_stone",
  },
  {
    id: "delirium_f05",
    codePattern: "F05",
    match: "prefix",
    expectedPrimaryOwner: "psychiatric_behavioral",
    expectedFamilyId: "psych_f05",
    forbiddenFamilyIds: ["psych_f20", "psych_f29", "psych_f31"],
    notes: "F05 delirium (medical/neuro) not psychosis",
  },
  {
    id: "postpartum_f531",
    codePattern: "F53.1",
    match: "prefix",
    expectedPrimaryOwner: "psychiatric_behavioral",
    expectedFamilyId: "psych_f53",
    notes: "F53.1 postpartum_psychiatric; OB secondary for O90* complications only",
  },
  {
    id: "suicidal_ideation_r45851",
    codePattern: "R45.851",
    match: "prefix",
    expectedPrimaryOwner: "psychiatric_behavioral",
    expectedFamilyId: "psych_suicide_r45851",
  },
  {
    id: "suicide_attempt_t1491",
    codePattern: "T14.91",
    match: "prefix",
    expectedPrimaryOwner: "psychiatric_behavioral",
    expectedFamilyId: "psych_suicide_t1491",
  },
  {
    id: "intentional_t40",
    codePattern: "T40",
    match: "prefix",
    expectedPrimaryOwner: "toxicology_envenomation",
    notes: "T40.* intentional — tox ownership for poisoning mechanism",
  },
  {
    id: "carbon_monoxide_t58",
    codePattern: "T58",
    match: "prefix",
    expectedPrimaryOwner: "toxicology_envenomation",
    notes: "T58 CO before environmental heat/inhalation overlap",
  },
  {
    id: "envenomation_t63",
    codePattern: "T63",
    match: "prefix",
    expectedPrimaryOwner: "toxicology_envenomation",
    expectedFamilyId: "tox_envenomation_t63",
  },
  {
    id: "ectopic_o00",
    codePattern: "O00",
    match: "prefix",
    expectedPrimaryOwner: "obgyn_urology",
    expectedFamilyId: "ob_obstetric_o00",
  },
  {
    id: "testicular_torsion_n44",
    codePattern: "N44",
    match: "prefix",
    expectedPrimaryOwner: "obgyn_urology",
    expectedFamilyId: "ob_uro_n44",
  },
  {
    id: "heat_exhaustion_t674",
    codePattern: "T67.4",
    match: "prefix",
    expectedPrimaryOwner: "environmental_exposure",
    notes: "Heat illness env before generic tox",
  },
  {
    id: "necrotizing_m726",
    codePattern: "M72.6",
    match: "prefix",
    expectedPrimaryOwner: "soft_tissue_wound_infections",
    expectedFamilyId: "sti_necrotizing_fasciitis",
  },
];

const norm = (code: string) => code.replace(/\./g, "").toUpperCase();

export function codeMatchesPattern(code: string, pattern: string, match: "exact" | "prefix"): boolean {
  const c = norm(code);
  const p = norm(pattern);
  return match === "exact" ? c === p : c.startsWith(p);
}

export function resolveEnterpriseOwnershipForCode(
  scoped: EnterpriseScopedCode[],
  probe: EnterpriseOwnershipProbe,
): EnterpriseScopedCode | undefined {
  return scoped.find((row) => codeMatchesPattern(row.code, probe.codePattern, probe.match));
}
