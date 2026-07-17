/**
 * Static snapshot of enterprise adaptive template IDs/titles/phases (Phase 19 Commit 2).
 * Hand-maintained for specialty adaptive templates BATCH22–28 + injury MSK adaptive set.
 */

export const TOTAL_VISIBLE_TEMPLATES = 172;

/** Phase injury MSK/adaptive templates (29 templates from MSK_TRAUMA_COMPLAINT_V1). */
export const ENTERPRISE_INJURY_ADAPTIVE_TEMPLATE_IDS = [
  "back_pain_complaint_v1",
  "neck_pain_complaint_v1",
  "shoulder_injury_complaint_v1",
  "knee_injury_complaint_v1",
  "ankle_foot_injury_complaint_v1",
  "hip_pain_injury_complaint_v1",
  "hand_wrist_injury_complaint_v1",
  "fall_trauma_complaint_v1",
  "minor_head_injury_complaint_v1",
  "laceration_soft_tissue_complaint_v1",
  "animal_bite_adult_complaint_v1",
  "human_bite_high_risk_wound_adult_complaint_v1",
  "fracture_adult_complaint_v1",
  "dislocation_adult_complaint_v1",
  "sprain_strain_adult_complaint_v1",
  "tendon_injury_adult_complaint_v1",
  "ligament_injury_adult_complaint_v1",
  "crush_injury_adult_complaint_v1",
  "traumatic_amputation_adult_complaint_v1",
  "foreign_body_adult_complaint_v1",
  "burn_injury_adult_complaint_v1",
  "penetrating_trauma_adult_complaint_v1",
  "blast_polytrauma_adult_complaint_v1",
  "spine_back_pain_adult_complaint_v1",
  "spinal_trauma_adult_complaint_v1",
  "head_injury_adult_complaint_v1",
  "facial_trauma_adult_complaint_v1",
  "eye_complaint_adult_v1",
  "eye_trauma_adult_v1",
] as const;

export const ENTERPRISE_SPECIALTY_ADAPTIVE_TEMPLATE_BATCHES = {
  batch22: [
    "ent_ear_hearing_vertigo_adult_v1",
    "ent_nose_epistaxis_adult_v1",
    "ent_throat_neck_airway_adult_v1",
  ],
  batch23: [
    "soft_tissue_infection_adult_v1",
    "abscess_purulent_infection_adult_v1",
    "high_risk_wound_infection_adult_v1",
  ],
  batch24: [
    "dermatologic_rash_adult_v1",
    "allergic_inflammatory_dermatology_adult_v1",
    "vesicular_bullous_skin_disorder_adult_v1",
    "dermatologic_emergency_adult_v1",
  ],
  batch25: [
    "heat_environmental_illness_adult_v1",
    "cold_environmental_injury_adult_v1",
    "submersion_electrical_lightning_adult_v1",
    "altitude_diving_radiation_exposure_adult_v1",
  ],
  batch26: [
    "toxic_ingestion_overdose_adult_v1",
    "substance_intoxication_withdrawal_adult_v1",
    "inhaled_industrial_toxic_exposure_adult_v1",
    "envenomation_poisonous_exposure_adult_v1",
  ],
  batch27: [
    "early_pregnancy_bleeding_pain_v1",
    "late_pregnancy_labor_emergency_v1",
    "hypertensive_postpartum_obstetric_emergency_v1",
    "acute_gynecologic_pelvic_complaint_v1",
    "renal_urinary_emergency_v1",
    "acute_scrotal_penile_emergency_v1",
  ],
  batch28: [
    "suicide_self_harm_risk_v1",
    "psychosis_mania_behavioral_crisis_v1",
    "depression_anxiety_trauma_crisis_v1",
    "delirium_catatonia_cognitive_behavior_change_v1",
    "pediatric_developmental_behavioral_emergency_v1",
    "capacity_refusal_safety_disposition_v1",
  ],
} as const;

export type EnterpriseTemplateInventoryEntry = {
  id: string;
  phase: number | "injury";
  batch: string;
  titleEnKey: string;
  titleFrKey: string;
};

const titleKey = (id: string) => `providerDocumentationWorkspace.template_${id.replace(/_v1$/, "").replace(/_adult_v1$/, "")}`;

function buildInventory(): EnterpriseTemplateInventoryEntry[] {
  const entries: EnterpriseTemplateInventoryEntry[] = [];
  for (const id of ENTERPRISE_INJURY_ADAPTIVE_TEMPLATE_IDS) {
    entries.push({
      id,
      phase: "injury",
      batch: "injury_msk_adaptive",
      titleEnKey: titleKey(id),
      titleFrKey: titleKey(id),
    });
  }
  const batchMeta: Array<{ batch: keyof typeof ENTERPRISE_SPECIALTY_ADAPTIVE_TEMPLATE_BATCHES; phase: number }> = [
    { batch: "batch22", phase: 12 },
    { batch: "batch23", phase: 13 },
    { batch: "batch24", phase: 14 },
    { batch: "batch25", phase: 15 },
    { batch: "batch26", phase: 16 },
    { batch: "batch27", phase: 17 },
    { batch: "batch28", phase: 18 },
  ];
  for (const { batch, phase } of batchMeta) {
    for (const id of ENTERPRISE_SPECIALTY_ADAPTIVE_TEMPLATE_BATCHES[batch]) {
      entries.push({
        id,
        phase,
        batch,
        titleEnKey: titleKey(id),
        titleFrKey: titleKey(id),
      });
    }
  }
  return entries;
}

export const ENTERPRISE_TEMPLATE_INVENTORY: EnterpriseTemplateInventoryEntry[] = buildInventory();

/** Phase 19 must not introduce new adaptive templates beyond the frozen inventory. */
export const PHASE_19_NEW_TEMPLATE_IDS: readonly string[] = [];
