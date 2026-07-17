/**
 * Consolidated discharge routing prefix maps for enterprise diagnostic intelligence (Phase 19).
 * Sourced from Phase 12–18 specialty routing certifiers; longest-prefix wins across all entries.
 */

export type DischargeRoutingPrefixEntry = { family: string; prefixes: string[] };

const n = (code: string) => code.toUpperCase().replace(/\./g, "");

/** High-risk enterprise routing probes — expected family per code/prefix. */
export const ENTERPRISE_ROUTING_PROBE_EXPECTATIONS: Array<{
  label: string;
  code: string;
  expectedFamily: string;
}> = [
  { label: "Fournier gangrene", code: "N49.3", expectedFamily: "necrotizing_soft_tissue_infection_post_acute" },
  { label: "Kidney stone", code: "N20.0", expectedFamily: "kidney_stone" },
  { label: "Delirium", code: "F05.9", expectedFamily: "delirium_post_acute_v1" },
  { label: "Postpartum psychiatric", code: "F53.1", expectedFamily: "postpartum_psychiatric_crisis_post_acute_v1" },
  { label: "Suicidal ideation", code: "R45.851", expectedFamily: "suicidal_ideation_post_assessment_v1" },
  { label: "Suicide attempt", code: "T14.91", expectedFamily: "suicide_attempt_post_acute_v1" },
  { label: "Medication poisoning", code: "T40.0X1A", expectedFamily: "tox_medication_poisoning" },
  { label: "Carbon monoxide", code: "T58.01XA", expectedFamily: "tox_nonmedicinal" },
  { label: "Envenomation", code: "T63.001A", expectedFamily: "tox_envenomation" },
  { label: "Ectopic pregnancy", code: "O00.101", expectedFamily: "obgyn_ectopic_pregnancy" },
  { label: "Testicular torsion", code: "N44.00", expectedFamily: "urology_testicular_torsion" },
  { label: "Heat exhaustion", code: "T67.4XXA", expectedFamily: "env_heat_illness" },
  { label: "Necrotizing fasciitis", code: "M72.6", expectedFamily: "necrotizing_soft_tissue_infection_post_acute" },
  { label: "Penetrating trauma chest", code: "S21.101A", expectedFamily: "trauma_penetrating_chest" },
  { label: "Burn hand", code: "T23.012A", expectedFamily: "trauma_burn_hand" },
];

/** Prefix maps merged from specialty routing certifiers (Phase 12–18). */
export const ENTERPRISE_DISCHARGE_ROUTING_PREFIXES: DischargeRoutingPrefixEntry[] = [
  // Psychiatric / behavioral (Phase 18)
  { family: "suicidal_ideation_post_assessment_v1", prefixes: ["R45.851"] },
  { family: "suicide_attempt_post_acute_v1", prefixes: ["T14.91"] },
  {
    family: "self_harm_post_assessment_v1",
    prefixes: ["X71", "X72", "X73", "X74", "X75", "X76", "X77", "X78", "X80", "X81", "X82", "X83", "Z91.5", "Z91.51", "Z91.52"],
  },
  { family: "behavioral_agitation_post_acute_v1", prefixes: ["R45.1"] },
  { family: "catatonia_post_acute_v1", prefixes: ["F06.1", "F20.2"] },
  { family: "psychosis_post_acute_v1", prefixes: ["F20", "F21", "F22", "F23", "F24", "F25", "F28", "F29"] },
  { family: "mania_post_acute_v1", prefixes: ["F30", "F31"] },
  { family: "depression_crisis_v1", prefixes: ["F32", "F33", "F34", "F39"] },
  { family: "anxiety_panic_crisis_v1", prefixes: ["F40", "F41"] },
  { family: "acute_stress_reaction_v1", prefixes: ["F43"] },
  { family: "behavioral_health_crisis", prefixes: ["F42", "F44", "F45", "F48", "R45.89", "R45.850", "T74", "T76", "Y07"] },
  { family: "delirium_post_acute_v1", prefixes: ["F05", "R41.0", "R41.82"] },
  { family: "dementia_behavior_change_v1", prefixes: ["F01", "F02", "F03", "R41.3"] },
  {
    family: "substance_induced_behavioral_crisis_v1",
    prefixes: ["F10", "F11", "F12", "F13", "F14", "F15", "F16", "F17", "F18", "F19"],
  },
  { family: "eating_disorder_medical_followup_v1", prefixes: ["F50"] },
  { family: "postpartum_psychiatric_crisis_post_acute_v1", prefixes: ["F53"] },
  { family: "pediatric_behavioral_crisis_v1", prefixes: ["F84", "F90", "F91", "F98", "F70", "F71", "F72", "F73", "F78", "F79"] },
  { family: "informed_refusal_v1", prefixes: ["Z53.2"] },
  { family: "against_medical_advice_v1", prefixes: ["Z53.9", "Z91.19"] },
  { family: "behavioral_health_safety_plan_v1", prefixes: ["Z04.6"] },
  { family: "crisis_resource_followup_v1", prefixes: ["Z75", "Z03.89"] },
  // Toxicology (Phase 16)
  {
    family: "tox_medication_poisoning",
    prefixes: ["T36", "T37", "T38", "T39", "T40", "T41", "T42", "T43", "T44", "T45", "T46", "T47", "T48", "T49", "T50"],
  },
  { family: "tox_nonmedicinal", prefixes: ["T51", "T52", "T53", "T54", "T55", "T56", "T57", "T58", "T59", "T60", "T61", "T62", "T64", "T65"] },
  { family: "tox_envenomation", prefixes: ["T63"] },
  { family: "tox_substance_use", prefixes: ["F10", "F11", "F12", "F13", "F14", "F15", "F16", "F17", "F18", "F19"] },
  { family: "tox_serotonin", prefixes: ["G90.81"] },
  { family: "tox_nms", prefixes: ["G21.0"] },
  { family: "tox_methemoglobin", prefixes: ["D74.8", "D74.9"] },
  // Environmental (Phase 15) — from certify-environmental-exposure-routing.ts
  { family: "env_heat_illness", prefixes: ["T67", "X30", "W92", "X32"] },
  { family: "env_cold_illness", prefixes: ["T68", "T69", "X31", "W93"] },
  { family: "env_frostbite_dual", prefixes: ["T33", "T34", "T35"] },
  { family: "env_submersion", prefixes: ["T75.1", "W65", "W67", "W69", "W73", "W74"] },
  { family: "env_lightning", prefixes: ["T75.0"] },
  { family: "env_electrocution", prefixes: ["T75.4"] },
  // Burn (Phase 7) — from certify-burn-routing.ts
  { family: "trauma_burn_hand", prefixes: ["T23.0", "T23.1", "T23.2", "T23.3"] },
  { family: "trauma_burn_face", prefixes: ["T20.0", "T20.1", "T20.2", "T20.3"] },
  { family: "trauma_burn_generic", prefixes: ["T21", "T22", "T24", "T28", "T30", "T31"] },
  // Penetrating trauma (Phase 8)
  { family: "trauma_penetrating_chest", prefixes: ["S21.1", "S21.2", "S21.3", "S21.4", "S25", "S26", "S27"] },
  { family: "trauma_penetrating_abdomen", prefixes: ["S31.0", "S31.1", "S31.5", "S31.6", "S31.8", "S35", "S36", "S37"] },
  { family: "trauma_penetrating_head", prefixes: ["S01.0", "S01.1", "S01.2", "S01.3", "S01.4", "S01.5", "S01.8", "S01.9"] },
  { family: "obgyn_ectopic_pregnancy", prefixes: ["O00"] },
  { family: "obgyn_molar_pregnancy", prefixes: ["O01"] },
  { family: "obgyn_pregnancy_unknown_location", prefixes: ["O02.81"] },
  { family: "obgyn_abnormal_products", prefixes: ["O02"] },
  { family: "obgyn_spontaneous_abortion", prefixes: ["O03"] },
  { family: "obgyn_termination_complications", prefixes: ["O04", "O07", "O08"] },
  { family: "obgyn_hypertensive_disorders", prefixes: ["O10", "O11", "O12", "O13", "O14", "O15", "O16"] },
  { family: "obgyn_threatened_miscarriage", prefixes: ["O20.0"] },
  { family: "obgyn_early_pregnancy_bleeding", prefixes: ["O20"] },
  { family: "obgyn_hyperemesis", prefixes: ["O21"] },
  { family: "obgyn_gu_infection_pregnancy", prefixes: ["O23"] },
  { family: "obgyn_maternal_care_other", prefixes: ["O26"] },
  { family: "obgyn_prom_previa_abruption", prefixes: ["O42", "O44", "O45", "O46"] },
  { family: "obgyn_false_labor", prefixes: ["O47"] },
  { family: "obgyn_preterm_labor", prefixes: ["O60"] },
  { family: "obgyn_postpartum_hemorrhage", prefixes: ["O72"] },
  { family: "obgyn_retained_placenta", prefixes: ["O73"] },
  { family: "obgyn_puerperal_infection", prefixes: ["O85", "O86"] },
  { family: "obgyn_puerperal_complications", prefixes: ["O90"] },
  { family: "obgyn_labor_delivery_complications", prefixes: ["O62", "O63", "O64", "O65", "O66", "O67", "O68", "O69", "O70", "O71", "O74", "O75"] },
  { family: "obgyn_fetal_maternal_care", prefixes: ["O30", "O31", "O32", "O33", "O34", "O35", "O36", "O40", "O41", "O43", "O48"] },
  { family: "obgyn_maternal_disease", prefixes: ["O98", "O99"] },
  { family: "obgyn_gestation_weeks", prefixes: ["Z3A"] },
  { family: "obgyn_pregnancy_encounters", prefixes: ["Z32", "Z33", "Z34"] },
  { family: "obgyn_postpartum_encounter", prefixes: ["Z39"] },
  { family: "obgyn_pid", prefixes: ["N70", "N71", "N72", "N73", "N74"] },
  { family: "obgyn_tubo_ovarian_abscess", prefixes: ["N70.03"] },
  { family: "obgyn_bartholin", prefixes: ["N75"] },
  { family: "obgyn_vulvovaginal_inflammation", prefixes: ["N76"] },
  { family: "obgyn_endometriosis", prefixes: ["N80"] },
  { family: "obgyn_ovarian_torsion", prefixes: ["N83.5"] },
  { family: "obgyn_ovarian_cyst", prefixes: ["N83.2"] },
  { family: "obgyn_ovarian_disorders", prefixes: ["N83"] },
  { family: "obgyn_uterine_disorders", prefixes: ["N85"] },
  { family: "obgyn_menstrual_bleeding", prefixes: ["N92", "N93"] },
  { family: "obgyn_bleeding_pelvic_pain", prefixes: ["N94"] },
  { family: "obgyn_menopausal", prefixes: ["N95"] },
  { family: "obgyn_postprocedural", prefixes: ["N99"] },
  { family: "obgyn_iud_complication", prefixes: ["T83.3"] },
  { family: "obgyn_vaginitis", prefixes: ["A59.0", "B37.3", "A60"] },
  { family: "necrotizing_soft_tissue_infection_post_acute", prefixes: ["N49.3", "M72.6", "A48.0"] },
  { family: "urology_pyelonephritis", prefixes: ["N10", "N12"] },
  { family: "urology_obstructive_uropathy", prefixes: ["N13"] },
  { family: "kidney_stone", prefixes: ["N20", "N21", "N23"] },
  { family: "uti_urinary_symptoms", prefixes: ["N30", "N39", "R30"] },
  { family: "urology_prostatitis", prefixes: ["N41"] },
  { family: "urology_testicular_torsion", prefixes: ["N44"] },
  { family: "urology_epididymitis_orchitis", prefixes: ["N45"] },
  { family: "urology_scrotal_disorders", prefixes: ["N43", "N49", "N50"] },
  { family: "urology_prepuce", prefixes: ["N47"] },
  { family: "urology_penis_disorders", prefixes: ["N48"] },
  { family: "hematuria", prefixes: ["R31"] },
  { family: "urinary_retention", prefixes: ["R33"] },
  { family: "urology_urinary_symptoms", prefixes: ["R39"] },
  { family: "urology_gu_device_complication", prefixes: ["T83"] },
  { family: "gu_trauma_organ_injury", prefixes: ["S37"] },
  { family: "gu_trauma_genital_contusion", prefixes: ["S30.2"] },
  { family: "gu_trauma_genital_open_wound", prefixes: ["S31.2"] },
];

export function bestEnterpriseDischargeFamily(code: string): { family: string; length: number } | null {
  let best: { family: string; length: number } | null = null;
  for (const entry of ENTERPRISE_DISCHARGE_ROUTING_PREFIXES) {
    for (const prefix of entry.prefixes) {
      const length = n(prefix).length;
      if (n(code).startsWith(n(prefix)) && (!best || length > best.length)) {
        best = { family: entry.family, length };
      }
    }
  }
  return best;
}
