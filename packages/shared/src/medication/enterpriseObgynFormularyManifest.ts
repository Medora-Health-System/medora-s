/**
 * MEDUI.MEDICATION.OBGYN_PROVIDER_ORDERING_EXPANSION.1
 * Catalog remediation for OBGYN medications missing from Wave 4 / Haiti.
 */

type ObgynFormularyEntry = {
  catalogCode: string;
  genericName: string;
  displayNameFr: string;
  displayNameEn: string;
  strength: string;
  dosageForm: string;
  route: string;
  therapeuticClass: string;
  bucket: "OBGYN";
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

export const ENTERPRISE_OBGYN_FORMULARY_MANIFEST: ObgynFormularyEntry[] = [
  {
    catalogCode: "PENICILLIN_G_5_MILLION_UNITS_POUDRE_INTRAVEINEUSE",
    genericName: "Penicillin G",
    displayNameFr: "Pénicilline G",
    displayNameEn: "Penicillin G",
    strength: "5 million units",
    dosageForm: "poudre",
    route: "intraveineuse",
    therapeuticClass: "Antibiotique",
    bucket: "OBGYN",
    mode: "CREATE",
    aliases: [alias("Penicillin G IV", "en"), alias("Pénicilline G IV", "fr"), alias("GBS prophylaxis", "en")],
    searchTerms: ["penicillin g", "penicilline g", "gbs", "intrapartum", "5 million units", "intraveineuse"],
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
    administrationType: "INFUSION",
    billingClass: "THERAPEUTIC",
  },
  {
    catalogCode: "TRANEXAMIC_ACID_1000_MG_10_ML_INJECTABLE_INTRAVEINEUSE",
    genericName: "Tranexamic acid",
    displayNameFr: "Acide tranexamique",
    displayNameEn: "Tranexamic acid",
    strength: "1000 mg/10 mL",
    dosageForm: "injectable",
    route: "intraveineuse",
    therapeuticClass: "Hémostase",
    bucket: "OBGYN",
    mode: "CREATE",
    aliases: [alias("TXA", "en"), alias("Exacyl IV", "fr"), alias("PPH TXA", "en")],
    searchTerms: ["tranexamic", "tranexamique", "txa", "postpartum hemorrhage", "hemostasis"],
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
    administrationType: "PUSH",
    billingClass: "THERAPEUTIC",
  },
];

export const ENTERPRISE_OBGYN_FORMULARY_BY_CODE = Object.fromEntries(
  ENTERPRISE_OBGYN_FORMULARY_MANIFEST.map((entry) => [entry.catalogCode, entry])
) as Record<string, ObgynFormularyEntry>;
