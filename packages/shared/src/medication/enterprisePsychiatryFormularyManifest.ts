/**
 * MEDUI.MEDICATION.PSYCHIATRY_PROVIDER_ORDERING_EXPANSION.1
 * Catalog remediation for psychiatry medications missing from Wave / Haiti.
 */

type PsychiatryFormularyEntry = {
  catalogCode: string;
  genericName: string;
  displayNameFr: string;
  displayNameEn: string;
  strength: string;
  dosageForm: string;
  route: string;
  therapeuticClass: string;
  bucket: "PSYCHIATRY";
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

export const ENTERPRISE_PSYCHIATRY_FORMULARY_MANIFEST: PsychiatryFormularyEntry[] = [
  {
    catalogCode: "OLANZAPINE_10_MG_ODT_COMPRIME_ORODISPERSIBLE_ORALE",
    genericName: "Olanzapine",
    displayNameFr: "Olanzapine ODT",
    displayNameEn: "Olanzapine ODT",
    strength: "10 mg ODT",
    dosageForm: "comprimé orodispersible",
    route: "orale",
    therapeuticClass: "Antipsychotique",
    bucket: "PSYCHIATRY",
    mode: "CREATE",
    aliases: [alias("Zyprexa Zydis", "en"), alias("Zyprexa Zydis", "fr"), alias("olanzapine ODT", "en")],
    searchTerms: ["olanzapine", "odt", "orodispersible", "agitation", "psychosis"],
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
  {
    catalogCode: "OLANZAPINE_10_MG_INJECTABLE_INTRAMUSCULAIRE",
    genericName: "Olanzapine",
    displayNameFr: "Olanzapine IM",
    displayNameEn: "Olanzapine IM",
    strength: "10 mg",
    dosageForm: "injectable",
    route: "intramusculaire",
    therapeuticClass: "Antipsychotique",
    bucket: "PSYCHIATRY",
    mode: "CREATE",
    aliases: [alias("Zyprexa IM", "en"), alias("Zyprexa IM", "fr"), alias("olanzapine IM", "en")],
    searchTerms: ["olanzapine", "intramusculaire", "agitation", "behavioral crisis"],
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
    administrationType: "IM",
    billingClass: "DRUG_SUPPLY",
  },
  {
    catalogCode: "ZIPRASIDONE_20_MG_INJECTABLE_INTRAMUSCULAIRE",
    genericName: "Ziprasidone",
    displayNameFr: "Ziprasidone IM",
    displayNameEn: "Ziprasidone IM",
    strength: "20 mg",
    dosageForm: "injectable",
    route: "intramusculaire",
    therapeuticClass: "Antipsychotique",
    bucket: "PSYCHIATRY",
    mode: "CREATE",
    aliases: [alias("Geodon IM", "en"), alias("Geodon IM", "fr"), alias("ziprasidone IM", "en")],
    searchTerms: ["ziprasidone", "intramusculaire", "agitation", "psychosis"],
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
    administrationType: "IM",
    billingClass: "DRUG_SUPPLY",
  },
  {
    catalogCode: "LURASIDONE_40_MG_COMPRIME_ORALE",
    genericName: "Lurasidone",
    displayNameFr: "Lurasidone",
    displayNameEn: "Lurasidone",
    strength: "40 mg",
    dosageForm: "comprimé",
    route: "orale",
    therapeuticClass: "Antipsychotique",
    bucket: "PSYCHIATRY",
    mode: "CREATE",
    aliases: [alias("Latuda", "en"), alias("Latuda", "fr")],
    searchTerms: ["lurasidone", "latuda", "schizophrenia", "bipolar"],
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
  {
    catalogCode: "BENZTROPINE_1_MG_COMPRIME_ORALE",
    genericName: "Benztropine",
    displayNameFr: "Benztropine",
    displayNameEn: "Benztropine",
    strength: "1 mg",
    dosageForm: "comprimé",
    route: "orale",
    therapeuticClass: "Anticholinergique",
    bucket: "PSYCHIATRY",
    mode: "CREATE",
    aliases: [alias("Cogentin", "en"), alias("Cogentin", "fr"), alias("EPS", "en")],
    searchTerms: ["benztropine", "eps", "extrapyramidal", "dystonia"],
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
  {
    catalogCode: "BENZTROPINE_1_MG_ML_INJECTABLE_INTRAMUSCULAIRE",
    genericName: "Benztropine",
    displayNameFr: "Benztropine IM",
    displayNameEn: "Benztropine IM",
    strength: "1 mg/mL",
    dosageForm: "injectable",
    route: "intramusculaire",
    therapeuticClass: "Anticholinergique",
    bucket: "PSYCHIATRY",
    mode: "CREATE",
    aliases: [alias("Cogentin IM", "en"), alias("Cogentin IM", "fr")],
    searchTerms: ["benztropine", "intramusculaire", "eps", "dystonia"],
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
    administrationType: "IM",
    billingClass: "DRUG_SUPPLY",
  },
  {
    catalogCode: "HYDROXYZINE_25_MG_COMPRIME_ORALE",
    genericName: "Hydroxyzine",
    displayNameFr: "Hydroxyzine",
    displayNameEn: "Hydroxyzine",
    strength: "25 mg",
    dosageForm: "comprimé",
    route: "orale",
    therapeuticClass: "Anxiolytique",
    bucket: "PSYCHIATRY",
    mode: "CREATE",
    aliases: [alias("Vistaril", "en"), alias("Atarax", "fr")],
    searchTerms: ["hydroxyzine", "anxiety", "agitation", "pruritus"],
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
  {
    catalogCode: "HYDROXYZINE_50_MG_ML_INJECTABLE_INTRAMUSCULAIRE",
    genericName: "Hydroxyzine",
    displayNameFr: "Hydroxyzine IM",
    displayNameEn: "Hydroxyzine IM",
    strength: "50 mg/mL",
    dosageForm: "injectable",
    route: "intramusculaire",
    therapeuticClass: "Anxiolytique",
    bucket: "PSYCHIATRY",
    mode: "CREATE",
    aliases: [alias("Vistaril IM", "en"), alias("Vistaril IM", "fr")],
    searchTerms: ["hydroxyzine", "intramusculaire", "anxiety", "agitation"],
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
    administrationType: "IM",
    billingClass: "DRUG_SUPPLY",
  },
  {
    catalogCode: "PROPRANOLOL_10_MG_COMPRIME_ORALE",
    genericName: "Propranolol",
    displayNameFr: "Propranolol",
    displayNameEn: "Propranolol",
    strength: "10 mg",
    dosageForm: "comprimé",
    route: "orale",
    therapeuticClass: "Bêta-bloquant",
    bucket: "PSYCHIATRY",
    mode: "CREATE",
    aliases: [alias("Inderal", "en"), alias("Inderal", "fr"), alias("akathisia", "en")],
    searchTerms: ["propranolol", "akathisia", "anxiety", "beta blocker"],
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
  {
    catalogCode: "PROPRANOLOL_1_MG_ML_INJECTABLE_INTRAVEINEUSE",
    genericName: "Propranolol",
    displayNameFr: "Propranolol IV",
    displayNameEn: "Propranolol IV",
    strength: "1 mg/mL",
    dosageForm: "injectable",
    route: "intraveineuse",
    therapeuticClass: "Bêta-bloquant",
    bucket: "PSYCHIATRY",
    mode: "CREATE",
    aliases: [alias("Inderal IV", "en"), alias("propranolol IV", "fr")],
    searchTerms: ["propranolol", "intraveineuse", "hypertensive urgency"],
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
    billingClass: "DRUG_SUPPLY",
  },
  {
    catalogCode: "DIVALPROEX_250_MG_GELULE_ORALE",
    genericName: "Divalproex",
    displayNameFr: "Divalproate de sodium",
    displayNameEn: "Divalproex",
    strength: "250 mg",
    dosageForm: "gélule",
    route: "orale",
    therapeuticClass: "Stabilisateur de l'humeur",
    bucket: "PSYCHIATRY",
    mode: "CREATE",
    aliases: [alias("Depakote", "en"), alias("Depakote", "fr"), alias("valproate ER", "en")],
    searchTerms: ["divalproex", "depakote", "valproate", "mood stabilizer", "bipolar"],
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

export const ENTERPRISE_PSYCHIATRY_FORMULARY_BY_CODE = Object.fromEntries(
  ENTERPRISE_PSYCHIATRY_FORMULARY_MANIFEST.map((entry) => [entry.catalogCode, entry])
) as Record<string, PsychiatryFormularyEntry>;
