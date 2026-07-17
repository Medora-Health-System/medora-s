/**
 * Phase 6.5 — curated Emergency Medicine controlled pilot dataset (~100 items).
 * Ingredient/product-level pilot rows for dry-run/dedupe/preview only — not clinical activation.
 */
import type { MedicationEmCategory } from "./medicationPilotDuplicatePrevention.js";

export type EmPilotDatasetRow = {
  itemCode: string;
  genericName: string;
  brandName?: string;
  strengthDisplay: string;
  concentrationText?: string;
  dosageForm: string;
  route: string;
  releaseType?: string;
  packageQuantity?: string;
  packageUnit?: string;
  containerType?: string;
  singleOrMultiDose?: string;
  category: MedicationEmCategory;
  notes?: string;
};

type Seed = {
  genericName: string;
  strengthDisplay: string;
  dosageForm: string;
  route: string;
  category: MedicationEmCategory;
};

const SEEDS: Seed[] = [
  { genericName: "acetaminophen", strengthDisplay: "500 mg", dosageForm: "tablet", route: "oral", category: "ANALGESIA" },
  { genericName: "acetaminophen", strengthDisplay: "1000 mg", dosageForm: "tablet", route: "oral", category: "ANALGESIA" },
  { genericName: "acetaminophen", strengthDisplay: "10 mg/mL", dosageForm: "injection", route: "intravenous", category: "ANALGESIA" },
  { genericName: "ibuprofen", strengthDisplay: "400 mg", dosageForm: "tablet", route: "oral", category: "ANALGESIA" },
  { genericName: "ibuprofen", strengthDisplay: "600 mg", dosageForm: "tablet", route: "oral", category: "ANALGESIA" },
  { genericName: "ketorolac", strengthDisplay: "30 mg/mL", dosageForm: "injection", route: "intravenous", category: "ANALGESIA" },
  { genericName: "ketorolac", strengthDisplay: "15 mg/mL", dosageForm: "injection", route: "intramuscular", category: "ANALGESIA" },
  { genericName: "morphine", strengthDisplay: "2 mg/mL", dosageForm: "injection", route: "intravenous", category: "ANALGESIA" },
  { genericName: "morphine", strengthDisplay: "10 mg/mL", dosageForm: "injection", route: "intravenous", category: "ANALGESIA" },
  { genericName: "hydromorphone", strengthDisplay: "1 mg/mL", dosageForm: "injection", route: "intravenous", category: "ANALGESIA" },
  { genericName: "hydromorphone", strengthDisplay: "2 mg/mL", dosageForm: "injection", route: "intravenous", category: "ANALGESIA" },
  { genericName: "fentanyl", strengthDisplay: "50 mcg/mL", dosageForm: "injection", route: "intravenous", category: "ANALGESIA" },
  { genericName: "ketamine", strengthDisplay: "10 mg/mL", dosageForm: "injection", route: "intravenous", category: "SEDATION" },
  { genericName: "ketamine", strengthDisplay: "50 mg/mL", dosageForm: "injection", route: "intramuscular", category: "SEDATION" },
  { genericName: "midazolam", strengthDisplay: "1 mg/mL", dosageForm: "injection", route: "intravenous", category: "SEDATION" },
  { genericName: "midazolam", strengthDisplay: "5 mg/mL", dosageForm: "injection", route: "intramuscular", category: "SEDATION" },
  { genericName: "lorazepam", strengthDisplay: "2 mg/mL", dosageForm: "injection", route: "intravenous", category: "SEDATION" },
  { genericName: "lorazepam", strengthDisplay: "1 mg", dosageForm: "tablet", route: "oral", category: "SEDATION" },
  { genericName: "diazepam", strengthDisplay: "5 mg/mL", dosageForm: "injection", route: "intravenous", category: "SEDATION" },
  { genericName: "diazepam", strengthDisplay: "5 mg", dosageForm: "tablet", route: "oral", category: "SEDATION" },
  { genericName: "ondansetron", strengthDisplay: "4 mg", dosageForm: "tablet", route: "oral", category: "GI" },
  { genericName: "ondansetron", strengthDisplay: "2 mg/mL", dosageForm: "injection", route: "intravenous", category: "GI" },
  { genericName: "metoclopramide", strengthDisplay: "5 mg/mL", dosageForm: "injection", route: "intravenous", category: "GI" },
  { genericName: "promethazine", strengthDisplay: "25 mg/mL", dosageForm: "injection", route: "intramuscular", category: "GI" },
  { genericName: "famotidine", strengthDisplay: "20 mg", dosageForm: "tablet", route: "oral", category: "GI" },
  { genericName: "famotidine", strengthDisplay: "10 mg/mL", dosageForm: "injection", route: "intravenous", category: "GI" },
  { genericName: "pantoprazole", strengthDisplay: "40 mg", dosageForm: "injection", route: "intravenous", category: "GI" },
  { genericName: "aluminum hydroxide / magnesium hydroxide", strengthDisplay: "400 mg", dosageForm: "oral_liquid", route: "oral", category: "GI" },
  { genericName: "dicyclomine", strengthDisplay: "10 mg", dosageForm: "capsule", route: "oral", category: "GI" },
  { genericName: "polyethylene glycol", strengthDisplay: "17 g", dosageForm: "powder", route: "oral", category: "GI" },
  { genericName: "lactulose", strengthDisplay: "10 g/15 mL", dosageForm: "oral_liquid", route: "oral", category: "GI" },
  { genericName: "ceftriaxone", strengthDisplay: "1 g", dosageForm: "injection", route: "intravenous", category: "ANTIBIOTIC" },
  { genericName: "ceftriaxone", strengthDisplay: "2 g", dosageForm: "injection", route: "intravenous", category: "ANTIBIOTIC" },
  { genericName: "cefepime", strengthDisplay: "1 g", dosageForm: "injection", route: "intravenous", category: "ANTIBIOTIC" },
  { genericName: "cefepime", strengthDisplay: "2 g", dosageForm: "injection", route: "intravenous", category: "ANTIBIOTIC" },
  { genericName: "cefazolin", strengthDisplay: "1 g", dosageForm: "injection", route: "intravenous", category: "ANTIBIOTIC" },
  { genericName: "piperacillin / tazobactam", strengthDisplay: "3.375 g", dosageForm: "injection", route: "intravenous", category: "ANTIBIOTIC" },
  { genericName: "piperacillin / tazobactam", strengthDisplay: "4.5 g", dosageForm: "injection", route: "intravenous", category: "ANTIBIOTIC" },
  { genericName: "vancomycin", strengthDisplay: "1 g", dosageForm: "injection", route: "intravenous", category: "ANTIBIOTIC" },
  { genericName: "clindamycin", strengthDisplay: "150 mg/mL", dosageForm: "injection", route: "intravenous", category: "ANTIBIOTIC" },
  { genericName: "azithromycin", strengthDisplay: "500 mg", dosageForm: "tablet", route: "oral", category: "ANTIBIOTIC" },
  { genericName: "azithromycin", strengthDisplay: "500 mg", dosageForm: "injection", route: "intravenous", category: "ANTIBIOTIC" },
  { genericName: "doxycycline", strengthDisplay: "100 mg", dosageForm: "capsule", route: "oral", category: "ANTIBIOTIC" },
  { genericName: "amoxicillin / clavulanate", strengthDisplay: "875 mg", dosageForm: "tablet", route: "oral", category: "ANTIBIOTIC" },
  { genericName: "ciprofloxacin", strengthDisplay: "500 mg", dosageForm: "tablet", route: "oral", category: "ANTIBIOTIC" },
  { genericName: "ciprofloxacin", strengthDisplay: "400 mg", dosageForm: "injection", route: "intravenous", category: "ANTIBIOTIC" },
  { genericName: "levofloxacin", strengthDisplay: "750 mg", dosageForm: "tablet", route: "oral", category: "ANTIBIOTIC" },
  { genericName: "metronidazole", strengthDisplay: "500 mg", dosageForm: "tablet", route: "oral", category: "ANTIBIOTIC" },
  { genericName: "metronidazole", strengthDisplay: "500 mg", dosageForm: "injection", route: "intravenous", category: "ANTIBIOTIC" },
  { genericName: "meropenem", strengthDisplay: "1 g", dosageForm: "injection", route: "intravenous", category: "ANTIBIOTIC" },
  { genericName: "epinephrine", strengthDisplay: "1 mg/mL", dosageForm: "injection", route: "intravenous", category: "RESUSCITATION" },
  { genericName: "epinephrine", strengthDisplay: "0.1 mg/mL", dosageForm: "injection", route: "intravenous", category: "RESUSCITATION" },
  { genericName: "epinephrine", strengthDisplay: "0.3 mg", dosageForm: "autoinjector", route: "intramuscular", category: "ALLERGY" },
  { genericName: "norepinephrine", strengthDisplay: "1 mg/mL", dosageForm: "injection", route: "intravenous", category: "RESUSCITATION" },
  { genericName: "dopamine", strengthDisplay: "40 mg/mL", dosageForm: "injection", route: "intravenous", category: "RESUSCITATION" },
  { genericName: "dobutamine", strengthDisplay: "12.5 mg/mL", dosageForm: "injection", route: "intravenous", category: "CARDIAC" },
  { genericName: "phenylephrine", strengthDisplay: "10 mg/mL", dosageForm: "injection", route: "intravenous", category: "RESUSCITATION" },
  { genericName: "vasopressin", strengthDisplay: "20 units/mL", dosageForm: "injection", route: "intravenous", category: "RESUSCITATION" },
  { genericName: "atropine", strengthDisplay: "0.1 mg/mL", dosageForm: "injection", route: "intravenous", category: "RESUSCITATION" },
  { genericName: "adenosine", strengthDisplay: "3 mg/mL", dosageForm: "injection", route: "intravenous", category: "CARDIAC" },
  { genericName: "amiodarone", strengthDisplay: "50 mg/mL", dosageForm: "injection", route: "intravenous", category: "CARDIAC" },
  { genericName: "diltiazem", strengthDisplay: "5 mg/mL", dosageForm: "injection", route: "intravenous", category: "CARDIAC" },
  { genericName: "metoprolol", strengthDisplay: "1 mg/mL", dosageForm: "injection", route: "intravenous", category: "CARDIAC" },
  { genericName: "metoprolol", strengthDisplay: "25 mg", dosageForm: "tablet", route: "oral", category: "CARDIAC" },
  { genericName: "labetalol", strengthDisplay: "5 mg/mL", dosageForm: "injection", route: "intravenous", category: "CARDIAC" },
  { genericName: "hydralazine", strengthDisplay: "20 mg/mL", dosageForm: "injection", route: "intravenous", category: "CARDIAC" },
  { genericName: "nicardipine", strengthDisplay: "2.5 mg/mL", dosageForm: "injection", route: "intravenous", category: "CARDIAC" },
  { genericName: "nitroglycerin", strengthDisplay: "5 mg/mL", dosageForm: "injection", route: "intravenous", category: "CARDIAC" },
  { genericName: "aspirin", strengthDisplay: "81 mg", dosageForm: "tablet", route: "oral", category: "CARDIAC" },
  { genericName: "aspirin", strengthDisplay: "325 mg", dosageForm: "tablet", route: "oral", category: "CARDIAC" },
  { genericName: "heparin", strengthDisplay: "1000 units/mL", dosageForm: "injection", route: "intravenous", category: "CARDIAC" },
  { genericName: "albuterol", strengthDisplay: "2.5 mg/3 mL", dosageForm: "inhalation", route: "inhalation", category: "RESPIRATORY" },
  { genericName: "ipratropium", strengthDisplay: "0.5 mg/2.5 mL", dosageForm: "inhalation", route: "inhalation", category: "RESPIRATORY" },
  { genericName: "methylprednisolone", strengthDisplay: "125 mg", dosageForm: "injection", route: "intravenous", category: "RESPIRATORY" },
  { genericName: "dexamethasone", strengthDisplay: "4 mg/mL", dosageForm: "injection", route: "intravenous", category: "RESPIRATORY" },
  { genericName: "prednisone", strengthDisplay: "20 mg", dosageForm: "tablet", route: "oral", category: "RESPIRATORY" },
  { genericName: "diphenhydramine", strengthDisplay: "50 mg/mL", dosageForm: "injection", route: "intravenous", category: "ALLERGY" },
  { genericName: "diphenhydramine", strengthDisplay: "25 mg", dosageForm: "capsule", route: "oral", category: "ALLERGY" },
  { genericName: "magnesium sulfate", strengthDisplay: "500 mg/mL", dosageForm: "injection", route: "intravenous", category: "ELECTROLYTE" },
  { genericName: "racepinephrine", strengthDisplay: "2.25%", dosageForm: "inhalation", route: "inhalation", category: "RESPIRATORY" },
  { genericName: "levetiracetam", strengthDisplay: "100 mg/mL", dosageForm: "injection", route: "intravenous", category: "NEUROLOGIC" },
  { genericName: "fosphenytoin", strengthDisplay: "50 mg PE/mL", dosageForm: "injection", route: "intravenous", category: "NEUROLOGIC" },
  { genericName: "phenytoin", strengthDisplay: "50 mg/mL", dosageForm: "injection", route: "intravenous", category: "NEUROLOGIC" },
  { genericName: "valproate", strengthDisplay: "100 mg/mL", dosageForm: "injection", route: "intravenous", category: "NEUROLOGIC" },
  { genericName: "naloxone", strengthDisplay: "0.4 mg/mL", dosageForm: "injection", route: "intravenous", category: "TOXICOLOGY" },
  { genericName: "naloxone", strengthDisplay: "4 mg", dosageForm: "spray", route: "intranasal", category: "TOXICOLOGY" },
  { genericName: "flumazenil", strengthDisplay: "0.1 mg/mL", dosageForm: "injection", route: "intravenous", category: "TOXICOLOGY" },
  { genericName: "insulin regular", strengthDisplay: "100 units/mL", dosageForm: "injection", route: "intravenous", category: "ENDOCRINE" },
  { genericName: "insulin lispro", strengthDisplay: "100 units/mL", dosageForm: "injection", route: "subcutaneous", category: "ENDOCRINE" },
  { genericName: "dextrose", strengthDisplay: "50%", dosageForm: "injection", route: "intravenous", category: "ENDOCRINE" },
  { genericName: "dextrose", strengthDisplay: "10%", dosageForm: "infusion", route: "intravenous", category: "FLUID" },
  { genericName: "glucagon", strengthDisplay: "1 mg", dosageForm: "injection", route: "intramuscular", category: "ENDOCRINE" },
  { genericName: "calcium gluconate", strengthDisplay: "100 mg/mL", dosageForm: "injection", route: "intravenous", category: "ELECTROLYTE" },
  { genericName: "calcium chloride", strengthDisplay: "100 mg/mL", dosageForm: "injection", route: "intravenous", category: "ELECTROLYTE" },
  { genericName: "sodium bicarbonate", strengthDisplay: "8.4%", dosageForm: "injection", route: "intravenous", category: "ELECTROLYTE" },
  { genericName: "potassium chloride", strengthDisplay: "2 mEq/mL", dosageForm: "injection", route: "intravenous", category: "ELECTROLYTE" },
  { genericName: "sodium chloride", strengthDisplay: "0.9%", dosageForm: "infusion", route: "intravenous", category: "FLUID" },
  { genericName: "lactated ringers", strengthDisplay: "1 L", dosageForm: "infusion", route: "intravenous", category: "FLUID" },
  { genericName: "alteplase", strengthDisplay: "100 mg", dosageForm: "injection", route: "intravenous", category: "THROMBOLYTIC" },
  { genericName: "tenecteplase", strengthDisplay: "50 mg", dosageForm: "injection", route: "intravenous", category: "THROMBOLYTIC" },
  { genericName: "acetylcysteine", strengthDisplay: "200 mg/mL", dosageForm: "injection", route: "intravenous", category: "TOXICOLOGY" },
  { genericName: "fomepizole", strengthDisplay: "1 g/mL", dosageForm: "injection", route: "intravenous", category: "TOXICOLOGY" },
  { genericName: "activated charcoal", strengthDisplay: "50 g", dosageForm: "suspension", route: "oral", category: "TOXICOLOGY" },
  { genericName: "hydroxocobalamin", strengthDisplay: "5 g", dosageForm: "injection", route: "intravenous", category: "TOXICOLOGY" },
  { genericName: "lidocaine", strengthDisplay: "1%", dosageForm: "injection", route: "infiltration", category: "PROCEDURAL" },
  { genericName: "lidocaine", strengthDisplay: "2%", dosageForm: "injection", route: "infiltration", category: "PROCEDURAL" },
  { genericName: "bupivacaine", strengthDisplay: "0.25%", dosageForm: "injection", route: "infiltration", category: "PROCEDURAL" },
  { genericName: "ropivacaine", strengthDisplay: "0.5%", dosageForm: "injection", route: "infiltration", category: "PROCEDURAL" },
  { genericName: "tranexamic acid", strengthDisplay: "100 mg/mL", dosageForm: "injection", route: "intravenous", category: "PROCEDURAL" },
  { genericName: "oxytocin", strengthDisplay: "10 units/mL", dosageForm: "injection", route: "intravenous", category: "PROCEDURAL" },
];

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function buildRows(): EmPilotDatasetRow[] {
  const rows: EmPilotDatasetRow[] = [];
  const seen = new Set<string>();
  for (const seed of SEEDS) {
    const itemCode =
      `EM_PILOT_${slug(seed.genericName)}_${slug(seed.strengthDisplay)}_${slug(seed.dosageForm)}_${slug(seed.route)}`.toUpperCase();
    if (seen.has(itemCode)) continue;
    seen.add(itemCode);
    rows.push({
      itemCode,
      genericName: seed.genericName,
      strengthDisplay: seed.strengthDisplay,
      concentrationText: seed.strengthDisplay.includes("/") ? seed.strengthDisplay : undefined,
      dosageForm: seed.dosageForm,
      route: seed.route,
      releaseType: "immediate",
      category: seed.category,
      containerType:
        seed.dosageForm === "injection" || seed.dosageForm === "infusion" ? "vial" : "unit_dose",
      singleOrMultiDose: seed.dosageForm === "infusion" ? "multi_dose" : "single_dose",
    });
  }
  return rows;
}

export const EM_PILOT_DATASET_ROWS: EmPilotDatasetRow[] = buildRows();

export const EM_PILOT_DEFAULT_MANIFEST_META = {
  pilotId: "EM_CONTROLLED_PILOT_V1",
  pilotName: "Emergency Medicine Controlled Medication Pilot",
  pilotVersion: "1.0.0",
  scope: "CONTROLLED_EMERGENCY_MEDICATION_PILOT",
  clinicalDomain: "EMERGENCY_MEDICINE",
  dataClassification: "CONTROLLED_REAL_PILOT",
  clinicalActivationAllowed: false,
  pilotStatus: "DRAFT",
  approvalStatus: "DRAFT",
  medicationCountExpected: EM_PILOT_DATASET_ROWS.length,
  notes:
    "Curated EM pilot (~100 items). Dry-run/dedupe/preview only until MEDICATION_ADMIN approves staging. No clinical activation.",
} as const;

export function getEmPilotDatasetStats() {
  const categories = new Map<string, number>();
  for (const row of EM_PILOT_DATASET_ROWS) {
    categories.set(row.category, (categories.get(row.category) ?? 0) + 1);
  }
  return {
    total: EM_PILOT_DATASET_ROWS.length,
    categories: Object.fromEntries(categories),
  };
}
