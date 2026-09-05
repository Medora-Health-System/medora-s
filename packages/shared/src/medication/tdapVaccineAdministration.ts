/**
 * MEDUI.MEDICATION_CATALOG.HOSPITAL_ORDERABILITY_AND_TDAP.1
 * Tdap IM 0.5 mL vaccine administration workflow — shared validation + auto-note.
 */

import {
  resolveImInjectionSiteDisplay,
  type ImInjectionSiteId,
} from "../mar/medicationAdministrationInjectionSite.js";
import {
  vaccineManufacturerLabel,
  type VaccineManufacturerId,
} from "./vaccineManufacturerCatalog.js";
import {
  type VaccineVisDocumentation,
  type VaccineVisRecipient,
  validateVaccineVisDocumentation,
} from "./vaccineVisGovernance.js";
import { ENTERPRISE_WAVE1_FORMULARY_BY_CODE } from "./enterpriseWave1FormularyManifest.js";
import { pickProductUiCopy, productUiBcp47Tag } from "../i18n/productUiLocale.js";
import {
  serializeVaccineAdministrationDocumentation,
  vaccineInjectionSiteLaterality,
  type VaccineAdministrationDocumentation,
} from "./vaccineMarAdministrationDocumentation.js";

export const TDAP_CATALOG_CODE = "TDAP_VACCINE_0.5_ML_INJECTABLE_INJECTABLEINTRAMUSCULAR" as const;

export const TDAP_DEFAULT_DOSE_VALUE = "0.5";
export const TDAP_DEFAULT_DOSE_UNIT = "mL";
export const TDAP_DEFAULT_ROUTE = "IM";

/** Tdap-appropriate IM sites (pediatric thigh + deltoid + ventrogluteal). */
export const TDAP_IM_INJECTION_SITES: readonly ImInjectionSiteId[] = [
  "right_deltoid",
  "left_deltoid",
  "right_ventrogluteal",
  "left_ventrogluteal",
  "right_vastus_lateralis",
  "left_vastus_lateralis",
] as const;

export type TdapEducationReviewedWith = "patient" | "spouse" | "parent" | "family";

export type TdapEducationTopic =
  | "reason_for_medication"
  | "signs_of_allergic_reaction"
  | "precautions";

/** Default education topics for a complete Tdap administration (mutable copy for forms). */
export const TDAP_DEFAULT_REVIEWED_TOPICS: TdapEducationTopic[] = [
  "reason_for_medication",
  "signs_of_allergic_reaction",
  "precautions",
];

export function tdapReviewedTopics(topics?: readonly TdapEducationTopic[]): TdapEducationTopic[] {
  return topics ? [...topics] : [...TDAP_DEFAULT_REVIEWED_TOPICS];
}

export type TdapVaccineAdministrationForm = {
  doseValue: string;
  doseUnit: string;
  route: string;
  injectionSite: ImInjectionSiteId | "";
  allergiesVerified: boolean;
  confirmedFiveRights: boolean;
  medicationInformationReviewed: boolean;
  reviewedWith: TdapEducationReviewedWith | "";
  reviewedTopics: TdapEducationTopic[];
  verbalizedUnderstanding: boolean;
  lotNumber: string;
  expirationDate: string;
  manufacturerId: VaccineManufacturerId | "";
  manufacturerOther: string;
  vis: VaccineVisDocumentation;
  amountWasted: string;
  administeredAt: string;
  administeringClinicianName: string;
  administeringClinicianCredentials: string;
};

export function emptyTdapVaccineAdministrationForm(): TdapVaccineAdministrationForm {
  return {
    doseValue: TDAP_DEFAULT_DOSE_VALUE,
    doseUnit: TDAP_DEFAULT_DOSE_UNIT,
    route: TDAP_DEFAULT_ROUTE,
    injectionSite: "",
    allergiesVerified: false,
    confirmedFiveRights: false,
    medicationInformationReviewed: false,
    reviewedWith: "",
    reviewedTopics: [],
    verbalizedUnderstanding: false,
    lotNumber: "",
    expirationDate: "",
    manufacturerId: "",
    manufacturerOther: "",
    vis: { visGiven: false, visRecipient: "none", visDate: "" },
    amountWasted: "",
    administeredAt: "",
    administeringClinicianName: "",
    administeringClinicianCredentials: "",
  };
}

export function getTdapFormularyEntry() {
  return ENTERPRISE_WAVE1_FORMULARY_BY_CODE[TDAP_CATALOG_CODE] ?? null;
}

/** Sample complete Tdap form for certification/tests — always returns mutable reviewedTopics. */
export function sampleCompleteTdapVaccineAdministrationForm(
  overrides?: Partial<TdapVaccineAdministrationForm>
): TdapVaccineAdministrationForm {
  const base: TdapVaccineAdministrationForm = {
    ...emptyTdapVaccineAdministrationForm(),
    injectionSite: "right_deltoid",
    allergiesVerified: true,
    confirmedFiveRights: true,
    medicationInformationReviewed: true,
    reviewedWith: "patient",
    reviewedTopics: tdapReviewedTopics(),
    lotNumber: "U8653BA",
    expirationDate: "2027-09-01",
    manufacturerId: "sanofi_pasteur",
    vis: { visGiven: true, visRecipient: "patient", visDate: "2026-06-14" },
    administeredAt: "2026-06-03T14:30:00.000Z",
    administeringClinicianName: "Dr. Example",
    administeringClinicianCredentials: "MD",
  };
  if (!overrides) return base;
  return {
    ...base,
    ...overrides,
    reviewedTopics: tdapReviewedTopics(overrides.reviewedTopics),
  };
}

export function tdapInjectionSiteLaterality(site: ImInjectionSiteId): "right" | "left" | "other" {
  if (site.startsWith("right_")) return "right";
  if (site.startsWith("left_")) return "left";
  return "other";
}

export function validateTdapVaccineAdministrationForm(form: TdapVaccineAdministrationForm): string[] {
  const errors: string[] = [];
  if (!form.doseValue.trim()) errors.push("dose_required");
  if (!form.doseUnit.trim()) errors.push("dose_unit_required");
  if (!isIntramuscularTdapRoute(form.route)) errors.push("route_must_be_im");
  if (!form.injectionSite) errors.push("injection_site_required");
  if (!form.allergiesVerified) errors.push("allergies_verified_required");
  if (!form.confirmedFiveRights) errors.push("five_rights_required");
  if (!form.medicationInformationReviewed) errors.push("medication_info_reviewed_required");
  if (!form.reviewedWith) errors.push("reviewed_with_required");
  if (!form.reviewedTopics.length) errors.push("reviewed_topics_required");
  if (!form.lotNumber.trim()) errors.push("lot_number_required");
  if (!form.expirationDate.trim()) errors.push("expiration_date_required");
  if (!form.manufacturerId) errors.push("manufacturer_required");
  if (form.manufacturerId === "other" && !form.manufacturerOther.trim()) {
    errors.push("manufacturer_other_required");
  }
  errors.push(...validateVaccineVisDocumentation(form.vis));
  if (!form.administeredAt.trim()) errors.push("administered_at_required");
  if (!form.administeringClinicianName.trim()) errors.push("clinician_name_required");
  return errors;
}

export function isIntramuscularTdapRoute(route: string): boolean {
  const n = route.trim().toLowerCase();
  return n === "im" || n.includes("intramuscular") || n.includes("intramusculaire");
}

function formatExpirationForNote(isoDate: string, locale: string): string {
  const trimmed = isoDate.trim();
  if (!trimmed) return "";
  try {
    const d = new Date(`${trimmed}T12:00:00`);
    return d.toLocaleDateString(productUiBcp47Tag(locale), {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
  } catch {
    return trimmed;
  }
}

function formatAdminTimeForNote(iso: string, locale: string): string {
  const trimmed = iso.trim();
  if (!trimmed) return "";
  try {
    const d = new Date(trimmed);
    return d.toLocaleString(productUiBcp47Tag(locale), {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return trimmed;
  }
}

function manufacturerDisplay(form: TdapVaccineAdministrationForm, locale: string): string {
  if (!form.manufacturerId) return "";
  if (form.manufacturerId === "other") return form.manufacturerOther.trim();
  return vaccineManufacturerLabel(form.manufacturerId, locale);
}

function injectionSiteDisplay(site: ImInjectionSiteId, locale: string): string {
  return resolveImInjectionSiteDisplay(site, locale);
}

const REVIEWED_WITH_EN: Record<TdapEducationReviewedWith, string> = {
  patient: "patient",
  spouse: "spouse",
  parent: "parent",
  family: "family",
};

const REVIEWED_WITH_FR: Record<TdapEducationReviewedWith, string> = {
  patient: "le patient",
  spouse: "le conjoint",
  parent: "le parent",
  family: "la famille",
};

const VIS_RECIPIENT_EN: Record<Exclude<VaccineVisRecipient, "none">, string> = {
  patient: "patient",
  family: "family",
};

const VIS_RECIPIENT_FR: Record<Exclude<VaccineVisRecipient, "none">, string> = {
  patient: "le patient",
  family: "la famille",
};

const REVIEWED_WITH_ES: Record<TdapEducationReviewedWith, string> = {
  patient: "el paciente",
  spouse: "el cónyuge",
  parent: "el progenitor",
  family: "la familia",
};

const VIS_RECIPIENT_ES: Record<Exclude<VaccineVisRecipient, "none">, string> = {
  patient: "el paciente",
  family: "la familia",
};

function reviewedWithLabel(reviewedWith: TdapEducationReviewedWith, locale: string): string {
  return pickProductUiCopy(
    locale,
    { en: REVIEWED_WITH_EN[reviewedWith], fr: REVIEWED_WITH_FR[reviewedWith], es: REVIEWED_WITH_ES[reviewedWith] },
    REVIEWED_WITH_ES[reviewedWith]
  );
}

function visRecipientLabel(recipient: Exclude<VaccineVisRecipient, "none">, locale: string): string {
  return pickProductUiCopy(
    locale,
    { en: VIS_RECIPIENT_EN[recipient], fr: VIS_RECIPIENT_FR[recipient], es: VIS_RECIPIENT_ES[recipient] },
    VIS_RECIPIENT_ES[recipient]
  );
}

/** Build live MAR / progress-note narrative — omits blank optional segments. */
export function buildTdapVaccineAdministrationNote(
  form: TdapVaccineAdministrationForm,
  locale: string
): string {
  const parts: string[] = [];

  const dosePart = pickProductUiCopy(
    locale,
    {
      en: `Tdap IM ${form.doseValue.trim()} ${form.doseUnit.trim()} given.`,
      fr: `Tdap IM ${form.doseValue.trim()} ${form.doseUnit.trim()} administré.`,
      es: `Tdap IM ${form.doseValue.trim()} ${form.doseUnit.trim()} administrado.`,
    },
    `Tdap IM ${form.doseValue.trim()} ${form.doseUnit.trim()} administrado.`
  );
  parts.push(dosePart);

  const lot = form.lotNumber.trim();
  const exp = formatExpirationForNote(form.expirationDate, locale);
  const mfr = manufacturerDisplay(form, locale);
  const detailBits: string[] = [];
  if (lot) {
    detailBits.push(pickProductUiCopy(locale, { en: `Lot#: ${lot}`, fr: `Lot n° : ${lot}`, es: `Lote n.º: ${lot}` }, `Lote n.º: ${lot}`));
  }
  if (exp) {
    detailBits.push(
      pickProductUiCopy(
        locale,
        { en: `expiration date: ${exp}`, fr: `date d'expiration : ${exp}`, es: `fecha de vencimiento: ${exp}` },
        `fecha de vencimiento: ${exp}`
      )
    );
  }
  if (mfr) {
    detailBits.push(
      pickProductUiCopy(locale, { en: `manufacturer: ${mfr}`, fr: `fabricant : ${mfr}`, es: `fabricante: ${mfr}` }, `fabricante: ${mfr}`)
    );
  }
  if (detailBits.length) {
    parts.push(`${detailBits.join(", ")}.`);
  }

  if (form.injectionSite) {
    const siteLabel = injectionSiteDisplay(form.injectionSite, locale);
    parts.push(
      pickProductUiCopy(
        locale,
        {
          en: `Given in the ${siteLabel.toLowerCase()}.`,
          fr: `Administré dans le ${siteLabel.toLowerCase()}.`,
          es: `Administrado en el ${siteLabel.toLowerCase()}.`,
        },
        `Administrado en el ${siteLabel.toLowerCase()}.`
      )
    );
  }

  if (form.allergiesVerified && form.confirmedFiveRights) {
    parts.push(
      pickProductUiCopy(
        locale,
        {
          en: "Allergies verified and confirmed 5 rights.",
          fr: "Allergies vérifiées et 5 bonnes pratiques confirmées.",
          es: "Alergias verificadas y 5 correctos confirmados.",
        },
        "Alergias verificadas y 5 correctos confirmados."
      )
    );
  }

  if (form.medicationInformationReviewed && form.reviewedWith) {
    const withWhom = reviewedWithLabel(form.reviewedWith, locale);
    const topics = pickProductUiCopy(
      locale,
      {
        en: "reason for taking this medication, signs of allergic reaction, and precautions",
        fr: "motif du médicament, signes de réaction allergique et précautions",
        es: "motivo del medicamento, signos de reacción alérgica y precauciones",
      },
      "motivo del medicamento, signos de reacción alérgica y precauciones"
    );
    parts.push(
      pickProductUiCopy(
        locale,
        {
          en: `Information reviewed with ${withWhom} including ${topics}.`,
          fr: `Information revue avec ${withWhom}, incluant ${topics}.`,
          es: `Información revisada con ${withWhom}, incluyendo ${topics}.`,
        },
        `Información revisada con ${withWhom}, incluyendo ${topics}.`
      )
    );
  }

  if (form.verbalizedUnderstanding) {
    parts.push(
      pickProductUiCopy(
        locale,
        { en: "Verbalized understanding.", fr: "Compréhension verbalisée.", es: "Comprensión verbalizada." },
        "Comprensión verbalizada."
      )
    );
  }

  if (form.vis.visGiven && form.vis.visDate.trim() && form.vis.visRecipient !== "none") {
    const visDate = formatExpirationForNote(form.vis.visDate, locale);
    const recipient = visRecipientLabel(form.vis.visRecipient, locale);
    parts.push(
      pickProductUiCopy(
        locale,
        {
          en: `Vaccine information statement dated ${visDate} provided to ${recipient}.`,
          fr: `Fiche d'information vaccinale datée du ${visDate} remise à ${recipient}.`,
          es: `Hoja de información vacunal fechada el ${visDate} entregada a ${recipient}.`,
        },
        `Hoja de información vacunal fechada el ${visDate} entregada a ${recipient}.`
      )
    );
  }

  const wasted = form.amountWasted.trim();
  if (wasted) {
    parts.push(
      pickProductUiCopy(
        locale,
        { en: `Amount wasted: ${wasted}.`, fr: `Quantité perdue : ${wasted}.`, es: `Cantidad desperdiciada: ${wasted}.` },
        `Cantidad desperdiciada: ${wasted}.`
      )
    );
  }

  const clinician = [form.administeringClinicianName.trim(), form.administeringClinicianCredentials.trim()]
    .filter(Boolean)
    .join(", ");
  const time = formatAdminTimeForNote(form.administeredAt, locale);
  if (clinician || time) {
    parts.push(`— ${[time, clinician].filter(Boolean).join(" ")}`.trim());
  }

  return parts.join(" ");
}

/** Serialize form for MAR / progress note persistence. */
export function serializeTdapVaccineAdministrationPayload(form: TdapVaccineAdministrationForm): Record<string, unknown> {
  const genericDocumentation: VaccineAdministrationDocumentation = {
    vaccineProductId: null,
    catalogCode: TDAP_CATALOG_CODE,
    vaccineDisplayName: "Tdap vaccine",
    dose: form.doseValue,
    unit: form.doseUnit,
    route: form.route,
    site: form.injectionSite,
    laterality: vaccineInjectionSiteLaterality(form.injectionSite),
    lotNumber: form.lotNumber,
    expirationDate: form.expirationDate,
    manufacturerId: form.manufacturerId,
    manufacturerDisplayName: manufacturerDisplay(form, "en"),
    visGiven: form.vis.visGiven,
    visRecipient: form.vis.visRecipient,
    visDate: form.vis.visDate,
    visEditionDate: null,
    allergiesVerified: form.allergiesVerified,
    fiveRightsConfirmed: form.confirmedFiveRights,
    educationReviewed: form.medicationInformationReviewed,
    reviewedWith: form.reviewedWith,
    reviewedTopics: form.reviewedTopics,
    understandingConfirmed: form.verbalizedUnderstanding,
    amountWasted: form.amountWasted,
    administeredAt: form.administeredAt,
    administeredBy: form.administeringClinicianName,
    administeredByCredentials: form.administeringClinicianCredentials,
  };
  return {
    type: "tdap_vaccine_administration_v1",
    catalogCode: TDAP_CATALOG_CODE,
    ...form,
    genericVaccineDocumentation: serializeVaccineAdministrationDocumentation(genericDocumentation),
    generatedNoteEn: buildTdapVaccineAdministrationNote(form, "en"),
    generatedNoteFr: buildTdapVaccineAdministrationNote(form, "fr"),
    generatedNoteEs: buildTdapVaccineAdministrationNote(form, "es"),
  };
}

const EN_LEAKAGE_IN_FR = /\b(given|manufacturer|allergies verified|vaccine information statement)\b/i;
const FR_LEAKAGE_IN_EN = /\b(administré|fabricant|allergies vérifiées|fiche d'information vaccinale)\b/i;
const EN_LEAKAGE_IN_ES = /\b(given|manufacturer|allergies verified|vaccine information statement|verbalized understanding)\b/i;
const FR_LEAKAGE_IN_ES = /\b(administré|fiche d'information vaccinale|allergies vérifiées|compréhension verbalisée|bonnes pratiques)\b/i;

export function tdapNoteIsMonolingual(note: string, locale: string): boolean {
  if (locale === "fr") return !EN_LEAKAGE_IN_FR.test(note);
  if (locale === "es") return !EN_LEAKAGE_IN_ES.test(note) && !FR_LEAKAGE_IN_ES.test(note);
  return !FR_LEAKAGE_IN_EN.test(note);
}
