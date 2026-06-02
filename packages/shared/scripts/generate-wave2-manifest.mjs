/**
 * One-shot generator for M1.6D Wave 2 formulary + billing manifests.
 * Run: node packages/shared/scripts/generate-wave2-manifest.mjs
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const medDir = join(__dirname, "../src/medication");

/** @type {Array<{code?:string,g:string,fr:string,en:string,st:string,form:string,route:string,tc:string,bucket:string,mode:string,aliases:string[],terms?:string[],gov?:object,adm?:string,essential?:boolean}>} */
const ROWS = [
  // Anticoagulation adjuncts (Wave 1 covers core DOACs/warfarin/enoxaparin 40)
  { g: "Fondaparinux", fr: "Fondaparinux", en: "Fondaparinux", st: "2.5 mg", form: "injectable", route: "sous-cutanée", tc: "Anticoagulant", bucket: "ANTICOAGULATION", mode: "CREATE", aliases: ["Arixtra"], gov: { isHighAlert: true, requiresWitness: true, requiresPharmacyVerification: true } },
  { code: "ENOXAPARIN_60_MG_PER_0.6_ML_INJECTABLE_INJECTION", g: "Enoxaparin", fr: "Énoxaparine", en: "Enoxaparin", st: "60 mg/0.6 mL", form: "injectable", route: "injectable", tc: "Anticoagulant", bucket: "ANTICOAGULATION", mode: "CREATE", aliases: ["Lovenox 60", "lovenox"], gov: { isHighAlert: true, requiresWitness: true, requiresPharmacyVerification: true }, adm: "INJECTION" },

  // Cardiology
  { code: "ATENOLOL_50_MG_COMPRIME_ORAL", g: "Atenolol", fr: "Aténolol", en: "Atenolol", st: "50 mg", form: "comprimé", route: "orale", tc: "Bêta-bloquant", bucket: "CARDIOLOGY", mode: "ENRICH", aliases: ["Tenormin", "tenormin"] },
  { code: "ATENOLOL_100_MG_COMPRIME_ORAL", g: "Atenolol", fr: "Aténolol", en: "Atenolol", st: "100 mg", form: "comprimé", route: "orale", tc: "Bêta-bloquant", bucket: "CARDIOLOGY", mode: "ENRICH", aliases: ["Tenormin"] },
  { code: "AMIODARONE_150MG_3ML_IV", g: "Amiodarone", fr: "Amiodarone", en: "Amiodarone", st: "150 mg/3 mL", form: "injectable", route: "injectable", tc: "Antiarythmique", bucket: "CARDIOLOGY", mode: "ENRICH", aliases: ["Pacerone IV", "cordarone"], adm: "INFUSION" },
  { code: "METOPROLOL_5MG_5ML_IV", g: "Metoprolol", fr: "Métoprolol", en: "Metoprolol", st: "5 mg/5 mL", form: "injectable", route: "intraveineuse", tc: "Bêta-bloquant", bucket: "CARDIOLOGY", mode: "ENRICH", aliases: ["Lopressor IV", "Toprol"], adm: "PUSH" },
  { code: "CLOPIDOGREL_75_MG_COMPRIME_ORAL", g: "Clopidogrel", fr: "Clopidogrel", en: "Clopidogrel", st: "75 mg", form: "comprimé", route: "orale", tc: "Antiplaquettaire", bucket: "CARDIOLOGY", mode: "ENRICH", aliases: ["Plavix", "plavix"] },
  { code: "SPIRONOLACTONE_25_MG_COMPRIME_ORAL", g: "Spironolactone", fr: "Spironolactone", en: "Spironolactone", st: "25 mg", form: "comprimé", route: "orale", tc: "Diurétique", bucket: "CARDIOLOGY", mode: "ENRICH", aliases: ["Aldactone", "aldactone"] },
  { code: "ASPIRIN_81", g: "Aspirin", fr: "Aspirine", en: "Aspirin", st: "81 mg", form: "comprimé", route: "orale", tc: "Antiplaquettaire", bucket: "CARDIOLOGY", mode: "ENRICH", aliases: ["ASA", "baby aspirin"] },
  { code: "CARVEDILOL_12.5_MG_COMPRIME_ORAL", g: "Carvedilol", fr: "Carvédilol", en: "Carvedilol", st: "12.5 mg", form: "comprimé", route: "orale", tc: "Bêta-bloquant", bucket: "CARDIOLOGY", mode: "ENRICH", aliases: ["Coreg"] },
  { g: "Bisoprolol", fr: "Bisoprolol", en: "Bisoprolol", st: "5 mg", form: "comprimé", route: "orale", tc: "Bêta-bloquant", bucket: "CARDIOLOGY", mode: "CREATE", aliases: ["Zebeta", "bisoprolol"] },
  { g: "Diltiazem", fr: "Diltiazem", en: "Diltiazem", st: "120 mg", form: "comprimé", route: "orale", tc: "Anticalcique", bucket: "CARDIOLOGY", mode: "CREATE", aliases: ["Cardizem", "diltiazem"] },
  { g: "Diltiazem", fr: "Diltiazem", en: "Diltiazem", st: "20 mg/2 mL", form: "injectable", route: "injectable", tc: "Anticalcique", bucket: "CARDIOLOGY", mode: "CREATE", aliases: ["Cardizem IV"], adm: "PUSH" },
  { g: "Verapamil", fr: "Vérapamil", en: "Verapamil", st: "80 mg", form: "comprimé", route: "orale", tc: "Anticalcique", bucket: "CARDIOLOGY", mode: "CREATE", aliases: ["Calan", "verapamil"] },
  { g: "Pravastatin", fr: "Pravastatine", en: "Pravastatin", st: "20 mg", form: "comprimé", route: "orale", tc: "Hypolipémiant", bucket: "CARDIOLOGY", mode: "CREATE", aliases: ["Pravachol", "pravastatin"] },
  { g: "Nitroglycerin", fr: "Nitroglycérine", en: "Nitroglycerin", st: "0.4 mg", form: "comprimé sublingual", route: "orale", tc: "Antiangineux", bucket: "CARDIOLOGY", mode: "CREATE", aliases: ["Nitrostat", "nitro SL"], gov: { isHighAlert: true } },
  { g: "Isosorbide mononitrate", fr: "Isosorbide mononitrate", en: "Isosorbide mononitrate", st: "30 mg", form: "comprimé", route: "orale", tc: "Antiangineux", bucket: "CARDIOLOGY", mode: "CREATE", aliases: ["Imdur", "isosorbide"] },
  { g: "Digoxin", fr: "Digoxine", en: "Digoxin", st: "0.25 mg", form: "comprimé", route: "orale", tc: "Inotrope", bucket: "CARDIOLOGY", mode: "CREATE", aliases: ["Lanoxin", "digoxin"], gov: { isHighAlert: true } },
  { g: "Amiodarone", fr: "Amiodarone", en: "Amiodarone", st: "200 mg", form: "comprimé", route: "orale", tc: "Antiarythmique", bucket: "CARDIOLOGY", mode: "CREATE", aliases: ["Pacerone", "Cordarone"], gov: { isHighAlert: true } },
  { g: "Metoprolol succinate", fr: "Métoprolol succinate", en: "Metoprolol succinate", st: "50 mg", form: "comprimé", route: "orale", tc: "Bêta-bloquant", bucket: "CARDIOLOGY", mode: "CREATE", aliases: ["Toprol XL", "metoprolol XL"] },

  // Diabetes
  { code: "REGULAR_INSULIN_100_UI_PER_ML_INJECTABLE_SUBCUTANEOUS", g: "Regular Insulin", fr: "Insuline régulière", en: "Regular Insulin", st: "100 UI/mL", form: "injectable", route: "sous-cutanée", tc: "Antidiabétique", bucket: "DIABETES", mode: "ENRICH", aliases: ["Actrapid", "Humulin R", "insulin regular"], adm: "SUBCUTANEOUS" },
  { code: "NPH_INSULIN_100_UI_PER_ML_INJECTABLE_SUBCUTANEOUS", g: "NPH Insulin", fr: "Insuline NPH", en: "NPH Insulin", st: "100 UI/mL", form: "injectable", route: "sous-cutanée", tc: "Antidiabétique", bucket: "DIABETES", mode: "ENRICH", aliases: ["Insulatard", "NPH"], adm: "SUBCUTANEOUS" },
  { code: "INSULIN_7030_100_UI_PER_ML_INJECTABLE_SUBCUTANEOUS", g: "Insulin 70/30", fr: "Insuline prémix 70/30", en: "Insulin 70/30", st: "100 UI/mL", form: "injectable", route: "sous-cutanée", tc: "Antidiabétique", bucket: "DIABETES", mode: "ENRICH", aliases: ["Mixtard", "70/30 insulin"], adm: "SUBCUTANEOUS" },
  { g: "Insulin glargine", fr: "Insuline glargine", en: "Insulin glargine", st: "100 UI/mL", form: "injectable", route: "sous-cutanée", tc: "Antidiabétique", bucket: "DIABETES", mode: "CREATE", aliases: ["Lantus", "Basaglar", "glargine"], adm: "SUBCUTANEOUS", gov: { isHighAlert: true } },
  { g: "Insulin lispro", fr: "Insuline lispro", en: "Insulin lispro", st: "100 UI/mL", form: "injectable", route: "sous-cutanée", tc: "Antidiabétique", bucket: "DIABETES", mode: "CREATE", aliases: ["Humalog", "lispro"], adm: "SUBCUTANEOUS", gov: { isHighAlert: true } },
  { g: "Glyburide", fr: "Glyburide", en: "Glyburide", st: "5 mg", form: "comprimé", route: "orale", tc: "Antidiabétique", bucket: "DIABETES", mode: "CREATE", aliases: ["Diabeta", "glyburide"] },
  { g: "Sitagliptin", fr: "Sitagliptine", en: "Sitagliptin", st: "100 mg", form: "comprimé", route: "orale", tc: "Antidiabétique", bucket: "DIABETES", mode: "CREATE", aliases: ["Januvia", "sitagliptin"] },
  { g: "Pioglitazone", fr: "Pioglitazone", en: "Pioglitazone", st: "15 mg", form: "comprimé", route: "orale", tc: "Antidiabétique", bucket: "DIABETES", mode: "CREATE", aliases: ["Actos", "pioglitazone"] },
  { g: "Glimepiride", fr: "Glimepiride", en: "Glimepiride", st: "2 mg", form: "comprimé", route: "orale", tc: "Antidiabétique", bucket: "DIABETES", mode: "CREATE", aliases: ["Amaryl", "glimepiride"] },
  { g: "Acarbose", fr: "Acarbose", en: "Acarbose", st: "50 mg", form: "comprimé", route: "orale", tc: "Antidiabétique", bucket: "DIABETES", mode: "CREATE", aliases: ["Precose", "acarbose"] },

  // Women's health
  { code: "COMBINED_ORAL_CONTRACEPTIVE_STANDARD_COMPRIME_ORAL", g: "Combined Oral Contraceptive", fr: "Contraceptif oral combiné", en: "Combined Oral Contraceptive", st: "standard", form: "comprimé", route: "orale", tc: "Contraception", bucket: "WOMENS_HEALTH", mode: "ENRICH", aliases: ["OCP", "pilule combinée", "birth control"] },
  { code: "MEDROXYPROGESTERONE_150_MG_PER_ML_INJECTABLE_INTRAMUSCULAR", g: "Medroxyprogesterone", fr: "Médroxyprogestérone", en: "Medroxyprogesterone", st: "150 mg/mL", form: "injectable", route: "intramusculaire", tc: "Contraception", bucket: "WOMENS_HEALTH", mode: "ENRICH", aliases: ["Depo-Provera", "depo"], adm: "IM" },
  { g: "Prenatal multivitamin", fr: "Multivitamine prénatale", en: "Prenatal multivitamin", st: "standard", form: "comprimé", route: "orale", tc: "Obstétrique", bucket: "WOMENS_HEALTH", mode: "CREATE", aliases: ["prenatal vitamin", "vitamine prénatale"] },
  { g: "Progesterone", fr: "Progestérone", en: "Progesterone", st: "100 mg", form: "gélule", route: "orale", tc: "Obstétrique", bucket: "WOMENS_HEALTH", mode: "CREATE", aliases: ["Prometrium", "progesterone"] },
  { g: "Levonorgestrel", fr: "Lévonorgestrel", en: "Levonorgestrel", st: "1.5 mg", form: "comprimé", route: "orale", tc: "Contraception d'urgence", bucket: "WOMENS_HEALTH", mode: "CREATE", aliases: ["Plan B", "morning after pill"] },

  // Pulmonology
  { code: "SALBUTAMOL_100_MCG_PER_DOSE_INHALATEUR_INHALATION", g: "Salbutamol", fr: "Salbutamol", en: "Albuterol", st: "100 mcg/dose", form: "inhalateur", route: "inhalée", tc: "Bronchodilatateur", bucket: "PULMONOLOGY", mode: "ENRICH", aliases: ["Ventolin", "albuterol", "salbutamol"], adm: "INHALATION" },
  { code: "SALBUTAMOL_2.5_MG_PER_2.5_ML_SOLUTION_NEBULISATION_INHALATION", g: "Salbutamol", fr: "Salbutamol", en: "Albuterol", st: "2.5 mg/2.5 mL", form: "solution de nébulisation", route: "inhalée", tc: "Bronchodilatateur", bucket: "PULMONOLOGY", mode: "ENRICH", aliases: ["Ventolin nebules", "albuterol neb"], adm: "INHALATION" },
  { code: "IPRATROPIUM_20_MCG_PER_DOSE_INHALATEUR_INHALATION", g: "Ipratropium", fr: "Ipratropium", en: "Ipratropium", st: "20 mcg/dose", form: "inhalateur", route: "inhalée", tc: "Bronchodilatateur", bucket: "PULMONOLOGY", mode: "ENRICH", aliases: ["Atrovent", "ipratropium"], adm: "INHALATION" },
  { code: "BUDESONIDE_200_MCG_PER_DOSE_INHALATEUR_INHALATION", g: "Budesonide", fr: "Budésonide", en: "Budesonide", st: "200 mcg/dose", form: "inhalateur", route: "inhalée", tc: "Corticoïde inhalé", bucket: "PULMONOLOGY", mode: "ENRICH", aliases: ["Pulmicort", "budesonide"], adm: "INHALATION" },
  { code: "BECLOMETASONE_100_MCG_PER_DOSE_INHALATEUR_INHALATION", g: "Beclometasone", fr: "Béclométasone", en: "Beclometasone", st: "100 mcg/dose", form: "inhalateur", route: "inhalée", tc: "Corticoïde inhalé", bucket: "PULMONOLOGY", mode: "ENRICH", aliases: ["Qvar", "beclomethasone"], adm: "INHALATION" },
  { g: "Montelukast", fr: "Montélukast", en: "Montelukast", st: "10 mg", form: "comprimé", route: "orale", tc: "Antiasthmatique", bucket: "PULMONOLOGY", mode: "CREATE", aliases: ["Singulair", "montelukast"] },
  { g: "Fluticasone", fr: "Fluticasone", en: "Fluticasone", st: "110 mcg/dose", form: "inhalateur", route: "inhalée", tc: "Corticoïde inhalé", bucket: "PULMONOLOGY", mode: "CREATE", aliases: ["Flovent", "fluticasone"], adm: "INHALATION" },
  { g: "Fluticasone salmeterol", fr: "Fluticasone salmétérol", en: "Fluticasone salmeterol", st: "250/50 mcg", form: "inhalateur", route: "inhalée", tc: "Antiasthmatique", bucket: "PULMONOLOGY", mode: "CREATE", aliases: ["Advair", "fluticasone salmeterol"], adm: "INHALATION" },
  { code: "PREDNISONE_20_MG_COMPRIME_ORAL", g: "Prednisone", fr: "Prednisone", en: "Prednisone", st: "20 mg", form: "comprimé", route: "orale", tc: "Corticostéroide", bucket: "PULMONOLOGY", mode: "ENRICH", aliases: ["Deltasone", "prednisone"] },
  { code: "PREDNISONE_5", g: "Prednisone", fr: "Prednisone", en: "Prednisone", st: "5 mg", form: "comprimé", route: "orale", tc: "Corticostéroide", bucket: "PULMONOLOGY", mode: "ENRICH", aliases: ["Deltasone"] },

  // GI
  { code: "FAMOTIDINE_20MG_IV", g: "Famotidine", fr: "Famotidine", en: "Famotidine", st: "20 mg/2 mL", form: "injectable", route: "injectable", tc: "IPP", bucket: "GI", mode: "ENRICH", aliases: ["Pepcid IV", "pepcid"], adm: "PUSH" },
  { g: "Sucralfate", fr: "Sucralfate", en: "Sucralfate", st: "1 g", form: "comprimé", route: "orale", tc: "Gastroprotecteur", bucket: "GI", mode: "CREATE", aliases: ["Carafate", "sucralfate"] },
  { g: "Mesalamine", fr: "Mésalamine", en: "Mesalamine", st: "400 mg", form: "comprimé", route: "orale", tc: "Anti-inflammatoire intestinal", bucket: "GI", mode: "CREATE", aliases: ["Asacol", "mesalamine"] },
  { g: "Docusate", fr: "Docusate", en: "Docusate", st: "100 mg", form: "gélule", route: "orale", tc: "Laxatif", bucket: "GI", mode: "CREATE", aliases: ["Colace", "docusate"] },
  { g: "Polyethylene glycol", fr: "Polyéthylène glycol", en: "Polyethylene glycol", st: "17 g", form: "poudre", route: "orale", tc: "Laxatif", bucket: "GI", mode: "CREATE", aliases: ["MiraLAX", "peg"] },

  // Psychiatry
  { code: "HALOPERIDOL_5MG_ML_INJECTABLE", g: "Haloperidol", fr: "Halopéridol", en: "Haloperidol", st: "5 mg/mL", form: "injectable", route: "injectable", tc: "Antipsychotique", bucket: "PSYCHIATRY", mode: "ENRICH", aliases: ["Haldol", "haldol"], adm: "PUSH" },
  { g: "Quetiapine", fr: "Quétiapine", en: "Quetiapine", st: "25 mg", form: "comprimé", route: "orale", tc: "Antipsychotique", bucket: "PSYCHIATRY", mode: "CREATE", aliases: ["Seroquel", "quetiapine"] },
  { g: "Aripiprazole", fr: "Aripiprazole", en: "Aripiprazole", st: "5 mg", form: "comprimé", route: "orale", tc: "Antipsychotique", bucket: "PSYCHIATRY", mode: "CREATE", aliases: ["Abilify", "aripiprazole"] },
  { g: "Lithium carbonate", fr: "Carbonate de lithium", en: "Lithium carbonate", st: "300 mg", form: "comprimé", route: "orale", tc: "Psychiatrie", bucket: "PSYCHIATRY", mode: "CREATE", aliases: ["Lithobid", "lithium"], gov: { isHighAlert: true } },
  { g: "Valproic acid", fr: "Acide valproïque", en: "Valproic acid", st: "250 mg", form: "comprimé", route: "orale", tc: "Anticonvulsivant", bucket: "PSYCHIATRY", mode: "CREATE", aliases: ["Depakote", "valproate"], gov: { isHighAlert: true } },
  { g: "Trazodone", fr: "Trazodone", en: "Trazodone", st: "50 mg", form: "comprimé", route: "orale", tc: "Antidépresseur", bucket: "PSYCHIATRY", mode: "CREATE", aliases: ["Desyrel", "trazodone"] },

  // Infectious disease / ER
  { code: "CEFTRIAXONE_1_G_INJECTABLE_INJECTION", g: "Ceftriaxone", fr: "Ceftriaxone", en: "Ceftriaxone", st: "1 g", form: "injectable", route: "injectable", tc: "Antibiotique", bucket: "INFECTIOUS_DISEASE", mode: "ENRICH", aliases: ["Rocephin", "ceftriaxone"], adm: "INFUSION" },
  { code: "CEFTRIAXONE_2_G_INJECTABLE_INJECTION", g: "Ceftriaxone", fr: "Ceftriaxone", en: "Ceftriaxone", st: "2 g", form: "injectable", route: "injectable", tc: "Antibiotique", bucket: "INFECTIOUS_DISEASE", mode: "ENRICH", aliases: ["Rocephin 2g"], adm: "INFUSION" },
  { code: "CEFAZOLIN_1G_INJECTABLE", g: "Cefazolin", fr: "Céfazoline", en: "Cefazolin", st: "1 g", form: "injectable", route: "injectable", tc: "Antibiotique", bucket: "INFECTIOUS_DISEASE", mode: "ENRICH", aliases: ["Ancef", "cefazolin"], adm: "INFUSION" },
  { code: "CEFEPIME_1G_INJECTABLE", g: "Cefepime", fr: "Céfépime", en: "Cefepime", st: "1 g", form: "injectable", route: "injectable", tc: "Antibiotique", bucket: "INFECTIOUS_DISEASE", mode: "ENRICH", aliases: ["Maxipime"], adm: "INFUSION" },
  { code: "AZITHROMYCIN_500_MG_COMPRIME_ORAL", g: "Azithromycin", fr: "Azithromycine", en: "Azithromycin", st: "500 mg", form: "comprimé", route: "orale", tc: "Antibiotique", bucket: "INFECTIOUS_DISEASE", mode: "ENRICH", aliases: ["Zithromax", "z-pack"] },
  { code: "VANCOMYCIN_1_G_INJECTABLE_INTRAVENOUS", g: "Vancomycin", fr: "Vancomycine", en: "Vancomycin", st: "1 g", form: "injectable", route: "intraveineuse", tc: "Antibiotique", bucket: "INFECTIOUS_DISEASE", mode: "ENRICH", aliases: ["Vancocin", "vanc"], adm: "INFUSION", gov: { isHighAlert: true } },
  { code: "METRONIDAZOLE_500_MG_COMPRIME_ORAL", g: "Metronidazole", fr: "Métronidazole", en: "Metronidazole", st: "500 mg", form: "comprimé", route: "orale", tc: "Antiparasitaire", bucket: "INFECTIOUS_DISEASE", mode: "ENRICH", aliases: ["Flagyl", "metronidazole"] },
  { code: "METRONIDAZOLE_500_MG_PER_100_ML_PERFUSION_INTRAVENOUS", g: "Metronidazole", fr: "Métronidazole", en: "Metronidazole", st: "500 mg/100 mL", form: "perfusion", route: "intraveineuse", tc: "Antiparasitaire", bucket: "INFECTIOUS_DISEASE", mode: "ENRICH", aliases: ["Flagyl IV"], adm: "INFUSION" },
  { g: "Linezolid", fr: "Linézolide", en: "Linezolid", st: "600 mg", form: "comprimé", route: "orale", tc: "Antibiotique", bucket: "INFECTIOUS_DISEASE", mode: "CREATE", aliases: ["Zyvox", "linezolid"] },
  { g: "Piperacillin tazobactam", fr: "Pipéracilline tazobactam", en: "Piperacillin tazobactam", st: "3.375 g", form: "injectable", route: "injectable", tc: "Antibiotique", bucket: "INFECTIOUS_DISEASE", mode: "CREATE", aliases: ["Zosyn", "pip tazo"], adm: "INFUSION" },

  // ER critical care
  { code: "FUROSEMIDE_20_MG_PER_2_ML_INJECTABLE_INJECTION", g: "Furosemide", fr: "Furosémide", en: "Furosemide", st: "20 mg/2 mL", form: "injectable", route: "injectable", tc: "Diurétique", bucket: "ER_CRITICAL", mode: "ENRICH", aliases: ["Lasix IV"], adm: "PUSH" },
  { code: "ONDANSETRON_4_MG_PER_2_ML_INJECTABLE_INJECTION", g: "Ondansetron", fr: "Ondansétron", en: "Ondansetron", st: "4 mg/2 mL", form: "injectable", route: "injectable", tc: "Antiémetique", bucket: "ER_CRITICAL", mode: "ENRICH", aliases: ["Zofran IV"], adm: "PUSH" },
  { code: "NALOXONE_0.4MG_ML", g: "Naloxone", fr: "Naloxone", en: "Naloxone", st: "0.4 mg/mL", form: "injectable", route: "injectable", tc: "Urgence", bucket: "ER_CRITICAL", mode: "ENRICH", aliases: ["Narcan", "naloxone"], adm: "PUSH" },
  { code: "MIDAZOLAM_5MG_ML_INJECTABLE", g: "Midazolam", fr: "Midazolam", en: "Midazolam", st: "5 mg/mL", form: "injectable", route: "injectable", tc: "Benzodiazépine", bucket: "ER_CRITICAL", mode: "ENRICH", aliases: ["Versed", "midazolam"], gov: { isControlled: true, controlledSchedule: "IV" }, adm: "PUSH" },
  { code: "KETAMINE_50MG_ML_INJECTABLE", g: "Ketamine", fr: "Kétamine", en: "Ketamine", st: "50 mg/mL", form: "injectable", route: "injectable", tc: "Anesthésique", bucket: "ER_CRITICAL", mode: "ENRICH", aliases: ["Ketalar", "ketamine"], gov: { isControlled: true, controlledSchedule: "III", requiresDoubleSign: true }, adm: "PUSH" },
  { code: "PROPOFOL_10MG_ML_IV", g: "Propofol", fr: "Propofol", en: "Propofol", st: "10 mg/mL", form: "injectable", route: "intraveineuse", tc: "Anesthésique", bucket: "ER_CRITICAL", mode: "ENRICH", aliases: ["Diprivan", "propofol"], gov: { isHighAlert: true }, adm: "INFUSION" },
  { code: "DIAZEPAM_10_MG_PER_2_ML_INJECTABLE_INJECTION", g: "Diazepam", fr: "Diazépam", en: "Diazepam", st: "10 mg/2 mL", form: "injectable", route: "injectable", tc: "Anxiolytique", bucket: "ER_CRITICAL", mode: "ENRICH", aliases: ["Valium IV"], gov: { isControlled: true, controlledSchedule: "IV" }, adm: "PUSH" },
  { code: "DEXAMETHASONE_4_MG_PER_1_ML_INJECTABLE_INJECTION", g: "Dexamethasone", fr: "Dexaméthasone", en: "Dexamethasone", st: "4 mg/1 mL", form: "injectable", route: "injectable", tc: "Corticoïde", bucket: "ER_CRITICAL", mode: "ENRICH", aliases: ["Decadron IV"], adm: "PUSH" },
  { code: "HYDROCORTISONE_100_MG_INJECTABLE_INJECTION", g: "Hydrocortisone", fr: "Hydrocortisone", en: "Hydrocortisone", st: "100 mg", form: "injectable", route: "injectable", tc: "Corticoïde", bucket: "ER_CRITICAL", mode: "ENRICH", aliases: ["Solu-Cortef"], adm: "PUSH" },
  { code: "METHYLPREDNISOLONE_125MG", g: "Methylprednisolone", fr: "Méthylprednisolone", en: "Methylprednisolone", st: "125 mg/2 mL", form: "injectable", route: "injectable", tc: "Corticoïde", bucket: "ER_CRITICAL", mode: "ENRICH", aliases: ["Solumedrol"], adm: "PUSH" },
  { code: "POTASSIUM_CHLORIDE_20_MEQ_PER_10_ML_INJECTABLE_INTRAVENOUS", g: "Potassium Chloride", fr: "Chlorure de potassium", en: "Potassium Chloride", st: "20 mEq/10 mL", form: "injectable", route: "intraveineuse", tc: "Électrolyte", bucket: "ER_CRITICAL", mode: "ENRICH", aliases: ["KCl", "potassium"], gov: { isHighAlert: true }, adm: "INFUSION" },
  { code: "MAGNESIUM_SULFATE_500_MG_PER_ML_INJECTABLE_INJECTION", g: "Magnesium Sulfate", fr: "Sulfate de magnésium", en: "Magnesium Sulfate", st: "500 mg/mL", form: "injectable", route: "injectable", tc: "Obstétrique", bucket: "ER_CRITICAL", mode: "ENRICH", aliases: ["MgSO4", "magnesium"], adm: "PUSH" },
  { code: "ADRENALINE_1_MG_PER_ML_INJECTABLE_INJECTION", g: "Adrenaline", fr: "Adrénaline", en: "Epinephrine", st: "1 mg/mL", form: "injectable", route: "injectable", tc: "Urgence", bucket: "ER_CRITICAL", mode: "ENRICH", aliases: ["Epinephrine", "EpiPen", "epi"], gov: { isHighAlert: true }, adm: "PUSH" },

  // Chronic / primary care additions
  { g: "Allopurinol", fr: "Allopurinol", en: "Allopurinol", st: "100 mg", form: "comprimé", route: "orale", tc: "Antigoutte", bucket: "CHRONIC", mode: "CREATE", aliases: ["Zyloprim", "allopurinol"] },
  { g: "Colchicine", fr: "Colchicine", en: "Colchicine", st: "0.6 mg", form: "comprimé", route: "orale", tc: "Antigoutte", bucket: "CHRONIC", mode: "CREATE", aliases: ["Colcrys", "colchicine"] },
  { g: "Gabapentin", fr: "Gabapentine", en: "Gabapentin", st: "300 mg", form: "gélule", route: "orale", tc: "Neurologie", bucket: "CHRONIC", mode: "CREATE", aliases: ["Neurontin", "gabapentin"] },
  { g: "Phenytoin", fr: "Phénytoïne", en: "Phenytoin", st: "100 mg", form: "comprimé", route: "orale", tc: "Anticonvulsivant", bucket: "CHRONIC", mode: "CREATE", aliases: ["Dilantin", "phenytoin"], gov: { isHighAlert: true } },
  { g: "Levetiracetam", fr: "Lévétiracétam", en: "Levetiracetam", st: "500 mg", form: "comprimé", route: "orale", tc: "Anticonvulsivant", bucket: "CHRONIC", mode: "CREATE", aliases: ["Keppra", "levetiracetam"] },
  { g: "Vitamin D3", fr: "Vitamine D3", en: "Vitamin D3", st: "1000 IU", form: "comprimé", route: "orale", tc: "Supplément", bucket: "CHRONIC", mode: "CREATE", aliases: ["cholecalciferol", "vitamine d"] },
  { g: "Ferrous sulfate", fr: "Sulfate ferreux", en: "Ferrous sulfate", st: "325 mg", form: "comprimé", route: "orale", tc: "Supplément", bucket: "CHRONIC", mode: "CREATE", aliases: ["iron", "fer"] },
  { g: "Folic acid", fr: "Acide folique", en: "Folic acid", st: "1 mg", form: "comprimé", route: "orale", tc: "Supplément", bucket: "CHRONIC", mode: "CREATE", aliases: ["folate", "acide folique"] },
  { code: "AMLODIPINE_10_MG_COMPRIME_ORAL", g: "Amlodipine", fr: "Amlodipine", en: "Amlodipine", st: "10 mg", form: "comprimé", route: "orale", tc: "Antihypertenseur", bucket: "CHRONIC", mode: "ENRICH", aliases: ["Norvasc 10"] },
  { code: "LORAZEPAM_2_MG_COMPRIME_ORAL", g: "Lorazepam", fr: "Lorazépam", en: "Lorazepam", st: "2 mg", form: "comprimé", route: "orale", tc: "Anxiolytique", bucket: "CHRONIC", mode: "ENRICH", aliases: ["Ativan oral"], gov: { isControlled: true, controlledSchedule: "IV" } },
];

function deriveCode(g, st, form, route) {
  const slug = (s) =>
    s
      .toUpperCase()
      .normalize("NFD")
      .replace(/\u0301/g, "")
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
  const strength = slug(st.replace(/,/g, "").replace(/\./g, "_"));
  const formSlug = slug(form.replace("é", "e").replace("è", "e"));
  const routeSlug = slug(route.replace("é", "e"));
  return `${slug(g)}_${strength}_${formSlug}_${routeSlug}`.replace(/__+/g, "_");
}

function defaultGov(gov = {}) {
  return {
    isControlled: gov.isControlled ?? false,
    controlledSchedule: gov.controlledSchedule ?? null,
    isHighAlert: gov.isHighAlert ?? false,
    requiresWitness: gov.requiresWitness ?? false,
    requiresDoubleSign: gov.requiresDoubleSign ?? false,
    lasaGroupId: gov.lasaGroupId ?? null,
    requiresPharmacyVerification: gov.requiresPharmacyVerification ?? false,
  };
}

function billingFor(row, idx) {
  const seq = String(500000 + idx).padStart(9, "0");
  const ndc11 = `00000${seq}`.slice(-11);
  const ndcDisplay = `${ndc11.slice(0, 5)}-${ndc11.slice(5, 9)}-${ndc11.slice(9)}`;
  const isVaccine = row.bucket === "VACCINE";
  const hcpcs = isVaccine ? "90471" : row.form.includes("injectable") || row.route.includes("intraveineuse") ? "J3490" : "J3490";
  return {
    hcpcs: isVaccine ? "90686" : hcpcs,
    description: `Wave2 ${row.g} ${row.st}`,
    billingUnitType: row.form.includes("injectable") ? "mg" : "tablet",
    ndc11,
    ndcDisplay,
    administrationCpt: isVaccine ? "90471" : undefined,
    cvxCode: isVaccine ? "141" : undefined,
  };
}

const entries = ROWS.map((r, i) => {
  const catalogCode = r.code ?? deriveCode(r.g, r.st, r.form, r.route);
  const searchTerms = [r.g.toLowerCase(), ...r.aliases.map((a) => a.toLowerCase())];
  return {
    catalogCode,
    genericName: r.g,
    displayNameFr: r.fr,
    displayNameEn: r.en,
    strength: r.st,
    dosageForm: r.form,
    route: r.route,
    therapeuticClass: r.tc,
    bucket: r.bucket,
    mode: r.mode,
    aliases: r.aliases,
    searchTerms: [...new Set(searchTerms)],
    governance: defaultGov(r.gov),
    isEssential: r.essential ?? r.mode === "ENRICH",
    administrationType: r.adm ?? (r.form.includes("injectable") ? "INJECTION" : r.form.includes("inhal") ? "INHALATION" : "ORAL"),
    billingClass: r.form.includes("injectable") ? "THERAPEUTIC" : "DRUG_SUPPLY",
    _billing: billingFor(r, i + 1),
  };
});

// Dedupe catalog codes
const seen = new Set();
for (const e of entries) {
  if (seen.has(e.catalogCode)) throw new Error(`duplicate ${e.catalogCode}`);
  seen.add(e.catalogCode);
}

console.log(`Generated ${entries.length} wave2 entries`);

const formularyTs = `/**
 * M1.6D — Enterprise Formulary Wave 2 manifest (auto-generated — edit ROWS in generate-wave2-manifest.mjs).
 */

import type { EnterpriseWave2FormularyEntry } from "./enterpriseWave2Types.js";

export const ENTERPRISE_WAVE2_FORMULARY_MANIFEST: EnterpriseWave2FormularyEntry[] = ${JSON.stringify(
  entries.map(({ _billing, ...e }) => e),
  null,
  2
)};

export const ENTERPRISE_WAVE2_FORMULARY_BY_CODE: Record<string, EnterpriseWave2FormularyEntry> =
  Object.fromEntries(ENTERPRISE_WAVE2_FORMULARY_MANIFEST.map((e) => [e.catalogCode, e]));

export const ENTERPRISE_WAVE2_FORMULARY_VERSION = "M1.6D" as const;
`;

const billingTs = `/**
 * M1.6D — Enterprise Wave 2 billing manifest (aligned to formulary order).
 */

import { ENTERPRISE_WAVE2_FORMULARY_MANIFEST } from "./enterpriseWave2FormularyManifest.js";
import type { EnterpriseWave2BillingEntry } from "./enterpriseWave2Types.js";

const BILLING_SPECS = ${JSON.stringify(
  entries.map((e) => ({ catalogCode: e.catalogCode, ...e._billing })),
  null,
  2
)};

if (BILLING_SPECS.length !== ENTERPRISE_WAVE2_FORMULARY_MANIFEST.length) {
  throw new Error(
    \`[wave2-billing] spec count \${BILLING_SPECS.length} != formulary \${ENTERPRISE_WAVE2_FORMULARY_MANIFEST.length}\`
  );
}

export const ENTERPRISE_WAVE2_BILLING_MANIFEST: EnterpriseWave2BillingEntry[] = BILLING_SPECS;

export const ENTERPRISE_WAVE2_BILLING_BY_CODE: Record<string, EnterpriseWave2BillingEntry> =
  Object.fromEntries(ENTERPRISE_WAVE2_BILLING_MANIFEST.map((e) => [e.catalogCode, e]));
`;

writeFileSync(join(medDir, "enterpriseWave2FormularyManifest.ts"), formularyTs);
writeFileSync(join(medDir, "enterpriseWave2BillingManifest.ts"), billingTs);
console.log("Wrote enterpriseWave2FormularyManifest.ts and enterpriseWave2BillingManifest.ts");
