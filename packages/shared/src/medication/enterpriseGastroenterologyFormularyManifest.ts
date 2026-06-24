/**
 * MEDUI.MEDICATION.GASTROENTEROLOGY_PROVIDER_ORDERING_EXPANSION.1
 * Catalog remediation for gastroenterology medications missing from Wave / Haiti.
 */

type GastroenterologyFormularyEntry = {
  catalogCode: string;
  genericName: string;
  displayNameFr: string;
  displayNameEn: string;
  strength: string;
  dosageForm: string;
  route: string;
  therapeuticClass: string;
  bucket: "GASTROENTEROLOGY";
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

export const ENTERPRISE_GASTROENTEROLOGY_FORMULARY_MANIFEST: GastroenterologyFormularyEntry[] = [
  {
    catalogCode: "RIFAXIMIN_550_MG_COMPRIME_ORALE",
    genericName: "Rifaximin",
    displayNameFr: "Rifaximine",
    displayNameEn: "Rifaximin",
    strength: "550 mg",
    dosageForm: "comprimé",
    route: "orale",
    therapeuticClass: "Antibiotique intestinal",
    bucket: "GASTROENTEROLOGY",
    mode: "CREATE",
    aliases: [alias("Xifaxan", "en"), alias("Xifaxan", "fr"), alias("encéphalopathie hépatique", "fr")],
    searchTerms: ["rifaximin", "rifaximine", "hepatic encephalopathy", "encephalopathie hepatique", "550 mg"],
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
    billingClass: "THERAPEUTIC",
  },
  {
    catalogCode: "SENNA_8_6_MG_COMPRIME_ORALE",
    genericName: "Senna",
    displayNameFr: "Séné",
    displayNameEn: "Senna",
    strength: "8.6 mg",
    dosageForm: "comprimé",
    route: "orale",
    therapeuticClass: "Laxatif",
    bucket: "GASTROENTEROLOGY",
    mode: "CREATE",
    aliases: [alias("Senokot", "en"), alias("Senokot", "fr"), alias("séné", "fr")],
    searchTerms: ["senna", "sene", "senokot", "constipation", "laxative"],
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
    billingClass: "THERAPEUTIC",
  },
  {
    catalogCode: "BISACODYL_5_MG_COMPRIME_ORALE",
    genericName: "Bisacodyl",
    displayNameFr: "Bisacodyl",
    displayNameEn: "Bisacodyl",
    strength: "5 mg",
    dosageForm: "comprimé",
    route: "orale",
    therapeuticClass: "Laxatif",
    bucket: "GASTROENTEROLOGY",
    mode: "CREATE",
    aliases: [alias("Dulcolax", "en"), alias("Dulcolax", "fr")],
    searchTerms: ["bisacodyl", "dulcolax", "constipation", "laxative"],
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
    billingClass: "THERAPEUTIC",
  },
];

export const ENTERPRISE_GASTROENTEROLOGY_FORMULARY_BY_CODE = Object.fromEntries(
  ENTERPRISE_GASTROENTEROLOGY_FORMULARY_MANIFEST.map((entry) => [entry.catalogCode, entry])
) as Record<string, GastroenterologyFormularyEntry>;
