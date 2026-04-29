/**
 * Review-only FDA NDC evidence for Medora medication catalog rows.
 *
 * These mappings are intentionally not wired into seeding or runtime behavior.
 * They capture product-level NDC evidence only; package-level NDC selection
 * remains a separate pharmacy/inventory decision.
 */

export type MedicationNdcCandidate = {
  productNdc: string;
  brandName: string;
  genericName: string;
  dosageForm: string;
  route: string[];
  activeIngredients: Array<{
    name: string;
    strength: string;
  }>;
  productType: "HUMAN PRESCRIPTION DRUG";
  listingExpirationDate?: string;
};

export type MedicationNdcMapping = {
  medoraCode: string;
  ndcCandidates: MedicationNdcCandidate[];
  confidence: "confirmed" | "review";
  notes: string;
};

export const MEDICATION_NDC_MAPPINGS: MedicationNdcMapping[] = [
  {
    medoraCode: "ROCURONIUM_10MG_ML_IV",
    ndcCandidates: [
      {
        productNdc: "71872-7349",
        brandName: "Rocuronium",
        genericName: "Rocuronium",
        dosageForm: "INJECTION, SOLUTION",
        route: ["INTRAVENOUS"],
        activeIngredients: [{ name: "ROCURONIUM BROMIDE", strength: "100 mg/10mL" }],
        productType: "HUMAN PRESCRIPTION DRUG",
        listingExpirationDate: "20261231",
      },
    ],
    confidence: "confirmed",
    notes: "Matches rocuronium 10 mg/mL IV injection; product-level NDC only, package NDC not selected.",
  },
  {
    medoraCode: "ETOMIDATE_2MG_ML_IV",
    ndcCandidates: [
      {
        productNdc: "65145-127",
        brandName: "Etomidate",
        genericName: "Etomidate",
        dosageForm: "INJECTION, SOLUTION",
        route: ["INTRAVENOUS"],
        activeIngredients: [{ name: "ETOMIDATE", strength: "2 mg/mL" }],
        productType: "HUMAN PRESCRIPTION DRUG",
        listingExpirationDate: "20271231",
      },
    ],
    confidence: "confirmed",
    notes: "Matches etomidate 2 mg/mL IV injection; product-level NDC only.",
  },
  {
    medoraCode: "KETAMINE_50MG_ML_INJECTABLE",
    ndcCandidates: [
      {
        productNdc: "65219-188",
        brandName: "ketamine hydrochloride",
        genericName: "ketamine hydrochloride",
        dosageForm: "INJECTION",
        route: ["INTRAMUSCULAR", "INTRAVENOUS"],
        activeIngredients: [{ name: "KETAMINE HYDROCHLORIDE", strength: "50 mg/mL" }],
        productType: "HUMAN PRESCRIPTION DRUG",
        listingExpirationDate: "20261231",
      },
    ],
    confidence: "confirmed",
    notes: "Matches ketamine 50 mg/mL injectable with IM/IV route support; product-level NDC only.",
  },
  {
    medoraCode: "NOREPINEPHRINE_4MG_4ML_IV",
    ndcCandidates: [
      {
        productNdc: "72603-180",
        brandName: "NOREPINEPHRINE BITARTRATE",
        genericName: "norepinephrine bitartrate",
        dosageForm: "INJECTION",
        route: ["INTRAVENOUS"],
        activeIngredients: [{ name: "NOREPINEPHRINE BITARTRATE", strength: "1 mg/mL" }],
        productType: "HUMAN PRESCRIPTION DRUG",
        listingExpirationDate: "20261231",
      },
    ],
    confidence: "confirmed",
    notes: "Matches norepinephrine 1 mg/mL concentration, compatible with 4 mg/4 mL seed row; premixed 4 mg/250 mL candidates were not selected.",
  },
  {
    medoraCode: "PIPERACILLIN_TAZOBACTAM_4_5G_IV",
    ndcCandidates: [
      {
        productNdc: "72572-418",
        brandName: "piperacillin and tazobactam",
        genericName: "piperacillin and tazobactam",
        dosageForm: "INJECTION, POWDER, FOR SOLUTION",
        route: ["INTRAVENOUS"],
        activeIngredients: [
          { name: "PIPERACILLIN SODIUM", strength: "4 g/20mL" },
          { name: "TAZOBACTAM SODIUM", strength: ".5 g/20mL" },
        ],
        productType: "HUMAN PRESCRIPTION DRUG",
        listingExpirationDate: "20261231",
      },
    ],
    confidence: "confirmed",
    notes: "Matches approved combination product piperacillin 4 g plus tazobactam 0.5 g IV; product-level NDC only.",
  },
  {
    medoraCode: "METOPROLOL_5MG_5ML_IV",
    ndcCandidates: [
      {
        productNdc: "36000-033",
        brandName: "Metoprolol",
        genericName: "metoprolol tartrate",
        dosageForm: "INJECTION",
        route: ["INTRAVENOUS"],
        activeIngredients: [{ name: "METOPROLOL TARTRATE", strength: "5 mg/5mL" }],
        productType: "HUMAN PRESCRIPTION DRUG",
        listingExpirationDate: "20261231",
      },
    ],
    confidence: "confirmed",
    notes: "Matches metoprolol tartrate 5 mg/5 mL IV injection; product-level NDC only.",
  },
  {
    medoraCode: "MORPHINE_10_MG_PER_ML_INJECTABLE_INJECTION",
    ndcCandidates: [
      {
        productNdc: "0641-6127",
        brandName: "Morphine Sulfate",
        genericName: "Morphine Sulfate",
        dosageForm: "INJECTION",
        route: ["INTRAVENOUS"],
        activeIngredients: [{ name: "MORPHINE SULFATE", strength: "10 mg/mL" }],
        productType: "HUMAN PRESCRIPTION DRUG",
        listingExpirationDate: "20261231",
      },
    ],
    confidence: "confirmed",
    notes: "Matches morphine sulfate 10 mg/mL injectable; controlled-substance handling remains separate from NDC identity review.",
  },
  {
    medoraCode: "CEFTRIAXONE_1_G_INJECTABLE_INJECTION",
    ndcCandidates: [
      {
        productNdc: "25021-106",
        brandName: "ceftriaxone",
        genericName: "ceftriaxone",
        dosageForm: "INJECTION, POWDER, FOR SOLUTION",
        route: ["INTRAMUSCULAR", "INTRAVENOUS"],
        activeIngredients: [{ name: "CEFTRIAXONE SODIUM", strength: "1 g/1" }],
        productType: "HUMAN PRESCRIPTION DRUG",
        listingExpirationDate: "20261231",
      },
    ],
    confidence: "confirmed",
    notes: "Matches ceftriaxone 1 g powder for IM/IV solution; product-level NDC only.",
  },
  {
    medoraCode: "CEFTRIAXONE_2_G_INJECTABLE_INJECTION",
    ndcCandidates: [
      {
        productNdc: "25021-107",
        brandName: "ceftriaxone",
        genericName: "ceftriaxone",
        dosageForm: "INJECTION, POWDER, FOR SOLUTION",
        route: ["INTRAMUSCULAR", "INTRAVENOUS"],
        activeIngredients: [{ name: "CEFTRIAXONE SODIUM", strength: "2 g/1" }],
        productType: "HUMAN PRESCRIPTION DRUG",
        listingExpirationDate: "20261231",
      },
    ],
    confidence: "confirmed",
    notes: "Matches ceftriaxone 2 g powder for IM/IV solution; product-level NDC only.",
  },
  {
    medoraCode: "PROPOFOL_10MG_ML_IV",
    ndcCandidates: [
      {
        productNdc: "16714-528",
        brandName: "propofol",
        genericName: "propofol",
        dosageForm: "INJECTION, EMULSION",
        route: ["INTRAVENOUS"],
        activeIngredients: [{ name: "PROPOFOL", strength: "10 mg/mL" }],
        productType: "HUMAN PRESCRIPTION DRUG",
        listingExpirationDate: "20261231",
      },
    ],
    confidence: "confirmed",
    notes: "Matches propofol 10 mg/mL IV emulsion; product-level NDC only.",
  },
  {
    medoraCode: "SUCCINYLCHOLINE_20MG_ML_IV",
    ndcCandidates: [
      {
        productNdc: "71872-7241",
        brandName: "Succinylcholine",
        genericName: "Succinylcholine",
        dosageForm: "INJECTION, SOLUTION",
        route: ["INTRAMUSCULAR", "INTRAVENOUS"],
        activeIngredients: [{ name: "SUCCINYLCHOLINE CHLORIDE", strength: "20 mg/mL" }],
        productType: "HUMAN PRESCRIPTION DRUG",
        listingExpirationDate: "20261231",
      },
    ],
    confidence: "confirmed",
    notes: "Matches succinylcholine 20 mg/mL IM/IV injection; product-level NDC only.",
  },
  {
    medoraCode: "FENTANYL_50MCG_ML_INJECTABLE",
    ndcCandidates: [
      {
        productNdc: "0409-9093",
        brandName: "FENTANYL CITRATE",
        genericName: "fentanyl citrate",
        dosageForm: "INJECTION, SOLUTION",
        route: ["INTRAMUSCULAR", "INTRAVENOUS"],
        activeIngredients: [{ name: "FENTANYL CITRATE", strength: "50 ug/mL" }],
        productType: "HUMAN PRESCRIPTION DRUG",
        listingExpirationDate: "20271231",
      },
    ],
    confidence: "confirmed",
    notes: "Matches fentanyl citrate 50 mcg/mL IM/IV injection; controlled-substance handling remains separate from NDC identity review.",
  },
  {
    medoraCode: "MIDAZOLAM_5MG_ML_INJECTABLE",
    ndcCandidates: [
      {
        productNdc: "0641-6190",
        brandName: "Midazolam",
        genericName: "Midazolam",
        dosageForm: "INJECTION",
        route: ["INTRAMUSCULAR", "INTRAVENOUS"],
        activeIngredients: [{ name: "MIDAZOLAM HYDROCHLORIDE", strength: "5 mg/mL" }],
        productType: "HUMAN PRESCRIPTION DRUG",
        listingExpirationDate: "20261231",
      },
    ],
    confidence: "confirmed",
    notes: "Matches midazolam 5 mg/mL IM/IV injection; product-level NDC only.",
  },
  {
    medoraCode: "HYDROMORPHONE_2MG_ML_INJECTABLE",
    ndcCandidates: [
      {
        productNdc: "76045-010",
        brandName: "Dilaudid",
        genericName: "Hydromorphone hydrochloride",
        dosageForm: "INJECTION, SOLUTION",
        route: ["INTRAMUSCULAR", "INTRAVENOUS", "SUBCUTANEOUS"],
        activeIngredients: [{ name: "HYDROMORPHONE HYDROCHLORIDE", strength: "2 mg/mL" }],
        productType: "HUMAN PRESCRIPTION DRUG",
        listingExpirationDate: "20261231",
      },
    ],
    confidence: "confirmed",
    notes: "Matches hydromorphone 2 mg/mL injectable; controlled-substance handling remains separate from NDC identity review.",
  },
  {
    medoraCode: "PHENYLEPHRINE_10MG_ML_IV",
    ndcCandidates: [
      {
        productNdc: "51662-1249",
        brandName: "PHENYLEPHRINE HCI",
        genericName: "PHENYLEPHRINE HCI",
        dosageForm: "INJECTION",
        route: ["INTRAVENOUS"],
        activeIngredients: [{ name: "PHENYLEPHRINE HYDROCHLORIDE", strength: "10 mg/mL" }],
        productType: "HUMAN PRESCRIPTION DRUG",
        listingExpirationDate: "20261231",
      },
    ],
    confidence: "confirmed",
    notes: "Matches phenylephrine 10 mg/mL IV injection; product-level NDC only.",
  },
  {
    medoraCode: "VASOPRESSIN_20UI_ML_IV",
    ndcCandidates: [
      {
        productNdc: "70121-1642",
        brandName: "vasopressin",
        genericName: "vasopressin",
        dosageForm: "INJECTION",
        route: ["INTRAVENOUS"],
        activeIngredients: [{ name: "VASOPRESSIN", strength: "20 [USP'U]/mL" }],
        productType: "HUMAN PRESCRIPTION DRUG",
        listingExpirationDate: "20261231",
      },
    ],
    confidence: "confirmed",
    notes: "Matches vasopressin 20 units/mL IV injection; product-level NDC only.",
  },
  {
    medoraCode: "DOPAMINE_400MG_250ML_IV",
    ndcCandidates: [
      {
        productNdc: "84549-007",
        brandName: "Dopamine Hydrochloride and Dextrose",
        genericName: "Dopamine Hydrochloride",
        dosageForm: "INJECTION, SOLUTION",
        route: ["INTRAVENOUS"],
        activeIngredients: [{ name: "DOPAMINE HYDROCHLORIDE", strength: "160 mg/100mL" }],
        productType: "HUMAN PRESCRIPTION DRUG",
        listingExpirationDate: "20261231",
      },
    ],
    confidence: "review",
    notes: "Ingredient, route, and dosage form match. Strength is concentration-compatible with 400 mg/250 mL, but the FDA product is a premix presentation, so keep for pharmacist review.",
  },
  {
    medoraCode: "DOBUTAMINE_250MG_20ML_IV",
    ndcCandidates: [
      {
        productNdc: "70436-203",
        brandName: "Dobutamine",
        genericName: "dobutamine",
        dosageForm: "INJECTION",
        route: ["INTRAVENOUS"],
        activeIngredients: [{ name: "DOBUTAMINE HYDROCHLORIDE", strength: "250 mg/20mL" }],
        productType: "HUMAN PRESCRIPTION DRUG",
        listingExpirationDate: "20271231",
      },
    ],
    confidence: "confirmed",
    notes: "Matches dobutamine 250 mg/20 mL IV product; product-level NDC only.",
  },
  {
    medoraCode: "SODIUM_BICARBONATE_8_4PCT_IV",
    ndcCandidates: [
      {
        productNdc: "80830-2305",
        brandName: "SODIUM BICARBONATE",
        genericName: "sodium bicarbonate",
        dosageForm: "INJECTION, SOLUTION",
        route: ["INTRAVENOUS"],
        activeIngredients: [{ name: "SODIUM BICARBONATE", strength: "84 mg/mL" }],
        productType: "HUMAN PRESCRIPTION DRUG",
        listingExpirationDate: "20271231",
      },
    ],
    confidence: "confirmed",
    notes: "Matches sodium bicarbonate 8.4% IV injection as 84 mg/mL; product-level NDC only.",
  },
  {
    medoraCode: "ADENOSINE_6MG_2ML_IV",
    ndcCandidates: [
      {
        productNdc: "67457-856",
        brandName: "Adenosine",
        genericName: "adenosine",
        dosageForm: "INJECTION, SOLUTION",
        route: ["INTRAVENOUS"],
        activeIngredients: [{ name: "ADENOSINE", strength: "3 mg/mL" }],
        productType: "HUMAN PRESCRIPTION DRUG",
        listingExpirationDate: "20261231",
      },
    ],
    confidence: "review",
    notes: "Ingredient, route, and dosage form match. Strength is concentration-compatible with 6 mg/2 mL, but the FDA product is listed as 3 mg/mL, so keep for pharmacist review.",
  },
  {
    medoraCode: "AMIODARONE_150MG_3ML_IV",
    ndcCandidates: [
      {
        productNdc: "55150-180",
        brandName: "Amiodarone Hydrochloride",
        genericName: "Amiodarone Hydrochloride",
        dosageForm: "INJECTION, SOLUTION",
        route: ["INTRAVENOUS"],
        activeIngredients: [{ name: "AMIODARONE HYDROCHLORIDE", strength: "150 mg/3mL" }],
        productType: "HUMAN PRESCRIPTION DRUG",
        listingExpirationDate: "20261231",
      },
    ],
    confidence: "confirmed",
    notes: "Matches amiodarone 150 mg/3 mL IV injection; product-level NDC only.",
  },
];
