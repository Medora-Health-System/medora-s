/**
 * MEDUI.MEDICATION.SURGERY_PERIOPERATIVE_PROVIDER_ORDERING_EXPANSION.1
 * Catalog remediation for perioperative medications missing from Wave / Haiti.
 */

type SurgeryPerioperativeFormularyEntry = {
  catalogCode: string;
  genericName: string;
  displayNameFr: string;
  displayNameEn: string;
  strength: string;
  dosageForm: string;
  route: string;
  therapeuticClass: string;
  bucket: "SURGERY_PERIOPERATIVE";
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

export const ENTERPRISE_SURGERY_PERIOPERATIVE_FORMULARY_MANIFEST: SurgeryPerioperativeFormularyEntry[] = [
  {
    catalogCode: "CEFOXITIN_2_G_INJECTABLE_INTRAVEINEUSE",
    genericName: "Cefoxitin",
    displayNameFr: "Céfoxitine",
    displayNameEn: "Cefoxitin",
    strength: "2 g",
    dosageForm: "poudre injectable",
    route: "intraveineuse",
    therapeuticClass: "Antibiotique",
    bucket: "SURGERY_PERIOPERATIVE",
    mode: "CREATE",
    aliases: [alias("Mefoxin", "en"), alias("Mefoxin", "fr"), alias("cefoxitin IV", "en")],
    searchTerms: ["cefoxitin", "cefoxitin IV", "mefoxin", "surgical prophylaxis"],
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
    catalogCode: "SCOPOLAMINE_1_MG_OVER_3_DAYS_TRANSDERMAL_PATCH",
    genericName: "Scopolamine",
    displayNameFr: "Scopolamine patch",
    displayNameEn: "Scopolamine patch",
    strength: "1 mg/3 days",
    dosageForm: "patch transdermique",
    route: "transdermique",
    therapeuticClass: "Antiémétique",
    bucket: "SURGERY_PERIOPERATIVE",
    mode: "CREATE",
    aliases: [alias("Transderm Scop", "en"), alias("patch scopolamine", "fr")],
    searchTerms: ["scopolamine patch", "transderm scop", "PONV prophylaxis"],
    governance: {
      isControlled: false,
      controlledSchedule: null,
      isHighAlert: false,
      requiresWitness: false,
      requiresDoubleSign: false,
      lasaGroupId: null,
      requiresPharmacyVerification: false,
      requiresSpecialtyReview: true,
    },
    isEssential: false,
    administrationType: "TOPICAL",
    billingClass: "THERAPEUTIC",
  },
];

export const ENTERPRISE_SURGERY_PERIOPERATIVE_FORMULARY_BY_CODE = Object.fromEntries(
  ENTERPRISE_SURGERY_PERIOPERATIVE_FORMULARY_MANIFEST.map((entry) => [entry.catalogCode, entry])
) as Record<string, SurgeryPerioperativeFormularyEntry>;
