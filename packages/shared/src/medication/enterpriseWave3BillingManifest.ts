/**
 * M1.7B — Enterprise Wave 3 billing manifest (aligned to formulary order).
 */

import { ENTERPRISE_WAVE3_FORMULARY_MANIFEST } from "./enterpriseWave3FormularyManifest.js";
import type { EnterpriseWave3BillingEntry } from "./enterpriseWave3Types.js";

const BILLING_SPECS = [
  {
    "catalogCode": "SEVELAMER_CARBONATE_800_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Sevelamer carbonate 800 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600001",
    "ndcDisplay": "00000-6000-01"
  },
  {
    "catalogCode": "CALCIUM_ACETATE_667_MG_GELULE_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Calcium acetate 667 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600002",
    "ndcDisplay": "00000-6000-02"
  },
  {
    "catalogCode": "CALCITRIOL_0_25_MCG_GELULE_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Calcitriol 0.25 mcg",
    "billingUnitType": "tablet",
    "ndc11": "00000600003",
    "ndcDisplay": "00000-6000-03"
  },
  {
    "catalogCode": "CINACALCET_30_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Cinacalcet 30 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600004",
    "ndcDisplay": "00000-6000-04"
  },
  {
    "catalogCode": "SODIUM_BICARBONATE_650_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Sodium bicarbonate 650 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600005",
    "ndcDisplay": "00000-6000-05"
  },
  {
    "catalogCode": "PATIROMER_8_4_G_POUDRE_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Patiromer 8.4 g",
    "billingUnitType": "tablet",
    "ndc11": "00000600006",
    "ndcDisplay": "00000-6000-06"
  },
  {
    "catalogCode": "SODIUM_ZIRCONIUM_CYCLOSILICATE_10_G_POUDRE_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Sodium zirconium cyclosilicate 10 g",
    "billingUnitType": "tablet",
    "ndc11": "00000600007",
    "ndcDisplay": "00000-6000-07"
  },
  {
    "catalogCode": "EPOETIN_ALFA_4000_UI_ML_INJECTABLE_SOUS_CUTANEE",
    "hcpcs": "J3490",
    "description": "Wave3 Epoetin alfa 4000 UI/mL",
    "billingUnitType": "mg",
    "ndc11": "00000600008",
    "ndcDisplay": "00000-6000-08"
  },
  {
    "catalogCode": "DARBEPOETIN_ALFA_40_MCG_0_4_ML_INJECTABLE_SOUS_CUTANEE",
    "hcpcs": "J3490",
    "description": "Wave3 Darbepoetin alfa 40 mcg/0.4 mL",
    "billingUnitType": "mg",
    "ndc11": "00000600009",
    "ndcDisplay": "00000-6000-09"
  },
  {
    "catalogCode": "IRON_SUCROSE_20_MG_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave3 Iron sucrose 20 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000600010",
    "ndcDisplay": "00000-6000-10"
  },
  {
    "catalogCode": "FERRIC_CARBOXYMALTOSE_750_MG_15_ML_INJECTABLE_INTRAVEINEUSE",
    "hcpcs": "J3490",
    "description": "Wave3 Ferric carboxymaltose 750 mg/15 mL",
    "billingUnitType": "mg",
    "ndc11": "00000600011",
    "ndcDisplay": "00000-6000-11"
  },
  {
    "catalogCode": "TORSEMIDE_20_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Torsemide 20 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600012",
    "ndcDisplay": "00000-6000-12"
  },
  {
    "catalogCode": "METOLAZONE_2_5_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Metolazone 2.5 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600013",
    "ndcDisplay": "00000-6000-13"
  },
  {
    "catalogCode": "BUMETANIDE_1_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Bumetanide 1 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600014",
    "ndcDisplay": "00000-6000-14"
  },
  {
    "catalogCode": "SODIUM_POLYSTYRENE_SULFONATE_15_G_POUDRE_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Sodium polystyrene sulfonate 15 g",
    "billingUnitType": "tablet",
    "ndc11": "00000600015",
    "ndcDisplay": "00000-6000-15"
  },
  {
    "catalogCode": "ERGOCALCIFEROL_50000_IU_GELULE_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Ergocalciferol 50000 IU",
    "billingUnitType": "tablet",
    "ndc11": "00000600016",
    "ndcDisplay": "00000-6000-16"
  },
  {
    "catalogCode": "CLOBETASOL_PROPIONATE_0_05_CREME_TOPIQUE",
    "hcpcs": "J3490",
    "description": "Wave3 Clobetasol propionate 0.05%",
    "billingUnitType": "tablet",
    "ndc11": "00000600017",
    "ndcDisplay": "00000-6000-17"
  },
  {
    "catalogCode": "BETAMETHASONE_VALERATE_0_1_CREME_TOPIQUE",
    "hcpcs": "J3490",
    "description": "Wave3 Betamethasone valerate 0.1%",
    "billingUnitType": "tablet",
    "ndc11": "00000600018",
    "ndcDisplay": "00000-6000-18"
  },
  {
    "catalogCode": "TRIAMCINOLONE_ACETONIDE_0_1_CREME_TOPIQUE",
    "hcpcs": "J3490",
    "description": "Wave3 Triamcinolone acetonide 0.1%",
    "billingUnitType": "tablet",
    "ndc11": "00000600019",
    "ndcDisplay": "00000-6000-19"
  },
  {
    "catalogCode": "HYDROCORTISONE_2_5_CREME_TOPIQUE",
    "hcpcs": "J3490",
    "description": "Wave3 Hydrocortisone 2.5%",
    "billingUnitType": "tablet",
    "ndc11": "00000600020",
    "ndcDisplay": "00000-6000-20"
  },
  {
    "catalogCode": "TACROLIMUS_0_1_ONGUENT_TOPIQUE",
    "hcpcs": "J3490",
    "description": "Wave3 Tacrolimus 0.1%",
    "billingUnitType": "tablet",
    "ndc11": "00000600021",
    "ndcDisplay": "00000-6000-21"
  },
  {
    "catalogCode": "PIMECROLIMUS_1_CREME_TOPIQUE",
    "hcpcs": "J3490",
    "description": "Wave3 Pimecrolimus 1%",
    "billingUnitType": "tablet",
    "ndc11": "00000600022",
    "ndcDisplay": "00000-6000-22"
  },
  {
    "catalogCode": "MUPIROCIN_2_ONGUENT_TOPIQUE",
    "hcpcs": "J3490",
    "description": "Wave3 Mupirocin 2%",
    "billingUnitType": "tablet",
    "ndc11": "00000600023",
    "ndcDisplay": "00000-6000-23"
  },
  {
    "catalogCode": "KETOCONAZOLE_2_CREME_TOPIQUE",
    "hcpcs": "J3490",
    "description": "Wave3 Ketoconazole 2%",
    "billingUnitType": "tablet",
    "ndc11": "00000600024",
    "ndcDisplay": "00000-6000-24"
  },
  {
    "catalogCode": "TERBINAFINE_250_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Terbinafine 250 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600025",
    "ndcDisplay": "00000-6000-25"
  },
  {
    "catalogCode": "FLUCONAZOLE_150_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Fluconazole 150 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600026",
    "ndcDisplay": "00000-6000-26"
  },
  {
    "catalogCode": "DOXYCYCLINE_100_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Doxycycline 100 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600027",
    "ndcDisplay": "00000-6000-27"
  },
  {
    "catalogCode": "ISOTRETINOIN_20_MG_GELULE_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Isotretinoin 20 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600028",
    "ndcDisplay": "00000-6000-28"
  },
  {
    "catalogCode": "BENZOYL_PEROXIDE_5_GEL_TOPIQUE",
    "hcpcs": "J3490",
    "description": "Wave3 Benzoyl peroxide 5%",
    "billingUnitType": "tablet",
    "ndc11": "00000600029",
    "ndcDisplay": "00000-6000-29"
  },
  {
    "catalogCode": "ADAPALENE_0_1_GEL_TOPIQUE",
    "hcpcs": "J3490",
    "description": "Wave3 Adapalene 0.1%",
    "billingUnitType": "tablet",
    "ndc11": "00000600030",
    "ndcDisplay": "00000-6000-30"
  },
  {
    "catalogCode": "TRETINOIN_0_025_CREME_TOPIQUE",
    "hcpcs": "J3490",
    "description": "Wave3 Tretinoin 0.025%",
    "billingUnitType": "tablet",
    "ndc11": "00000600031",
    "ndcDisplay": "00000-6000-31"
  },
  {
    "catalogCode": "CLINDAMYCIN_1_GEL_TOPIQUE",
    "hcpcs": "J3490",
    "description": "Wave3 Clindamycin 1%",
    "billingUnitType": "tablet",
    "ndc11": "00000600032",
    "ndcDisplay": "00000-6000-32"
  },
  {
    "catalogCode": "PERMETHRIN_5_CREME_TOPIQUE",
    "hcpcs": "J3490",
    "description": "Wave3 Permethrin 5%",
    "billingUnitType": "tablet",
    "ndc11": "00000600033",
    "ndcDisplay": "00000-6000-33"
  },
  {
    "catalogCode": "SILVER_SULFADIAZINE_1_CREME_TOPIQUE",
    "hcpcs": "J3490",
    "description": "Wave3 Silver sulfadiazine 1%",
    "billingUnitType": "tablet",
    "ndc11": "00000600034",
    "ndcDisplay": "00000-6000-34"
  },
  {
    "catalogCode": "CLOTRIMAZOLE_1_CREME_TOPIQUE",
    "hcpcs": "J3490",
    "description": "Wave3 Clotrimazole 1%",
    "billingUnitType": "tablet",
    "ndc11": "00000600035",
    "ndcDisplay": "00000-6000-35"
  },
  {
    "catalogCode": "HYDROCORTISONE_1_CREME_TOPIQUE",
    "hcpcs": "J3490",
    "description": "Wave3 Hydrocortisone 1%",
    "billingUnitType": "tablet",
    "ndc11": "00000600036",
    "ndcDisplay": "00000-6000-36"
  },
  {
    "catalogCode": "METHOTREXATE_2_5_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Methotrexate 2.5 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600037",
    "ndcDisplay": "00000-6000-37"
  },
  {
    "catalogCode": "HYDROXYCHLOROQUINE_200_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Hydroxychloroquine 200 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600038",
    "ndcDisplay": "00000-6000-38"
  },
  {
    "catalogCode": "SULFASALAZINE_500_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Sulfasalazine 500 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600039",
    "ndcDisplay": "00000-6000-39"
  },
  {
    "catalogCode": "LEFLUNOMIDE_20_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Leflunomide 20 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600040",
    "ndcDisplay": "00000-6000-40"
  },
  {
    "catalogCode": "METHYLPREDNISOLONE_4_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Methylprednisolone 4 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600041",
    "ndcDisplay": "00000-6000-41"
  },
  {
    "catalogCode": "FEBUXOSTAT_40_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Febuxostat 40 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600042",
    "ndcDisplay": "00000-6000-42"
  },
  {
    "catalogCode": "PREDNISONE_10_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Prednisone 10 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600043",
    "ndcDisplay": "00000-6000-43"
  },
  {
    "catalogCode": "ETANERCEPT_50_MG_ML_INJECTABLE_SOUS_CUTANEE",
    "hcpcs": "J3490",
    "description": "Wave3 Etanercept 50 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000600044",
    "ndcDisplay": "00000-6000-44"
  },
  {
    "catalogCode": "ADALIMUMAB_40_MG_0_8_ML_INJECTABLE_SOUS_CUTANEE",
    "hcpcs": "J3490",
    "description": "Wave3 Adalimumab 40 mg/0.8 mL",
    "billingUnitType": "mg",
    "ndc11": "00000600045",
    "ndcDisplay": "00000-6000-45"
  },
  {
    "catalogCode": "COLCHICINE_0_6_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Colchicine 0.6 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600046",
    "ndcDisplay": "00000-6000-46"
  },
  {
    "catalogCode": "ALLOPURINOL_300_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Allopurinol 300 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600047",
    "ndcDisplay": "00000-6000-47"
  },
  {
    "catalogCode": "INDOMETHACIN_25_MG_GELULE_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Indomethacin 25 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600048",
    "ndcDisplay": "00000-6000-48"
  },
  {
    "catalogCode": "AZATHIOPRINE_50_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Azathioprine 50 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600049",
    "ndcDisplay": "00000-6000-49"
  },
  {
    "catalogCode": "LAMOTRIGINE_100_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Lamotrigine 100 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600050",
    "ndcDisplay": "00000-6000-50"
  },
  {
    "catalogCode": "TOPIRAMATE_25_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Topiramate 25 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600051",
    "ndcDisplay": "00000-6000-51"
  },
  {
    "catalogCode": "CARBAMAZEPINE_200_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Carbamazepine 200 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600052",
    "ndcDisplay": "00000-6000-52"
  },
  {
    "catalogCode": "VALPROIC_ACID_500_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Valproic acid 500 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600053",
    "ndcDisplay": "00000-6000-53"
  },
  {
    "catalogCode": "PREGABALIN_75_MG_GELULE_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Pregabalin 75 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600054",
    "ndcDisplay": "00000-6000-54"
  },
  {
    "catalogCode": "ROPINIROLE_0_25_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Ropinirole 0.25 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600055",
    "ndcDisplay": "00000-6000-55"
  },
  {
    "catalogCode": "PRAMIPEXOLE_0_125_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Pramipexole 0.125 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600056",
    "ndcDisplay": "00000-6000-56"
  },
  {
    "catalogCode": "DONEPEZIL_5_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Donepezil 5 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600057",
    "ndcDisplay": "00000-6000-57"
  },
  {
    "catalogCode": "MEMANTINE_10_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Memantine 10 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600058",
    "ndcDisplay": "00000-6000-58"
  },
  {
    "catalogCode": "OXCARBAZEPINE_300_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Oxcarbazepine 300 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600059",
    "ndcDisplay": "00000-6000-59"
  },
  {
    "catalogCode": "PHENYTOIN_100_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Phenytoin 125 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600060",
    "ndcDisplay": "00000-6000-60"
  },
  {
    "catalogCode": "LEVETIRACETAM_750_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Levetiracetam 750 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600061",
    "ndcDisplay": "00000-6000-61"
  },
  {
    "catalogCode": "GABAPENTIN_600_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Gabapentin 600 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600062",
    "ndcDisplay": "00000-6000-62"
  },
  {
    "catalogCode": "BACLOFEN_10_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Baclofen 10 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600063",
    "ndcDisplay": "00000-6000-63"
  },
  {
    "catalogCode": "ZONISAMIDE_100_MG_GELULE_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Zonisamide 100 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600064",
    "ndcDisplay": "00000-6000-64"
  },
  {
    "catalogCode": "CLONAZEPAM_0_5_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Clonazepam 0.5 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600065",
    "ndcDisplay": "00000-6000-65"
  },
  {
    "catalogCode": "SERTRALINE_50_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Sertraline 50 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600066",
    "ndcDisplay": "00000-6000-66"
  },
  {
    "catalogCode": "FLUOXETINE_20_MG_GELULE_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Fluoxetine 20 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600067",
    "ndcDisplay": "00000-6000-67"
  },
  {
    "catalogCode": "ESCITALOPRAM_10_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Escitalopram 10 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600068",
    "ndcDisplay": "00000-6000-68"
  },
  {
    "catalogCode": "CITALOPRAM_20_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Citalopram 20 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600069",
    "ndcDisplay": "00000-6000-69"
  },
  {
    "catalogCode": "PAROXETINE_20_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Paroxetine 20 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600070",
    "ndcDisplay": "00000-6000-70"
  },
  {
    "catalogCode": "VENLAFAXINE_75_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Venlafaxine 75 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600071",
    "ndcDisplay": "00000-6000-71"
  },
  {
    "catalogCode": "DULOXETINE_30_MG_GELULE_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Duloxetine 30 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600072",
    "ndcDisplay": "00000-6000-72"
  },
  {
    "catalogCode": "BUPROPION_150_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Bupropion 150 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600073",
    "ndcDisplay": "00000-6000-73"
  },
  {
    "catalogCode": "MIRTAZAPINE_15_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Mirtazapine 15 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600074",
    "ndcDisplay": "00000-6000-74"
  },
  {
    "catalogCode": "OLANZAPINE_5_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Olanzapine 5 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600075",
    "ndcDisplay": "00000-6000-75"
  },
  {
    "catalogCode": "RISPERIDONE_1_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Risperidone 1 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600076",
    "ndcDisplay": "00000-6000-76"
  },
  {
    "catalogCode": "HALOPERIDOL_2_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Haloperidol 2 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600077",
    "ndcDisplay": "00000-6000-77"
  },
  {
    "catalogCode": "CLOZAPINE_25_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Clozapine 25 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600078",
    "ndcDisplay": "00000-6000-78"
  },
  {
    "catalogCode": "LORAZEPAM_0_5_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Lorazepam 0.5 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600079",
    "ndcDisplay": "00000-6000-79"
  },
  {
    "catalogCode": "METHYLPHENIDATE_10_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Methylphenidate 10 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600080",
    "ndcDisplay": "00000-6000-80"
  },
  {
    "catalogCode": "QUETIAPINE_100_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Quetiapine 100 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600081",
    "ndcDisplay": "00000-6000-81"
  },
  {
    "catalogCode": "ARIPIPRAZOLE_10_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Aripiprazole 10 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600082",
    "ndcDisplay": "00000-6000-82"
  },
  {
    "catalogCode": "LITHIUM_CARBONATE_450_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Lithium carbonate 450 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600083",
    "ndcDisplay": "00000-6000-83"
  },
  {
    "catalogCode": "CHLORPROMAZINE_25_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Chlorpromazine 25 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600084",
    "ndcDisplay": "00000-6000-84"
  },
  {
    "catalogCode": "FLUVOXAMINE_50_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Fluvoxamine 50 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600085",
    "ndcDisplay": "00000-6000-85"
  },
  {
    "catalogCode": "BUDESONIDE_FORMOTEROL_160_4_5_MCG_INHALATEUR_INHALEE",
    "hcpcs": "J3490",
    "description": "Wave3 Budesonide formoterol 160/4.5 mcg",
    "billingUnitType": "tablet",
    "ndc11": "00000600086",
    "ndcDisplay": "00000-6000-86"
  },
  {
    "catalogCode": "FLUTICASONE_UMECLIDINIUM_VILANTEROL_100_62_5_25_MCG_INHALATEUR_INHALEE",
    "hcpcs": "J3490",
    "description": "Wave3 Fluticasone umeclidinium vilanterol 100/62.5/25 mcg",
    "billingUnitType": "tablet",
    "ndc11": "00000600087",
    "ndcDisplay": "00000-6000-87"
  },
  {
    "catalogCode": "TIOTROPIUM_18_MCG_INHALATEUR_INHALEE",
    "hcpcs": "J3490",
    "description": "Wave3 Tiotropium 18 mcg",
    "billingUnitType": "tablet",
    "ndc11": "00000600088",
    "ndcDisplay": "00000-6000-88"
  },
  {
    "catalogCode": "IPRATROPIUM_ALBUTEROL_0_5_3_MG_SOLUTION_DE_NEBULISATION_INHALEE",
    "hcpcs": "J3490",
    "description": "Wave3 Ipratropium albuterol 0.5/3 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600089",
    "ndcDisplay": "00000-6000-89"
  },
  {
    "catalogCode": "ACETYLCYSTEINE_20_SOLUTION_DE_NEBULISATION_INHALEE",
    "hcpcs": "J3490",
    "description": "Wave3 Acetylcysteine 20%",
    "billingUnitType": "tablet",
    "ndc11": "00000600090",
    "ndcDisplay": "00000-6000-90"
  },
  {
    "catalogCode": "SODIUM_CHLORIDE_3_SOLUTION_DE_NEBULISATION_INHALEE",
    "hcpcs": "J3490",
    "description": "Wave3 Sodium chloride 3%",
    "billingUnitType": "tablet",
    "ndc11": "00000600091",
    "ndcDisplay": "00000-6000-91"
  },
  {
    "catalogCode": "THEOPHYLLINE_300_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Theophylline 300 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600092",
    "ndcDisplay": "00000-6000-92"
  },
  {
    "catalogCode": "ROFLUMILAST_500_MCG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Roflumilast 500 mcg",
    "billingUnitType": "tablet",
    "ndc11": "00000600093",
    "ndcDisplay": "00000-6000-93"
  },
  {
    "catalogCode": "CROMOLYN_SODIUM_10_MG_2_ML_SOLUTION_DE_NEBULISATION_INHALEE",
    "hcpcs": "J3490",
    "description": "Wave3 Cromolyn sodium 10 mg/2 mL",
    "billingUnitType": "tablet",
    "ndc11": "00000600094",
    "ndcDisplay": "00000-6000-94"
  },
  {
    "catalogCode": "FLUTICASONE_SALMETEROL_100_50_MCG_INHALATEUR_INHALEE",
    "hcpcs": "J3490",
    "description": "Wave3 Fluticasone salmeterol 100/50 mcg",
    "billingUnitType": "tablet",
    "ndc11": "00000600095",
    "ndcDisplay": "00000-6000-95"
  },
  {
    "catalogCode": "BUDESONIDE_0_5_MG_2_ML_SUSPENSION_POUR_NEBULISATION_INHALEE",
    "hcpcs": "J3490",
    "description": "Wave3 Budesonide 0.5 mg/2 mL",
    "billingUnitType": "tablet",
    "ndc11": "00000600096",
    "ndcDisplay": "00000-6000-96"
  },
  {
    "catalogCode": "FLUTICASONE_50_MCG_DOSE_SPRAY_NASAL_NASALE",
    "hcpcs": "J3490",
    "description": "Wave3 Fluticasone 50 mcg/dose",
    "billingUnitType": "tablet",
    "ndc11": "00000600097",
    "ndcDisplay": "00000-6000-97"
  },
  {
    "catalogCode": "GLYCOPYRROLATE_15_MCG_INHALATEUR_INHALEE",
    "hcpcs": "J3490",
    "description": "Wave3 Glycopyrrolate 15 mcg",
    "billingUnitType": "tablet",
    "ndc11": "00000600098",
    "ndcDisplay": "00000-6000-98"
  },
  {
    "catalogCode": "DEXAMETHASONE_0_4_MG_2_ML_SOLUTION_DE_NEBULISATION_INHALEE",
    "hcpcs": "J3490",
    "description": "Wave3 Dexamethasone 0.4 mg/2 mL",
    "billingUnitType": "tablet",
    "ndc11": "00000600099",
    "ndcDisplay": "00000-6000-99"
  },
  {
    "catalogCode": "INSULIN_DETEMIR_100_UI_ML_INJECTABLE_SOUS_CUTANEE",
    "hcpcs": "J3490",
    "description": "Wave3 Insulin detemir 100 UI/mL",
    "billingUnitType": "mg",
    "ndc11": "00000600100",
    "ndcDisplay": "00000-6001-00"
  },
  {
    "catalogCode": "INSULIN_ASPART_100_UI_ML_INJECTABLE_SOUS_CUTANEE",
    "hcpcs": "J3490",
    "description": "Wave3 Insulin aspart 100 UI/mL",
    "billingUnitType": "mg",
    "ndc11": "00000600101",
    "ndcDisplay": "00000-6001-01"
  },
  {
    "catalogCode": "SEMAGLUTIDE_0_25_MG_INJECTABLE_SOUS_CUTANEE",
    "hcpcs": "J3490",
    "description": "Wave3 Semaglutide 0.25 mg",
    "billingUnitType": "mg",
    "ndc11": "00000600102",
    "ndcDisplay": "00000-6001-02"
  },
  {
    "catalogCode": "TIRZEPATIDE_2_5_MG_INJECTABLE_SOUS_CUTANEE",
    "hcpcs": "J3490",
    "description": "Wave3 Tirzepatide 2.5 mg",
    "billingUnitType": "mg",
    "ndc11": "00000600103",
    "ndcDisplay": "00000-6001-03"
  },
  {
    "catalogCode": "EMPAGLIFLOZIN_10_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Empagliflozin 10 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600104",
    "ndcDisplay": "00000-6001-04"
  },
  {
    "catalogCode": "DAPAGLIFLOZIN_10_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Dapagliflozin 10 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600105",
    "ndcDisplay": "00000-6001-05"
  },
  {
    "catalogCode": "CANAGLIFLOZIN_100_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Canagliflozin 100 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600106",
    "ndcDisplay": "00000-6001-06"
  },
  {
    "catalogCode": "REPAGLINIDE_1_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Repaglinide 1 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600107",
    "ndcDisplay": "00000-6001-07"
  },
  {
    "catalogCode": "GLIPIZIDE_5_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Glipizide 5 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600108",
    "ndcDisplay": "00000-6001-08"
  },
  {
    "catalogCode": "LIRAGLUTIDE_6_MG_ML_INJECTABLE_SOUS_CUTANEE",
    "hcpcs": "J3490",
    "description": "Wave3 Liraglutide 6 mg/mL",
    "billingUnitType": "mg",
    "ndc11": "00000600109",
    "ndcDisplay": "00000-6001-09"
  },
  {
    "catalogCode": "METFORMIN_500_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Metformin 500 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600110",
    "ndcDisplay": "00000-6001-10"
  },
  {
    "catalogCode": "INSULIN_GLARGINE_300_UI_ML_INJECTABLE_SOUS_CUTANEE",
    "hcpcs": "J3490",
    "description": "Wave3 Insulin glargine 300 UI/mL",
    "billingUnitType": "mg",
    "ndc11": "00000600111",
    "ndcDisplay": "00000-6001-11"
  },
  {
    "catalogCode": "INSULIN_LISPRO_200_UI_ML_INJECTABLE_SOUS_CUTANEE",
    "hcpcs": "J3490",
    "description": "Wave3 Insulin lispro 200 UI/mL",
    "billingUnitType": "mg",
    "ndc11": "00000600112",
    "ndcDisplay": "00000-6001-12"
  },
  {
    "catalogCode": "GLIMEPIRIDE_4_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Glimepiride 4 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600113",
    "ndcDisplay": "00000-6001-13"
  },
  {
    "catalogCode": "PIOGLITAZONE_30_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Pioglitazone 30 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600114",
    "ndcDisplay": "00000-6001-14"
  },
  {
    "catalogCode": "SITAGLIPTIN_50_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Sitagliptin 50 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600115",
    "ndcDisplay": "00000-6001-15"
  },
  {
    "catalogCode": "GLYBURIDE_2_5_MG_COMPRIME_ORALE",
    "hcpcs": "J3490",
    "description": "Wave3 Glyburide 2.5 mg",
    "billingUnitType": "tablet",
    "ndc11": "00000600116",
    "ndcDisplay": "00000-6001-16"
  }
];

if (BILLING_SPECS.length !== ENTERPRISE_WAVE3_FORMULARY_MANIFEST.length) {
  throw new Error(
    `[wave3-billing] spec count ${BILLING_SPECS.length} != formulary ${ENTERPRISE_WAVE3_FORMULARY_MANIFEST.length}`
  );
}

export const ENTERPRISE_WAVE3_BILLING_MANIFEST: EnterpriseWave3BillingEntry[] = BILLING_SPECS;

export const ENTERPRISE_WAVE3_BILLING_BY_CODE: Record<string, EnterpriseWave3BillingEntry> =
  Object.fromEntries(ENTERPRISE_WAVE3_BILLING_MANIFEST.map((e) => [e.catalogCode, e]));
