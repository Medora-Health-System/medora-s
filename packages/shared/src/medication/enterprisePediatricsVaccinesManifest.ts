/**
 * MEDUI.MEDICATION.PEDIATRICS_PROVIDER_ORDERING_EXPANSION.1
 * Pediatric vaccine gap audit manifest (coverage classification only).
 */

export type PediatricsVaccineClassification = "READY" | "RESTRICTED_PEDS_REVIEW";

export type EnterprisePediatricsVaccineEntry = {
  vaccineId: string;
  labelEn: string;
  searchTokens: readonly string[];
  preferredCatalogCodes: readonly string[];
  classification: PediatricsVaccineClassification;
  rationale: string;
};

export const ENTERPRISE_PEDIATRICS_VACCINES_MANIFEST: EnterprisePediatricsVaccineEntry[] = [
  {
    vaccineId: "dtap",
    labelEn: "DTaP",
    searchTokens: ["dtap", "diphtheria tetanus pertussis"],
    preferredCatalogCodes: [],
    classification: "RESTRICTED_PEDS_REVIEW",
    rationale: "Pediatric DTaP series not yet in governed vaccine activation registry",
  },
  {
    vaccineId: "ipv",
    labelEn: "IPV",
    searchTokens: ["ipv", "polio vaccine", "inactivated poliovirus"],
    preferredCatalogCodes: [],
    classification: "RESTRICTED_PEDS_REVIEW",
    rationale: "Pediatric IPV series missing from catalog and billing certification",
  },
  {
    vaccineId: "hib",
    labelEn: "Hib",
    searchTokens: ["hib", "haemophilus influenzae type b"],
    preferredCatalogCodes: [],
    classification: "RESTRICTED_PEDS_REVIEW",
    rationale: "Hib conjugate vaccine not yet certified for provider ordering",
  },
  {
    vaccineId: "rotavirus",
    labelEn: "Rotavirus",
    searchTokens: ["rotavirus", "rotateq", "rotarix"],
    preferredCatalogCodes: [],
    classification: "RESTRICTED_PEDS_REVIEW",
    rationale: "Oral rotavirus vaccine requires pediatric vaccine governance review",
  },
  {
    vaccineId: "pcv13",
    labelEn: "PCV13",
    searchTokens: ["pcv13", "prevnar 13", "pneumococcal conjugate"],
    preferredCatalogCodes: ["PNEUMOCOCCAL_VACCINE_0_5_ML_INJECTABLE_INJECTABLEINTRAMUSCULAR"],
    classification: "RESTRICTED_PEDS_REVIEW",
    rationale: "Pneumococcal conjugate present for adults; pediatric PCV13/15 series requires peds review",
  },
  {
    vaccineId: "pcv15",
    labelEn: "PCV15",
    searchTokens: ["pcv15", "prevnar 15"],
    preferredCatalogCodes: [],
    classification: "RESTRICTED_PEDS_REVIEW",
    rationale: "PCV15 pediatric formulation not in catalog",
  },
  {
    vaccineId: "mmr",
    labelEn: "MMR",
    searchTokens: ["mmr", "measles mumps rubella"],
    preferredCatalogCodes: ["MMR_VACCINE_0_5_ML_INJECTABLE_INJECTABLEINTRAMUSCULAR"],
    classification: "READY",
    rationale: "MMR certified in enterprise wave-1 vaccine manifest",
  },
  {
    vaccineId: "varicella",
    labelEn: "Varicella",
    searchTokens: ["varicella", "chickenpox", "varivax"],
    preferredCatalogCodes: ["VARICELLA_VACCINE_0_5_ML_INJECTABLE_INJECTABLEINTRAMUSCULAR"],
    classification: "READY",
    rationale: "Varicella certified in enterprise wave-1 vaccine manifest",
  },
];

export const ENTERPRISE_PEDIATRICS_VACCINES_BY_ID = Object.fromEntries(
  ENTERPRISE_PEDIATRICS_VACCINES_MANIFEST.map((entry) => [entry.vaccineId, entry])
) as Record<string, EnterprisePediatricsVaccineEntry>;
