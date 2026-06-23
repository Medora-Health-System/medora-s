/**
 * MEDUI.MEDICATION.CARDIOLOGY_PROVIDER_ORDERING_EXPANSION.1
 * Cardiology formulary catalog remediation — inactive until certified activation.
 */

type CardiologyFormularyEntry = {
  catalogCode: string;
  genericName: string;
  displayNameFr: string;
  displayNameEn: string;
  strength: string;
  dosageForm: string;
  route: string;
  therapeuticClass: string;
  bucket: "CARDIOLOGY";
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

export const ENTERPRISE_CARDIOLOGY_FORMULARY_MANIFEST: CardiologyFormularyEntry[] = [
  {
    catalogCode: "SACUBITRIL_VALSARTAN_24_26_MG_COMPRIME_ORALE",
    genericName: "Sacubitril/Valsartan",
    displayNameFr: "Sacubitril/Valsartan",
    displayNameEn: "Sacubitril/Valsartan",
    strength: "24/26 mg",
    dosageForm: "comprimé",
    route: "orale",
    therapeuticClass: "Insuffisance cardiaque",
    bucket: "CARDIOLOGY",
    mode: "CREATE",
    aliases: [alias("Entresto 24/26", "en"), alias("Entresto 24/26", "fr")],
    searchTerms: ["sacubitril", "valsartan", "entresto", "24/26", "heart failure"],
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
    catalogCode: "SACUBITRIL_VALSARTAN_49_51_MG_COMPRIME_ORALE",
    genericName: "Sacubitril/Valsartan",
    displayNameFr: "Sacubitril/Valsartan",
    displayNameEn: "Sacubitril/Valsartan",
    strength: "49/51 mg",
    dosageForm: "comprimé",
    route: "orale",
    therapeuticClass: "Insuffisance cardiaque",
    bucket: "CARDIOLOGY",
    mode: "CREATE",
    aliases: [alias("Entresto 49/51", "en"), alias("Entresto 49/51", "fr")],
    searchTerms: ["sacubitril", "valsartan", "entresto", "49/51", "heart failure"],
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
    catalogCode: "BUMETANIDE_1_MG_ML_INJECTABLE_INTRAVEINEUSE",
    genericName: "Bumetanide",
    displayNameFr: "Bumétanide",
    displayNameEn: "Bumetanide",
    strength: "1 mg/mL",
    dosageForm: "injectable",
    route: "intraveineuse",
    therapeuticClass: "Diurétique",
    bucket: "CARDIOLOGY",
    mode: "CREATE",
    aliases: [alias("Bumex IV", "en"), alias("Bumex IV", "fr")],
    searchTerms: ["bumetanide", "bumetamide", "1 mg/ml", "intraveineuse", "diuretic"],
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
    administrationType: "IV",
    billingClass: "THERAPEUTIC",
  },
  {
    catalogCode: "NITROGLYCERIN_0_4_MG_COMPRIME_SUBLINGUAL_CARDIOLOGY",
    genericName: "Nitroglycerin",
    displayNameFr: "Nitroglycérine",
    displayNameEn: "Nitroglycerin",
    strength: "0.4 mg",
    dosageForm: "comprimé sublingual",
    route: "sublinguale",
    therapeuticClass: "Antiangineux",
    bucket: "CARDIOLOGY",
    mode: "CREATE",
    aliases: [alias("Nitrostat", "en"), alias("Nitrostat", "fr")],
    searchTerms: ["nitroglycerin", "nitroglycerine", "0.4 mg", "sublingual", "nitrostat"],
    governance: {
      isControlled: false,
      controlledSchedule: null,
      isHighAlert: true,
      requiresWitness: false,
      requiresDoubleSign: false,
      lasaGroupId: null,
      requiresPharmacyVerification: false,
    },
    isEssential: false,
    administrationType: "ORAL",
    billingClass: "DRUG_SUPPLY",
  },
  {
    catalogCode: "FUROSEMIDE_40_MG_4_ML_INJECTABLE_INTRAVEINEUSE",
    genericName: "Furosemide",
    displayNameFr: "Furosémide",
    displayNameEn: "Furosemide",
    strength: "40 mg/4 mL",
    dosageForm: "injectable",
    route: "intraveineuse",
    therapeuticClass: "Diurétique",
    bucket: "CARDIOLOGY",
    mode: "CREATE",
    aliases: [alias("Lasix IV", "en"), alias("Lasix IV", "fr")],
    searchTerms: ["furosemide", "40 mg", "intraveineuse", "lasix", "diuretic"],
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
    administrationType: "IV",
    billingClass: "THERAPEUTIC",
  },
];

export const ENTERPRISE_CARDIOLOGY_FORMULARY_BY_CODE: Record<string, CardiologyFormularyEntry> =
  Object.fromEntries(ENTERPRISE_CARDIOLOGY_FORMULARY_MANIFEST.map((entry) => [entry.catalogCode, entry]));
