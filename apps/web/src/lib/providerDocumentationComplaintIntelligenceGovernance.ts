/**
 * Phase 19MDM.2 — Complaint-intelligence unsafe phrase governance (advisory / test gate).
 * Blocks certainty language, false-negative imaging/labs claims, and mandatory disposition directives.
 */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import { flattenComplaintIntelligenceKeys } from "./providerDocumentationComplaintIntelligence";

export type ComplaintIntelligenceUnsafePhraseRule = {
  id: string;
  pattern: RegExp;
};

export const COMPLAINT_INTELLIGENCE_UNSAFE_PHRASE_RULES: readonly ComplaintIntelligenceUnsafePhraseRule[] =
  [
    { id: "appendicitis_ruled_out", pattern: /\bappendicitis\s+ruled\s+out\b/i },
    { id: "obstruction_ruled_out", pattern: /\bobstruction\s+ruled\s+out\b/i },
    { id: "gi_bleed_ruled_out", pattern: /\b(gi\s*bleed|gastrointestinal\s+bleed)\s+ruled\s+out\b/i },
    { id: "perforation_ruled_out", pattern: /\bperforation\s+ruled\s+out\b/i },
    { id: "surgical_abdomen_ruled_out", pattern: /\bsurgical\s+abdomen\s+ruled\s+out\b/i },
    { id: "ct_normal", pattern: /\bct\s+normal\b/i },
    { id: "labs_normal", pattern: /\blabs\s+normal\b/i },
    { id: "imaging_negative", pattern: /\bimaging\s+negative\b/i },
    { id: "no_acute_process", pattern: /\bno\s+acute\s+process\b/i },
    { id: "benign_abdomen", pattern: /\bbenign\s+abdomen\b/i },
    { id: "safe_for_discharge", pattern: /\bsafe\s+for\s+discharge\b/i },
    { id: "medically_cleared", pattern: /\bmedically\s+cleared\b/i },
    { id: "stable_for_discharge", pattern: /\bstable\s+for\s+discharge\b/i },
    { id: "tolerating_po_without_issue", pattern: /\btolerating\s+po\s+without\s+issue\b/i },
    { id: "pain_resolved", pattern: /\bpain\s+resolved\b/i },
    { id: "no_serious_pathology", pattern: /\bno\s+serious\s+pathology\b/i },
    { id: "must_discharge", pattern: /\bmust\s+discharge\b/i },
    { id: "must_admit", pattern: /\bmust\s+admit\b/i },
    { id: "definitive_diagnosis", pattern: /\bdefinitive\s+diagnosis\b/i },
    { id: "ruled_out_generic", pattern: /\bruled\s+out\b/i },
    { id: "workup_negative", pattern: /\bworkup\s+negative\b/i },
    { id: "patient_stable", pattern: /\bpatient\s+stable\b/i },
    // Phase 19MDM.3 — respiratory / ENT
    { id: "pneumonia_ruled_out", pattern: /\bpneumonia\s+ruled\s+out\b/i },
    { id: "pe_ruled_out", pattern: /\b(pe|pulmonary\s+embolism)\s+ruled\s+out\b/i },
    { id: "acs_ruled_out", pattern: /\b(acs|acute\s+coronary\s+syndrome)\s+ruled\s+out\b/i },
    { id: "respiratory_failure_ruled_out", pattern: /\brespiratory\s+failure\s+ruled\s+out\b/i },
    { id: "sepsis_ruled_out", pattern: /\bsepsis\s+ruled\s+out\b/i },
    { id: "covid_negative", pattern: /\bcovid\s+negative\b/i },
    { id: "flu_negative", pattern: /\bflu\s+negative\b/i },
    { id: "cxr_normal", pattern: /\b(chest\s+x-?ray|cxr)\s+normal\b/i },
    { id: "d_dimer_negative", pattern: /\bd-?dimer\s+negative\b/i },
    { id: "oxygen_saturation_normal", pattern: /\boxygen\s+saturation\s+normal\b/i },
    { id: "lungs_clear", pattern: /\blungs\s+clear\b/i },
    { id: "no_respiratory_distress", pattern: /\bno\s+respiratory\s+distress\b/i },
    { id: "no_pneumonia", pattern: /\bno\s+pneumonia\b/i },
    { id: "no_pe", pattern: /\bno\s+pe\b/i },
    { id: "symptoms_resolved", pattern: /\bsymptoms\s+resolved\b/i },
    // Phase 19MDM.4 — cardiac / vascular
    { id: "mi_ruled_out", pattern: /\b(mi|heart\s+attack)\s+ruled\s+out\b/i },
    { id: "dvt_ruled_out", pattern: /\bdvt\s+ruled\s+out\b/i },
    { id: "stroke_ruled_out", pattern: /\bstroke\s+ruled\s+out\b/i },
    { id: "tia_ruled_out", pattern: /\btia\s+ruled\s+out\b/i },
    { id: "hypertensive_emergency_ruled_out", pattern: /\bhypertensive\s+emergency\s+ruled\s+out\b/i },
    { id: "chf_resolved", pattern: /\b(chf|heart\s+failure)\s+resolved\b/i },
    { id: "ekg_normal", pattern: /\b(ekg|ecg)\s+normal\b/i },
    { id: "troponin_negative", pattern: /\btroponins?\s+negative\b/i },
    { id: "cardiac_enzymes_negative", pattern: /\bcardiac\s+enzymes\s+negative\b/i },
    { id: "ultrasound_negative", pattern: /\bultrasound\s+negative\b/i },
    { id: "ct_negative", pattern: /\bct\s+negative\b/i },
    { id: "vitals_normal", pattern: /\bvitals\s+normal\b/i },
    { id: "telemetry_normal", pattern: /\btelemetry\s+normal\b/i },
    { id: "low_cardiac_risk", pattern: /\blow\s+cardiac\s+risk\b/i },
    { id: "low_risk_chest_pain", pattern: /\blow\s+risk\s+chest\s+pain\b/i },
    { id: "no_dvt", pattern: /\bno\s+dvt\b/i },
    { id: "no_acs", pattern: /\bno\s+acs\b/i },
    { id: "no_heart_problem", pattern: /\bno\s+heart\s+problem\b/i },
    { id: "rate_controlled_permanently", pattern: /\brate\s+controlled\s+permanently\b/i },
    { id: "anticoagulation_not_needed", pattern: /\banticoagulation\s+not\s+needed\b/i },
    { id: "stroke_risk_low", pattern: /\bstroke\s+risk\s+low\b/i },
    { id: "blood_clot_ruled_out", pattern: /\bblood\s+clot\s+ruled\s+out\b/i },
    // Phase 19MDM.5 — GU / renal
    { id: "uti_ruled_out", pattern: /\buti\s+ruled\s+out\b/i },
    { id: "pyelonephritis_ruled_out", pattern: /\bpyelonephritis\s+ruled\s+out\b/i },
    { id: "torsion_ruled_out", pattern: /\btorsion\s+ruled\s+out\b/i },
    { id: "ectopic_ruled_out", pattern: /\bectopic\s+ruled\s+out\b/i },
    { id: "sti_ruled_out", pattern: /\bsti\s+ruled\s+out\b/i },
    { id: "kidney_stone_ruled_out", pattern: /\bkidney\s+stone\s+ruled\s+out\b/i },
    { id: "renal_failure_ruled_out", pattern: /\brenal\s+failure\s+ruled\s+out\b/i },
    { id: "ua_negative", pattern: /\bua\s+negative\b/i },
    { id: "urine_culture_negative", pattern: /\burine\s+culture\s+negative\b/i },
    { id: "ultrasound_normal", pattern: /\bultrasound\s+normal\b/i },
    { id: "renal_function_normal", pattern: /\brenal\s+function\s+normal\b/i },
    { id: "creatinine_normal", pattern: /\bcreatinine\s+normal\b/i },
    { id: "no_infection", pattern: /\bno\s+infection\b/i },
    { id: "benign_gu_exam", pattern: /\bbenign\s+gu\s+exam\b/i },
    { id: "no_emergency_condition", pattern: /\bno\s+emergency\s+condition\b/i },
    { id: "stone_passed", pattern: /\bstone\s+passed\b/i },
    { id: "torsion_excluded", pattern: /\btorsion\s+excluded\b/i },
  ];

export function complaintIntelligenceTextViolations(text: string): string[] {
  const violations: string[] = [];
  for (const rule of COMPLAINT_INTELLIGENCE_UNSAFE_PHRASE_RULES) {
    if (rule.pattern.test(text)) violations.push(rule.id);
  }
  return violations;
}

export function collectComplaintIntelResolvedText(
  bundle: ProviderDocumentationComplaintIntelligence,
  resolveFragment: (key: string) => string
): string {
  return flattenComplaintIntelligenceKeys(bundle)
    .map((key) => resolveFragment(key))
    .join("\n");
}

export function scanComplaintIntelligenceBundleForUnsafePhrases(
  bundle: ProviderDocumentationComplaintIntelligence,
  resolveFragment: (key: string) => string
): string[] {
  const text = collectComplaintIntelResolvedText(bundle, resolveFragment);
  return complaintIntelligenceTextViolations(text);
}
