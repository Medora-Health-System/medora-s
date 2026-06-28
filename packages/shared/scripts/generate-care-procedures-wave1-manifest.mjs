/**
 * MEDUI.CARE_PROCEDURES.EXPANSION_WAVE_1_STAFF_ORDERS.2
 * Generates wave-1 staff-order manifest from exports/care-procedures-wave1-staff-orders.csv
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const csvPath = path.join(repoRoot, "exports/care-procedures-wave1-staff-orders.csv");
const outPath = path.join(
  __dirname,
  "../src/procedures/canonicalCareProcedureStaffOrdersWave1Manifest.ts"
);

/** Explicit merge targets — legacy staff-order label → existing canonical code. */
const MERGE_INTO = {
  "Ambulate Patient": "ambulation_trial",
  "Apply Ice to Affected Area": "ice_pack",
  "Bladder Scan": "bladder_scan",
  "C Collar": "cervical_collar",
  "Soft Collar": "cervical_collar",
  "Cardiac Monitoring": "continuous_cardiac_monitoring",
  "Continuous Cardiac Monitoring": "continuous_cardiac_monitoring",
  "Collect Blood Culture Prior to Starting Antibiotic": "blood_culture_collection",
  "Consult Behavioral Health": "psychiatry_consult",
  "Consult Cardiology": "cardiology_consult",
  "Consult Neurology": "neurology_consult",
  "Consult Orthopedic Surgery": "orthopedics_consult",
  "Consult Social Services": "social_work_consult",
  "Crutches": "crutches",
  "Dress Wounds": "wound_care",
  "Wet-to-Dry Dressing Change": "dressing_change",
  "EKG 12 Lead": "ekg_ecg",
  "EKG 12 Lead at 3 Hours": "ekg_ecg",
  "EKG 12 Lead at 6 Hours": "ekg_ecg",
  "Repeat EKG 12 Lead": "ekg_ecg",
  "Third Repeat EKG 12 Lead": "ekg_ecg",
  "Give Warm Blanket": "warm_blanket",
  "Warm Blanket": "warm_blanket",
  "Insert Indwelling Foley Catheter": "foley_catheter",
  "IV Saline Lock": "peripheral_iv_placement",
  "Saline Lock IV": "peripheral_iv_placement",
  "Level I Trauma Activation / Full Trauma Activation": "trauma_team_activation",
  "Level II Trauma Activation / Modified Trauma Activation": "trauma_team_activation",
  "Level III Trauma Activation / Trauma Alert Consult": "trauma_team_activation",
  "NG Tube Insert": "ng_tube_placement",
  "OG / Orogastric Tube Insertion": "ng_tube_placement",
  "NPO": "npo_status",
  "NPO Until Patient Medically Cleared": "npo_status",
  "Oral Suction": "suctioning",
  "Suction for Sputum": "suctioning",
  "Oxygen": "oxygen_therapy",
  "PO Challenge": "oral_challenge",
  "POC Glucose": "glucose_check",
  "POC Urine Pregnancy": "pregnancy_test",
  "Psych Evaluation Call": "psychiatry_consult",
  "Respiratory Therapy Request": "respiratory_treatment",
  "Sitter at Bedside": "constant_observation",
  "Splint Aircast Left Ankle": "splint_application",
  "Splint Aircast Right Ankle": "splint_application",
  "Lower Extremity Splint": "splint_application",
  "Upper Extremity Splint": "splint_application",
  "Arm Sling": "splint_application",
  "Stroke Alert": "stroke_alert_activation",
  "Stroke Team": "stroke_alert_activation",
  "Transfer": "patient_transport",
  "Central Line Insertion Setup": "central_line_placement",
  "Set Up Central Line": "central_line_placement",
  "Chest Tube Setup": "chest_tube",
  "Set Up Chest Tube": "chest_tube",
  "LP Tray": "lumbar_puncture",
  "LP Tray to Bedside": "lumbar_puncture",
  "Set Up Lumbar Puncture Tray": "lumbar_puncture",
  "Set Up Intubation": "endotracheal_intubation",
  "Set Up Laceration Repair": "laceration_repair",
  "Leather Restraints Protocol": "restraints_application",
  "Soft Restraints Per Protocol": "restraints_application",
  "Restraints Non-Violent or Non-Self-Destructive": "restraints_application",
  "Violent or Self-Destructive Restraints Adult 18+": "restraints_application",
  "Prepare Patient for Procedural Sedation": "procedural_sedation",
  "Set Up Procedural Sedation": "procedural_sedation",
  "Contact Poison Control": "consult_poison_control",
  "Morgan Lens": "eye_irrigation_morgan_lens",
  "Eye Irrigation with Morgan Lens": "eye_irrigation_morgan_lens",
  "Incentive Spirometry RT Request": "incentive_spirometry_rt",
  "Incentive Spirometry Nursing": "incentive_spirometry_nursing",
  "Weight": "weigh_patient",
  "Remove Wound Dressing": "remove_dressing",
  "Remove Dressing": "remove_dressing",
  "Vitals": "vitals_check",
  "Neuro Vitals": "neuro_vitals_check",
  "Visual Acuity Screening": "visual_acuity",
  "Document Vital Signs in Chart No More Than Every 15 Minutes": "vitals_q15_document",
  "Vital Sign Check Every 15 Minutes and Document in Chart": "vitals_q15_document",
  "Document Vital Signs in Chart No More Than Every 30 Minutes": "vitals_q30_document",
  "Vital Sign Check Every 30 Minutes and Document in Chart": "vitals_q30_document",
  "Vital Sign Check Every 60 Minutes and Document in Chart": "vitals_q60_document",
  "Vital Sign Check Every 4 Hours": "vitals_q4_document",
  "Notify MD if Abnormal Vitals": "notify_md_abnormal_vitals",
  "Pulse Oximetry": "pulse_oximetry",
  "Spot Pulse Oximetry": "pulse_oximetry",
  "High Flow Nasal Cannula Oxygen": "high_flow_nasal_cannula",
};

/** Wave-1 primary label for a new canonical code (aliases merge via MERGE_INTO). */
const NEW_CANONICAL_PRIMARY = {
  consult_poison_control: "Consult Poison Control",
  eye_irrigation_morgan_lens: "Eye Irrigation with Morgan Lens",
  incentive_spirometry_rt: "Incentive Spirometry RT Request",
  incentive_spirometry_nursing: "Incentive Spirometry Nursing",
  weigh_patient: "Weigh Patient",
  remove_dressing: "Remove Dressing",
  vitals_check: "Vitals",
  neuro_vitals_check: "Neuro Vitals",
  visual_acuity: "Visual Acuity",
  vitals_q15_document: "Vital Sign Check Every 15 Minutes and Document in Chart",
  vitals_q30_document: "Vital Sign Check Every 30 Minutes and Document in Chart",
  vitals_q60_document: "Vital Sign Check Every 60 Minutes and Document in Chart",
  vitals_q4_document: "Vital Sign Check Every 4 Hours",
  notify_md_abnormal_vitals: "Notify MD if Abnormal Vitals",
  pulse_oximetry: "Pulse Oximetry",
  high_flow_nasal_cannula: "High Flow Nasal Cannula Oxygen",
  bipap_rt_request: "BiPAP RT Request",
  cpap_rt_request: "CPAP RT Request",
  bcpap_rt_request: "BCPAP",
};

const CATEGORY_RULES = [
  [/^(Admit|Place in Observation|Bed Request|Complete Admit|Admitting|Release to Funeral)/i, "ADMISSION_DISPOSITION"],
  [/^Consult /i, "CONSULTS"],
  [/^Contact Poison|^Consult Poison/i, "CONSULTS"],
  [/^POC |^Collect Blood|^Sputum Collection|^Rectal Temperature/i, "SPECIMEN_POC"],
  [
    /RT Request|BiPAP|CPAP|BCPAP|Ventilator|Respiratory|Spirometry|Cool Mist|Bulb Suction|Nasal Trumpet|Peak Flow|Spacer|Oxygen Titrate|EtCO2/i,
    "RESPIRATORY",
  ],
  [
    /EKG|Cardiac|Pulse Ox|Vital|Vitals|Holter|Telemetry|Monitor|EtCO2|Doppler|Orthostatic|Neuro Vitals|Weigh|Weight|Temperature|Fetal Heart|Fetal Monitoring|Continuous Fetal|Central VO2|Blood Pressure|BP Bilateral/i,
    "MONITORING",
  ],
  [/Stroke Target|Stroke|Neuro Check|Neurovascular|Seizure|Head of Bed 30/i, "NEURO_STROKE"],
  [/Level .*Trauma|Massive Transfusion|Back Board|Log Roll|Septic Team|Cardiac Team/i, "TRAUMA"],
  [
    /Notify |Contact MD|Nursing Communication|Document LMP|Obtain Old|Obtain Parental|Obtain Consent|Add Pharmacy|Psych Evaluation|Financial Services|Resuscitation Status|Smoking Cessation|Echocardiogram|MSDS|Activity|Diet|Admitting Diagnosis|Admitting Doctor|Call Hospitalist/i,
    "COMMUNICATION",
  ],
  [
    /Wound|Dressing|Suture|Staple|Debride|Steri|Irrigate Wound|Soak Wound|Elastic Wrap|Ace Wrap|Techni-Care|Wound Setup|Apply Loose|Apply Steri|Remove Staples|Remove Sutures|Suture Setup|Suture Removal/i,
    "WOUND_CARE",
  ],
  [
    /Splint|Immobilizer|Sling|Cane|Walker|Crutch|Orthopedic Boot|Orthopedic Shoe|Post-op Shoe|Clavicle|Buddy Tape|Abdominal Binder|Shoulder Immobilizer|Knee Immobilizer|Remove C Collar|C Collar|Soft Collar|Back Board/i,
    "ORTHOPEDICS_IMMOBILIZATION",
  ],
  [
    /Foley|Bladder|Urinary|Catheter|Enema|Disimpaction|NG Tube|OG |Pelvic Exam|Clamp Feeding|Barthol|Leg Bag|Urine Strainer|Straight Catheter|Continuous Bladder|Irrigate.*Catheter|Suprapubic|Give Urinal|Commode|Rectal/i,
    "GI_GU",
  ],
  [
    /IV |Saline Lock|Central Line|Midline|PICC|Transfuse|Fluid Warmer|Arterial|Sterile Gloves|Set Up Suction|Set Up Bronchoscopy|Transvenous Pacer|Pacer Pads/i,
    "VASCULAR_ACCESS",
  ],
  [
    /Restraint|Sitter|Fall|Elopement|Suicide|Swallowing|Assist Patient|Ambulate|PO Fluids|Apply Heat|Give Urinal|Commode|Weigh|Incentive Spirometry Nursing|Reassess and Document Temperature|Verify and Document Antipyretic|Disimpaction|Enema|Soap Suds|PO Fluids|Diet|Activity|Log Roll|Measure Left Calf|Eye Patch|Eye Protection|Smoking/i,
    "NURSING_PATIENT_CARE",
  ],
  [/Eye |Ear |Cerumen|Slit Lamp|Tono Pen|Visual Acuity|Nasal Balloon|Nasal Tampon|Epistaxis|Dental|Set Up Dental|Set Up Epistaxis|Set Up Slit|Set Up Nasopharyngoscope|Katz Extractor/i, "OTHER"],
  [/Set Up |Tray to Bedside|Laceration Kit|Prepare Patient|LP Tray|Pelvic Exam Setup|Wound Setup|Suture Setup|Dental Tray|Ear Tray|Eye Tray|Epistaxis Tray|Set Up Trach/i, "OTHER"],
];

const PROVIDER_PATTERNS =
  /Consult |PICC Line|Midline Catheter|Transvenous Pacer|Set Up Intubation|Set Up Laceration|Set Up Bronchoscopy|Set Up Central Line|Set Up Chest Tube|Set Up Lumbar|Prepare Patient for Procedural|Obtain Consent for Lumbar|Obtain Consent for Sedation|Obtain Consent for Thrombolytics|Massive Transfusion|Level .*Trauma|Debride Wound|Cerumen Disimpaction|Transfuse /i;

function slugify(label) {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
    .slice(0, 72);
}

function inferCategory(label) {
  for (const [pattern, category] of CATEGORY_RULES) {
    if (pattern.test(label)) return category;
  }
  return "NURSING_PATIENT_CARE";
}

function inferExecutionRole(category, label) {
  if (PROVIDER_PATTERNS.test(label) || category === "CONSULTS") return "PROVIDER";
  if (/RT Request|BiPAP|CPAP|BCPAP|Ventilator|Respiratory Therapy|Peak Flow|Cool Mist|Bulb Suction|Incentive Spirometry RT|Spacer.*RT/i.test(label))
    return "RESPIRATORY";
  if (/Level .*Trauma|Stroke Team|Stroke Alert|Septic Team|Cardiac Team|Massive Transfusion/i.test(label))
    return "MULTI_ROLE";
  return "NURSING";
}

function toFrench(en) {
  const map = {
    "Consult ": "Consultation ",
    "Admit to ": "Admission en ",
    "Notify MD ": "Alerter le médecin si ",
    "Notify APP ": "Alerter l'APP ",
    "Set Up ": "Préparer ",
    "POC ": "POC ",
    " RT Request": " — demande RT",
    "NPO": "NPO (à jeun)",
    "Apply Heat to Affected Area": "Application de chaleur sur la zone affectée",
    "Apply Ice to Affected Area": "Application de glace sur la zone affectée",
    "Give Warm Blanket": "Donner une couverture chauffante",
    "Warm Blanket": "Couverture chauffante",
    "Weigh Patient": "Peser le patient",
    "Pulse Oximetry": "Oxymétrie de pouls",
    "Seizure Precautions": "Précautions convulsions",
    "Suicide Precautions": "Précautions suicide",
    "Fall Precautions": "Précautions anti-chute",
  };
  if (map[en]) return map[en];
  for (const [k, v] of Object.entries(map)) {
    if (en.startsWith(k)) return v + en.slice(k.length);
  }
  return en;
}

function parseCsv(content) {
  const lines = content.trim().split("\n");
  const header = lines[0].split(",");
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(",");
    rows.push({
      displayNameEn: parts[0]?.trim() ?? "",
      category: parts[1]?.trim() || undefined,
      mergeIntoCode: parts[2]?.trim() || undefined,
      code: parts[3]?.trim() || undefined,
      requiresProviderOrder: parts[4]?.trim() === "Y",
    });
  }
  return rows;
}

function main() {
  if (!fs.existsSync(csvPath)) {
    console.error("Missing CSV:", csvPath);
    process.exit(1);
  }
  const csvRows = parseCsv(fs.readFileSync(csvPath, "utf8"));
  const aliasMerges = {};
  const newRows = [];
  const usedCodes = new Set();
  const duplicateMerges = [];

  const primaryLabelByCode = new Map(Object.entries(NEW_CANONICAL_PRIMARY));

  for (const row of csvRows) {
    const label = row.displayNameEn;
    if (!label) continue;

    const mergeTarget = row.mergeIntoCode || MERGE_INTO[label];
    if (mergeTarget) {
      const primaryLabel = primaryLabelByCode.get(mergeTarget);
      if (primaryLabel && primaryLabel !== label) {
        if (!aliasMerges[mergeTarget]) aliasMerges[mergeTarget] = [];
        aliasMerges[mergeTarget].push(label);
        duplicateMerges.push({ canonicalCode: mergeTarget, mergedFrom: label, reason: "WAVE1_ALIAS_MERGE" });
        continue;
      }
      if (!primaryLabel) {
        if (!aliasMerges[mergeTarget]) aliasMerges[mergeTarget] = [];
        aliasMerges[mergeTarget].push(label);
        duplicateMerges.push({ canonicalCode: mergeTarget, mergedFrom: label, reason: "WAVE1_ALIAS_MERGE" });
        continue;
      }
    }

    const forcedCode = [...primaryLabelByCode.entries()].find(([, primary]) => primary === label)?.[0];
    let code = row.code || forcedCode || slugify(label);
    if (usedCodes.has(code)) code = `${code}_${usedCodes.size}`;
    usedCodes.add(code);

    const category = row.category || inferCategory(label);
    const executionRoleCategory = inferExecutionRole(category, label);
    const requiresProviderOrder =
      row.requiresProviderOrder ?? (PROVIDER_PATTERNS.test(label) || category === "CONSULTS");

    newRows.push({
      code,
      displayNameEn: label,
      displayNameFr: toFrench(label),
      category,
      aliases: [],
      executionRoleCategory,
      orderable: true,
      isActive: true,
      requiresProviderOrder,
      nursingProtocolAllowed: !requiresProviderOrder,
      requiresClinicalNote: false,
    });
  }

  const ts = `/**
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

export const WAVE1_STAFF_ORDER_ALIAS_MERGES: Wave1StaffOrderAliasMerge[] = ${JSON.stringify(
    Object.entries(aliasMerges).map(([canonicalCode, aliases]) => ({ canonicalCode, aliases })),
    null,
    2
  )};

export const WAVE1_STAFF_ORDER_NEW_ROWS: Wave1StaffOrderNewRow[] = ${JSON.stringify(newRows, null, 2)};

export const WAVE1_STAFF_ORDER_DEDUP_REPORT = ${JSON.stringify(duplicateMerges, null, 2)} as const;

export const WAVE1_STAFF_ORDER_SOURCE_COUNT = ${csvRows.length};
export const WAVE1_STAFF_ORDER_ALIAS_MERGE_COUNT = ${duplicateMerges.length};
export const WAVE1_STAFF_ORDER_NEW_ROW_COUNT = ${newRows.length};
`;

  fs.writeFileSync(outPath, ts);
  console.log(
    JSON.stringify(
      {
        source: csvRows.length,
        aliasMerges: duplicateMerges.length,
        newRows: newRows.length,
        outPath,
      },
      null,
      2
    )
  );
}

main();
