/**
 * M1.4B — Medication billing mapping remediation manifest.
 * Illustrative U.S. hospital HCPCS J-codes for Haiti injectable / IV catalog rows.
 * Replace with licensed payer/facility code sets when available.
 */

export type MedicationBillingMappingCategory =
  | "INJECTABLE"
  | "INFUSION"
  | "HYDRATION"
  | "ER"
  | "OBSERVATION";

export type MedicationBillingMappingManifestEntry = {
  catalogCode: string;
  /** HCPCS J-code (drug administration). */
  hcpcs: string;
  description: string;
  billingUnitType?: string;
  category: MedicationBillingMappingCategory;
};

const J = (hcpcs: string, description: string, category: MedicationBillingMappingCategory, billingUnitType?: string) => ({
  hcpcs,
  description,
  category,
  ...(billingUnitType ? { billingUnitType } : {}),
});

/** Haiti billable catalog codes → HCPCS (J-code) suggestions. */
export const MEDICATION_BILLING_MAPPING_ENTRIES: MedicationBillingMappingManifestEntry[] = [
  { catalogCode: "TRAMADOL_100_MG_PER_2_ML_INJECTABLE_INJECTION", ...J("J1648", "Tramadol HCl injection", "INJECTABLE", "mg") },
  { catalogCode: "DICLOFENAC_75_MG_PER_3_ML_INJECTABLE_INJECTION", ...J("J1130", "Diclofenac sodium injection", "INJECTABLE", "mg") },
  { catalogCode: "METAMIZOLE_1_G_PER_2_ML_INJECTABLE_INJECTION", ...J("J3490", "Unclassified drug (metamizole)", "INJECTABLE") },
  { catalogCode: "KETOPROFEN_100_MG_PER_2_ML_INJECTABLE_INJECTION", ...J("J3490", "Unclassified drug (ketoprofen)", "INJECTABLE") },
  { catalogCode: "AMPICILLIN_1_G_INJECTABLE_INJECTION", ...J("J0290", "Ampicillin injection", "INJECTABLE", "mg") },
  { catalogCode: "CLOXACILLIN_500_MG_INJECTABLE_INJECTION", ...J("J3490", "Unclassified drug (cloxacillin)", "INJECTABLE") },
  {
    catalogCode: "BENZATHINE_PENICILLIN_G_1.2_M_UI_INJECTABLE_INTRAMUSCULAR",
    ...J("J0560", "Penicillin G benzathine injection", "INJECTABLE", "unit"),
  },
  {
    catalogCode: "BENZATHINE_PENICILLIN_G_2.4_M_UI_INJECTABLE_INTRAMUSCULAR",
    ...J("J0560", "Penicillin G benzathine injection", "INJECTABLE", "unit"),
  },
  { catalogCode: "CEFTRIAXONE_1_G_INJECTABLE_INJECTION", ...J("J0696", "Ceftriaxone sodium (per 250 mg)", "ER", "mg") },
  { catalogCode: "CEFTRIAXONE_2_G_INJECTABLE_INJECTION", ...J("J0696", "Ceftriaxone sodium (per 250 mg)", "ER", "mg") },
  { catalogCode: "CLINDAMYCIN_600_MG_PER_4_ML_INJECTABLE_INJECTION", ...J("J0735", "Clindamycin injection", "INJECTABLE", "mg") },
  {
    catalogCode: "METRONIDAZOLE_500_MG_PER_100_ML_PERFUSION_INTRAVENOUS",
    ...J("J3490", "Unclassified drug (metronidazole IV)", "INFUSION", "mg"),
  },
  { catalogCode: "FUROSEMIDE_20_MG_PER_2_ML_INJECTABLE_INJECTION", ...J("J1940", "Furosemide injection", "INJECTABLE", "mg") },
  { catalogCode: "REGULAR_INSULIN_100_UI_PER_ML_INJECTABLE_SUBCUTANEOUS", ...J("J1815", "Insulin injection (per 5 units)", "INJECTABLE", "unit") },
  { catalogCode: "NPH_INSULIN_100_UI_PER_ML_INJECTABLE_SUBCUTANEOUS", ...J("J1815", "Insulin injection (per 5 units)", "INJECTABLE", "unit") },
  { catalogCode: "INSULIN_7030_100_UI_PER_ML_INJECTABLE_SUBCUTANEOUS", ...J("J1815", "Insulin injection (per 5 units)", "INJECTABLE", "unit") },
  { catalogCode: "DEXAMETHASONE_4_MG_PER_ML_INJECTABLE_INJECTION", ...J("J1100", "Dexamethasone injection", "INJECTABLE", "mg") },
  { catalogCode: "ONDANSETRON_4_MG_PER_2_ML_INJECTABLE_INJECTION", ...J("J2405", "Ondansetron 1 mg injection", "ER", "mg") },
  { catalogCode: "METOCLOPRAMIDE_10_MG_PER_2_ML_INJECTABLE_INJECTION", ...J("J2765", "Metoclopramide injection", "INJECTABLE", "mg") },
  { catalogCode: "HYOSCINE_BUTYLBROMIDE_20_MG_PER_ML_INJECTABLE_INJECTION", ...J("J3490", "Unclassified drug (hyoscine)", "INJECTABLE") },
  { catalogCode: "OXYTOCIN_10_UI_PER_ML_INJECTABLE_INJECTION", ...J("J2590", "Oxytocin injection", "INJECTABLE", "unit") },
  { catalogCode: "MAGNESIUM_SULFATE_500_MG_PER_ML_INJECTABLE_INJECTION", ...J("J3475", "Magnesium sulfate injection", "INJECTABLE", "mg") },
  { catalogCode: "METHYLERGOMETRINE_0.2_MG_PER_ML_INJECTABLE_INJECTION", ...J("J3490", "Unclassified drug (methylergometrine)", "INJECTABLE") },
  { catalogCode: "MEDROXYPROGESTERONE_150_MG_PER_ML_INJECTABLE_INTRAMUSCULAR", ...J("J3490", "Unclassified drug (medroxyprogesterone)", "INJECTABLE") },
  { catalogCode: "ADRENALINE_1_MG_PER_ML_INJECTABLE_INJECTION", ...J("J1650", "Epinephrine injection", "ER", "mg") },
  { catalogCode: "DIAZEPAM_10_MG_PER_2_ML_INJECTABLE_INJECTION", ...J("J3360", "Diazepam injection", "INJECTABLE", "mg") },
  { catalogCode: "HYDROCORTISONE_100_MG_INJECTABLE_INJECTION", ...J("J1720", "Hydrocortisone injection", "INJECTABLE", "mg") },
  { catalogCode: "DEXTROSE_50_INJECTABLE_INTRAVENOUS", ...J("J3490", "Unclassified drug (dextrose 50%)", "ER") },
  { catalogCode: "NORMAL_SALINE_0.9_500_ML_PERFUSION_INTRAVENOUS", ...J("J7030", "Normal saline infusion, 1000 cc", "HYDRATION", "mL") },
  { catalogCode: "NORMAL_SALINE_0.9_1_L_PERFUSION_INTRAVENOUS", ...J("J7030", "Normal saline infusion, 1000 cc", "HYDRATION", "mL") },
  { catalogCode: "RINGER_LACTATE_500_ML_PERFUSION_INTRAVENOUS", ...J("J7042", "Lactated Ringer's, 1000 cc", "HYDRATION", "mL") },
  { catalogCode: "RINGER_LACTATE_1_L_PERFUSION_INTRAVENOUS", ...J("J7042", "Lactated Ringer's, 1000 cc", "HYDRATION", "mL") },
  { catalogCode: "DEXTROSE_5_500_ML_PERFUSION_INTRAVENOUS", ...J("J7060", "5% dextrose/water, 1000 cc", "HYDRATION", "mL") },
  { catalogCode: "DEXTROSE_SALINE_5_PER_0.9_PERFUSION_INTRAVENOUS", ...J("J7046", "5% dextrose/normal saline, 1000 cc", "HYDRATION", "mL") },
  { catalogCode: "GENTAMICIN_80_MG_PER_2_ML_INJECTABLE_INJECTION", ...J("J1580", "Gentamicin injection", "INJECTABLE", "mg") },
  { catalogCode: "MORPHINE_10_MG_PER_ML_INJECTABLE_INJECTION", ...J("J2270", "Morphine 10 mg injection", "ER", "mg") },
  { catalogCode: "VANCOMYCIN_1_G_INJECTABLE_INTRAVENOUS", ...J("J3370", "Vancomycin injection", "ER", "mg") },
  { catalogCode: "CALCIUM_GLUCONATE_10_INJECTABLE_INTRAVENOUS", ...J("J0612", "Calcium gluconate injection", "INJECTABLE", "mg") },
  { catalogCode: "POTASSIUM_CHLORIDE_20_MEQ_PER_10_ML_INJECTABLE_INTRAVENOUS", ...J("J3480", "Potassium chloride injection", "INJECTABLE", "mEq") },
  {
    catalogCode: "MAGNESIUM_SULFATE_2_G_PER_50_ML_PERFUSION_INTRAVENOUS",
    ...J("J3475", "Magnesium sulfate injection", "INFUSION", "mg"),
  },
  { catalogCode: "ARTESUNATE_60_MG_INJECTABLE_INJECTION", ...J("J3490", "Unclassified drug (artesunate)", "INJECTABLE") },
  { catalogCode: "VITAMIN_K_10_MG_PER_1_ML_INJECTABLE_INJECTION", ...J("J3420", "Vitamin K injection", "INJECTABLE", "mg") },
  { catalogCode: "TRANEXAMIC_ACID_500_MG_PER_5_ML_INJECTABLE_INJECTION", ...J("J3490", "Unclassified drug (tranexamic acid)", "INJECTABLE") },
  { catalogCode: "CEFTAZIDIME_1_G_INJECTABLE_INJECTION", ...J("J0713", "Ceftazidime injection", "INJECTABLE", "mg") },
  { catalogCode: "MEROPENEM_1_G_INJECTABLE_INTRAVENOUS", ...J("J2185", "Meropenem injection", "ER", "mg") },
  { catalogCode: "FLUCONAZOLE_2_MG_PER_ML_PERFUSION_INTRAVENOUS", ...J("J1450", "Fluconazole injection", "INFUSION", "mg") },
  { catalogCode: "KETOROLAC_30_MG_PER_ML_INJECTABLE_INJECTION", ...J("J1885", "Ketorolac injection", "INJECTABLE", "mg") },
  { catalogCode: "NALOXONE_0.4_MG_PER_ML_INJECTABLE_INJECTION", ...J("J2310", "Naloxone injection", "ER", "mg") },
  { catalogCode: "DIPHENHYDRAMINE_50_MG_PER_ML_INJECTABLE_INJECTION", ...J("J1200", "Diphenhydramine injection", "INJECTABLE", "mg") },
  { catalogCode: "FAMOTIDINE_20_MG_PER_2_ML_INJECTABLE_INJECTION", ...J("J3490", "Unclassified drug (famotidine)", "INJECTABLE") },
  { catalogCode: "METHYLPREDNISOLONE_125_MG_PER_2_ML_INJECTABLE_INJECTION", ...J("J2919", "Methylprednisolone injection", "INJECTABLE", "mg") },
  { catalogCode: "AMIODARONE_150_MG_PER_3_ML_INJECTABLE_INTRAVENOUS", ...J("J0280", "Amiodarone injection", "ER", "mg") },
  { catalogCode: "SUCCINYLCHOLINE_20_MG_PER_ML_INJECTABLE_INTRAVENOUS", ...J("J3490", "Unclassified drug (succinylcholine)", "ER") },
  { catalogCode: "CEFAZOLIN_1_G_INJECTABLE_INJECTION", ...J("J0690", "Cefazolin injection", "INJECTABLE", "mg") },
  { catalogCode: "CEFEPIME_1_G_INJECTABLE_INJECTION", ...J("J0712", "Cefepime injection", "INJECTABLE", "mg") },
  { catalogCode: "HYDROMORPHONE_2_MG_PER_ML_INJECTABLE_INJECTION", ...J("J1170", "Hydromorphone injection", "ER", "mg") },
  { catalogCode: "HALOPERIDOL_5_MG_PER_ML_INJECTABLE_INJECTION", ...J("J1630", "Haloperidol injection", "INJECTABLE", "mg") },
  { catalogCode: "HEPARIN_5000_UI_PER_ML_INJECTABLE_INJECTION", ...J("J1644", "Heparin injection (per 1000 units)", "INJECTABLE", "unit") },
  { catalogCode: "FENTANYL_50_MCG_PER_ML_INJECTABLE_INJECTION", ...J("J3010", "Fentanyl citrate injection", "ER", "mcg") },
  { catalogCode: "LABETALOL_5_MG_PER_ML_INJECTABLE_INTRAVENOUS", ...J("J3490", "Unclassified drug (labetalol)", "ER") },
  { catalogCode: "LIDOCAINE_2_INJECTABLE_INJECTION", ...J("J2000", "Lidocaine injection", "INJECTABLE", "mg") },
  { catalogCode: "MIDAZOLAM_5_MG_PER_ML_INJECTABLE_INJECTION", ...J("J2250", "Midazolam injection", "ER", "mg") },
  { catalogCode: "PROPOFOL_10_MG_PER_ML_INJECTABLE_INTRAVENOUS", ...J("J2704", "Propofol injection", "ER", "mg") },
  { catalogCode: "PANTOPRAZOLE_40_MG_INJECTABLE_INTRAVENOUS", ...J("J3490", "Unclassified drug (pantoprazole)", "OBSERVATION") },
  { catalogCode: "AZITHROMYCIN_500_MG_INJECTABLE_INTRAVENOUS", ...J("J0456", "Azithromycin injection", "INJECTABLE", "mg") },
  { catalogCode: "PARACETAMOL_1_G_PER_100_ML_PERFUSION_INTRAVENOUS", ...J("J0131", "Acetaminophen injection", "INFUSION", "mg") },
  { catalogCode: "ACYCLOVIR_250_MG_INJECTABLE_INTRAVENOUS", ...J("J8499", "Antiviral injection (acyclovir)", "INJECTABLE", "mg") },
  { catalogCode: "LORAZEPAM_2_MG_PER_ML_INJECTABLE_INJECTION", ...J("J2060", "Lorazepam injection", "INJECTABLE", "mg") },
  { catalogCode: "METOPROLOL_5_MG_PER_5_ML_INJECTABLE_INTRAVENOUS", ...J("J3490", "Unclassified drug (metoprolol IV)", "ER") },
  { catalogCode: "ROCURONIUM_10_MG_PER_ML_INJECTABLE_INTRAVENOUS", ...J("J3490", "Unclassified drug (rocuronium)", "ER") },
  { catalogCode: "ETOMIDATE_2_MG_PER_ML_INJECTABLE_INTRAVENOUS", ...J("J3490", "Unclassified drug (etomidate)", "ER") },
  { catalogCode: "KETAMINE_50_MG_PER_ML_INJECTABLE_INJECTION", ...J("J3490", "Unclassified drug (ketamine)", "ER") },
  { catalogCode: "NOREPINEPHRINE_4_MG_PER_4_ML_INJECTABLE_INTRAVENOUS", ...J("J3490", "Unclassified drug (norepinephrine)", "ER") },
  { catalogCode: "ADENOSINE_6_MG_PER_2_ML_INJECTABLE_INTRAVENOUS", ...J("J3490", "Unclassified drug (adenosine)", "ER") },
  {
    catalogCode: "PIPERACILLINTAZOBACTAM_4.5_G_INJECTABLE_INTRAVENOUS",
    ...J("J0665", "Piperacillin/tazobactam injection", "ER", "mg"),
  },
  { catalogCode: "SODIUM_BICARBONATE_8.4_INJECTABLE_INTRAVENOUS", ...J("J3490", "Unclassified drug (sodium bicarbonate)", "ER") },
  { catalogCode: "PHENYLEPHRINE_10_MG_PER_ML_INJECTABLE_INTRAVENOUS", ...J("J2371", "Phenylephrine injection", "ER", "mg") },
  { catalogCode: "VASOPRESSIN_20_UI_PER_ML_INJECTABLE_INTRAVENOUS", ...J("J3490", "Unclassified drug (vasopressin)", "ER") },
  { catalogCode: "DOPAMINE_400_MG_PER_250_ML_PERFUSION_INTRAVENOUS", ...J("J3490", "Unclassified drug (dopamine infusion)", "INFUSION") },
  { catalogCode: "DOBUTAMINE_250_MG_PER_20_ML_PERFUSION_INTRAVENOUS", ...J("J3490", "Unclassified drug (dobutamine infusion)", "INFUSION") },
  {
    catalogCode: "DROPERIDOL_2.5_MG_PER_ML_INJECTABLE_INTRAVEINEUSE_INTRAMUSCULAIRE",
    ...J("J1610", "Droperidol injection", "INJECTABLE", "mg"),
  },
  { catalogCode: "DEXAMETHASONE_4_MG_PER_1_ML_INJECTABLE_INJECTION", ...J("J1100", "Dexamethasone injection", "INJECTABLE", "mg") },
];

export const MEDICATION_BILLING_MAPPING_BY_CODE: Record<string, MedicationBillingMappingManifestEntry> =
  Object.fromEntries(MEDICATION_BILLING_MAPPING_ENTRIES.map((e) => [e.catalogCode, e]));

export const MEDICATION_BILLING_MAPPING_MANIFEST_VERSION = "M1.4B" as const;

/** Minimum billable-catalog HCPCS coverage for remediation sign-off (injectable + IV perfusion). */
export const MEDICATION_BILLING_MAPPING_COVERAGE_THRESHOLD_PCT = 95;

export function isBillableCatalogMedicationRow(row: {
  dosageForm?: string | null;
  route?: string | null;
  administrationType?: string | null;
}): boolean {
  const form = (row.dosageForm ?? "").toLowerCase();
  const route = (row.route ?? "").toLowerCase();
  const admin = (row.administrationType ?? "").toUpperCase();
  if (form.includes("inject") || form.includes("perfus")) return true;
  if (route.includes("intraveine") || route.includes("intravenous") || route.includes("inject")) return true;
  if (admin === "INFUSION" || admin === "PUSH") return true;
  return false;
}
