/**
 * MEDUI.MEDICATION.PEDIATRICS_PROVIDER_ORDERING_EXPANSION.1
 * Catalog remediation for pediatric medications missing from Wave / Haiti.
 */

type PediatricsFormularyEntry = {
  catalogCode: string;
  genericName: string;
  displayNameFr: string;
  displayNameEn: string;
  strength: string;
  dosageForm: string;
  route: string;
  therapeuticClass: string;
  bucket: "PEDIATRICS";
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

export const ENTERPRISE_PEDIATRICS_FORMULARY_MANIFEST: PediatricsFormularyEntry[] = [
  {
    catalogCode: "CEFDINIR_125_MG_PER_5_ML_SUSPENSION_BUVABLE_ORAL",
    genericName: "Cefdinir",
    displayNameFr: "Céfdinir",
    displayNameEn: "Cefdinir",
    strength: "125 mg/5 mL",
    dosageForm: "suspension buvable",
    route: "orale",
    therapeuticClass: "Antibiotique",
    bucket: "PEDIATRICS",
    mode: "CREATE",
    aliases: [alias("Omnicef", "en"), alias("Omnicef", "fr"), alias("cefdinir suspension", "en")],
    searchTerms: ["cefdinir", "cefdinir suspension", "omnicef", "otitis media"],
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
    catalogCode: "ERYTHROMYCIN_0_5_OPHTHALMIQUE_OPHTHALMIQUE",
    genericName: "Erythromycin",
    displayNameFr: "Érythromycine ophtalmique",
    displayNameEn: "Erythromycin ophthalmic",
    strength: "0.5%",
    dosageForm: "pommade ophtalmique",
    route: "ophtalmique",
    therapeuticClass: "Antibiotique ophtalmique",
    bucket: "PEDIATRICS",
    mode: "CREATE",
    aliases: [alias("Ilotycin", "en"), alias("prophylaxie oculaire nouveau-né", "fr")],
    searchTerms: ["erythromycin ophthalmic", "erythromycine ophtalmique", "newborn eye prophylaxis"],
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
    administrationType: "ORAL",
    billingClass: "THERAPEUTIC",
  },
];

export const ENTERPRISE_PEDIATRICS_FORMULARY_BY_CODE = Object.fromEntries(
  ENTERPRISE_PEDIATRICS_FORMULARY_MANIFEST.map((entry) => [entry.catalogCode, entry])
) as Record<string, PediatricsFormularyEntry>;
