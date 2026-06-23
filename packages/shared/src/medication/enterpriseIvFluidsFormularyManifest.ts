/**
 * MEDUI.MEDICATION.IV_FLUIDS_PROVIDER_ORDERING_EXPANSION.1
 * Catalog remediation for hospital IV fluid crystalloids not yet in Wave 4 / Haiti.
 */

type IvFluidFormularyEntry = {
  catalogCode: string;
  genericName: string;
  displayNameFr: string;
  displayNameEn: string;
  strength: string;
  dosageForm: string;
  route: string;
  therapeuticClass: string;
  bucket: "IV_FLUIDS";
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

function fluidEntry(input: Omit<IvFluidFormularyEntry, "bucket" | "mode" | "isEssential">): IvFluidFormularyEntry {
  return { ...input, bucket: "IV_FLUIDS", mode: "CREATE", isEssential: false };
}

export const ENTERPRISE_IV_FLUIDS_FORMULARY_MANIFEST: IvFluidFormularyEntry[] = [
  fluidEntry({
    catalogCode: "SODIUM_CHLORIDE_0_9_250_ML_PERFUSION_INTRAVEINEUSE",
    genericName: "Sodium chloride",
    displayNameFr: "Chlorure de sodium",
    displayNameEn: "Normal saline",
    strength: "0.9% 250 mL",
    dosageForm: "perfusion",
    route: "intraveineuse",
    therapeuticClass: "Soluté",
    aliases: [alias("NS 250", "en"), alias("NS 250", "fr"), alias("normal saline 250 mL", "en")],
    searchTerms: ["ns", "normal saline", "0.9", "250 ml", "chlorure de sodium", "soluté"],
    governance: {
      isControlled: false,
      controlledSchedule: null,
      isHighAlert: false,
      requiresWitness: false,
      requiresDoubleSign: false,
      lasaGroupId: null,
      requiresPharmacyVerification: false,
    },
    administrationType: "INFUSION",
    billingClass: "HYDRATION",
  }),
  fluidEntry({
    catalogCode: "SODIUM_CHLORIDE_0_9_500_ML_PERFUSION_INTRAVEINEUSE",
    genericName: "Sodium chloride",
    displayNameFr: "Chlorure de sodium",
    displayNameEn: "Normal saline",
    strength: "0.9% 500 mL",
    dosageForm: "perfusion",
    route: "intraveineuse",
    therapeuticClass: "Soluté",
    aliases: [alias("NS 500", "en"), alias("NS 500", "fr")],
    searchTerms: ["ns", "normal saline", "0.9", "500 ml", "chlorure de sodium"],
    governance: {
      isControlled: false,
      controlledSchedule: null,
      isHighAlert: false,
      requiresWitness: false,
      requiresDoubleSign: false,
      lasaGroupId: null,
      requiresPharmacyVerification: false,
    },
    administrationType: "INFUSION",
    billingClass: "HYDRATION",
  }),
  fluidEntry({
    catalogCode: "SODIUM_CHLORIDE_0_9_10_ML_FLUSH_INTRAVEINEUSE",
    genericName: "Sodium chloride",
    displayNameFr: "Chlorure de sodium (rinçage)",
    displayNameEn: "Normal saline flush",
    strength: "0.9% 10 mL",
    dosageForm: "solution",
    route: "intraveineuse",
    therapeuticClass: "Soluté",
    aliases: [alias("NS flush", "en"), alias("rinçage NS", "fr")],
    searchTerms: ["ns flush", "saline flush", "rinçage", "10 ml", "line flush"],
    governance: {
      isControlled: false,
      controlledSchedule: null,
      isHighAlert: false,
      requiresWitness: false,
      requiresDoubleSign: false,
      lasaGroupId: null,
      requiresPharmacyVerification: false,
    },
    administrationType: "PUSH",
    billingClass: "HYDRATION",
  }),
  fluidEntry({
    catalogCode: "SODIUM_CHLORIDE_0_45_500_ML_PERFUSION_INTRAVEINEUSE",
    genericName: "Sodium chloride",
    displayNameFr: "Chlorure de sodium 0,45 %",
    displayNameEn: "Half normal saline",
    strength: "0.45% 500 mL",
    dosageForm: "perfusion",
    route: "intraveineuse",
    therapeuticClass: "Soluté",
    aliases: [alias("0.45% NS", "en"), alias("NS 0,45 %", "fr"), alias("half normal saline", "en")],
    searchTerms: ["0.45", "half normal", "half ns", "500 ml", "maintenance fluid"],
    governance: {
      isControlled: false,
      controlledSchedule: null,
      isHighAlert: false,
      requiresWitness: false,
      requiresDoubleSign: false,
      lasaGroupId: null,
      requiresPharmacyVerification: false,
    },
    administrationType: "INFUSION",
    billingClass: "HYDRATION",
  }),
  fluidEntry({
    catalogCode: "SODIUM_CHLORIDE_0_45_1000_ML_PERFUSION_INTRAVEINEUSE",
    genericName: "Sodium chloride",
    displayNameFr: "Chlorure de sodium 0,45 %",
    displayNameEn: "Half normal saline",
    strength: "0.45% 1000 mL",
    dosageForm: "perfusion",
    route: "intraveineuse",
    therapeuticClass: "Soluté",
    aliases: [alias("0.45% NS 1000", "en"), alias("NS 0,45 % 1 L", "fr")],
    searchTerms: ["0.45", "half normal", "1000 ml", "1 l", "maintenance fluid"],
    governance: {
      isControlled: false,
      controlledSchedule: null,
      isHighAlert: false,
      requiresWitness: false,
      requiresDoubleSign: false,
      lasaGroupId: null,
      requiresPharmacyVerification: false,
    },
    administrationType: "INFUSION",
    billingClass: "HYDRATION",
  }),
  fluidEntry({
    catalogCode: "DEXTROSE_5_250_ML_PERFUSION_INTRAVEINEUSE",
    genericName: "Dextrose",
    displayNameFr: "Glucose",
    displayNameEn: "Dextrose 5%",
    strength: "5% 250 mL",
    dosageForm: "perfusion",
    route: "intraveineuse",
    therapeuticClass: "Soluté",
    aliases: [alias("D5W 250", "en"), alias("D5W 250", "fr")],
    searchTerms: ["d5w", "dextrose", "5%", "250 ml", "glucose"],
    governance: {
      isControlled: false,
      controlledSchedule: null,
      isHighAlert: false,
      requiresWitness: false,
      requiresDoubleSign: false,
      lasaGroupId: null,
      requiresPharmacyVerification: false,
    },
    administrationType: "INFUSION",
    billingClass: "HYDRATION",
  }),
  fluidEntry({
    catalogCode: "DEXTROSE_5_500_ML_PERFUSION_INTRAVEINEUSE",
    genericName: "Dextrose",
    displayNameFr: "Glucose",
    displayNameEn: "Dextrose 5%",
    strength: "5% 500 mL",
    dosageForm: "perfusion",
    route: "intraveineuse",
    therapeuticClass: "Soluté",
    aliases: [alias("D5W 500", "en"), alias("D5W 500", "fr")],
    searchTerms: ["d5w", "dextrose", "5%", "500 ml", "glucose"],
    governance: {
      isControlled: false,
      controlledSchedule: null,
      isHighAlert: false,
      requiresWitness: false,
      requiresDoubleSign: false,
      lasaGroupId: null,
      requiresPharmacyVerification: false,
    },
    administrationType: "INFUSION",
    billingClass: "HYDRATION",
  }),
  fluidEntry({
    catalogCode: "DEXTROSE_SALINE_5_0_45_PERFUSION_INTRAVEINEUSE",
    genericName: "Dextrose + Saline",
    displayNameFr: "Glucose + sérum salé 0,45 %",
    displayNameEn: "D5 0.45% NS",
    strength: "5%/0.45%",
    dosageForm: "perfusion",
    route: "intraveineuse",
    therapeuticClass: "Soluté",
    aliases: [alias("D5 0.45% NS", "en"), alias("D5 NS 0,45 %", "fr")],
    searchTerms: ["d5", "0.45", "dextrose saline", "maintenance", "pediatric fluid"],
    governance: {
      isControlled: false,
      controlledSchedule: null,
      isHighAlert: false,
      requiresWitness: false,
      requiresDoubleSign: false,
      lasaGroupId: null,
      requiresPharmacyVerification: false,
    },
    administrationType: "INFUSION",
    billingClass: "HYDRATION",
  }),
  fluidEntry({
    catalogCode: "DEXTROSE_5_RINGER_LACTATE_1000_ML_PERFUSION_INTRAVEINEUSE",
    genericName: "Dextrose + Ringer Lactate",
    displayNameFr: "Glucose + Ringer lactate",
    displayNameEn: "D5 Lactated Ringer",
    strength: "5% 1000 mL",
    dosageForm: "perfusion",
    route: "intraveineuse",
    therapeuticClass: "Soluté",
    aliases: [alias("D5 LR", "en"), alias("D5 RL", "fr")],
    searchTerms: ["d5 lr", "d5 ringer", "dextrose lactated ringer", "1000 ml"],
    governance: {
      isControlled: false,
      controlledSchedule: null,
      isHighAlert: false,
      requiresWitness: false,
      requiresDoubleSign: false,
      lasaGroupId: null,
      requiresPharmacyVerification: false,
    },
    administrationType: "INFUSION",
    billingClass: "HYDRATION",
  }),
  fluidEntry({
    catalogCode: "PLASMALYTE_1000_ML_PERFUSION_INTRAVEINEUSE",
    genericName: "Plasma-Lyte",
    displayNameFr: "Plasma-Lyte",
    displayNameEn: "Plasma-Lyte",
    strength: "1000 mL",
    dosageForm: "perfusion",
    route: "intraveineuse",
    therapeuticClass: "Soluté",
    aliases: [alias("Plasmalyte", "en"), alias("Plasmalyte", "fr")],
    searchTerms: ["plasmalyte", "plasma lyte", "balanced crystalloid", "1000 ml"],
    governance: {
      isControlled: false,
      controlledSchedule: null,
      isHighAlert: false,
      requiresWitness: false,
      requiresDoubleSign: false,
      lasaGroupId: null,
      requiresPharmacyVerification: false,
    },
    administrationType: "INFUSION",
    billingClass: "HYDRATION",
  }),
  fluidEntry({
    catalogCode: "NORMOSOL_1000_ML_PERFUSION_INTRAVEINEUSE",
    genericName: "Normosol",
    displayNameFr: "Normosol",
    displayNameEn: "Normosol",
    strength: "1000 mL",
    dosageForm: "perfusion",
    route: "intraveineuse",
    therapeuticClass: "Soluté",
    aliases: [alias("Normosol-R", "en"), alias("Normosol", "fr")],
    searchTerms: ["normosol", "balanced crystalloid", "1000 ml"],
    governance: {
      isControlled: false,
      controlledSchedule: null,
      isHighAlert: false,
      requiresWitness: false,
      requiresDoubleSign: false,
      lasaGroupId: null,
      requiresPharmacyVerification: false,
    },
    administrationType: "INFUSION",
    billingClass: "HYDRATION",
  }),
];

export const ENTERPRISE_IV_FLUIDS_FORMULARY_BY_CODE = Object.fromEntries(
  ENTERPRISE_IV_FLUIDS_FORMULARY_MANIFEST.map((entry) => [entry.catalogCode, entry])
) as Record<string, IvFluidFormularyEntry>;
