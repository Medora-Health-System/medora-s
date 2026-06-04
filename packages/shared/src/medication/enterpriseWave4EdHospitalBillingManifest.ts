/**
 * M1.7C — Enterprise Wave 4 ED/Hospital billing manifest (aligned to formulary order).
 */

import { ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST } from "./enterpriseWave4EdHospitalFormularyManifest.js";
import type { EnterpriseWave4EdHospitalBillingEntry } from "./enterpriseWave4EdHospitalTypes.js";

const BILLING_SPECS = [
  {
    "catalogCode": "ETOMIDATE_2_MG_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Etomidate 2 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700001",
    "ndcDisplay": "00000-7000-01"
  },
  {
    "catalogCode": "KETAMINE_50MG_ML_INJECTABLE",
    "hcpcs": "J3490",
    "description": "Wave4 Ketamine 50 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700002",
    "ndcDisplay": "00000-7000-02"
  },
  {
    "catalogCode": "KETAMINE_10_MG_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Ketamine 10 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700003",
    "ndcDisplay": "00000-7000-03"
  },
  {
    "catalogCode": "PROPOFOL_10MG_ML_IV",
    "hcpcs": "J3490",
    "description": "Wave4 Propofol 10 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700004",
    "ndcDisplay": "00000-7000-04"
  },
  {
    "catalogCode": "PROPOFOL_20_MG_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Propofol 20 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700005",
    "ndcDisplay": "00000-7000-05"
  },
  {
    "catalogCode": "MIDAZOLAM_5MG_ML_INJECTABLE",
    "hcpcs": "J3490",
    "description": "Wave4 Midazolam 5 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700006",
    "ndcDisplay": "00000-7000-06"
  },
  {
    "catalogCode": "MIDAZOLAM_1_MG_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Midazolam 1 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700007",
    "ndcDisplay": "00000-7000-07"
  },
  {
    "catalogCode": "LORAZEPAM_2_MG_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Lorazepam 2 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700008",
    "ndcDisplay": "00000-7000-08"
  },
  {
    "catalogCode": "LORAZEPAM_4_MG_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Lorazepam 4 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700009",
    "ndcDisplay": "00000-7000-09"
  },
  {
    "catalogCode": "SUCCINYLCHOLINE_20_MG_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Succinylcholine 20 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700010",
    "ndcDisplay": "00000-7000-10"
  },
  {
    "catalogCode": "SUCCINYLCHOLINE_100_MG_POUDRE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Succinylcholine 100 mg",
    "billingUnitType": "mg",
    "ndc11": "00000700011",
    "ndcDisplay": "00000-7000-11"
  },
  {
    "catalogCode": "ROCURONIUM_10_MG_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Rocuronium 10 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700012",
    "ndcDisplay": "00000-7000-12"
  },
  {
    "catalogCode": "ROCURONIUM_50_MG_5_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Rocuronium 50 mg/5 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700013",
    "ndcDisplay": "00000-7000-13"
  },
  {
    "catalogCode": "VECURONIUM_10_MG_POUDRE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Vecuronium 10 mg",
    "billingUnitType": "mg",
    "ndc11": "00000700014",
    "ndcDisplay": "00000-7000-14"
  },
  {
    "catalogCode": "VECURONIUM_1_MG_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Vecuronium 1 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700015",
    "ndcDisplay": "00000-7000-15"
  },
  {
    "catalogCode": "CISATRACURIUM_2_MG_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Cisatracurium 2 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700016",
    "ndcDisplay": "00000-7000-16"
  },
  {
    "catalogCode": "ATRACURIUM_10_MG_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Atracurium 10 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700017",
    "ndcDisplay": "00000-7000-17"
  },
  {
    "catalogCode": "THIOPENTAL_25_MG_ML_POUDRE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Thiopental 25 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700018",
    "ndcDisplay": "00000-7000-18"
  },
  {
    "catalogCode": "FENTANYL_50_MCG_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Fentanyl 50 mcg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700019",
    "ndcDisplay": "00000-7000-19"
  },
  {
    "catalogCode": "FENTANYL_100_MCG_2_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Fentanyl 100 mcg/2 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700020",
    "ndcDisplay": "00000-7000-20"
  },
  {
    "catalogCode": "FENTANYL_250_MCG_5_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Fentanyl 250 mcg/5 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700021",
    "ndcDisplay": "00000-7000-21"
  },
  {
    "catalogCode": "MORPHINE_2_MG_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Morphine 2 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700022",
    "ndcDisplay": "00000-7000-22"
  },
  {
    "catalogCode": "MORPHINE_4_MG_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Morphine 4 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700023",
    "ndcDisplay": "00000-7000-23"
  },
  {
    "catalogCode": "MORPHINE_1_MG_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Morphine 1 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700024",
    "ndcDisplay": "00000-7000-24"
  },
  {
    "catalogCode": "HYDROMORPHONE_1_MG_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Hydromorphone 1 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700025",
    "ndcDisplay": "00000-7000-25"
  },
  {
    "catalogCode": "HYDROMORPHONE_2_MG_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Hydromorphone 2 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700026",
    "ndcDisplay": "00000-7000-26"
  },
  {
    "catalogCode": "HYDROMORPHONE_4_MG_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Hydromorphone 4 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700027",
    "ndcDisplay": "00000-7000-27"
  },
  {
    "catalogCode": "KETOROLAC_15_MG_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Ketorolac 15 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700028",
    "ndcDisplay": "00000-7000-28"
  },
  {
    "catalogCode": "KETOROLAC_30_MG_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Ketorolac 30 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700029",
    "ndcDisplay": "00000-7000-29"
  },
  {
    "catalogCode": "ACETAMINOPHEN_10_MG_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Acetaminophen 10 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700030",
    "ndcDisplay": "00000-7000-30"
  },
  {
    "catalogCode": "ACETAMINOPHEN_1000_MG_100_ML_PERFUSION_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Acetaminophen 1000 mg/100 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700031",
    "ndcDisplay": "00000-7000-31"
  },
  {
    "catalogCode": "NALBUPHINE_10_MG_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Nalbuphine 10 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700032",
    "ndcDisplay": "00000-7000-32"
  },
  {
    "catalogCode": "LIDOCAINE_1_INJECTABLE_INJECTABLE",
    "hcpcs": "J3490",
    "description": "Wave4 Lidocaine 1%",
    "billingUnitType": "mg",
    "ndc11": "00000700033",
    "ndcDisplay": "00000-7000-33"
  },
  {
    "catalogCode": "LIDOCAINE_2_INJECTABLE_INJECTABLE",
    "hcpcs": "J3490",
    "description": "Wave4 Lidocaine 2%",
    "billingUnitType": "mg",
    "ndc11": "00000700034",
    "ndcDisplay": "00000-7000-34"
  },
  {
    "catalogCode": "BUPIVACAINE_0_25_INJECTABLE_INJECTABLE",
    "hcpcs": "J3490",
    "description": "Wave4 Bupivacaine 0.25%",
    "billingUnitType": "mg",
    "ndc11": "00000700035",
    "ndcDisplay": "00000-7000-35"
  },
  {
    "catalogCode": "BUPIVACAINE_0_5_INJECTABLE_INJECTABLE",
    "hcpcs": "J3490",
    "description": "Wave4 Bupivacaine 0.5%",
    "billingUnitType": "mg",
    "ndc11": "00000700036",
    "ndcDisplay": "00000-7000-36"
  },
  {
    "catalogCode": "DEXMEDETOMIDINE_100_MCG_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Dexmedetomidine 100 mcg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700037",
    "ndcDisplay": "00000-7000-37"
  },
  {
    "catalogCode": "REMIFENTANIL_1_MG_POUDRE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Remifentanil 1 mg",
    "billingUnitType": "mg",
    "ndc11": "00000700038",
    "ndcDisplay": "00000-7000-38"
  },
  {
    "catalogCode": "ALFENTANIL_500_MCG_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Alfentanil 500 mcg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700039",
    "ndcDisplay": "00000-7000-39"
  },
  {
    "catalogCode": "ADRENALINE_1_MG_PER_ML_INJECTABLE_INJECTION",
    "hcpcs": "J3490",
    "description": "Wave4 Epinephrine 1 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700040",
    "ndcDisplay": "00000-7000-40"
  },
  {
    "catalogCode": "EPINEPHRINE_0_1_MG_ML_PERFUSION_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Epinephrine 0.1 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700041",
    "ndcDisplay": "00000-7000-41"
  },
  {
    "catalogCode": "AMIODARONE_150MG_3ML_IV",
    "hcpcs": "J3490",
    "description": "Wave4 Amiodarone 150 mg/3 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700042",
    "ndcDisplay": "00000-7000-42"
  },
  {
    "catalogCode": "AMIODARONE_900_MG_500_ML_PERFUSION_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Amiodarone 900 mg/500 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700043",
    "ndcDisplay": "00000-7000-43"
  },
  {
    "catalogCode": "LIDOCAINE_20_MG_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Lidocaine 20 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700044",
    "ndcDisplay": "00000-7000-44"
  },
  {
    "catalogCode": "ATROPINE_0_1_MG_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Atropine 0.1 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700045",
    "ndcDisplay": "00000-7000-45"
  },
  {
    "catalogCode": "ATROPINE_1_MG_10_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Atropine 1 mg/10 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700046",
    "ndcDisplay": "00000-7000-46"
  },
  {
    "catalogCode": "CALCIUM_CHLORIDE_10_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Calcium chloride 10%",
    "billingUnitType": "mg",
    "ndc11": "00000700047",
    "ndcDisplay": "00000-7000-47"
  },
  {
    "catalogCode": "CALCIUM_GLUCONATE_10_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Calcium gluconate 10%",
    "billingUnitType": "mg",
    "ndc11": "00000700048",
    "ndcDisplay": "00000-7000-48"
  },
  {
    "catalogCode": "SODIUM_BICARBONATE_8_4_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Sodium bicarbonate 8.4%",
    "billingUnitType": "mg",
    "ndc11": "00000700049",
    "ndcDisplay": "00000-7000-49"
  },
  {
    "catalogCode": "SODIUM_BICARBONATE_50_MEQ_50_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Sodium bicarbonate 50 mEq/50 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700050",
    "ndcDisplay": "00000-7000-50"
  },
  {
    "catalogCode": "ADENOSINE_3_MG_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Adenosine 3 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700051",
    "ndcDisplay": "00000-7000-51"
  },
  {
    "catalogCode": "MAGNESIUM_SULFATE_2_G_50_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Magnesium sulfate 2 g/50 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700052",
    "ndcDisplay": "00000-7000-52"
  },
  {
    "catalogCode": "MAGNESIUM_SULFATE_4_G_100_ML_PERFUSION_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Magnesium sulfate 4 g/100 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700053",
    "ndcDisplay": "00000-7000-53"
  },
  {
    "catalogCode": "DILTIAZEM_5_MG_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Diltiazem 5 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700054",
    "ndcDisplay": "00000-7000-54"
  },
  {
    "catalogCode": "METOPROLOL_5MG_5ML_IV",
    "hcpcs": "J3490",
    "description": "Wave4 Metoprolol 5 mg/5 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700055",
    "ndcDisplay": "00000-7000-55"
  },
  {
    "catalogCode": "NITROGLYCERIN_5_MG_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Nitroglycerin 5 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700056",
    "ndcDisplay": "00000-7000-56"
  },
  {
    "catalogCode": "ISOPROTERENOL_0_2_MG_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Isoproterenol 0.2 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700057",
    "ndcDisplay": "00000-7000-57"
  },
  {
    "catalogCode": "NOREPINEPHRINE_4_MG_4_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Norepinephrine 4 mg/4 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700058",
    "ndcDisplay": "00000-7000-58"
  },
  {
    "catalogCode": "NOREPINEPHRINE_8_MG_250_ML_PERFUSION_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Norepinephrine 8 mg/250 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700059",
    "ndcDisplay": "00000-7000-59"
  },
  {
    "catalogCode": "NOREPINEPHRINE_16_MG_250_ML_PERFUSION_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Norepinephrine 16 mg/250 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700060",
    "ndcDisplay": "00000-7000-60"
  },
  {
    "catalogCode": "EPINEPHRINE_4_MG_250_ML_PERFUSION_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Epinephrine 4 mg/250 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700061",
    "ndcDisplay": "00000-7000-61"
  },
  {
    "catalogCode": "DOPAMINE_400_MG_250_ML_PERFUSION_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Dopamine 400 mg/250 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700062",
    "ndcDisplay": "00000-7000-62"
  },
  {
    "catalogCode": "DOPAMINE_800_MG_250_ML_PERFUSION_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Dopamine 800 mg/250 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700063",
    "ndcDisplay": "00000-7000-63"
  },
  {
    "catalogCode": "DOBUTAMINE_250_MG_20_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Dobutamine 250 mg/20 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700064",
    "ndcDisplay": "00000-7000-64"
  },
  {
    "catalogCode": "DOBUTAMINE_500_MG_250_ML_PERFUSION_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Dobutamine 500 mg/250 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700065",
    "ndcDisplay": "00000-7000-65"
  },
  {
    "catalogCode": "PHENYLEPHRINE_10_MG_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Phenylephrine 10 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700066",
    "ndcDisplay": "00000-7000-66"
  },
  {
    "catalogCode": "PHENYLEPHRINE_50_MG_250_ML_PERFUSION_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Phenylephrine 50 mg/250 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700067",
    "ndcDisplay": "00000-7000-67"
  },
  {
    "catalogCode": "VASOPRESSIN_20_UNITS_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Vasopressin 20 units/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700068",
    "ndcDisplay": "00000-7000-68"
  },
  {
    "catalogCode": "VASOPRESSIN_40_UNITS_100_ML_PERFUSION_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Vasopressin 40 units/100 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700069",
    "ndcDisplay": "00000-7000-69"
  },
  {
    "catalogCode": "MILRINONE_1_MG_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Milrinone 1 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700070",
    "ndcDisplay": "00000-7000-70"
  },
  {
    "catalogCode": "MILRINONE_40_MG_200_ML_PERFUSION_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Milrinone 40 mg/200 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700071",
    "ndcDisplay": "00000-7000-71"
  },
  {
    "catalogCode": "ANGIOTENSIN_II_2_5_MG_500_ML_PERFUSION_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Angiotensin II 2.5 mg/500 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700072",
    "ndcDisplay": "00000-7000-72"
  },
  {
    "catalogCode": "EPINEPHRINE_16_MG_250_ML_PERFUSION_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Epinephrine 16 mg/250 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700073",
    "ndcDisplay": "00000-7000-73"
  },
  {
    "catalogCode": "PIPERACILLIN_TAZOBACTAM_3_375_G_INJECTABLE_INJECTABLE",
    "hcpcs": "J3490",
    "description": "Wave4 Piperacillin tazobactam 3.375 g",
    "billingUnitType": "mg",
    "ndc11": "00000700074",
    "ndcDisplay": "00000-7000-74"
  },
  {
    "catalogCode": "PIPERACILLIN_TAZOBACTAM_4_5_G_POUDRE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Piperacillin tazobactam 4.5 g",
    "billingUnitType": "mg",
    "ndc11": "00000700075",
    "ndcDisplay": "00000-7000-75"
  },
  {
    "catalogCode": "PIPERACILLIN_TAZOBACTAM_2_25_G_POUDRE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Piperacillin tazobactam 2.25 g",
    "billingUnitType": "mg",
    "ndc11": "00000700076",
    "ndcDisplay": "00000-7000-76"
  },
  {
    "catalogCode": "VANCOMYCIN_1_G_INJECTABLE_INTRAVENOUS",
    "hcpcs": "J3490",
    "description": "Wave4 Vancomycin 1 g",
    "billingUnitType": "mg",
    "ndc11": "00000700077",
    "ndcDisplay": "00000-7000-77"
  },
  {
    "catalogCode": "VANCOMYCIN_500_MG_POUDRE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Vancomycin 500 mg",
    "billingUnitType": "mg",
    "ndc11": "00000700078",
    "ndcDisplay": "00000-7000-78"
  },
  {
    "catalogCode": "VANCOMYCIN_750_MG_POUDRE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Vancomycin 750 mg",
    "billingUnitType": "mg",
    "ndc11": "00000700079",
    "ndcDisplay": "00000-7000-79"
  },
  {
    "catalogCode": "CEFEPIME_1G_INJECTABLE",
    "hcpcs": "J3490",
    "description": "Wave4 Cefepime 1 g",
    "billingUnitType": "mg",
    "ndc11": "00000700080",
    "ndcDisplay": "00000-7000-80"
  },
  {
    "catalogCode": "CEFEPIME_2_G_POUDRE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Cefepime 2 g",
    "billingUnitType": "mg",
    "ndc11": "00000700081",
    "ndcDisplay": "00000-7000-81"
  },
  {
    "catalogCode": "MEROPENEM_1_G_POUDRE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Meropenem 1 g",
    "billingUnitType": "mg",
    "ndc11": "00000700082",
    "ndcDisplay": "00000-7000-82"
  },
  {
    "catalogCode": "MEROPENEM_500_MG_POUDRE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Meropenem 500 mg",
    "billingUnitType": "mg",
    "ndc11": "00000700083",
    "ndcDisplay": "00000-7000-83"
  },
  {
    "catalogCode": "IMIPENEM_CILASTATIN_500_MG_POUDRE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Imipenem cilastatin 500 mg",
    "billingUnitType": "mg",
    "ndc11": "00000700084",
    "ndcDisplay": "00000-7000-84"
  },
  {
    "catalogCode": "IMIPENEM_CILASTATIN_250_MG_POUDRE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Imipenem cilastatin 250 mg",
    "billingUnitType": "mg",
    "ndc11": "00000700085",
    "ndcDisplay": "00000-7000-85"
  },
  {
    "catalogCode": "CEFTRIAXONE_1_G_INJECTABLE_INJECTION",
    "hcpcs": "J3490",
    "description": "Wave4 Ceftriaxone 1 g",
    "billingUnitType": "mg",
    "ndc11": "00000700086",
    "ndcDisplay": "00000-7000-86"
  },
  {
    "catalogCode": "CEFTRIAXONE_2_G_INJECTABLE_INJECTION",
    "hcpcs": "J3490",
    "description": "Wave4 Ceftriaxone 2 g",
    "billingUnitType": "mg",
    "ndc11": "00000700087",
    "ndcDisplay": "00000-7000-87"
  },
  {
    "catalogCode": "CEFAZOLIN_1G_INJECTABLE",
    "hcpcs": "J3490",
    "description": "Wave4 Cefazolin 1 g",
    "billingUnitType": "mg",
    "ndc11": "00000700088",
    "ndcDisplay": "00000-7000-88"
  },
  {
    "catalogCode": "CEFAZOLIN_2_G_POUDRE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Cefazolin 2 g",
    "billingUnitType": "mg",
    "ndc11": "00000700089",
    "ndcDisplay": "00000-7000-89"
  },
  {
    "catalogCode": "METRONIDAZOLE_500_MG_PER_100_ML_PERFUSION_INTRAVENOUS",
    "hcpcs": "J3490",
    "description": "Wave4 Metronidazole 500 mg/100 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700090",
    "ndcDisplay": "00000-7000-90"
  },
  {
    "catalogCode": "AZITHROMYCIN_500_MG_250_ML_PERFUSION_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Azithromycin 500 mg/250 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700091",
    "ndcDisplay": "00000-7000-91"
  },
  {
    "catalogCode": "LEVOFLOXACIN_750_MG_150_ML_PERFUSION_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Levofloxacin 750 mg/150 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700092",
    "ndcDisplay": "00000-7000-92"
  },
  {
    "catalogCode": "CIPROFLOXACIN_400_MG_200_ML_PERFUSION_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Ciprofloxacin 400 mg/200 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700093",
    "ndcDisplay": "00000-7000-93"
  },
  {
    "catalogCode": "CLINDAMYCIN_900_MG_50_ML_PERFUSION_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Clindamycin 900 mg/50 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700094",
    "ndcDisplay": "00000-7000-94"
  },
  {
    "catalogCode": "AMPICILLIN_SULBACTAM_3_G_POUDRE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Ampicillin sulbactam 3 g",
    "billingUnitType": "mg",
    "ndc11": "00000700095",
    "ndcDisplay": "00000-7000-95"
  },
  {
    "catalogCode": "AMPICILLIN_SULBACTAM_1_5_G_POUDRE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Ampicillin sulbactam 1.5 g",
    "billingUnitType": "mg",
    "ndc11": "00000700096",
    "ndcDisplay": "00000-7000-96"
  },
  {
    "catalogCode": "LINEZOLID_600_MG_300_ML_PERFUSION_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Linezolid 600 mg/300 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700097",
    "ndcDisplay": "00000-7000-97"
  },
  {
    "catalogCode": "DAPTOMYCIN_500_MG_POUDRE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Daptomycin 500 mg",
    "billingUnitType": "mg",
    "ndc11": "00000700098",
    "ndcDisplay": "00000-7000-98"
  },
  {
    "catalogCode": "ERTAPENEM_1_G_POUDRE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Ertapenem 1 g",
    "billingUnitType": "mg",
    "ndc11": "00000700099",
    "ndcDisplay": "00000-7000-99"
  },
  {
    "catalogCode": "TIGECYCLINE_50_MG_POUDRE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Tigecycline 50 mg",
    "billingUnitType": "mg",
    "ndc11": "00000700100",
    "ndcDisplay": "00000-7001-00"
  },
  {
    "catalogCode": "COLISTIMETHATE_150_MG_POUDRE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Colistimethate 150 mg",
    "billingUnitType": "mg",
    "ndc11": "00000700101",
    "ndcDisplay": "00000-7001-01"
  },
  {
    "catalogCode": "ALTEPLASE_100_MG_POUDRE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Alteplase 100 mg",
    "billingUnitType": "mg",
    "ndc11": "00000700102",
    "ndcDisplay": "00000-7001-02"
  },
  {
    "catalogCode": "TENECTEPLASE_50_MG_POUDRE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Tenecteplase 50 mg",
    "billingUnitType": "mg",
    "ndc11": "00000700103",
    "ndcDisplay": "00000-7001-03"
  },
  {
    "catalogCode": "LEVETIRACETAM_500_MG_5_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Levetiracetam 500 mg/5 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700104",
    "ndcDisplay": "00000-7001-04"
  },
  {
    "catalogCode": "LEVETIRACETAM_1000_MG_100_ML_PERFUSION_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Levetiracetam 1000 mg/100 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700105",
    "ndcDisplay": "00000-7001-05"
  },
  {
    "catalogCode": "PHENYTOIN_50_MG_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Phenytoin 50 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700106",
    "ndcDisplay": "00000-7001-06"
  },
  {
    "catalogCode": "VALPROATE_SODIUM_100_MG_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Valproate sodium 100 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700107",
    "ndcDisplay": "00000-7001-07"
  },
  {
    "catalogCode": "NIMODIPINE_60_MG_GELULE_ORALE",
    "hcpcs": "J3490",
    "description": "Wave4 Nimodipine 60 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000700108",
    "ndcDisplay": "00000-7001-08"
  },
  {
    "catalogCode": "NIMODIPINE_30_MG_GELULE_ORALE",
    "hcpcs": "J3490",
    "description": "Wave4 Nimodipine 30 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000700109",
    "ndcDisplay": "00000-7001-09"
  },
  {
    "catalogCode": "MANNITOL_20_PERFUSION_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Mannitol 20%",
    "billingUnitType": "mg",
    "ndc11": "00000700110",
    "ndcDisplay": "00000-7001-10"
  },
  {
    "catalogCode": "MANNITOL_15_PERFUSION_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Mannitol 15%",
    "billingUnitType": "mg",
    "ndc11": "00000700111",
    "ndcDisplay": "00000-7001-11"
  },
  {
    "catalogCode": "HYPERTONIC_SALINE_3_500_ML_PERFUSION_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Hypertonic saline 3% 500 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700112",
    "ndcDisplay": "00000-7001-12"
  },
  {
    "catalogCode": "HYPERTONIC_SALINE_23_4_30_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Hypertonic saline 23.4% 30 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700113",
    "ndcDisplay": "00000-7001-13"
  },
  {
    "catalogCode": "LABETALOL_5_MG_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Labetalol 5 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700114",
    "ndcDisplay": "00000-7001-14"
  },
  {
    "catalogCode": "LABETALOL_100_MG_20_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Labetalol 100 mg/20 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700115",
    "ndcDisplay": "00000-7001-15"
  },
  {
    "catalogCode": "NICARDIPINE_2_5_MG_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Nicardipine 2.5 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700116",
    "ndcDisplay": "00000-7001-16"
  },
  {
    "catalogCode": "PHENOBARBITAL_130_MG_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Phenobarbital 130 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700117",
    "ndcDisplay": "00000-7001-17"
  },
  {
    "catalogCode": "NITROGLYCERIN_0_4_MG_COMPRIME_SUBLINGUAL_ORALE",
    "hcpcs": "J3490",
    "description": "Wave4 Nitroglycerin 0.4 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000700118",
    "ndcDisplay": "00000-7001-18"
  },
  {
    "catalogCode": "NITROGLYCERIN_50_MG_250_ML_PERFUSION_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Nitroglycerin 50 mg/250 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700119",
    "ndcDisplay": "00000-7001-19"
  },
  {
    "catalogCode": "HEPARIN_5000_UNITS_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Heparin 5000 units/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700120",
    "ndcDisplay": "00000-7001-20"
  },
  {
    "catalogCode": "HEPARIN_25000_UNITS_500_ML_PERFUSION_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Heparin 25000 units/500 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700121",
    "ndcDisplay": "00000-7001-21"
  },
  {
    "catalogCode": "ENOXAPARIN_40_MG_PER_0.4_ML_INJECTABLE_INJECTION",
    "hcpcs": "J3490",
    "description": "Wave4 Enoxaparin 40 mg/0.4 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700122",
    "ndcDisplay": "00000-7001-22"
  },
  {
    "catalogCode": "ENOXAPARIN_60_MG_PER_0.6_ML_INJECTABLE_INJECTION",
    "hcpcs": "J3490",
    "description": "Wave4 Enoxaparin 60 mg/0.6 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700123",
    "ndcDisplay": "00000-7001-23"
  },
  {
    "catalogCode": "ENOXAPARIN_120_MG_0_8_ML_INJECTABLE_SOUS_CUTANEE",
    "hcpcs": "J3490",
    "description": "Wave4 Enoxaparin 120 mg/0.8 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700124",
    "ndcDisplay": "00000-7001-24"
  },
  {
    "catalogCode": "CLOPIDOGREL_75_MG_COMPRIME_ORAL",
    "hcpcs": "J3490",
    "description": "Wave4 Clopidogrel 75 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000700125",
    "ndcDisplay": "00000-7001-25"
  },
  {
    "catalogCode": "ASPIRIN_81",
    "hcpcs": "J3490",
    "description": "Wave4 Aspirin 81 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000700126",
    "ndcDisplay": "00000-7001-26"
  },
  {
    "catalogCode": "ASPIRIN_325_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave4 Aspirin 325 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000700127",
    "ndcDisplay": "00000-7001-27"
  },
  {
    "catalogCode": "TICAGRELOR_180_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave4 Ticagrelor 180 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000700128",
    "ndcDisplay": "00000-7001-28"
  },
  {
    "catalogCode": "TICAGRELOR_90_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave4 Ticagrelor 90 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000700129",
    "ndcDisplay": "00000-7001-29"
  },
  {
    "catalogCode": "NITROPRUSSIDE_50_MG_2_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Nitroprusside 50 mg/2 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700130",
    "ndcDisplay": "00000-7001-30"
  },
  {
    "catalogCode": "CLEVIDIPINE_0_5_MG_ML_EMULSION_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Clevidipine 0.5 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700131",
    "ndcDisplay": "00000-7001-31"
  },
  {
    "catalogCode": "HYDRALAZINE_20_MG_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Hydralazine 20 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700132",
    "ndcDisplay": "00000-7001-32"
  },
  {
    "catalogCode": "EPTIFIBATIDE_75_MG_100_ML_PERFUSION_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Eptifibatide 75 mg/100 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700133",
    "ndcDisplay": "00000-7001-33"
  },
  {
    "catalogCode": "BIVALIRUDIN_250_MG_POUDRE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Bivalirudin 250 mg",
    "billingUnitType": "mg",
    "ndc11": "00000700134",
    "ndcDisplay": "00000-7001-34"
  },
  {
    "catalogCode": "METOPROLOL_25_MG_COMPRIME_ORAL",
    "hcpcs": "J3490",
    "description": "Wave4 Metoprolol 25 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000700135",
    "ndcDisplay": "00000-7001-35"
  },
  {
    "catalogCode": "SALBUTAMOL_2.5_MG_PER_2.5_ML_SOLUTION_NEBULISATION_INHALATION",
    "hcpcs": "J3490",
    "description": "Wave4 Albuterol 2.5 mg/3 mL",
    "billingUnitType": "tablet",
    "ndc11": "00000700136",
    "ndcDisplay": "00000-7001-36"
  },
  {
    "catalogCode": "ALBUTEROL_0_5_SOLUTION_DE_NEBULISATION_INHALEE",
    "hcpcs": "J3490",
    "description": "Wave4 Albuterol 0.5%",
    "billingUnitType": "tablet",
    "ndc11": "00000700137",
    "ndcDisplay": "00000-7001-37"
  },
  {
    "catalogCode": "IPRATROPIUM_0_5_MG_2_5_ML_SOLUTION_DE_NEBULISATION_INHALEE",
    "hcpcs": "J3490",
    "description": "Wave4 Ipratropium 0.5 mg/2.5 mL",
    "billingUnitType": "tablet",
    "ndc11": "00000700138",
    "ndcDisplay": "00000-7001-38"
  },
  {
    "catalogCode": "RACEMIC_EPINEPHRINE_2_25_SOLUTION_DE_NEBULISATION_INHALEE",
    "hcpcs": "J3490",
    "description": "Wave4 Racemic epinephrine 2.25%",
    "billingUnitType": "tablet",
    "ndc11": "00000700139",
    "ndcDisplay": "00000-7001-39"
  },
  {
    "catalogCode": "MAGNESIUM_SULFATE_1_G_50_ML_NEB_SOLUTION_DE_NEBULISATION_INHALEE",
    "hcpcs": "J3490",
    "description": "Wave4 Magnesium sulfate 1 g/50 mL neb",
    "billingUnitType": "tablet",
    "ndc11": "00000700140",
    "ndcDisplay": "00000-7001-40"
  },
  {
    "catalogCode": "METHYLPREDNISOLONE_125MG",
    "hcpcs": "J3490",
    "description": "Wave4 Methylprednisolone 125 mg",
    "billingUnitType": "mg",
    "ndc11": "00000700141",
    "ndcDisplay": "00000-7001-41"
  },
  {
    "catalogCode": "METHYLPREDNISOLONE_40_MG_POUDRE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Methylprednisolone 40 mg",
    "billingUnitType": "mg",
    "ndc11": "00000700142",
    "ndcDisplay": "00000-7001-42"
  },
  {
    "catalogCode": "DEXAMETHASONE_4_MG_PER_1_ML_INJECTABLE_INJECTION",
    "hcpcs": "J3490",
    "description": "Wave4 Dexamethasone 4 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700143",
    "ndcDisplay": "00000-7001-43"
  },
  {
    "catalogCode": "DEXAMETHASONE_10_MG_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Dexamethasone 10 mg",
    "billingUnitType": "mg",
    "ndc11": "00000700144",
    "ndcDisplay": "00000-7001-44"
  },
  {
    "catalogCode": "TERBUTALINE_1_MG_ML_INJECTABLE_SOUS_CUTANEE",
    "hcpcs": "J3490",
    "description": "Wave4 Terbutaline 1 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700145",
    "ndcDisplay": "00000-7001-45"
  },
  {
    "catalogCode": "AMINOPHYLLINE_250_MG_10_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Aminophylline 250 mg/10 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700146",
    "ndcDisplay": "00000-7001-46"
  },
  {
    "catalogCode": "BUDESONIDE_0.5_MG_PER_2_ML_SUSPENSION_POUR_NEBULISATION_INHALEE",
    "hcpcs": "J3490",
    "description": "Wave4 Budesonide 0.5 mg/2 mL",
    "billingUnitType": "tablet",
    "ndc11": "00000700147",
    "ndcDisplay": "00000-7001-47"
  },
  {
    "catalogCode": "TERBUTALINE_0_25_MG_ML_SOLUTION_DE_NEBULISATION_INHALEE",
    "hcpcs": "J3490",
    "description": "Wave4 Terbutaline 0.25 mg/mL",
    "billingUnitType": "tablet",
    "ndc11": "00000700148",
    "ndcDisplay": "00000-7001-48"
  },
  {
    "catalogCode": "EPINEPHRINE_1_MG_1_ML_IM_INJECTABLE_INTRAMUSCULAIRE",
    "hcpcs": "J3490",
    "description": "Wave4 Epinephrine 1 mg/1 mL IM",
    "billingUnitType": "mg",
    "ndc11": "00000700149",
    "ndcDisplay": "00000-7001-49"
  },
  {
    "catalogCode": "FUROSEMIDE_20_MG_PER_2_ML_INJECTABLE_INJECTION",
    "hcpcs": "J3490",
    "description": "Wave4 Furosemide 20 mg/2 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700150",
    "ndcDisplay": "00000-7001-50"
  },
  {
    "catalogCode": "ONDANSETRON_4_MG_PER_2_ML_INJECTABLE_INJECTION",
    "hcpcs": "J3490",
    "description": "Wave4 Ondansetron 4 mg/2 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700151",
    "ndcDisplay": "00000-7001-51"
  },
  {
    "catalogCode": "NALOXONE_0.4MG_ML",
    "hcpcs": "J3490",
    "description": "Wave4 Naloxone 0.4 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700152",
    "ndcDisplay": "00000-7001-52"
  },
  {
    "catalogCode": "NALOXONE_1_MG_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Naloxone 1 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700153",
    "ndcDisplay": "00000-7001-53"
  },
  {
    "catalogCode": "NALOXONE_4_MG_0_4_ML_INJECTABLE_INTRANASALE",
    "hcpcs": "J3490",
    "description": "Wave4 Naloxone 4 mg/0.4 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700154",
    "ndcDisplay": "00000-7001-54"
  },
  {
    "catalogCode": "FLUMAZENIL_0_1_MG_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Flumazenil 0.1 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700155",
    "ndcDisplay": "00000-7001-55"
  },
  {
    "catalogCode": "ACETYLCYSTEINE_20_IV_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Acetylcysteine 20% IV",
    "billingUnitType": "mg",
    "ndc11": "00000700156",
    "ndcDisplay": "00000-7001-56"
  },
  {
    "catalogCode": "ACETYLCYSTEINE_6_25_IV_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Acetylcysteine 6.25% IV",
    "billingUnitType": "mg",
    "ndc11": "00000700157",
    "ndcDisplay": "00000-7001-57"
  },
  {
    "catalogCode": "FOMEPIZOLE_15_MG_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Fomepizole 15 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700158",
    "ndcDisplay": "00000-7001-58"
  },
  {
    "catalogCode": "GLUCAGON_1_MG_POUDRE_INJECTABLE",
    "hcpcs": "J3490",
    "description": "Wave4 Glucagon 1 mg",
    "billingUnitType": "mg",
    "ndc11": "00000700159",
    "ndcDisplay": "00000-7001-59"
  },
  {
    "catalogCode": "OCTREOTIDE_100_MCG_ML_INJECTABLE_SOUS_CUTANEE",
    "hcpcs": "J3490",
    "description": "Wave4 Octreotide 100 mcg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700160",
    "ndcDisplay": "00000-7001-60"
  },
  {
    "catalogCode": "PHYSOSTIGMINE_1_MG_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Physostigmine 1 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700161",
    "ndcDisplay": "00000-7001-61"
  },
  {
    "catalogCode": "HYDROXOCOBALAMIN_5_G_POUDRE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Hydroxocobalamin 5 g",
    "billingUnitType": "mg",
    "ndc11": "00000700162",
    "ndcDisplay": "00000-7001-62"
  },
  {
    "catalogCode": "SODIUM_THIOSULFATE_12_5_G_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Sodium thiosulfate 12.5 g",
    "billingUnitType": "mg",
    "ndc11": "00000700163",
    "ndcDisplay": "00000-7001-63"
  },
  {
    "catalogCode": "DIGOXIN_IMMUNE_FAB_40_MG_POUDRE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Digoxin immune fab 40 mg",
    "billingUnitType": "mg",
    "ndc11": "00000700164",
    "ndcDisplay": "00000-7001-64"
  },
  {
    "catalogCode": "INTRALIPID_20_EMULSION_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Intralipid 20%",
    "billingUnitType": "mg",
    "ndc11": "00000700165",
    "ndcDisplay": "00000-7001-65"
  },
  {
    "catalogCode": "PRALIDOXIME_1_G_POUDRE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Pralidoxime 1 g",
    "billingUnitType": "mg",
    "ndc11": "00000700166",
    "ndcDisplay": "00000-7001-66"
  },
  {
    "catalogCode": "PHYTONADIONE_10_MG_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Phytonadione 10 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700167",
    "ndcDisplay": "00000-7001-67"
  },
  {
    "catalogCode": "ETHANOL_10_PERFUSION_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Ethanol 10%",
    "billingUnitType": "mg",
    "ndc11": "00000700168",
    "ndcDisplay": "00000-7001-68"
  },
  {
    "catalogCode": "POTASSIUM_CHLORIDE_20_MEQ_PER_10_ML_INJECTABLE_INTRAVENOUS",
    "hcpcs": "J3490",
    "description": "Wave4 Potassium chloride 20 mEq/10 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700169",
    "ndcDisplay": "00000-7001-69"
  },
  {
    "catalogCode": "POTASSIUM_CHLORIDE_10_MEQ_100_ML_PERFUSION_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Potassium chloride 10 mEq/100 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700170",
    "ndcDisplay": "00000-7001-70"
  },
  {
    "catalogCode": "POTASSIUM_CHLORIDE_40_MEQ_1000_ML_PERFUSION_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Potassium chloride 40 mEq/1000 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700171",
    "ndcDisplay": "00000-7001-71"
  },
  {
    "catalogCode": "MAGNESIUM_SULFATE_500_MG_PER_ML_INJECTABLE_INJECTION",
    "hcpcs": "J3490",
    "description": "Wave4 Magnesium sulfate 500 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700172",
    "ndcDisplay": "00000-7001-72"
  },
  {
    "catalogCode": "CALCIUM_GLUCONATE_10_100_ML_PERFUSION_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Calcium gluconate 10% 100 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700173",
    "ndcDisplay": "00000-7001-73"
  },
  {
    "catalogCode": "CALCIUM_CHLORIDE_10_100_ML_PERFUSION_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Calcium chloride 10% 100 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700174",
    "ndcDisplay": "00000-7001-74"
  },
  {
    "catalogCode": "SODIUM_PHOSPHATE_15_MMOL_250_ML_PERFUSION_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Sodium phosphate 15 mmol/250 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700175",
    "ndcDisplay": "00000-7001-75"
  },
  {
    "catalogCode": "POTASSIUM_PHOSPHATE_30_MMOL_500_ML_PERFUSION_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Potassium phosphate 30 mmol/500 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700176",
    "ndcDisplay": "00000-7001-76"
  },
  {
    "catalogCode": "ALBUMIN_5_250_ML_PERFUSION_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Albumin 5% 250 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700177",
    "ndcDisplay": "00000-7001-77"
  },
  {
    "catalogCode": "ALBUMIN_25_50_ML_PERFUSION_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Albumin 25% 50 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700178",
    "ndcDisplay": "00000-7001-78"
  },
  {
    "catalogCode": "DEXTROSE_50_50_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Dextrose 50% 50 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700179",
    "ndcDisplay": "00000-7001-79"
  },
  {
    "catalogCode": "DEXTROSE_10_250_ML_PERFUSION_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Dextrose 10% 250 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700180",
    "ndcDisplay": "00000-7001-80"
  },
  {
    "catalogCode": "REGULAR_INSULIN_100_UI_PER_ML_INJECTABLE_SUBCUTANEOUS",
    "hcpcs": "J3490",
    "description": "Wave4 Regular insulin 100 UI/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700181",
    "ndcDisplay": "00000-7001-81"
  },
  {
    "catalogCode": "REGULAR_INSULIN_100_UI_ML_DRIP_KIT_PERFUSION_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Regular insulin 100 UI/mL drip kit",
    "billingUnitType": "mg",
    "ndc11": "00000700182",
    "ndcDisplay": "00000-7001-82"
  },
  {
    "catalogCode": "HYPERTONIC_SALINE_3_1000_ML_PERFUSION_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Hypertonic saline 3% 1000 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700183",
    "ndcDisplay": "00000-7001-83"
  },
  {
    "catalogCode": "PACKED_RED_BLOOD_CELLS_250_ML_PERFUSION_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Packed red blood cells 250 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700184",
    "ndcDisplay": "00000-7001-84"
  },
  {
    "catalogCode": "FRESH_FROZEN_PLASMA_250_ML_PERFUSION_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Fresh frozen plasma 250 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700185",
    "ndcDisplay": "00000-7001-85"
  },
  {
    "catalogCode": "PLATELETS_APHERESIS_UNIT_PERFUSION_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Platelets apheresis unit",
    "billingUnitType": "mg",
    "ndc11": "00000700186",
    "ndcDisplay": "00000-7001-86"
  },
  {
    "catalogCode": "CRYOPRECIPITATE_10_UNITS_PERFUSION_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Cryoprecipitate 10 units",
    "billingUnitType": "mg",
    "ndc11": "00000700187",
    "ndcDisplay": "00000-7001-87"
  },
  {
    "catalogCode": "WHOLE_BLOOD_500_ML_PERFUSION_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Whole blood 500 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700188",
    "ndcDisplay": "00000-7001-88"
  },
  {
    "catalogCode": "DEXTROSE_5_1000_ML_PERFUSION_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Dextrose 5% 1000 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700189",
    "ndcDisplay": "00000-7001-89"
  },
  {
    "catalogCode": "SODIUM_CHLORIDE_0_9_1000_ML_PERFUSION_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Sodium chloride 0.9% 1000 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700190",
    "ndcDisplay": "00000-7001-90"
  },
  {
    "catalogCode": "OXYTOCIN_10_UNITS_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Oxytocin 10 units/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700191",
    "ndcDisplay": "00000-7001-91"
  },
  {
    "catalogCode": "OXYTOCIN_30_UNITS_500_ML_PERFUSION_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Oxytocin 30 units/500 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700192",
    "ndcDisplay": "00000-7001-92"
  },
  {
    "catalogCode": "METHYLERGONOVINE_0_2_MG_ML_INJECTABLE_INTRAMUSCULAIRE",
    "hcpcs": "J3490",
    "description": "Wave4 Methylergonovine 0.2 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700193",
    "ndcDisplay": "00000-7001-93"
  },
  {
    "catalogCode": "CARBOPROST_250_MCG_ML_INJECTABLE_INTRAMUSCULAIRE",
    "hcpcs": "J3490",
    "description": "Wave4 Carboprost 250 mcg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700194",
    "ndcDisplay": "00000-7001-94"
  },
  {
    "catalogCode": "MISOPROSTOL_200_MCG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave4 Misoprostol 200 mcg",
    "billingUnitType": "tablet",
    "ndc11": "00000700195",
    "ndcDisplay": "00000-7001-95"
  },
  {
    "catalogCode": "MISOPROSTOL_25_MCG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave4 Misoprostol 25 mcg",
    "billingUnitType": "tablet",
    "ndc11": "00000700196",
    "ndcDisplay": "00000-7001-96"
  },
  {
    "catalogCode": "MAGNESIUM_SULFATE_4_G_100_ML_OB_PERFUSION_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Magnesium sulfate 4 g/100 mL OB",
    "billingUnitType": "mg",
    "ndc11": "00000700197",
    "ndcDisplay": "00000-7001-97"
  },
  {
    "catalogCode": "RH_IMMUNE_GLOBULIN_300_MCG_INJECTABLE_INTRAMUSCULAIRE",
    "hcpcs": "J3490",
    "description": "Wave4 Rh immune globulin 300 mcg",
    "billingUnitType": "mg",
    "ndc11": "00000700198",
    "ndcDisplay": "00000-7001-98"
  },
  {
    "catalogCode": "BETAMETHASONE_12_MG_INJECTABLE_INTRAMUSCULAIRE",
    "hcpcs": "J3490",
    "description": "Wave4 Betamethasone 12 mg",
    "billingUnitType": "mg",
    "ndc11": "00000700199",
    "ndcDisplay": "00000-7001-99"
  },
  {
    "catalogCode": "DEXAMETHASONE_6_MG_IM_INJECTABLE_INTRAMUSCULAIRE",
    "hcpcs": "J3490",
    "description": "Wave4 Dexamethasone 6 mg IM",
    "billingUnitType": "mg",
    "ndc11": "00000700200",
    "ndcDisplay": "00000-7002-00"
  },
  {
    "catalogCode": "NIFEDIPINE_10_MG_GELULE_ORALE",
    "hcpcs": "J3490",
    "description": "Wave4 Nifedipine 10 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000700201",
    "ndcDisplay": "00000-7002-01"
  },
  {
    "catalogCode": "LABETALOL_200_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave4 Labetalol 200 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000700202",
    "ndcDisplay": "00000-7002-02"
  },
  {
    "catalogCode": "TERBUTALINE_0_25_MG_SC_OB_INJECTABLE_SOUS_CUTANEE",
    "hcpcs": "J3490",
    "description": "Wave4 Terbutaline 0.25 mg SC OB",
    "billingUnitType": "mg",
    "ndc11": "00000700203",
    "ndcDisplay": "00000-7002-03"
  },
  {
    "catalogCode": "MAGNESIUM_SULFATE_40_G_1000_ML_OB_PERFUSION_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Magnesium sulfate 40 g/1000 mL OB",
    "billingUnitType": "mg",
    "ndc11": "00000700204",
    "ndcDisplay": "00000-7002-04"
  },
  {
    "catalogCode": "EPINEPHRINE_0_15_MG_0_15_ML_INJECTABLE_INTRAMUSCULAIRE",
    "hcpcs": "J3490",
    "description": "Wave4 Epinephrine 0.15 mg/0.15 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700205",
    "ndcDisplay": "00000-7002-05"
  },
  {
    "catalogCode": "EPINEPHRINE_0_3_MG_0_3_ML_INJECTABLE_INTRAMUSCULAIRE",
    "hcpcs": "J3490",
    "description": "Wave4 Epinephrine 0.3 mg/0.3 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700206",
    "ndcDisplay": "00000-7002-06"
  },
  {
    "catalogCode": "DEXTROSE_10_100_ML_PERFUSION_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Dextrose 10% 100 mL",
    "billingUnitType": "mg",
    "ndc11": "00000700207",
    "ndcDisplay": "00000-7002-07"
  },
  {
    "catalogCode": "DEXTROSE_25_25_ML_NEONATAL_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Dextrose 25% 25 mL neonatal",
    "billingUnitType": "mg",
    "ndc11": "00000700208",
    "ndcDisplay": "00000-7002-08"
  },
  {
    "catalogCode": "AMPICILLIN_500_MG_POUDRE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Ampicillin 500 mg",
    "billingUnitType": "mg",
    "ndc11": "00000700209",
    "ndcDisplay": "00000-7002-09"
  },
  {
    "catalogCode": "GENTAMICIN_40_MG_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Gentamicin 40 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000700210",
    "ndcDisplay": "00000-7002-10"
  },
  {
    "catalogCode": "CEFTRIAXONE_100_MG_ML_PEDS_POUDRE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Ceftriaxone 100 mg/mL peds",
    "billingUnitType": "mg",
    "ndc11": "00000700211",
    "ndcDisplay": "00000-7002-11"
  },
  {
    "catalogCode": "MIDAZOLAM_5_MG_0_5_ML_NASAL_SOLUTION_NASALE_NASALE",
    "hcpcs": "J3490",
    "description": "Wave4 Midazolam 5 mg/0.5 mL nasal",
    "billingUnitType": "tablet",
    "ndc11": "00000700212",
    "ndcDisplay": "00000-7002-12"
  },
  {
    "catalogCode": "KETAMINE_100_MG_ML_PEDS_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Ketamine 100 mg/mL peds",
    "billingUnitType": "mg",
    "ndc11": "00000700213",
    "ndcDisplay": "00000-7002-13"
  },
  {
    "catalogCode": "ATROPINE_0_05_MG_ML_PEDS_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Atropine 0.05 mg/mL peds",
    "billingUnitType": "mg",
    "ndc11": "00000700214",
    "ndcDisplay": "00000-7002-14"
  },
  {
    "catalogCode": "LORAZEPAM_2_MG_ML_PEDS_IV_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Lorazepam 2 mg/mL peds IV",
    "billingUnitType": "mg",
    "ndc11": "00000700215",
    "ndcDisplay": "00000-7002-15"
  },
  {
    "catalogCode": "CALCIUM_GLUCONATE_100_MG_ML_PEDS_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Calcium gluconate 100 mg/mL peds",
    "billingUnitType": "mg",
    "ndc11": "00000700216",
    "ndcDisplay": "00000-7002-16"
  },
  {
    "catalogCode": "SODIUM_BICARBONATE_4_2_PEDS_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Sodium bicarbonate 4.2% peds",
    "billingUnitType": "mg",
    "ndc11": "00000700217",
    "ndcDisplay": "00000-7002-17"
  },
  {
    "catalogCode": "ALBUTEROL_0_083_PEDS_NEB_SOLUTION_DE_NEBULISATION_INHALEE",
    "hcpcs": "J3490",
    "description": "Wave4 Albuterol 0.083% peds neb",
    "billingUnitType": "tablet",
    "ndc11": "00000700218",
    "ndcDisplay": "00000-7002-18"
  },
  {
    "catalogCode": "DEXAMETHASONE_0_4_MG_ML_PEDS_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave4 Dexamethasone 0.4 mg/mL peds",
    "billingUnitType": "mg",
    "ndc11": "00000700219",
    "ndcDisplay": "00000-7002-19"
  },
  {
    "catalogCode": "RACEMIC_EPINEPHRINE_0_25_ML_PEDS_NEB_SOLUTION_DE_NEBULISATION_INHALEE",
    "hcpcs": "J3490",
    "description": "Wave4 Racemic epinephrine 0.25 mL peds neb",
    "billingUnitType": "tablet",
    "ndc11": "00000700220",
    "ndcDisplay": "00000-7002-20"
  },
  {
    "catalogCode": "AMOXICILLIN_250_MG_PER_5_ML_SUSPENSION_BUVABLE_ORAL",
    "hcpcs": "J3490",
    "description": "Wave4 Amoxicillin 250 mg/5 mL",
    "billingUnitType": "tablet",
    "ndc11": "00000700221",
    "ndcDisplay": "00000-7002-21"
  },
  {
    "catalogCode": "IBUPROFEN_100_MG_PER_5_ML_SUSPENSION_BUVABLE_ORAL",
    "hcpcs": "J3490",
    "description": "Wave4 Ibuprofen 100 mg/5 mL",
    "billingUnitType": "tablet",
    "ndc11": "00000700222",
    "ndcDisplay": "00000-7002-22"
  },
  {
    "catalogCode": "PREDNISOLONE_15_MG_PER_5_ML_SIROP_ORAL",
    "hcpcs": "J3490",
    "description": "Wave4 Prednisolone 15 mg/5 mL",
    "billingUnitType": "tablet",
    "ndc11": "00000700223",
    "ndcDisplay": "00000-7002-23"
  },
  {
    "catalogCode": "ONDANSETRON_4_MG_ODT_COMPRIME_ORODISPERSIBLE_ORALE",
    "hcpcs": "J3490",
    "description": "Wave4 Ondansetron 4 mg ODT",
    "billingUnitType": "tablet",
    "ndc11": "00000700224",
    "ndcDisplay": "00000-7002-24"
  },
  {
    "catalogCode": "ONDANSETRON_4_MG_5_ML_SOLUTION_BUVABLE_ORALE",
    "hcpcs": "J3490",
    "description": "Wave4 Ondansetron 4 mg/5 mL",
    "billingUnitType": "tablet",
    "ndc11": "00000700225",
    "ndcDisplay": "00000-7002-25"
  },
  {
    "catalogCode": "PARACETAMOL_120_MG_PER_5_ML_SIROP_ORAL",
    "hcpcs": "J3490",
    "description": "Wave4 Acetaminophen 120 mg/5 mL",
    "billingUnitType": "tablet",
    "ndc11": "00000700226",
    "ndcDisplay": "00000-7002-26"
  },
  {
    "catalogCode": "PARACETAMOL_250_MG_SUPPOSITOIRE_SUPPOSITOIRE_RECTAL",
    "hcpcs": "J3490",
    "description": "Wave4 Acetaminophen 250 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000700227",
    "ndcDisplay": "00000-7002-27"
  }
];

if (BILLING_SPECS.length !== ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST.length) {
  throw new Error(
    `[wave4-billing] spec count ${BILLING_SPECS.length} != formulary ${ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST.length}`
  );
}

export const ENTERPRISE_WAVE4_ED_HOSPITAL_BILLING_MANIFEST: EnterpriseWave4EdHospitalBillingEntry[] = BILLING_SPECS;

export const ENTERPRISE_WAVE4_ED_HOSPITAL_BILLING_BY_CODE: Record<string, EnterpriseWave4EdHospitalBillingEntry> =
  Object.fromEntries(ENTERPRISE_WAVE4_ED_HOSPITAL_BILLING_MANIFEST.map((e) => [e.catalogCode, e]));
