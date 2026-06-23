/**
 * MEDUI.MEDICATION.NEUROLOGY_AND_INFECTIOUS_DISEASE_PROVIDER_ORDERING_EXPANSION.1
 * Catalog remediation for missing neurology and infectious disease medications.
 */

type SpecialtyFormularyEntry = {
  catalogCode: string;
  genericName: string;
  displayNameFr: string;
  displayNameEn: string;
  strength: string;
  dosageForm: string;
  route: string;
  therapeuticClass: string;
  bucket: "NEUROLOGY" | "INFECTIOUS_DISEASE";
  mode: "CREATE";
  aliases: Array<{ text: string; language: "en" | "fr"; aliasType: "OTHER" }>;
  searchTerms: string[];
  governance: {
    isControlled: boolean;
    controlledSchedule: null;
    isHighAlert: boolean;
    requiresWitness: boolean;
    requiresDoubleSign: boolean;
    lasaGroupId: null;
    requiresPharmacyVerification: boolean;
    requiresSpecialtyReview?: boolean;
  };
  isEssential: false;
  administrationType: string;
  billingClass: string;
};

function alias(text: string, language: "en" | "fr") {
  return { text, language, aliasType: "OTHER" as const };
}

export const ENTERPRISE_NEUROLOGY_INFECTIOUS_DISEASE_FORMULARY_MANIFEST: SpecialtyFormularyEntry[] = [
  {
    catalogCode: "FOSPHEYTOIN_100_MG_PE_INJECTABLE_INTRAVEINEUSE",
    genericName: "Fosphenytoin",
    displayNameFr: "Fosphénytoïne",
    displayNameEn: "Fosphenytoin",
    strength: "100 mg PE/2 mL",
    dosageForm: "injectable",
    route: "intraveineuse",
    therapeuticClass: "Anticonvulsivant",
    bucket: "NEUROLOGY",
    mode: "CREATE",
    aliases: [alias("Cerebyx", "en"), alias("Cerebyx", "fr"), alias("fosphenytoin pe", "en")],
    searchTerms: ["fosphenytoin", "fosphenytoine", "100 mg pe", "intraveineuse", "cerebyx", "status epilepticus"],
    governance: {
      isControlled: false,
      controlledSchedule: null,
      isHighAlert: true,
      requiresWitness: false,
      requiresDoubleSign: false,
      lasaGroupId: null,
      requiresPharmacyVerification: true,
      requiresSpecialtyReview: true,
    },
    isEssential: false,
    administrationType: "IV",
    billingClass: "THERAPEUTIC",
  },
  {
    catalogCode: "LACOSAMIDE_200_MG_COMPRIME_ORALE",
    genericName: "Lacosamide",
    displayNameFr: "Lacosamide",
    displayNameEn: "Lacosamide",
    strength: "200 mg",
    dosageForm: "comprimé",
    route: "orale",
    therapeuticClass: "Anticonvulsivant",
    bucket: "NEUROLOGY",
    mode: "CREATE",
    aliases: [alias("Vimpat", "en"), alias("Vimpat", "fr")],
    searchTerms: ["lacosamide", "200 mg", "comprime", "orale", "vimpat", "anticonvulsivant"],
    governance: {
      isControlled: false,
      controlledSchedule: null,
      isHighAlert: true,
      requiresWitness: false,
      requiresDoubleSign: false,
      lasaGroupId: null,
      requiresPharmacyVerification: true,
      requiresSpecialtyReview: true,
    },
    isEssential: false,
    administrationType: "ORAL",
    billingClass: "DRUG_SUPPLY",
  },
  {
    catalogCode: "VANCOMYCIN_125_MG_COMPRIME_ORALE",
    genericName: "Vancomycin",
    displayNameFr: "Vancomycine",
    displayNameEn: "Vancomycin",
    strength: "125 mg",
    dosageForm: "gélule",
    route: "orale",
    therapeuticClass: "Antibiotique",
    bucket: "INFECTIOUS_DISEASE",
    mode: "CREATE",
    aliases: [alias("Vancocin capsule", "en"), alias("Vancocin gélule", "fr")],
    searchTerms: ["vancomycin", "vancomycine", "125 mg", "orale", "gelule", "c diff", "clostridium"],
    governance: {
      isControlled: false,
      controlledSchedule: null,
      isHighAlert: false,
      requiresWitness: false,
      requiresDoubleSign: false,
      lasaGroupId: null,
      requiresPharmacyVerification: false,
    },
    isEssential: false,
    administrationType: "ORAL",
    billingClass: "DRUG_SUPPLY",
  },
];

export const ENTERPRISE_NEUROLOGY_INFECTIOUS_DISEASE_FORMULARY_BY_CODE: Record<string, SpecialtyFormularyEntry> =
  Object.fromEntries(ENTERPRISE_NEUROLOGY_INFECTIOUS_DISEASE_FORMULARY_MANIFEST.map((entry) => [entry.catalogCode, entry]));
