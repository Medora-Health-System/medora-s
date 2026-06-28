/**
 * MEDUI.CARE_PROCEDURES.EXPANSION_WAVE_1_STAFF_ORDERS.2
 * Generated from exports/care-procedures-wave1-staff-orders.csv — do not edit by hand.
 * Regenerate: node packages/shared/scripts/generate-care-procedures-wave1-manifest.mjs
 */
import type { CanonicalCareProcedureCategory } from "./canonicalCareProcedureCategories.js";
import type { EnterpriseProcedureExecutionRoleCategory } from "./enterpriseProcedureCatalog.js";

export type Wave1StaffOrderAliasMerge = {
  canonicalCode: string;
  aliases: string[];
};

export type Wave1StaffOrderNewRow = {
  code: string;
  displayNameEn: string;
  displayNameFr: string;
  category: CanonicalCareProcedureCategory;
  aliases: string[];
  executionRoleCategory: EnterpriseProcedureExecutionRoleCategory;
  orderable: boolean;
  isActive: boolean;
  requiresProviderOrder: boolean;
  nursingProtocolAllowed: boolean;
  requiresClinicalNote: boolean;
};

export const WAVE1_STAFF_ORDER_ALIAS_MERGES: Wave1StaffOrderAliasMerge[] = [
  {
    "canonicalCode": "ambulation_trial",
    "aliases": [
      "Ambulate Patient"
    ]
  },
  {
    "canonicalCode": "ice_pack",
    "aliases": [
      "Apply Ice to Affected Area"
    ]
  },
  {
    "canonicalCode": "bladder_scan",
    "aliases": [
      "Bladder Scan"
    ]
  },
  {
    "canonicalCode": "cervical_collar",
    "aliases": [
      "C Collar",
      "Soft Collar"
    ]
  },
  {
    "canonicalCode": "continuous_cardiac_monitoring",
    "aliases": [
      "Cardiac Monitoring",
      "Continuous Cardiac Monitoring"
    ]
  },
  {
    "canonicalCode": "central_line_placement",
    "aliases": [
      "Central Line Insertion Setup",
      "Set Up Central Line"
    ]
  },
  {
    "canonicalCode": "chest_tube",
    "aliases": [
      "Chest Tube Setup",
      "Set Up Chest Tube"
    ]
  },
  {
    "canonicalCode": "blood_culture_collection",
    "aliases": [
      "Collect Blood Culture Prior to Starting Antibiotic"
    ]
  },
  {
    "canonicalCode": "psychiatry_consult",
    "aliases": [
      "Consult Behavioral Health",
      "Psych Evaluation Call"
    ]
  },
  {
    "canonicalCode": "cardiology_consult",
    "aliases": [
      "Consult Cardiology"
    ]
  },
  {
    "canonicalCode": "neurology_consult",
    "aliases": [
      "Consult Neurology"
    ]
  },
  {
    "canonicalCode": "orthopedics_consult",
    "aliases": [
      "Consult Orthopedic Surgery"
    ]
  },
  {
    "canonicalCode": "social_work_consult",
    "aliases": [
      "Consult Social Services"
    ]
  },
  {
    "canonicalCode": "consult_poison_control",
    "aliases": [
      "Contact Poison Control"
    ]
  },
  {
    "canonicalCode": "crutches",
    "aliases": [
      "Crutches"
    ]
  },
  {
    "canonicalCode": "vitals_q15_document",
    "aliases": [
      "Document Vital Signs in Chart No More Than Every 15 Minutes"
    ]
  },
  {
    "canonicalCode": "vitals_q30_document",
    "aliases": [
      "Document Vital Signs in Chart No More Than Every 30 Minutes"
    ]
  },
  {
    "canonicalCode": "wound_care",
    "aliases": [
      "Dress Wounds"
    ]
  },
  {
    "canonicalCode": "dressing_change",
    "aliases": [
      "Wet-to-Dry Dressing Change"
    ]
  },
  {
    "canonicalCode": "ekg_ecg",
    "aliases": [
      "EKG 12 Lead",
      "EKG 12 Lead at 3 Hours",
      "EKG 12 Lead at 6 Hours",
      "Repeat EKG 12 Lead",
      "Third Repeat EKG 12 Lead"
    ]
  },
  {
    "canonicalCode": "warm_blanket",
    "aliases": [
      "Give Warm Blanket",
      "Warm Blanket"
    ]
  },
  {
    "canonicalCode": "foley_catheter",
    "aliases": [
      "Insert Indwelling Foley Catheter"
    ]
  },
  {
    "canonicalCode": "peripheral_iv_placement",
    "aliases": [
      "IV Saline Lock",
      "Saline Lock IV"
    ]
  },
  {
    "canonicalCode": "restraints_application",
    "aliases": [
      "Leather Restraints Protocol",
      "Soft Restraints Per Protocol",
      "Restraints Non-Violent or Non-Self-Destructive",
      "Violent or Self-Destructive Restraints Adult 18+"
    ]
  },
  {
    "canonicalCode": "trauma_team_activation",
    "aliases": [
      "Level I Trauma Activation / Full Trauma Activation",
      "Level II Trauma Activation / Modified Trauma Activation",
      "Level III Trauma Activation / Trauma Alert Consult"
    ]
  },
  {
    "canonicalCode": "lumbar_puncture",
    "aliases": [
      "LP Tray",
      "LP Tray to Bedside",
      "Set Up Lumbar Puncture Tray"
    ]
  },
  {
    "canonicalCode": "eye_irrigation_morgan_lens",
    "aliases": [
      "Morgan Lens"
    ]
  },
  {
    "canonicalCode": "ng_tube_placement",
    "aliases": [
      "NG Tube Insert",
      "OG / Orogastric Tube Insertion"
    ]
  },
  {
    "canonicalCode": "npo_status",
    "aliases": [
      "NPO",
      "NPO Until Patient Medically Cleared"
    ]
  },
  {
    "canonicalCode": "oxygen_therapy",
    "aliases": [
      "Oxygen"
    ]
  },
  {
    "canonicalCode": "oral_challenge",
    "aliases": [
      "PO Challenge"
    ]
  },
  {
    "canonicalCode": "glucose_check",
    "aliases": [
      "POC Glucose"
    ]
  },
  {
    "canonicalCode": "pregnancy_test",
    "aliases": [
      "POC Urine Pregnancy"
    ]
  },
  {
    "canonicalCode": "procedural_sedation",
    "aliases": [
      "Prepare Patient for Procedural Sedation",
      "Set Up Procedural Sedation"
    ]
  },
  {
    "canonicalCode": "remove_dressing",
    "aliases": [
      "Remove Wound Dressing"
    ]
  },
  {
    "canonicalCode": "respiratory_treatment",
    "aliases": [
      "Respiratory Therapy Request"
    ]
  },
  {
    "canonicalCode": "endotracheal_intubation",
    "aliases": [
      "Set Up Intubation"
    ]
  },
  {
    "canonicalCode": "laceration_repair",
    "aliases": [
      "Set Up Laceration Repair"
    ]
  },
  {
    "canonicalCode": "constant_observation",
    "aliases": [
      "Sitter at Bedside"
    ]
  },
  {
    "canonicalCode": "splint_application",
    "aliases": [
      "Arm Sling",
      "Splint Aircast Left Ankle",
      "Splint Aircast Right Ankle",
      "Lower Extremity Splint",
      "Upper Extremity Splint"
    ]
  },
  {
    "canonicalCode": "pulse_oximetry",
    "aliases": [
      "Spot Pulse Oximetry"
    ]
  },
  {
    "canonicalCode": "stroke_alert_activation",
    "aliases": [
      "Stroke Alert",
      "Stroke Team"
    ]
  },
  {
    "canonicalCode": "suctioning",
    "aliases": [
      "Oral Suction",
      "Suction for Sputum"
    ]
  },
  {
    "canonicalCode": "patient_transport",
    "aliases": [
      "Transfer"
    ]
  },
  {
    "canonicalCode": "visual_acuity",
    "aliases": [
      "Visual Acuity Screening"
    ]
  },
  {
    "canonicalCode": "weigh_patient",
    "aliases": [
      "Weight"
    ]
  }
];

export const WAVE1_STAFF_ORDER_NEW_ROWS: Wave1StaffOrderNewRow[] = [
  {
    "code": "abdominal_binder",
    "displayNameEn": "Abdominal Binder",
    "displayNameFr": "Abdominal Binder",
    "category": "ORTHOPEDICS_IMMOBILIZATION",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "ace_wrap",
    "displayNameEn": "Ace Wrap",
    "displayNameFr": "Ace Wrap",
    "category": "WOUND_CARE",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "activity",
    "displayNameEn": "Activity",
    "displayNameFr": "Activity",
    "category": "COMMUNICATION",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "add_pharmacy_in_chart",
    "displayNameEn": "Add Pharmacy in chart",
    "displayNameFr": "Add Pharmacy in chart",
    "category": "COMMUNICATION",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "add_pharmacy_in_patient_chart",
    "displayNameEn": "Add Pharmacy in patient chart",
    "displayNameFr": "Add Pharmacy in patient chart",
    "category": "COMMUNICATION",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "admit_to_floor_48_hr_observation_unit",
    "displayNameEn": "Admit to Floor / 48 hr Observation Unit",
    "displayNameFr": "Admission en Floor / 48 hr Observation Unit",
    "category": "ADMISSION_DISPOSITION",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "admit_to_4s_haven",
    "displayNameEn": "Admit to 4S Haven",
    "displayNameFr": "Admission en 4S Haven",
    "category": "ADMISSION_DISPOSITION",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "admit_to_cdu_23_hr_ed_observation_unit",
    "displayNameEn": "Admit to CDU / 23 hr ED Observation Unit",
    "displayNameFr": "Admission en CDU / 23 hr ED Observation Unit",
    "category": "ADMISSION_DISPOSITION",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "admit_to_icu",
    "displayNameEn": "Admit to ICU",
    "displayNameFr": "Admission en ICU",
    "category": "ADMISSION_DISPOSITION",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "admit_to_med_surg",
    "displayNameEn": "Admit to Med Surg",
    "displayNameFr": "Admission en Med Surg",
    "category": "ADMISSION_DISPOSITION",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "admit_to_med_surg_with_telemetry",
    "displayNameEn": "Admit to Med Surg with Telemetry",
    "displayNameFr": "Admission en Med Surg with Telemetry",
    "category": "ADMISSION_DISPOSITION",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "admit_to_step_down_unit",
    "displayNameEn": "Admit to Step Down Unit",
    "displayNameFr": "Admission en Step Down Unit",
    "category": "ADMISSION_DISPOSITION",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "admitting_diagnosis",
    "displayNameEn": "Admitting Diagnosis",
    "displayNameFr": "Admitting Diagnosis",
    "category": "ADMISSION_DISPOSITION",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "admitting_doctor",
    "displayNameEn": "Admitting Doctor",
    "displayNameFr": "Admitting Doctor",
    "category": "ADMISSION_DISPOSITION",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "apply_heat_to_affected_area",
    "displayNameEn": "Apply Heat to Affected Area",
    "displayNameFr": "Application de chaleur sur la zone affectée",
    "category": "NURSING_PATIENT_CARE",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "apply_loose_dressing",
    "displayNameEn": "Apply Loose Dressing",
    "displayNameFr": "Apply Loose Dressing",
    "category": "WOUND_CARE",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "apply_steri_strips",
    "displayNameEn": "Apply Steri Strips",
    "displayNameFr": "Apply Steri Strips",
    "category": "WOUND_CARE",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "assist_patient_to_restroom",
    "displayNameEn": "Assist Patient to Restroom",
    "displayNameFr": "Assist Patient to Restroom",
    "category": "NURSING_PATIENT_CARE",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "back_board",
    "displayNameEn": "Back Board",
    "displayNameFr": "Back Board",
    "category": "TRAUMA",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "bair_hugger",
    "displayNameEn": "BAIR Hugger",
    "displayNameFr": "BAIR Hugger",
    "category": "NURSING_PATIENT_CARE",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "barthol_catheter",
    "displayNameEn": "Barthol Catheter",
    "displayNameFr": "Barthol Catheter",
    "category": "GI_GU",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "bcpap_rt_request",
    "displayNameEn": "BCPAP",
    "displayNameFr": "BCPAP",
    "category": "RESPIRATORY",
    "aliases": [],
    "executionRoleCategory": "RESPIRATORY",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "bed_request",
    "displayNameEn": "Bed Request",
    "displayNameFr": "Bed Request",
    "category": "ADMISSION_DISPOSITION",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "bipap_rt_request",
    "displayNameEn": "BiPAP RT Request",
    "displayNameFr": "BiPAP RT Request",
    "category": "RESPIRATORY",
    "aliases": [],
    "executionRoleCategory": "RESPIRATORY",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "blood_pressure_monitor",
    "displayNameEn": "Blood Pressure Monitor",
    "displayNameFr": "Blood Pressure Monitor",
    "category": "MONITORING",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "bp_bilateral_arms",
    "displayNameEn": "BP Bilateral Arms",
    "displayNameFr": "BP Bilateral Arms",
    "category": "MONITORING",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "buddy_tape_fingers",
    "displayNameEn": "Buddy Tape Fingers",
    "displayNameFr": "Buddy Tape Fingers",
    "category": "ORTHOPEDICS_IMMOBILIZATION",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "buddy_tape_toes",
    "displayNameEn": "Buddy Tape Toes",
    "displayNameFr": "Buddy Tape Toes",
    "category": "ORTHOPEDICS_IMMOBILIZATION",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "bulb_suction_rt_request",
    "displayNameEn": "Bulb Suction RT Request",
    "displayNameFr": "Bulb Suction RT Request",
    "category": "RESPIRATORY",
    "aliases": [],
    "executionRoleCategory": "RESPIRATORY",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "remove_c_collar",
    "displayNameEn": "Remove C Collar",
    "displayNameFr": "Remove C Collar",
    "category": "ORTHOPEDICS_IMMOBILIZATION",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "call_hospitalist_for_admission",
    "displayNameEn": "Call Hospitalist for Admission",
    "displayNameFr": "Call Hospitalist for Admission",
    "category": "COMMUNICATION",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "cane",
    "displayNameEn": "Cane",
    "displayNameFr": "Cane",
    "category": "ORTHOPEDICS_IMMOBILIZATION",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "cardiac_team",
    "displayNameEn": "Cardiac Team",
    "displayNameFr": "Cardiac Team",
    "category": "MONITORING",
    "aliases": [],
    "executionRoleCategory": "MULTI_ROLE",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "central_line_tray",
    "displayNameEn": "Central Line Tray",
    "displayNameFr": "Central Line Tray",
    "category": "VASCULAR_ACCESS",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "central_vo2_sat",
    "displayNameEn": "Central VO2 Sat",
    "displayNameFr": "Central VO2 Sat",
    "category": "MONITORING",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "cerumen_disimpaction",
    "displayNameEn": "Cerumen Disimpaction",
    "displayNameFr": "Cerumen Disimpaction",
    "category": "GI_GU",
    "aliases": [],
    "executionRoleCategory": "PROVIDER",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "chest_tube_to_continuous_suction",
    "displayNameEn": "Chest Tube to Continuous Suction",
    "displayNameFr": "Chest Tube to Continuous Suction",
    "category": "NURSING_PATIENT_CARE",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "chest_tube_to_water_seal",
    "displayNameEn": "Chest Tube to Water Seal",
    "displayNameFr": "Chest Tube to Water Seal",
    "category": "NURSING_PATIENT_CARE",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "clamp_feeding_tube",
    "displayNameEn": "Clamp Feeding Tube",
    "displayNameFr": "Clamp Feeding Tube",
    "category": "GI_GU",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "clavicle_strap",
    "displayNameEn": "Clavicle Strap",
    "displayNameFr": "Clavicle Strap",
    "category": "ORTHOPEDICS_IMMOBILIZATION",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "commode_to_bedside",
    "displayNameEn": "Commode to Bedside",
    "displayNameFr": "Commode to Bedside",
    "category": "GI_GU",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "complete_admit_checklist",
    "displayNameEn": "Complete Admit Checklist",
    "displayNameFr": "Complete Admit Checklist",
    "category": "ADMISSION_DISPOSITION",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "consult_burn_center",
    "displayNameEn": "Consult Burn Center",
    "displayNameFr": "Consultation Burn Center",
    "category": "CONSULTS",
    "aliases": [],
    "executionRoleCategory": "PROVIDER",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "consult_case_management",
    "displayNameEn": "Consult Case Management",
    "displayNameFr": "Consultation Case Management",
    "category": "CONSULTS",
    "aliases": [],
    "executionRoleCategory": "PROVIDER",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "consult_general_surgery",
    "displayNameEn": "Consult General Surgery",
    "displayNameFr": "Consultation General Surgery",
    "category": "CONSULTS",
    "aliases": [],
    "executionRoleCategory": "PROVIDER",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "consult_hospitalist",
    "displayNameEn": "Consult Hospitalist",
    "displayNameFr": "Consultation Hospitalist",
    "category": "CONSULTS",
    "aliases": [],
    "executionRoleCategory": "PROVIDER",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "consult_intensivist",
    "displayNameEn": "Consult Intensivist",
    "displayNameFr": "Consultation Intensivist",
    "category": "CONSULTS",
    "aliases": [],
    "executionRoleCategory": "PROVIDER",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "consult_interventional_radiology",
    "displayNameEn": "Consult Interventional Radiology",
    "displayNameFr": "Consultation Interventional Radiology",
    "category": "CONSULTS",
    "aliases": [],
    "executionRoleCategory": "PROVIDER",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "consult_nephrology",
    "displayNameEn": "Consult Nephrology",
    "displayNameFr": "Consultation Nephrology",
    "category": "CONSULTS",
    "aliases": [],
    "executionRoleCategory": "PROVIDER",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "consult_podiatry",
    "displayNameEn": "Consult Podiatry",
    "displayNameFr": "Consultation Podiatry",
    "category": "CONSULTS",
    "aliases": [],
    "executionRoleCategory": "PROVIDER",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "consult_poison_control",
    "displayNameEn": "Consult Poison Control",
    "displayNameFr": "Consultation Poison Control",
    "category": "CONSULTS",
    "aliases": [],
    "executionRoleCategory": "PROVIDER",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "consult_pulmonology",
    "displayNameEn": "Consult Pulmonology",
    "displayNameFr": "Consultation Pulmonology",
    "category": "CONSULTS",
    "aliases": [],
    "executionRoleCategory": "PROVIDER",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "consult_urology",
    "displayNameEn": "Consult Urology",
    "displayNameFr": "Consultation Urology",
    "category": "CONSULTS",
    "aliases": [],
    "executionRoleCategory": "PROVIDER",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "consult_vascular_surgery",
    "displayNameEn": "Consult Vascular Surgery",
    "displayNameFr": "Consultation Vascular Surgery",
    "category": "CONSULTS",
    "aliases": [],
    "executionRoleCategory": "PROVIDER",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "consult_wound_care",
    "displayNameEn": "Consult Wound Care",
    "displayNameFr": "Consultation Wound Care",
    "category": "CONSULTS",
    "aliases": [],
    "executionRoleCategory": "PROVIDER",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "contact_md_when_bolus_complete_for_sepsis_reassessment",
    "displayNameEn": "Contact MD When Bolus Complete for Sepsis Reassessment",
    "displayNameFr": "Contact MD When Bolus Complete for Sepsis Reassessment",
    "category": "COMMUNICATION",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "continuous_bladder_irrigation",
    "displayNameEn": "Continuous Bladder Irrigation",
    "displayNameFr": "Continuous Bladder Irrigation",
    "category": "GI_GU",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "continuous_fetal_monitoring",
    "displayNameEn": "Continuous Fetal Monitoring",
    "displayNameFr": "Continuous Fetal Monitoring",
    "category": "MONITORING",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "cool_mist_rt_request",
    "displayNameEn": "Cool Mist RT Request",
    "displayNameFr": "Cool Mist RT Request",
    "category": "RESPIRATORY",
    "aliases": [],
    "executionRoleCategory": "RESPIRATORY",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "cpap_rt_request",
    "displayNameEn": "CPAP RT Request",
    "displayNameFr": "CPAP RT Request",
    "category": "RESPIRATORY",
    "aliases": [],
    "executionRoleCategory": "RESPIRATORY",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "debride_wound",
    "displayNameEn": "Debride Wound",
    "displayNameFr": "Debride Wound",
    "category": "WOUND_CARE",
    "aliases": [],
    "executionRoleCategory": "PROVIDER",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "dental_tray",
    "displayNameEn": "Dental Tray",
    "displayNameFr": "Dental Tray",
    "category": "OTHER",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "diet",
    "displayNameEn": "Diet",
    "displayNameFr": "Diet",
    "category": "COMMUNICATION",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "discontinue_indwelling_foley_catheter",
    "displayNameEn": "Discontinue Indwelling Foley Catheter",
    "displayNameFr": "Discontinue Indwelling Foley Catheter",
    "category": "GI_GU",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "disimpaction_nursing",
    "displayNameEn": "Disimpaction Nursing",
    "displayNameFr": "Disimpaction Nursing",
    "category": "GI_GU",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "document_lmp_in_chart",
    "displayNameEn": "Document LMP in Chart",
    "displayNameFr": "Document LMP in Chart",
    "category": "COMMUNICATION",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "doppler_pulses",
    "displayNameEn": "Doppler Pulses",
    "displayNameFr": "Doppler Pulses",
    "category": "MONITORING",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "ear_irrigation",
    "displayNameEn": "Ear Irrigation",
    "displayNameFr": "Ear Irrigation",
    "category": "OTHER",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "ear_tray",
    "displayNameEn": "Ear Tray",
    "displayNameFr": "Ear Tray",
    "category": "OTHER",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "echocardiogram",
    "displayNameEn": "Echocardiogram",
    "displayNameFr": "Echocardiogram",
    "category": "COMMUNICATION",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "elastic_wrap",
    "displayNameEn": "Elastic Wrap",
    "displayNameFr": "Elastic Wrap",
    "category": "WOUND_CARE",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "elevate",
    "displayNameEn": "Elevate",
    "displayNameFr": "Elevate",
    "category": "NURSING_PATIENT_CARE",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "elevate_extremity",
    "displayNameEn": "Elevate Extremity",
    "displayNameFr": "Elevate Extremity",
    "category": "NURSING_PATIENT_CARE",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "elopement_precautions",
    "displayNameEn": "Elopement Precautions",
    "displayNameFr": "Elopement Precautions",
    "category": "NURSING_PATIENT_CARE",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "enema",
    "displayNameEn": "Enema",
    "displayNameFr": "Enema",
    "category": "GI_GU",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "epistaxis_tray",
    "displayNameEn": "Epistaxis Tray",
    "displayNameFr": "Epistaxis Tray",
    "category": "OTHER",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "etco2_monitoring",
    "displayNameEn": "EtCO2 Monitoring",
    "displayNameFr": "EtCO2 Monitoring",
    "category": "RESPIRATORY",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "eye_irrigation",
    "displayNameEn": "Eye Irrigation",
    "displayNameFr": "Eye Irrigation",
    "category": "OTHER",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "eye_irrigation_morgan_lens",
    "displayNameEn": "Eye Irrigation with Morgan Lens",
    "displayNameFr": "Eye Irrigation with Morgan Lens",
    "category": "OTHER",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "eye_patch",
    "displayNameEn": "Eye Patch",
    "displayNameFr": "Eye Patch",
    "category": "NURSING_PATIENT_CARE",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "eye_ph",
    "displayNameEn": "Eye pH",
    "displayNameFr": "Eye pH",
    "category": "OTHER",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "eye_protection_patch",
    "displayNameEn": "Eye Protection Patch",
    "displayNameFr": "Eye Protection Patch",
    "category": "NURSING_PATIENT_CARE",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "eye_tray",
    "displayNameEn": "Eye Tray",
    "displayNameFr": "Eye Tray",
    "category": "OTHER",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "fetal_heart_tones",
    "displayNameEn": "Fetal Heart Tones",
    "displayNameFr": "Fetal Heart Tones",
    "category": "MONITORING",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "fetal_monitoring",
    "displayNameEn": "Fetal Monitoring",
    "displayNameFr": "Fetal Monitoring",
    "category": "MONITORING",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "financial_services_consult",
    "displayNameEn": "Financial Services Consult",
    "displayNameFr": "Financial Services Consult",
    "category": "COMMUNICATION",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "fluid_warmer_level_1",
    "displayNameEn": "Fluid Warmer Level 1",
    "displayNameFr": "Fluid Warmer Level 1",
    "category": "VASCULAR_ACCESS",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "give_urinal",
    "displayNameEn": "Give Urinal",
    "displayNameFr": "Give Urinal",
    "category": "GI_GU",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "hemorrhagic_stroke_target_sbp_less_than_160_and_dbp_less_than_99",
    "displayNameEn": "Hemorrhagic Stroke Target SBP Less Than 160 and DBP Less Than 99",
    "displayNameFr": "Hemorrhagic Stroke Target SBP Less Than 160 and DBP Less Than 99",
    "category": "NEURO_STROKE",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "head_of_bed_30_degrees_and_neck_neutral",
    "displayNameEn": "Head of Bed 30 Degrees and Neck Neutral",
    "displayNameFr": "Head of Bed 30 Degrees and Neck Neutral",
    "category": "NEURO_STROKE",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "holter_monitor",
    "displayNameEn": "Holter Monitor",
    "displayNameFr": "Holter Monitor",
    "category": "MONITORING",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "immobilizer_knee",
    "displayNameEn": "Immobilizer Knee",
    "displayNameFr": "Immobilizer Knee",
    "category": "ORTHOPEDICS_IMMOBILIZATION",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "immobilizer_shoulder",
    "displayNameEn": "Immobilizer Shoulder",
    "displayNameFr": "Immobilizer Shoulder",
    "category": "ORTHOPEDICS_IMMOBILIZATION",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "incentive_spirometry_nursing",
    "displayNameEn": "Incentive Spirometry Nursing",
    "displayNameFr": "Incentive Spirometry Nursing",
    "category": "RESPIRATORY",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "irrigate_indwelling_foley_catheter",
    "displayNameEn": "Irrigate Indwelling Foley Catheter",
    "displayNameFr": "Irrigate Indwelling Foley Catheter",
    "category": "GI_GU",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "irrigate_suprapubic_catheter",
    "displayNameEn": "Irrigate Suprapubic Catheter",
    "displayNameFr": "Irrigate Suprapubic Catheter",
    "category": "GI_GU",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "irrigate_wounds",
    "displayNameEn": "Irrigate Wounds",
    "displayNameFr": "Irrigate Wounds",
    "category": "WOUND_CARE",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "ischemic_stroke_target_sbp_less_than_220_and_dbp_less_than_120",
    "displayNameEn": "Ischemic Stroke Target SBP Less Than 220 and DBP Less Than 120",
    "displayNameFr": "Ischemic Stroke Target SBP Less Than 220 and DBP Less Than 120",
    "category": "NEURO_STROKE",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "katz_extractor",
    "displayNameEn": "Katz Extractor",
    "displayNameFr": "Katz Extractor",
    "category": "OTHER",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "knee_immobilizer",
    "displayNameEn": "Knee Immobilizer",
    "displayNameFr": "Knee Immobilizer",
    "category": "ORTHOPEDICS_IMMOBILIZATION",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "laceration_kit_to_bedside",
    "displayNameEn": "Laceration Kit to Bedside",
    "displayNameFr": "Laceration Kit to Bedside",
    "category": "OTHER",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "leg_bag",
    "displayNameEn": "Leg Bag",
    "displayNameFr": "Leg Bag",
    "category": "GI_GU",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "log_roll",
    "displayNameEn": "Log Roll",
    "displayNameFr": "Log Roll",
    "category": "TRAUMA",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "massive_transfusion_protocol",
    "displayNameEn": "Massive Transfusion Protocol",
    "displayNameFr": "Massive Transfusion Protocol",
    "category": "TRAUMA",
    "aliases": [],
    "executionRoleCategory": "PROVIDER",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "measure_left_calf_circumference",
    "displayNameEn": "Measure Left Calf Circumference",
    "displayNameFr": "Measure Left Calf Circumference",
    "category": "NURSING_PATIENT_CARE",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "midline_catheter_placement",
    "displayNameEn": "Midline Catheter Placement",
    "displayNameFr": "Midline Catheter Placement",
    "category": "GI_GU",
    "aliases": [],
    "executionRoleCategory": "PROVIDER",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "msds_sheet",
    "displayNameEn": "MSDS Sheet",
    "displayNameFr": "MSDS Sheet",
    "category": "COMMUNICATION",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "nasal_balloon",
    "displayNameEn": "Nasal Balloon",
    "displayNameFr": "Nasal Balloon",
    "category": "OTHER",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "nasal_tampon",
    "displayNameEn": "Nasal Tampon",
    "displayNameFr": "Nasal Tampon",
    "category": "OTHER",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "nasal_trumpet_insert",
    "displayNameEn": "Nasal Trumpet Insert",
    "displayNameFr": "Nasal Trumpet Insert",
    "category": "RESPIRATORY",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "neuro_check",
    "displayNameEn": "Neuro Check",
    "displayNameFr": "Neuro Check",
    "category": "NEURO_STROKE",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "neurovascular_check",
    "displayNameEn": "Neurovascular Check",
    "displayNameFr": "Neurovascular Check",
    "category": "NEURO_STROKE",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "ng_tube_continuous_suction",
    "displayNameEn": "NG Tube Continuous Suction",
    "displayNameFr": "NG Tube Continuous Suction",
    "category": "GI_GU",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "notify_app_on_duty",
    "displayNameEn": "Notify APP on Duty",
    "displayNameFr": "Alerter l'APP on Duty",
    "category": "COMMUNICATION",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "notify_md_abnormal_vitals",
    "displayNameEn": "Notify MD if Abnormal Vitals",
    "displayNameFr": "Alerter le médecin si if Abnormal Vitals",
    "category": "MONITORING",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "notify_md_when_family_in_room",
    "displayNameEn": "Notify MD When Family in Room",
    "displayNameFr": "Alerter le médecin si When Family in Room",
    "category": "COMMUNICATION",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "notify_md_when_sbp_less_than_160_mmhg",
    "displayNameEn": "Notify MD When SBP Less Than 160 mmHg",
    "displayNameFr": "Alerter le médecin si When SBP Less Than 160 mmHg",
    "category": "COMMUNICATION",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "notify_md_when_sbp_less_than_170_mmhg",
    "displayNameEn": "Notify MD When SBP Less Than 170 mmHg",
    "displayNameFr": "Alerter le médecin si When SBP Less Than 170 mmHg",
    "category": "COMMUNICATION",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "notify_md_when_sbp_less_than_180_mmhg",
    "displayNameEn": "Notify MD When SBP Less Than 180 mmHg",
    "displayNameFr": "Alerter le médecin si When SBP Less Than 180 mmHg",
    "category": "COMMUNICATION",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "nursing_communication",
    "displayNameEn": "Nursing Communication",
    "displayNameFr": "Nursing Communication",
    "category": "COMMUNICATION",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "obtain_consent_for_procedure",
    "displayNameEn": "Obtain Consent for Procedure",
    "displayNameFr": "Obtain Consent for Procedure",
    "category": "COMMUNICATION",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "obtain_consent_for_lumbar_puncture",
    "displayNameEn": "Obtain Consent for Lumbar Puncture",
    "displayNameFr": "Obtain Consent for Lumbar Puncture",
    "category": "COMMUNICATION",
    "aliases": [],
    "executionRoleCategory": "PROVIDER",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "obtain_consent_for_sedation",
    "displayNameEn": "Obtain Consent for Sedation",
    "displayNameFr": "Obtain Consent for Sedation",
    "category": "COMMUNICATION",
    "aliases": [],
    "executionRoleCategory": "PROVIDER",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "obtain_consent_for_thrombolytics",
    "displayNameEn": "Obtain Consent for Thrombolytics",
    "displayNameFr": "Obtain Consent for Thrombolytics",
    "category": "COMMUNICATION",
    "aliases": [],
    "executionRoleCategory": "PROVIDER",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "obtain_old_ekg",
    "displayNameEn": "Obtain Old EKG",
    "displayNameFr": "Obtain Old EKG",
    "category": "MONITORING",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "obtain_old_records",
    "displayNameEn": "Obtain Old Records",
    "displayNameFr": "Obtain Old Records",
    "category": "COMMUNICATION",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "obtain_parental_consent_for_treatment",
    "displayNameEn": "Obtain Parental Consent for Treatment",
    "displayNameFr": "Obtain Parental Consent for Treatment",
    "category": "COMMUNICATION",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "orthopedic_boot",
    "displayNameEn": "Orthopedic Boot",
    "displayNameFr": "Orthopedic Boot",
    "category": "ORTHOPEDICS_IMMOBILIZATION",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "orthopedic_shoe",
    "displayNameEn": "Orthopedic Shoe",
    "displayNameFr": "Orthopedic Shoe",
    "category": "ORTHOPEDICS_IMMOBILIZATION",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "orthostatic_vital_signs",
    "displayNameEn": "Orthostatic Vital Signs",
    "displayNameFr": "Orthostatic Vital Signs",
    "category": "MONITORING",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "orthostatic_vitals_lying_and_sitting_only",
    "displayNameEn": "Orthostatic Vitals Lying and Sitting Only",
    "displayNameFr": "Orthostatic Vitals Lying and Sitting Only",
    "category": "MONITORING",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "high_flow_nasal_cannula",
    "displayNameEn": "High Flow Nasal Cannula Oxygen",
    "displayNameFr": "High Flow Nasal Cannula Oxygen",
    "category": "NURSING_PATIENT_CARE",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "oxygen_titrate_to_92_percent",
    "displayNameEn": "Oxygen Titrate to 92 Percent",
    "displayNameFr": "Oxygen Titrate to 92 Percent",
    "category": "RESPIRATORY",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "pacer_pads",
    "displayNameEn": "Pacer Pads",
    "displayNameFr": "Pacer Pads",
    "category": "VASCULAR_ACCESS",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "peak_flow_rt_request",
    "displayNameEn": "Peak Flow RT Request",
    "displayNameFr": "Peak Flow RT Request",
    "category": "RESPIRATORY",
    "aliases": [],
    "executionRoleCategory": "RESPIRATORY",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "peak_flow_pre_and_post_rt_request",
    "displayNameEn": "Peak Flow Pre and Post RT Request",
    "displayNameFr": "Peak Flow Pre and Post RT Request",
    "category": "RESPIRATORY",
    "aliases": [],
    "executionRoleCategory": "RESPIRATORY",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "pelvic_exam_setup",
    "displayNameEn": "Pelvic Exam Setup",
    "displayNameFr": "Pelvic Exam Setup",
    "category": "GI_GU",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "picc_line_placement",
    "displayNameEn": "PICC Line Placement",
    "displayNameFr": "PICC Line Placement",
    "category": "VASCULAR_ACCESS",
    "aliases": [],
    "executionRoleCategory": "PROVIDER",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "place_in_observation",
    "displayNameEn": "Place in Observation",
    "displayNameFr": "Place in Observation",
    "category": "ADMISSION_DISPOSITION",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "po_fluids",
    "displayNameEn": "PO Fluids",
    "displayNameFr": "PO Fluids",
    "category": "NURSING_PATIENT_CARE",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "poc_bmp",
    "displayNameEn": "POC BMP",
    "displayNameFr": "POC BMP",
    "category": "SPECIMEN_POC",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "poc_bnp",
    "displayNameEn": "POC BNP",
    "displayNameFr": "POC BNP",
    "category": "SPECIMEN_POC",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "poc_breathalyzer",
    "displayNameEn": "POC Breathalyzer",
    "displayNameFr": "POC Breathalyzer",
    "category": "SPECIMEN_POC",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "poc_cardiac_enzymes",
    "displayNameEn": "POC Cardiac Enzymes",
    "displayNameFr": "POC Cardiac Enzymes",
    "category": "SPECIMEN_POC",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "poc_guaiac_stool",
    "displayNameEn": "POC Guaiac Stool",
    "displayNameFr": "POC Guaiac Stool",
    "category": "SPECIMEN_POC",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "poc_strep_screen",
    "displayNameEn": "POC Strep Screen",
    "displayNameFr": "POC Strep Screen",
    "category": "SPECIMEN_POC",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "poc_troponin",
    "displayNameEn": "POC Troponin",
    "displayNameFr": "POC Troponin",
    "category": "SPECIMEN_POC",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "poc_urine_dip",
    "displayNameEn": "POC Urine Dip",
    "displayNameFr": "POC Urine Dip",
    "category": "SPECIMEN_POC",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "post_op_shoe",
    "displayNameEn": "Post-op Shoe",
    "displayNameFr": "Post-op Shoe",
    "category": "ORTHOPEDICS_IMMOBILIZATION",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "pulse_oximetry",
    "displayNameEn": "Pulse Oximetry",
    "displayNameFr": "Oxymétrie de pouls",
    "category": "MONITORING",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "reassess_and_document_temperature_within_30_to_60_minutes",
    "displayNameEn": "Reassess and Document Temperature Within 30 to 60 Minutes",
    "displayNameFr": "Reassess and Document Temperature Within 30 to 60 Minutes",
    "category": "MONITORING",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "rectal_temperature",
    "displayNameEn": "Rectal Temperature",
    "displayNameFr": "Rectal Temperature",
    "category": "SPECIMEN_POC",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "release_to_funeral_home",
    "displayNameEn": "Release to Funeral Home",
    "displayNameFr": "Release to Funeral Home",
    "category": "ADMISSION_DISPOSITION",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "remove_dressing",
    "displayNameEn": "Remove Dressing",
    "displayNameFr": "Remove Dressing",
    "category": "WOUND_CARE",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "remove_staples",
    "displayNameEn": "Remove Staples",
    "displayNameFr": "Remove Staples",
    "category": "WOUND_CARE",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "remove_sutures",
    "displayNameEn": "Remove Sutures",
    "displayNameFr": "Remove Sutures",
    "category": "WOUND_CARE",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "repeat_h_and_h_post_transfusion",
    "displayNameEn": "Repeat H and H Post Transfusion",
    "displayNameFr": "Repeat H and H Post Transfusion",
    "category": "NURSING_PATIENT_CARE",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "replace_indwelling_foley_catheter",
    "displayNameEn": "Replace Indwelling Foley Catheter",
    "displayNameFr": "Replace Indwelling Foley Catheter",
    "category": "GI_GU",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "resuscitation_status",
    "displayNameEn": "Resuscitation Status",
    "displayNameFr": "Resuscitation Status",
    "category": "COMMUNICATION",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "seizure_precautions",
    "displayNameEn": "Seizure Precautions",
    "displayNameFr": "Précautions convulsions",
    "category": "NEURO_STROKE",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "septic_team",
    "displayNameEn": "Septic Team",
    "displayNameFr": "Septic Team",
    "category": "TRAUMA",
    "aliases": [],
    "executionRoleCategory": "MULTI_ROLE",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "set_up_nasopharyngoscope",
    "displayNameEn": "Set Up Nasopharyngoscope",
    "displayNameFr": "Préparer Nasopharyngoscope",
    "category": "OTHER",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "set_up_slit_lamp",
    "displayNameEn": "Set Up Slit Lamp",
    "displayNameFr": "Préparer Slit Lamp",
    "category": "OTHER",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "set_up_suction",
    "displayNameEn": "Set Up Suction",
    "displayNameFr": "Préparer Suction",
    "category": "VASCULAR_ACCESS",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "set_up_bronchoscopy",
    "displayNameEn": "Set Up Bronchoscopy",
    "displayNameFr": "Préparer Bronchoscopy",
    "category": "VASCULAR_ACCESS",
    "aliases": [],
    "executionRoleCategory": "PROVIDER",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "set_up_dental_tray",
    "displayNameEn": "Set Up Dental Tray",
    "displayNameFr": "Préparer Dental Tray",
    "category": "OTHER",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "set_up_epistaxis_tray",
    "displayNameEn": "Set Up Epistaxis Tray",
    "displayNameFr": "Préparer Epistaxis Tray",
    "category": "OTHER",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "set_up_trach_exchange",
    "displayNameEn": "Set Up Trach Exchange",
    "displayNameFr": "Préparer Trach Exchange",
    "category": "OTHER",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "shoulder_immobilizer",
    "displayNameEn": "Shoulder Immobilizer",
    "displayNameFr": "Shoulder Immobilizer",
    "category": "ORTHOPEDICS_IMMOBILIZATION",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "sling",
    "displayNameEn": "Sling",
    "displayNameFr": "Sling",
    "category": "ORTHOPEDICS_IMMOBILIZATION",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "slit_lamp_to_bedside",
    "displayNameEn": "Slit Lamp to Bedside",
    "displayNameFr": "Slit Lamp to Bedside",
    "category": "OTHER",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "smoking_cessation_instructions",
    "displayNameEn": "Smoking Cessation Instructions",
    "displayNameFr": "Smoking Cessation Instructions",
    "category": "COMMUNICATION",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "soak_wound_in_betadine",
    "displayNameEn": "Soak Wound in Betadine",
    "displayNameFr": "Soak Wound in Betadine",
    "category": "WOUND_CARE",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "soap_suds_enema",
    "displayNameEn": "Soap Suds Enema",
    "displayNameFr": "Soap Suds Enema",
    "category": "GI_GU",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "spacer_to_bedside_with_teaching_rt_request",
    "displayNameEn": "Spacer to Bedside with Teaching RT Request",
    "displayNameFr": "Spacer to Bedside with Teaching RT Request",
    "category": "RESPIRATORY",
    "aliases": [],
    "executionRoleCategory": "RESPIRATORY",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "incentive_spirometry_rt",
    "displayNameEn": "Incentive Spirometry RT Request",
    "displayNameFr": "Incentive Spirometry RT Request",
    "category": "RESPIRATORY",
    "aliases": [],
    "executionRoleCategory": "RESPIRATORY",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "sputum_collection",
    "displayNameEn": "Sputum Collection",
    "displayNameFr": "Sputum Collection",
    "category": "SPECIMEN_POC",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "sterile_gloves",
    "displayNameEn": "Sterile Gloves",
    "displayNameFr": "Sterile Gloves",
    "category": "WOUND_CARE",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "straight_catheter_for_residual",
    "displayNameEn": "Straight Catheter for Residual",
    "displayNameFr": "Straight Catheter for Residual",
    "category": "GI_GU",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "suicide_precautions",
    "displayNameEn": "Suicide Precautions",
    "displayNameFr": "Précautions suicide",
    "category": "NURSING_PATIENT_CARE",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "suture_removal",
    "displayNameEn": "Suture Removal",
    "displayNameFr": "Suture Removal",
    "category": "WOUND_CARE",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "suture_setup",
    "displayNameEn": "Suture Setup",
    "displayNameFr": "Suture Setup",
    "category": "WOUND_CARE",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "swallowing_precautions",
    "displayNameEn": "Swallowing Precautions",
    "displayNameFr": "Swallowing Precautions",
    "category": "NURSING_PATIENT_CARE",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "swallowing_screen_required_before_first_po",
    "displayNameEn": "Swallowing Screen Required Before First PO",
    "displayNameFr": "Swallowing Screen Required Before First PO",
    "category": "NURSING_PATIENT_CARE",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "techni_care",
    "displayNameEn": "Techni-Care",
    "displayNameFr": "Techni-Care",
    "category": "WOUND_CARE",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "tono_pen",
    "displayNameEn": "Tono Pen",
    "displayNameFr": "Tono Pen",
    "category": "OTHER",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "transfuse_ffp",
    "displayNameEn": "Transfuse FFP",
    "displayNameFr": "Transfuse FFP",
    "category": "VASCULAR_ACCESS",
    "aliases": [],
    "executionRoleCategory": "PROVIDER",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "transfuse_platelets",
    "displayNameEn": "Transfuse Platelets",
    "displayNameFr": "Transfuse Platelets",
    "category": "VASCULAR_ACCESS",
    "aliases": [],
    "executionRoleCategory": "PROVIDER",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "transfuse_prbcs",
    "displayNameEn": "Transfuse PRBCs",
    "displayNameFr": "Transfuse PRBCs",
    "category": "VASCULAR_ACCESS",
    "aliases": [],
    "executionRoleCategory": "PROVIDER",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "transvenous_pacer",
    "displayNameEn": "Transvenous Pacer",
    "displayNameFr": "Transvenous Pacer",
    "category": "VASCULAR_ACCESS",
    "aliases": [],
    "executionRoleCategory": "PROVIDER",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "urinary_leg_bag",
    "displayNameEn": "Urinary Leg Bag",
    "displayNameFr": "Urinary Leg Bag",
    "category": "GI_GU",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "urine_strainer",
    "displayNameEn": "Urine Strainer",
    "displayNameFr": "Urine Strainer",
    "category": "GI_GU",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "ventilator",
    "displayNameEn": "Ventilator",
    "displayNameFr": "Ventilator",
    "category": "RESPIRATORY",
    "aliases": [],
    "executionRoleCategory": "RESPIRATORY",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "verify_and_document_antipyretic_administration",
    "displayNameEn": "Verify and Document Antipyretic Administration",
    "displayNameFr": "Verify and Document Antipyretic Administration",
    "category": "NURSING_PATIENT_CARE",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "visual_acuity",
    "displayNameEn": "Visual Acuity",
    "displayNameFr": "Visual Acuity",
    "category": "OTHER",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "vitals_q15_document",
    "displayNameEn": "Vital Sign Check Every 15 Minutes and Document in Chart",
    "displayNameFr": "Vital Sign Check Every 15 Minutes and Document in Chart",
    "category": "MONITORING",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "vitals_q30_document",
    "displayNameEn": "Vital Sign Check Every 30 Minutes and Document in Chart",
    "displayNameFr": "Vital Sign Check Every 30 Minutes and Document in Chart",
    "category": "MONITORING",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "vitals_q60_document",
    "displayNameEn": "Vital Sign Check Every 60 Minutes and Document in Chart",
    "displayNameFr": "Vital Sign Check Every 60 Minutes and Document in Chart",
    "category": "MONITORING",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "vitals_q4_document",
    "displayNameEn": "Vital Sign Check Every 4 Hours",
    "displayNameFr": "Vital Sign Check Every 4 Hours",
    "category": "MONITORING",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "vitals_check",
    "displayNameEn": "Vitals",
    "displayNameFr": "Vitals",
    "category": "MONITORING",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "neuro_vitals_check",
    "displayNameEn": "Neuro Vitals",
    "displayNameFr": "Neuro Vitals",
    "category": "MONITORING",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "standard_walker",
    "displayNameEn": "Standard Walker",
    "displayNameFr": "Standard Walker",
    "category": "ORTHOPEDICS_IMMOBILIZATION",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "weigh_patient",
    "displayNameEn": "Weigh Patient",
    "displayNameFr": "Peser le patient",
    "category": "MONITORING",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "wound_irrigation",
    "displayNameEn": "Wound Irrigation",
    "displayNameFr": "Wound Irrigation",
    "category": "WOUND_CARE",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  },
  {
    "code": "wound_setup",
    "displayNameEn": "Wound Setup",
    "displayNameFr": "Wound Setup",
    "category": "WOUND_CARE",
    "aliases": [],
    "executionRoleCategory": "NURSING",
    "orderable": true,
    "isActive": true,
    "requiresProviderOrder": false,
    "nursingProtocolAllowed": true,
    "requiresClinicalNote": false
  }
];

export const WAVE1_STAFF_ORDER_DEDUP_REPORT = [
  {
    "canonicalCode": "ambulation_trial",
    "mergedFrom": "Ambulate Patient",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "ice_pack",
    "mergedFrom": "Apply Ice to Affected Area",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "bladder_scan",
    "mergedFrom": "Bladder Scan",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "cervical_collar",
    "mergedFrom": "C Collar",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "continuous_cardiac_monitoring",
    "mergedFrom": "Cardiac Monitoring",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "central_line_placement",
    "mergedFrom": "Central Line Insertion Setup",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "chest_tube",
    "mergedFrom": "Chest Tube Setup",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "blood_culture_collection",
    "mergedFrom": "Collect Blood Culture Prior to Starting Antibiotic",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "psychiatry_consult",
    "mergedFrom": "Consult Behavioral Health",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "cardiology_consult",
    "mergedFrom": "Consult Cardiology",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "neurology_consult",
    "mergedFrom": "Consult Neurology",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "orthopedics_consult",
    "mergedFrom": "Consult Orthopedic Surgery",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "social_work_consult",
    "mergedFrom": "Consult Social Services",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "consult_poison_control",
    "mergedFrom": "Contact Poison Control",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "continuous_cardiac_monitoring",
    "mergedFrom": "Continuous Cardiac Monitoring",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "crutches",
    "mergedFrom": "Crutches",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "vitals_q15_document",
    "mergedFrom": "Document Vital Signs in Chart No More Than Every 15 Minutes",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "vitals_q30_document",
    "mergedFrom": "Document Vital Signs in Chart No More Than Every 30 Minutes",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "wound_care",
    "mergedFrom": "Dress Wounds",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "dressing_change",
    "mergedFrom": "Wet-to-Dry Dressing Change",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "ekg_ecg",
    "mergedFrom": "EKG 12 Lead",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "ekg_ecg",
    "mergedFrom": "EKG 12 Lead at 3 Hours",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "ekg_ecg",
    "mergedFrom": "EKG 12 Lead at 6 Hours",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "ekg_ecg",
    "mergedFrom": "Repeat EKG 12 Lead",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "ekg_ecg",
    "mergedFrom": "Third Repeat EKG 12 Lead",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "warm_blanket",
    "mergedFrom": "Give Warm Blanket",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "foley_catheter",
    "mergedFrom": "Insert Indwelling Foley Catheter",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "peripheral_iv_placement",
    "mergedFrom": "IV Saline Lock",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "restraints_application",
    "mergedFrom": "Leather Restraints Protocol",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "trauma_team_activation",
    "mergedFrom": "Level I Trauma Activation / Full Trauma Activation",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "trauma_team_activation",
    "mergedFrom": "Level II Trauma Activation / Modified Trauma Activation",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "trauma_team_activation",
    "mergedFrom": "Level III Trauma Activation / Trauma Alert Consult",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "lumbar_puncture",
    "mergedFrom": "LP Tray",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "lumbar_puncture",
    "mergedFrom": "LP Tray to Bedside",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "eye_irrigation_morgan_lens",
    "mergedFrom": "Morgan Lens",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "ng_tube_placement",
    "mergedFrom": "NG Tube Insert",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "npo_status",
    "mergedFrom": "NPO",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "npo_status",
    "mergedFrom": "NPO Until Patient Medically Cleared",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "ng_tube_placement",
    "mergedFrom": "OG / Orogastric Tube Insertion",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "oxygen_therapy",
    "mergedFrom": "Oxygen",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "oral_challenge",
    "mergedFrom": "PO Challenge",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "glucose_check",
    "mergedFrom": "POC Glucose",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "pregnancy_test",
    "mergedFrom": "POC Urine Pregnancy",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "procedural_sedation",
    "mergedFrom": "Prepare Patient for Procedural Sedation",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "psychiatry_consult",
    "mergedFrom": "Psych Evaluation Call",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "remove_dressing",
    "mergedFrom": "Remove Wound Dressing",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "respiratory_treatment",
    "mergedFrom": "Respiratory Therapy Request",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "restraints_application",
    "mergedFrom": "Soft Restraints Per Protocol",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "restraints_application",
    "mergedFrom": "Restraints Non-Violent or Non-Self-Destructive",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "restraints_application",
    "mergedFrom": "Violent or Self-Destructive Restraints Adult 18+",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "peripheral_iv_placement",
    "mergedFrom": "Saline Lock IV",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "procedural_sedation",
    "mergedFrom": "Set Up Procedural Sedation",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "central_line_placement",
    "mergedFrom": "Set Up Central Line",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "chest_tube",
    "mergedFrom": "Set Up Chest Tube",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "endotracheal_intubation",
    "mergedFrom": "Set Up Intubation",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "laceration_repair",
    "mergedFrom": "Set Up Laceration Repair",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "lumbar_puncture",
    "mergedFrom": "Set Up Lumbar Puncture Tray",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "constant_observation",
    "mergedFrom": "Sitter at Bedside",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "splint_application",
    "mergedFrom": "Arm Sling",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "cervical_collar",
    "mergedFrom": "Soft Collar",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "splint_application",
    "mergedFrom": "Splint Aircast Left Ankle",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "splint_application",
    "mergedFrom": "Splint Aircast Right Ankle",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "splint_application",
    "mergedFrom": "Lower Extremity Splint",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "splint_application",
    "mergedFrom": "Upper Extremity Splint",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "pulse_oximetry",
    "mergedFrom": "Spot Pulse Oximetry",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "stroke_alert_activation",
    "mergedFrom": "Stroke Alert",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "stroke_alert_activation",
    "mergedFrom": "Stroke Team",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "suctioning",
    "mergedFrom": "Oral Suction",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "suctioning",
    "mergedFrom": "Suction for Sputum",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "patient_transport",
    "mergedFrom": "Transfer",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "visual_acuity",
    "mergedFrom": "Visual Acuity Screening",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "warm_blanket",
    "mergedFrom": "Warm Blanket",
    "reason": "WAVE1_ALIAS_MERGE"
  },
  {
    "canonicalCode": "weigh_patient",
    "mergedFrom": "Weight",
    "reason": "WAVE1_ALIAS_MERGE"
  }
] as const;

export const WAVE1_STAFF_ORDER_SOURCE_COUNT = 278;
export const WAVE1_STAFF_ORDER_ALIAS_MERGE_COUNT = 73;
export const WAVE1_STAFF_ORDER_NEW_ROW_COUNT = 205;
