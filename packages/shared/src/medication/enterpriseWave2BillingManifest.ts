/**
 * M1.6D — Enterprise Wave 2 billing manifest (aligned to formulary order).
 */

import { ENTERPRISE_WAVE2_FORMULARY_MANIFEST } from "./enterpriseWave2FormularyManifest.js";
import type { EnterpriseWave2BillingEntry } from "./enterpriseWave2Types.js";

const BILLING_SPECS = [
  {
    "catalogCode": "FONDAPARINUX_2_5_MG_INJECTABLE_SOUS_CUTANEE",
    "hcpcs": "J3490",
    "description": "Wave2 Fondaparinux 2.5 mg",
    "billingUnitType": "mg",
    "ndc11": "00000500001",
    "ndcDisplay": "00000-5000-01"
  },
  {
    "catalogCode": "ENOXAPARIN_60_MG_PER_0.6_ML_INJECTABLE_INJECTION",
    "hcpcs": "J3490",
    "description": "Wave2 Enoxaparin 60 mg/0.6 mL",
    "billingUnitType": "mg",
    "ndc11": "00000500002",
    "ndcDisplay": "00000-5000-02"
  },
  {
    "catalogCode": "ATENOLOL_50_MG_COMPRIME_ORAL",
    "hcpcs": "J3490",
    "description": "Wave2 Atenolol 50 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000500003",
    "ndcDisplay": "00000-5000-03"
  },
  {
    "catalogCode": "ATENOLOL_100_MG_COMPRIME_ORAL",
    "hcpcs": "J3490",
    "description": "Wave2 Atenolol 100 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000500004",
    "ndcDisplay": "00000-5000-04"
  },
  {
    "catalogCode": "AMIODARONE_150MG_3ML_IV",
    "hcpcs": "J3490",
    "description": "Wave2 Amiodarone 150 mg/3 mL",
    "billingUnitType": "mg",
    "ndc11": "00000500005",
    "ndcDisplay": "00000-5000-05"
  },
  {
    "catalogCode": "METOPROLOL_5MG_5ML_IV",
    "hcpcs": "J3490",
    "description": "Wave2 Metoprolol 5 mg/5 mL",
    "billingUnitType": "mg",
    "ndc11": "00000500006",
    "ndcDisplay": "00000-5000-06"
  },
  {
    "catalogCode": "CLOPIDOGREL_75_MG_COMPRIME_ORAL",
    "hcpcs": "J3490",
    "description": "Wave2 Clopidogrel 75 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000500007",
    "ndcDisplay": "00000-5000-07"
  },
  {
    "catalogCode": "SPIRONOLACTONE_25_MG_COMPRIME_ORAL",
    "hcpcs": "J3490",
    "description": "Wave2 Spironolactone 25 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000500008",
    "ndcDisplay": "00000-5000-08"
  },
  {
    "catalogCode": "ASPIRIN_81",
    "hcpcs": "J3490",
    "description": "Wave2 Aspirin 81 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000500009",
    "ndcDisplay": "00000-5000-09"
  },
  {
    "catalogCode": "CARVEDILOL_12.5_MG_COMPRIME_ORAL",
    "hcpcs": "J3490",
    "description": "Wave2 Carvedilol 12.5 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000500010",
    "ndcDisplay": "00000-5000-10"
  },
  {
    "catalogCode": "BISOPROLOL_5_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave2 Bisoprolol 5 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000500011",
    "ndcDisplay": "00000-5000-11"
  },
  {
    "catalogCode": "DILTIAZEM_120_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave2 Diltiazem 120 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000500012",
    "ndcDisplay": "00000-5000-12"
  },
  {
    "catalogCode": "DILTIAZEM_20_MG_2_ML_INJECTABLE_INJECTABLE",
    "hcpcs": "J3490",
    "description": "Wave2 Diltiazem 20 mg/2 mL",
    "billingUnitType": "mg",
    "ndc11": "00000500013",
    "ndcDisplay": "00000-5000-13"
  },
  {
    "catalogCode": "VERAPAMIL_80_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave2 Verapamil 80 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000500014",
    "ndcDisplay": "00000-5000-14"
  },
  {
    "catalogCode": "PRAVASTATIN_20_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave2 Pravastatin 20 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000500015",
    "ndcDisplay": "00000-5000-15"
  },
  {
    "catalogCode": "NITROGLYCERIN_0_4_MG_COMPRIME_SUBLINGUAL_ORALE",
    "hcpcs": "J3490",
    "description": "Wave2 Nitroglycerin 0.4 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000500016",
    "ndcDisplay": "00000-5000-16"
  },
  {
    "catalogCode": "ISOSORBIDE_MONONITRATE_30_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave2 Isosorbide mononitrate 30 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000500017",
    "ndcDisplay": "00000-5000-17"
  },
  {
    "catalogCode": "DIGOXIN_0_25_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave2 Digoxin 0.25 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000500018",
    "ndcDisplay": "00000-5000-18"
  },
  {
    "catalogCode": "AMIODARONE_200_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave2 Amiodarone 200 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000500019",
    "ndcDisplay": "00000-5000-19"
  },
  {
    "catalogCode": "METOPROLOL_SUCCINATE_50_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave2 Metoprolol succinate 50 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000500020",
    "ndcDisplay": "00000-5000-20"
  },
  {
    "catalogCode": "REGULAR_INSULIN_100_UI_PER_ML_INJECTABLE_SUBCUTANEOUS",
    "hcpcs": "J3490",
    "description": "Wave2 Regular Insulin 100 UI/mL",
    "billingUnitType": "mg",
    "ndc11": "00000500021",
    "ndcDisplay": "00000-5000-21"
  },
  {
    "catalogCode": "NPH_INSULIN_100_UI_PER_ML_INJECTABLE_SUBCUTANEOUS",
    "hcpcs": "J3490",
    "description": "Wave2 NPH Insulin 100 UI/mL",
    "billingUnitType": "mg",
    "ndc11": "00000500022",
    "ndcDisplay": "00000-5000-22"
  },
  {
    "catalogCode": "INSULIN_7030_100_UI_PER_ML_INJECTABLE_SUBCUTANEOUS",
    "hcpcs": "J3490",
    "description": "Wave2 Insulin 70/30 100 UI/mL",
    "billingUnitType": "mg",
    "ndc11": "00000500023",
    "ndcDisplay": "00000-5000-23"
  },
  {
    "catalogCode": "INSULIN_GLARGINE_100_UI_ML_INJECTABLE_SOUS_CUTANEE",
    "hcpcs": "J3490",
    "description": "Wave2 Insulin glargine 100 UI/mL",
    "billingUnitType": "mg",
    "ndc11": "00000500024",
    "ndcDisplay": "00000-5000-24"
  },
  {
    "catalogCode": "INSULIN_LISPRO_100_UI_ML_INJECTABLE_SOUS_CUTANEE",
    "hcpcs": "J3490",
    "description": "Wave2 Insulin lispro 100 UI/mL",
    "billingUnitType": "mg",
    "ndc11": "00000500025",
    "ndcDisplay": "00000-5000-25"
  },
  {
    "catalogCode": "GLYBURIDE_5_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave2 Glyburide 5 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000500026",
    "ndcDisplay": "00000-5000-26"
  },
  {
    "catalogCode": "SITAGLIPTIN_100_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave2 Sitagliptin 100 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000500027",
    "ndcDisplay": "00000-5000-27"
  },
  {
    "catalogCode": "PIOGLITAZONE_15_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave2 Pioglitazone 15 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000500028",
    "ndcDisplay": "00000-5000-28"
  },
  {
    "catalogCode": "GLIMEPIRIDE_2_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave2 Glimepiride 2 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000500029",
    "ndcDisplay": "00000-5000-29"
  },
  {
    "catalogCode": "ACARBOSE_50_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave2 Acarbose 50 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000500030",
    "ndcDisplay": "00000-5000-30"
  },
  {
    "catalogCode": "COMBINED_ORAL_CONTRACEPTIVE_STANDARD_COMPRIME_ORAL",
    "hcpcs": "J3490",
    "description": "Wave2 Combined Oral Contraceptive standard",
    "billingUnitType": "tablet",
    "ndc11": "00000500031",
    "ndcDisplay": "00000-5000-31"
  },
  {
    "catalogCode": "MEDROXYPROGESTERONE_150_MG_PER_ML_INJECTABLE_INTRAMUSCULAR",
    "hcpcs": "J3490",
    "description": "Wave2 Medroxyprogesterone 150 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000500032",
    "ndcDisplay": "00000-5000-32"
  },
  {
    "catalogCode": "PRENATAL_MULTIVITAMIN_STANDARD_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave2 Prenatal multivitamin standard",
    "billingUnitType": "tablet",
    "ndc11": "00000500033",
    "ndcDisplay": "00000-5000-33"
  },
  {
    "catalogCode": "PROGESTERONE_100_MG_GELULE_ORALE",
    "hcpcs": "J3490",
    "description": "Wave2 Progesterone 100 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000500034",
    "ndcDisplay": "00000-5000-34"
  },
  {
    "catalogCode": "LEVONORGESTREL_1_5_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave2 Levonorgestrel 1.5 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000500035",
    "ndcDisplay": "00000-5000-35"
  },
  {
    "catalogCode": "SALBUTAMOL_100_MCG_PER_DOSE_INHALATEUR_INHALATION",
    "hcpcs": "J3490",
    "description": "Wave2 Salbutamol 100 mcg/dose",
    "billingUnitType": "tablet",
    "ndc11": "00000500036",
    "ndcDisplay": "00000-5000-36"
  },
  {
    "catalogCode": "SALBUTAMOL_2.5_MG_PER_2.5_ML_SOLUTION_NEBULISATION_INHALATION",
    "hcpcs": "J3490",
    "description": "Wave2 Salbutamol 2.5 mg/2.5 mL",
    "billingUnitType": "tablet",
    "ndc11": "00000500037",
    "ndcDisplay": "00000-5000-37"
  },
  {
    "catalogCode": "IPRATROPIUM_20_MCG_PER_DOSE_INHALATEUR_INHALATION",
    "hcpcs": "J3490",
    "description": "Wave2 Ipratropium 20 mcg/dose",
    "billingUnitType": "tablet",
    "ndc11": "00000500038",
    "ndcDisplay": "00000-5000-38"
  },
  {
    "catalogCode": "BUDESONIDE_200_MCG_PER_DOSE_INHALATEUR_INHALATION",
    "hcpcs": "J3490",
    "description": "Wave2 Budesonide 200 mcg/dose",
    "billingUnitType": "tablet",
    "ndc11": "00000500039",
    "ndcDisplay": "00000-5000-39"
  },
  {
    "catalogCode": "BECLOMETASONE_100_MCG_PER_DOSE_INHALATEUR_INHALATION",
    "hcpcs": "J3490",
    "description": "Wave2 Beclometasone 100 mcg/dose",
    "billingUnitType": "tablet",
    "ndc11": "00000500040",
    "ndcDisplay": "00000-5000-40"
  },
  {
    "catalogCode": "MONTELUKAST_10_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave2 Montelukast 10 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000500041",
    "ndcDisplay": "00000-5000-41"
  },
  {
    "catalogCode": "FLUTICASONE_110_MCG_DOSE_INHALATEUR_INHALEE",
    "hcpcs": "J3490",
    "description": "Wave2 Fluticasone 110 mcg/dose",
    "billingUnitType": "tablet",
    "ndc11": "00000500042",
    "ndcDisplay": "00000-5000-42"
  },
  {
    "catalogCode": "FLUTICASONE_SALMETEROL_250_50_MCG_INHALATEUR_INHALEE",
    "hcpcs": "J3490",
    "description": "Wave2 Fluticasone salmeterol 250/50 mcg",
    "billingUnitType": "tablet",
    "ndc11": "00000500043",
    "ndcDisplay": "00000-5000-43"
  },
  {
    "catalogCode": "PREDNISONE_20_MG_COMPRIME_ORAL",
    "hcpcs": "J3490",
    "description": "Wave2 Prednisone 20 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000500044",
    "ndcDisplay": "00000-5000-44"
  },
  {
    "catalogCode": "PREDNISONE_5",
    "hcpcs": "J3490",
    "description": "Wave2 Prednisone 5 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000500045",
    "ndcDisplay": "00000-5000-45"
  },
  {
    "catalogCode": "FAMOTIDINE_20MG_IV",
    "hcpcs": "J3490",
    "description": "Wave2 Famotidine 20 mg/2 mL",
    "billingUnitType": "mg",
    "ndc11": "00000500046",
    "ndcDisplay": "00000-5000-46"
  },
  {
    "catalogCode": "SUCRALFATE_1_G_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave2 Sucralfate 1 g",
    "billingUnitType": "tablet",
    "ndc11": "00000500047",
    "ndcDisplay": "00000-5000-47"
  },
  {
    "catalogCode": "MESALAMINE_400_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave2 Mesalamine 400 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000500048",
    "ndcDisplay": "00000-5000-48"
  },
  {
    "catalogCode": "DOCUSATE_100_MG_GELULE_ORALE",
    "hcpcs": "J3490",
    "description": "Wave2 Docusate 100 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000500049",
    "ndcDisplay": "00000-5000-49"
  },
  {
    "catalogCode": "POLYETHYLENE_GLYCOL_17_G_POUDRE_ORALE",
    "hcpcs": "J3490",
    "description": "Wave2 Polyethylene glycol 17 g",
    "billingUnitType": "tablet",
    "ndc11": "00000500050",
    "ndcDisplay": "00000-5000-50"
  },
  {
    "catalogCode": "HALOPERIDOL_5MG_ML_INJECTABLE",
    "hcpcs": "J3490",
    "description": "Wave2 Haloperidol 5 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000500051",
    "ndcDisplay": "00000-5000-51"
  },
  {
    "catalogCode": "QUETIAPINE_25_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave2 Quetiapine 25 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000500052",
    "ndcDisplay": "00000-5000-52"
  },
  {
    "catalogCode": "ARIPIPRAZOLE_5_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave2 Aripiprazole 5 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000500053",
    "ndcDisplay": "00000-5000-53"
  },
  {
    "catalogCode": "LITHIUM_CARBONATE_300_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave2 Lithium carbonate 300 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000500054",
    "ndcDisplay": "00000-5000-54"
  },
  {
    "catalogCode": "VALPROIC_ACID_250_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave2 Valproic acid 250 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000500055",
    "ndcDisplay": "00000-5000-55"
  },
  {
    "catalogCode": "TRAZODONE_50_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave2 Trazodone 50 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000500056",
    "ndcDisplay": "00000-5000-56"
  },
  {
    "catalogCode": "CEFTRIAXONE_1_G_INJECTABLE_INJECTION",
    "hcpcs": "J3490",
    "description": "Wave2 Ceftriaxone 1 g",
    "billingUnitType": "mg",
    "ndc11": "00000500057",
    "ndcDisplay": "00000-5000-57"
  },
  {
    "catalogCode": "CEFTRIAXONE_2_G_INJECTABLE_INJECTION",
    "hcpcs": "J3490",
    "description": "Wave2 Ceftriaxone 2 g",
    "billingUnitType": "mg",
    "ndc11": "00000500058",
    "ndcDisplay": "00000-5000-58"
  },
  {
    "catalogCode": "CEFAZOLIN_1G_INJECTABLE",
    "hcpcs": "J3490",
    "description": "Wave2 Cefazolin 1 g",
    "billingUnitType": "mg",
    "ndc11": "00000500059",
    "ndcDisplay": "00000-5000-59"
  },
  {
    "catalogCode": "CEFEPIME_1G_INJECTABLE",
    "hcpcs": "J3490",
    "description": "Wave2 Cefepime 1 g",
    "billingUnitType": "mg",
    "ndc11": "00000500060",
    "ndcDisplay": "00000-5000-60"
  },
  {
    "catalogCode": "AZITHROMYCIN_500_MG_COMPRIME_ORAL",
    "hcpcs": "J3490",
    "description": "Wave2 Azithromycin 500 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000500061",
    "ndcDisplay": "00000-5000-61"
  },
  {
    "catalogCode": "VANCOMYCIN_1_G_INJECTABLE_INTRAVENOUS",
    "hcpcs": "J3490",
    "description": "Wave2 Vancomycin 1 g",
    "billingUnitType": "mg",
    "ndc11": "00000500062",
    "ndcDisplay": "00000-5000-62"
  },
  {
    "catalogCode": "METRONIDAZOLE_500_MG_COMPRIME_ORAL",
    "hcpcs": "J3490",
    "description": "Wave2 Metronidazole 500 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000500063",
    "ndcDisplay": "00000-5000-63"
  },
  {
    "catalogCode": "METRONIDAZOLE_500_MG_PER_100_ML_PERFUSION_INTRAVENOUS",
    "hcpcs": "J3490",
    "description": "Wave2 Metronidazole 500 mg/100 mL",
    "billingUnitType": "tablet",
    "ndc11": "00000500064",
    "ndcDisplay": "00000-5000-64"
  },
  {
    "catalogCode": "LINEZOLID_600_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave2 Linezolid 600 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000500065",
    "ndcDisplay": "00000-5000-65"
  },
  {
    "catalogCode": "PIPERACILLIN_TAZOBACTAM_3_375_G_INJECTABLE_INJECTABLE",
    "hcpcs": "J3490",
    "description": "Wave2 Piperacillin tazobactam 3.375 g",
    "billingUnitType": "mg",
    "ndc11": "00000500066",
    "ndcDisplay": "00000-5000-66"
  },
  {
    "catalogCode": "FUROSEMIDE_20_MG_PER_2_ML_INJECTABLE_INJECTION",
    "hcpcs": "J3490",
    "description": "Wave2 Furosemide 20 mg/2 mL",
    "billingUnitType": "mg",
    "ndc11": "00000500067",
    "ndcDisplay": "00000-5000-67"
  },
  {
    "catalogCode": "ONDANSETRON_4_MG_PER_2_ML_INJECTABLE_INJECTION",
    "hcpcs": "J3490",
    "description": "Wave2 Ondansetron 4 mg/2 mL",
    "billingUnitType": "mg",
    "ndc11": "00000500068",
    "ndcDisplay": "00000-5000-68"
  },
  {
    "catalogCode": "NALOXONE_0.4MG_ML",
    "hcpcs": "J3490",
    "description": "Wave2 Naloxone 0.4 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000500069",
    "ndcDisplay": "00000-5000-69"
  },
  {
    "catalogCode": "MIDAZOLAM_5MG_ML_INJECTABLE",
    "hcpcs": "J3490",
    "description": "Wave2 Midazolam 5 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000500070",
    "ndcDisplay": "00000-5000-70"
  },
  {
    "catalogCode": "KETAMINE_50MG_ML_INJECTABLE",
    "hcpcs": "J3490",
    "description": "Wave2 Ketamine 50 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000500071",
    "ndcDisplay": "00000-5000-71"
  },
  {
    "catalogCode": "PROPOFOL_10MG_ML_IV",
    "hcpcs": "J3490",
    "description": "Wave2 Propofol 10 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000500072",
    "ndcDisplay": "00000-5000-72"
  },
  {
    "catalogCode": "DIAZEPAM_10_MG_PER_2_ML_INJECTABLE_INJECTION",
    "hcpcs": "J3490",
    "description": "Wave2 Diazepam 10 mg/2 mL",
    "billingUnitType": "mg",
    "ndc11": "00000500073",
    "ndcDisplay": "00000-5000-73"
  },
  {
    "catalogCode": "DEXAMETHASONE_4_MG_PER_1_ML_INJECTABLE_INJECTION",
    "hcpcs": "J3490",
    "description": "Wave2 Dexamethasone 4 mg/1 mL",
    "billingUnitType": "mg",
    "ndc11": "00000500074",
    "ndcDisplay": "00000-5000-74"
  },
  {
    "catalogCode": "HYDROCORTISONE_100_MG_INJECTABLE_INJECTION",
    "hcpcs": "J3490",
    "description": "Wave2 Hydrocortisone 100 mg",
    "billingUnitType": "mg",
    "ndc11": "00000500075",
    "ndcDisplay": "00000-5000-75"
  },
  {
    "catalogCode": "METHYLPREDNISOLONE_125MG",
    "hcpcs": "J3490",
    "description": "Wave2 Methylprednisolone 125 mg/2 mL",
    "billingUnitType": "mg",
    "ndc11": "00000500076",
    "ndcDisplay": "00000-5000-76"
  },
  {
    "catalogCode": "POTASSIUM_CHLORIDE_20_MEQ_PER_10_ML_INJECTABLE_INTRAVENOUS",
    "hcpcs": "J3490",
    "description": "Wave2 Potassium Chloride 20 mEq/10 mL",
    "billingUnitType": "mg",
    "ndc11": "00000500077",
    "ndcDisplay": "00000-5000-77"
  },
  {
    "catalogCode": "MAGNESIUM_SULFATE_500_MG_PER_ML_INJECTABLE_INJECTION",
    "hcpcs": "J3490",
    "description": "Wave2 Magnesium Sulfate 500 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000500078",
    "ndcDisplay": "00000-5000-78"
  },
  {
    "catalogCode": "ADRENALINE_1_MG_PER_ML_INJECTABLE_INJECTION",
    "hcpcs": "J3490",
    "description": "Wave2 Adrenaline 1 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000500079",
    "ndcDisplay": "00000-5000-79"
  },
  {
    "catalogCode": "ALLOPURINOL_100_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave2 Allopurinol 100 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000500080",
    "ndcDisplay": "00000-5000-80"
  },
  {
    "catalogCode": "COLCHICINE_0_6_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave2 Colchicine 0.6 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000500081",
    "ndcDisplay": "00000-5000-81"
  },
  {
    "catalogCode": "GABAPENTIN_300_MG_GELULE_ORALE",
    "hcpcs": "J3490",
    "description": "Wave2 Gabapentin 300 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000500082",
    "ndcDisplay": "00000-5000-82"
  },
  {
    "catalogCode": "PHENYTOIN_100_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave2 Phenytoin 100 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000500083",
    "ndcDisplay": "00000-5000-83"
  },
  {
    "catalogCode": "LEVETIRACETAM_500_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave2 Levetiracetam 500 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000500084",
    "ndcDisplay": "00000-5000-84"
  },
  {
    "catalogCode": "VITAMIN_D3_1000_IU_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave2 Vitamin D3 1000 IU",
    "billingUnitType": "tablet",
    "ndc11": "00000500085",
    "ndcDisplay": "00000-5000-85"
  },
  {
    "catalogCode": "FERROUS_SULFATE_325_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave2 Ferrous sulfate 325 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000500086",
    "ndcDisplay": "00000-5000-86"
  },
  {
    "catalogCode": "FOLIC_ACID_1_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave2 Folic acid 1 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000500087",
    "ndcDisplay": "00000-5000-87"
  },
  {
    "catalogCode": "AMLODIPINE_10_MG_COMPRIME_ORAL",
    "hcpcs": "J3490",
    "description": "Wave2 Amlodipine 10 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000500088",
    "ndcDisplay": "00000-5000-88"
  },
  {
    "catalogCode": "LORAZEPAM_2_MG_COMPRIME_ORAL",
    "hcpcs": "J3490",
    "description": "Wave2 Lorazepam 2 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000500089",
    "ndcDisplay": "00000-5000-89"
  }
];

if (BILLING_SPECS.length !== ENTERPRISE_WAVE2_FORMULARY_MANIFEST.length) {
  throw new Error(
    `[wave2-billing] spec count ${BILLING_SPECS.length} != formulary ${ENTERPRISE_WAVE2_FORMULARY_MANIFEST.length}`
  );
}

export const ENTERPRISE_WAVE2_BILLING_MANIFEST: EnterpriseWave2BillingEntry[] = BILLING_SPECS;

export const ENTERPRISE_WAVE2_BILLING_BY_CODE: Record<string, EnterpriseWave2BillingEntry> =
  Object.fromEntries(ENTERPRISE_WAVE2_BILLING_MANIFEST.map((e) => [e.catalogCode, e]));
