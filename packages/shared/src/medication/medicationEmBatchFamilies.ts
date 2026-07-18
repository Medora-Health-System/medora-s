/**
 * Phase 7 — curated Emergency Medicine medication family scope (~100 families).
 * Families are not orderables; each may yield multiple clinically distinct products.
 */
import type { MedicationEmCategory } from "./medicationPilotDuplicatePrevention.js";
import type { MedicationBatchGovernanceReview } from "./medicationBatchGovernance.js";

export type EmBatchMedicationFamily = {
  familyCode: string;
  genericName: string;
  category: MedicationEmCategory;
  expectedForms: string[];
  expectedRoutes: string[];
  expectedStrengths: string[];
  highAlertReview: boolean;
  controlledSubstanceReview: boolean;
  reviewPriority: "HIGH" | "STANDARD" | "LOW";
  governanceReview: MedicationBatchGovernanceReview;
  inclusionReason: string;
  excluded?: boolean;
  exclusionReason?: string;
};

function family(
  genericName: string,
  category: MedicationEmCategory,
  opts: Partial<
    Omit<EmBatchMedicationFamily, "familyCode" | "genericName" | "category">
  > = {}
): EmBatchMedicationFamily {
  const slug = genericName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  return {
    familyCode: `EM_FAM_${slug}`.toUpperCase(),
    genericName,
    category,
    expectedForms: opts.expectedForms ?? ["injection", "tablet"],
    expectedRoutes: opts.expectedRoutes ?? ["intravenous", "oral"],
    expectedStrengths: opts.expectedStrengths ?? [],
    highAlertReview: opts.highAlertReview ?? false,
    controlledSubstanceReview: opts.controlledSubstanceReview ?? false,
    reviewPriority: opts.reviewPriority ?? "STANDARD",
    governanceReview:
      opts.governanceReview ??
      (opts.controlledSubstanceReview
        ? "CONTROLLED_SUBSTANCE_REVIEW_REQUIRED"
        : opts.highAlertReview
          ? "HIGH_ALERT_REVIEW_REQUIRED"
          : "STANDARD_REVIEW"),
    inclusionReason:
      opts.inclusionReason ?? "Core Emergency Medicine acute-care medication family",
    excluded: opts.excluded,
    exclusionReason: opts.exclusionReason,
  };
}

/** Curated included EM medication families for Phase 7 controlled batch (~100). */
export const EM_BATCH_MEDICATION_FAMILIES: EmBatchMedicationFamily[] = [
  // Analgesia / antipyretics
  family("acetaminophen", "ANALGESIA"),
  family("ibuprofen", "ANALGESIA"),
  family("naproxen", "ANALGESIA", { expectedForms: ["tablet"], expectedRoutes: ["oral"] }),
  family("ketorolac", "ANALGESIA", { highAlertReview: true }),
  family("aspirin", "CARDIAC", { expectedForms: ["tablet"], expectedRoutes: ["oral"] }),
  family("morphine", "ANALGESIA", {
    controlledSubstanceReview: true,
    highAlertReview: true,
    reviewPriority: "HIGH",
  }),
  family("hydromorphone", "ANALGESIA", {
    controlledSubstanceReview: true,
    highAlertReview: true,
    reviewPriority: "HIGH",
  }),
  family("fentanyl", "ANALGESIA", {
    controlledSubstanceReview: true,
    highAlertReview: true,
    reviewPriority: "HIGH",
  }),
  family("oxycodone", "ANALGESIA", {
    controlledSubstanceReview: true,
    expectedForms: ["tablet"],
    expectedRoutes: ["oral"],
  }),
  family("tramadol", "ANALGESIA", {
    controlledSubstanceReview: true,
    expectedForms: ["tablet"],
    expectedRoutes: ["oral"],
  }),
  // Sedation / behavioral
  family("ketamine", "SEDATION", {
    controlledSubstanceReview: true,
    highAlertReview: true,
    reviewPriority: "HIGH",
  }),
  family("midazolam", "SEDATION", {
    controlledSubstanceReview: true,
    highAlertReview: true,
    reviewPriority: "HIGH",
  }),
  family("lorazepam", "SEDATION", { controlledSubstanceReview: true }),
  family("diazepam", "SEDATION", { controlledSubstanceReview: true }),
  family("haloperidol", "SEDATION"),
  family("droperidol", "SEDATION", { highAlertReview: true }),
  family("olanzapine", "SEDATION"),
  family("ziprasidone", "SEDATION"),
  family("dexmedetomidine", "SEDATION", { highAlertReview: true, reviewPriority: "HIGH" }),
  family("propofol", "SEDATION", { highAlertReview: true, reviewPriority: "HIGH" }),
  // GI
  family("ondansetron", "GI"),
  family("metoclopramide", "GI"),
  family("promethazine", "GI"),
  family("prochlorperazine", "GI"),
  family("famotidine", "GI"),
  family("pantoprazole", "GI"),
  family("omeprazole", "GI", { expectedForms: ["capsule"], expectedRoutes: ["oral"] }),
  family("dicyclomine", "GI", { expectedForms: ["capsule"], expectedRoutes: ["oral"] }),
  family("lactulose", "GI", { expectedForms: ["oral_liquid"], expectedRoutes: ["oral"] }),
  family("polyethylene glycol", "GI", { expectedForms: ["powder"], expectedRoutes: ["oral"] }),
  // Antibiotics
  family("ceftriaxone", "ANTIBIOTIC"),
  family("cefazolin", "ANTIBIOTIC"),
  family("cefepime", "ANTIBIOTIC"),
  family("ceftazidime", "ANTIBIOTIC"),
  family("piperacillin / tazobactam", "ANTIBIOTIC"),
  family("vancomycin", "ANTIBIOTIC", { highAlertReview: true }),
  family("clindamycin", "ANTIBIOTIC"),
  family("azithromycin", "ANTIBIOTIC"),
  family("doxycycline", "ANTIBIOTIC"),
  family("amoxicillin / clavulanate", "ANTIBIOTIC"),
  family("ciprofloxacin", "ANTIBIOTIC"),
  family("levofloxacin", "ANTIBIOTIC"),
  family("metronidazole", "ANTIBIOTIC"),
  family("meropenem", "ANTIBIOTIC"),
  family("ertapenem", "ANTIBIOTIC"),
  family("linezolid", "ANTIBIOTIC"),
  family("fluconazole", "ANTIBIOTIC"),
  family("acyclovir", "ANTIBIOTIC"),
  // Cardiovascular / resuscitation
  family("epinephrine", "RESUSCITATION", { highAlertReview: true, reviewPriority: "HIGH" }),
  family("norepinephrine", "RESUSCITATION", { highAlertReview: true, reviewPriority: "HIGH" }),
  family("dopamine", "RESUSCITATION", { highAlertReview: true }),
  family("dobutamine", "RESUSCITATION", { highAlertReview: true }),
  family("phenylephrine", "RESUSCITATION", { highAlertReview: true }),
  family("vasopressin", "RESUSCITATION", { highAlertReview: true }),
  family("atropine", "RESUSCITATION", { highAlertReview: true }),
  family("adenosine", "CARDIAC", { highAlertReview: true }),
  family("amiodarone", "CARDIAC", { highAlertReview: true }),
  family("lidocaine", "CARDIAC", {
    inclusionReason: "Antiarrhythmic / local anesthetic family — presentations remain distinct",
  }),
  family("diltiazem", "CARDIAC"),
  family("metoprolol", "CARDIAC"),
  family("esmolol", "CARDIAC", { highAlertReview: true }),
  family("labetalol", "CARDIAC"),
  family("hydralazine", "CARDIAC"),
  family("nicardipine", "CARDIAC", { highAlertReview: true }),
  family("nitroglycerin", "CARDIAC", { highAlertReview: true }),
  family("heparin", "CARDIAC", { highAlertReview: true, reviewPriority: "HIGH" }),
  family("enoxaparin", "CARDIAC", { highAlertReview: true }),
  // Respiratory / allergy
  family("albuterol", "RESPIRATORY", {
    expectedForms: ["inhalation", "nebulization"],
    expectedRoutes: ["inhalation"],
  }),
  family("ipratropium", "RESPIRATORY", {
    expectedForms: ["inhalation"],
    expectedRoutes: ["inhalation"],
  }),
  family("budesonide", "RESPIRATORY"),
  family("methylprednisolone", "RESPIRATORY"),
  family("dexamethasone", "RESPIRATORY"),
  family("prednisone", "RESPIRATORY", { expectedForms: ["tablet"], expectedRoutes: ["oral"] }),
  family("diphenhydramine", "ALLERGY"),
  family("cetirizine", "ALLERGY", { expectedForms: ["tablet"], expectedRoutes: ["oral"] }),
  family("epinephrine autoinjector", "ALLERGY", {
    highAlertReview: true,
    reviewPriority: "HIGH",
    expectedForms: ["autoinjector"],
    expectedRoutes: ["intramuscular"],
    inclusionReason: "Distinct device presentation from vial epinephrine",
  }),
  family("racemic epinephrine", "RESPIRATORY", {
    expectedForms: ["inhalation"],
    expectedRoutes: ["inhalation"],
    inclusionReason: "Distinct from systemic epinephrine presentations",
  }),
  family("magnesium sulfate", "ELECTROLYTE", { highAlertReview: true }),
  // Neurologic
  family("levetiracetam", "NEUROLOGIC"),
  family("fosphenytoin", "NEUROLOGIC", { highAlertReview: true }),
  family("phenytoin", "NEUROLOGIC", { highAlertReview: true }),
  family("valproate sodium", "NEUROLOGIC"),
  family("phenobarbital", "NEUROLOGIC", { controlledSubstanceReview: true }),
  family("lacosamide", "NEUROLOGIC"),
  family("naloxone", "TOXICOLOGY", { reviewPriority: "HIGH" }),
  family("flumazenil", "TOXICOLOGY", { highAlertReview: true }),
  family("mannitol", "NEUROLOGIC"),
  family("hypertonic saline", "ELECTROLYTE", { highAlertReview: true }),
  // Endocrine / electrolytes / fluids
  family("regular insulin", "ENDOCRINE", { highAlertReview: true, reviewPriority: "HIGH" }),
  family("insulin lispro", "ENDOCRINE", { highAlertReview: true, reviewPriority: "HIGH" }),
  family("dextrose 50%", "ENDOCRINE", { highAlertReview: true }),
  family("dextrose 10%", "ENDOCRINE"),
  family("glucagon", "ENDOCRINE"),
  family("calcium gluconate", "ELECTROLYTE", { highAlertReview: true }),
  family("calcium chloride", "ELECTROLYTE", { highAlertReview: true }),
  family("sodium bicarbonate", "ELECTROLYTE"),
  family("potassium chloride", "ELECTROLYTE", { highAlertReview: true, reviewPriority: "HIGH" }),
  family("sodium phosphate", "ELECTROLYTE", { highAlertReview: true }),
  family("sodium chloride", "FLUID"),
  family("lactated Ringer's", "FLUID"),
  // Stroke / bleeding
  family("alteplase", "THROMBOLYTIC", { highAlertReview: true, reviewPriority: "HIGH" }),
  family("tenecteplase", "THROMBOLYTIC", { highAlertReview: true, reviewPriority: "HIGH" }),
  family("tranexamic acid", "PROCEDURAL"),
  family("protamine", "CARDIAC", { highAlertReview: true }),
  family("vitamin K", "CARDIAC"),
  family("prothrombin complex concentrate", "CARDIAC", {
    highAlertReview: true,
    reviewPriority: "HIGH",
  }),
  // Toxicology
  family("acetylcysteine", "TOXICOLOGY"),
  family("fomepizole", "TOXICOLOGY"),
  family("activated charcoal", "TOXICOLOGY"),
  family("hydroxocobalamin", "TOXICOLOGY"),
  family("digoxin immune Fab", "TOXICOLOGY", { highAlertReview: true }),
  // Procedural / obstetric
  family("lidocaine with epinephrine", "PROCEDURAL"),
  family("bupivacaine", "PROCEDURAL"),
  family("ropivacaine", "PROCEDURAL"),
  family("lidocaine / epinephrine / tetracaine topical", "PROCEDURAL", {
    expectedForms: ["topical"],
    expectedRoutes: ["topical"],
  }),
  family("succinylcholine", "PROCEDURAL", { highAlertReview: true, reviewPriority: "HIGH" }),
  family("rocuronium", "PROCEDURAL", { highAlertReview: true }),
  family("vecuronium", "PROCEDURAL", { highAlertReview: true }),
  family("sugammadex", "PROCEDURAL"),
  family("oxytocin", "PROCEDURAL", { highAlertReview: true }),
  family("methylergonovine", "PROCEDURAL", { highAlertReview: true }),
];

/** Explicitly excluded from Phase 7 batch (documented scope control). */
export const EM_BATCH_EXCLUDED_FAMILIES: EmBatchMedicationFamily[] = [
  family("chemotherapy agents", "OTHER", {
    excluded: true,
    exclusionReason: "Oncology specialty catalog — out of Emergency Medicine Phase 7 scope",
  }),
  family("chronic outpatient psychiatric depot", "OTHER", {
    excluded: true,
    exclusionReason: "Chronic ambulatory specialty — not acute EM batch",
  }),
];

export const EM_BATCH_DEFAULT_MANIFEST_META = {
  batchId: "EM_CONTROLLED_BATCH_V1",
  batchName: "Emergency Medicine Controlled Medication Batch",
  batchVersion: "1.0.0",
  clinicalDomain: "EMERGENCY_MEDICINE",
  scope: "CONTROLLED_EMERGENCY_MEDICATION_BATCH",
  dataClassification: "CONTROLLED_REAL_BATCH",
  duplicateReviewRequired: true,
  humanVerificationRequired: true,
  clinicalActivationAllowed: false,
  batchStatus: "DRAFT",
  approvalStatus: "DRAFT",
  expectedMedicationFamilyCount: EM_BATCH_MEDICATION_FAMILIES.length,
  notes:
    "Phase 7 controlled EM batch. Authentic RxNorm extract required for operator execution; CI uses structural fixtures only. Clinical activation forbidden.",
} as const;

export function getEmBatchFamilyStats() {
  const included = EM_BATCH_MEDICATION_FAMILIES.filter((f) => !f.excluded);
  const categories = new Map<string, number>();
  for (const row of included) {
    categories.set(row.category, (categories.get(row.category) ?? 0) + 1);
  }
  return {
    totalFamilies: included.length,
    excludedFamilies: EM_BATCH_EXCLUDED_FAMILIES.length,
    categories: Object.fromEntries(categories),
    highAlertCount: included.filter((f) => f.highAlertReview).length,
    controlledSubstanceCount: included.filter((f) => f.controlledSubstanceReview).length,
  };
}
