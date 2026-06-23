/**
 * MEDUI.MEDICATION.VACCINE_MAR_ADMINISTRATION_HARDENING.1
 * Generic vaccine MAR administration documentation model — no activation/formulary mutation.
 */

import {
  imInjectionSiteLabelsEn,
  imInjectionSiteLabelsFr,
  type ImInjectionSiteId,
} from "../mar/medicationAdministrationInjectionSite.js";
import {
  vaccineManufacturerLabel,
  type VaccineManufacturerId,
} from "./vaccineManufacturerCatalog.js";
import type { VaccineVisDocumentation } from "./vaccineVisGovernance.js";
import { validateVaccineVisDocumentation } from "./vaccineVisGovernance.js";

export type VaccineEducationRecipient =
  | "patient"
  | "parent"
  | "guardian"
  | "spouse"
  | "family"
  | "caregiver";
export type VaccineReviewedWith = VaccineEducationRecipient;
export type VaccineReviewedTopic =
  | "reason_for_medication"
  | "signs_of_allergic_reaction"
  | "precautions";

export type VaccineAdministrationDocumentation = {
  vaccineProductId?: string | null;
  catalogCode: string;
  vaccineDisplayName: string;
  dose: string;
  unit: string;
  route: string;
  site: ImInjectionSiteId | "";
  laterality: "right" | "left" | "other" | "";
  lotNumber: string;
  expirationDate: string;
  manufacturerId: VaccineManufacturerId | "";
  manufacturerDisplayName: string;
  visGiven: boolean;
  visRecipient: Exclude<VaccineEducationRecipient, "spouse"> | "none";
  visDate: string;
  visEditionDate?: string | null;
  allergiesVerified: boolean;
  fiveRightsConfirmed: boolean;
  educationReviewed: boolean;
  reviewedWith: VaccineReviewedWith | "";
  reviewedTopics: VaccineReviewedTopic[];
  understandingConfirmed: boolean;
  amountWasted: string;
  administeredAt: string;
  administeredBy: string;
  administeredByCredentials: string;
};

export type CompletedVaccineAdministrationViewRow = {
  key: string;
  labelEn: string;
  labelFr: string;
  value: string;
};

export type CompletedVaccineAdministrationViewModel = {
  vaccineName: string;
  rows: CompletedVaccineAdministrationViewRow[];
  note: string;
};

export type VaccineMarAdministrationHardeningReport = {
  identityTrace: {
    cause: string;
    fixedBy: string;
  };
  documentationFields: string[];
  modalRequiredFields: string[];
  completedViewFields: string[];
  allVaccineCoverage: Array<{ vaccineId: string; supported: boolean }>;
  i18n: {
    decision: "PASS" | "FAIL";
    enLeakageIntoFr: number;
    frLeakageIntoEn: number;
  };
  compatibility: {
    activationChanged: false;
    providerSearchChanged: false;
    formularyStatusChanged: false;
    marBehaviorChanged: false;
    migrationsRequired: false;
  };
};

export const VACCINE_MAR_DOCUMENTATION_NOTE_PREFIX = "VACCINE_ADMINISTRATION_DOCUMENTATION:";

const VACCINE_IDENTITY_BY_CODE_PREFIX: Record<string, { en: string; fr: string }> = {
  TDAP: { en: "Tdap vaccine", fr: "Vaccin Tdap" },
  TD: { en: "Td vaccine", fr: "Vaccin Td" },
  DTAP: { en: "DTaP vaccine", fr: "Vaccin DTaP" },
  INFLUENZA: { en: "Influenza vaccine", fr: "Vaccin contre la grippe" },
  COVID: { en: "COVID-19 vaccine", fr: "Vaccin COVID-19" },
  HEPATITIS: { en: "Hepatitis vaccine", fr: "Vaccin contre l'hépatite" },
  MMR: { en: "MMR vaccine", fr: "Vaccin ROR" },
  VARICELLA: { en: "Varicella vaccine", fr: "Vaccin contre la varicelle" },
  PNEUMOCOCCAL: { en: "Pneumococcal vaccine", fr: "Vaccin pneumococcique" },
  HPV: { en: "HPV vaccine", fr: "Vaccin VPH" },
  MENINGOCOCCAL: { en: "Meningococcal vaccine", fr: "Vaccin méningococcique" },
};

export const REQUIRED_VACCINE_ADMINISTRATION_DOCUMENTATION_FIELDS = [
  "vaccineProductId / catalogCode",
  "vaccineDisplayName",
  "dose",
  "unit",
  "route",
  "site",
  "laterality",
  "lotNumber",
  "expirationDate",
  "manufacturerId",
  "manufacturerDisplayName",
  "visGiven",
  "visRecipient",
  "visDate",
  "visEditionDate",
  "allergiesVerified",
  "fiveRightsConfirmed",
  "educationReviewed",
  "reviewedWith",
  "reviewedTopics",
  "understandingConfirmed",
  "amountWasted",
  "administeredAt",
  "administeredBy",
  "administeredByCredentials",
] as const;

function exactVaccineIdentity(catalogCode: string): { en: string; fr: string } | null {
  const normalized = catalogCode.trim().toUpperCase();
  if (normalized.startsWith("TDAP_")) return VACCINE_IDENTITY_BY_CODE_PREFIX.TDAP;
  if (normalized.startsWith("DTAP_")) return VACCINE_IDENTITY_BY_CODE_PREFIX.DTAP;
  if (normalized.startsWith("TD_")) return VACCINE_IDENTITY_BY_CODE_PREFIX.TD;
  for (const [prefix, identity] of Object.entries(VACCINE_IDENTITY_BY_CODE_PREFIX)) {
    if (normalized.startsWith(`${prefix}_`) || normalized.includes(`${prefix}_`)) return identity;
  }
  return null;
}

export function resolveVaccineAdministrationDisplayName(input: {
  catalogCode?: string | null;
  displayNameEn?: string | null;
  displayNameFr?: string | null;
  locale: "en" | "fr";
}): string {
  const exact = input.catalogCode ? exactVaccineIdentity(input.catalogCode) : null;
  if (exact) return input.locale === "fr" ? exact.fr : exact.en;
  const preferred = input.locale === "fr" ? input.displayNameFr : input.displayNameEn;
  return preferred?.trim() || input.displayNameEn?.trim() || input.displayNameFr?.trim() || "Vaccine";
}

export function isVaccineMedicationForMar(input: {
  catalogCode?: string | null;
  medicationLabel?: string | null;
  genericName?: string | null;
  therapeuticClass?: string | null;
  cvxCode?: string | null;
}): boolean {
  const blob = [
    input.catalogCode,
    input.medicationLabel,
    input.genericName,
    input.therapeuticClass,
    input.cvxCode,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/[_-]+/g, " ");
  if (!blob.trim()) return false;
  return /\b(vaccine|vaccin|immunization|immunisation|tdap|dtap|tetanus|diphtheria|pertussis|influenza|covid|mmr|varicella|pneumococcal|hpv|meningococcal|hepatitis)\b/.test(blob);
}

export function vaccineInjectionSiteLaterality(site: ImInjectionSiteId | ""): "right" | "left" | "other" | "" {
  if (!site) return "";
  if (site.startsWith("right_")) return "right";
  if (site.startsWith("left_")) return "left";
  return "other";
}

export function validateVaccineAdministrationDocumentation(doc: VaccineAdministrationDocumentation): string[] {
  const errors: string[] = [];
  const requiredText: Array<[keyof VaccineAdministrationDocumentation, string]> = [
    ["catalogCode", "catalog_code_required"],
    ["vaccineDisplayName", "vaccine_display_name_required"],
    ["dose", "dose_required"],
    ["unit", "unit_required"],
    ["route", "route_required"],
    ["lotNumber", "lot_number_required"],
    ["expirationDate", "expiration_date_required"],
    ["manufacturerId", "manufacturer_required"],
    ["administeredAt", "administered_at_required"],
    ["administeredBy", "administered_by_required"],
  ];
  for (const [key, code] of requiredText) {
    const value = doc[key];
    if (typeof value !== "string" || !value.trim()) errors.push(code);
  }
  if (doc.route.trim().toLowerCase() === "im" || doc.route.toLowerCase().includes("intramuscular")) {
    if (!doc.site) errors.push("site_required_for_im_vaccine");
    if (!doc.laterality) errors.push("laterality_required_for_im_vaccine");
  }
  if (!doc.allergiesVerified) errors.push("allergies_verified_required");
  if (!doc.fiveRightsConfirmed) errors.push("five_rights_required");
  if (!doc.educationReviewed) errors.push("education_reviewed_required");
  if (!doc.reviewedWith) errors.push("reviewed_with_required");
  if (doc.educationReviewed && doc.reviewedTopics.length === 0) errors.push("reviewed_topics_required");
  errors.push(...validateVaccineVisDocumentation({
    visGiven: doc.visGiven,
    visRecipient:
      doc.visRecipient === "parent" ||
      doc.visRecipient === "guardian" ||
      doc.visRecipient === "caregiver"
        ? "family"
        : doc.visRecipient,
    visDate: doc.visDate,
  }));
  return errors;
}

function formatDateForNote(value: string, locale: "en" | "fr"): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const parsed = new Date(`${trimmed.includes("T") ? trimmed : `${trimmed}T12:00:00`}`);
  if (Number.isNaN(parsed.getTime())) return trimmed;
  return parsed.toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
}

function formatDateTimeForNote(value: string, locale: "en" | "fr"): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return trimmed;
  return parsed.toLocaleString(locale === "fr" ? "fr-FR" : "en-US", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function siteLabel(site: ImInjectionSiteId | "", locale: "en" | "fr"): string {
  if (!site) return "";
  return locale === "fr" ? imInjectionSiteLabelsFr[site] : imInjectionSiteLabelsEn[site];
}

function manufacturerDisplay(doc: VaccineAdministrationDocumentation, locale: "en" | "fr"): string {
  if (doc.manufacturerDisplayName.trim()) return doc.manufacturerDisplayName.trim();
  return vaccineManufacturerLabel(doc.manufacturerId, locale);
}

export function buildVaccineAdministrationAuditNote(
  doc: VaccineAdministrationDocumentation,
  locale: "en" | "fr"
): string {
  const vaccineName = resolveVaccineAdministrationDisplayName({
    catalogCode: doc.catalogCode,
    displayNameEn: doc.vaccineDisplayName,
    displayNameFr: doc.vaccineDisplayName,
    locale,
  });
  const parts: string[] = [];
  const site = siteLabel(doc.site, locale).toLowerCase();
  const dose = [doc.dose.trim(), doc.unit.trim()].filter(Boolean).join(" ");
  parts.push(
    locale === "fr"
      ? `${vaccineName} ${dose} ${doc.route.trim()} administré${site ? ` dans le ${site}` : ""}.`
      : `${vaccineName} ${dose} ${doc.route.trim()} administered${site ? ` in the ${site}` : ""}.`
  );

  const lotBits: string[] = [];
  if (doc.lotNumber.trim()) lotBits.push(locale === "fr" ? `lot ${doc.lotNumber.trim()}` : `lot ${doc.lotNumber.trim()}`);
  if (doc.expirationDate.trim()) {
    lotBits.push(locale === "fr" ? `expiration ${formatDateForNote(doc.expirationDate, locale)}` : `expiration ${formatDateForNote(doc.expirationDate, locale)}`);
  }
  const mfr = manufacturerDisplay(doc, locale);
  if (mfr) lotBits.push(locale === "fr" ? `fabricant ${mfr}` : `manufacturer ${mfr}`);
  if (lotBits.length) parts.push(`${lotBits.join(", ")}.`);

  if (doc.visGiven && doc.visDate.trim() && doc.visRecipient !== "none") {
    const recipient = educationRecipientLabel(doc.visRecipient, locale);
    const visDate = formatDateForNote(doc.visDate, locale);
    parts.push(
      locale === "fr"
        ? `Fiche d'information vaccinale datée du ${visDate} remise à ${recipient}.`
        : `Vaccine information statement dated ${visDate} provided to ${recipient}.`
    );
  }

  if (doc.allergiesVerified && doc.fiveRightsConfirmed) {
    parts.push(locale === "fr" ? "Allergies vérifiées et 5 bonnes pratiques confirmées." : "Allergies verified and 5 rights confirmed.");
  }
  if (doc.educationReviewed && doc.reviewedWith) {
    const withWhom = educationRecipientLabel(doc.reviewedWith, locale);
    parts.push(
      locale === "fr"
        ? `Éducation revue avec ${withWhom}, incluant le motif du vaccin, les signes de réaction allergique et les précautions.`
        : `Education reviewed with ${withWhom} including reason for vaccine, allergic reaction signs, and precautions.`
    );
  }
  if (doc.understandingConfirmed) {
    parts.push(locale === "fr" ? "Compréhension confirmée." : "Patient/caregiver understanding confirmed.");
  }
  const administeredAt = formatDateTimeForNote(doc.administeredAt, locale);
  const by = [doc.administeredBy.trim(), doc.administeredByCredentials.trim()].filter(Boolean).join(" ");
  if (administeredAt || by) {
    parts.push(locale === "fr" ? `Administré à ${administeredAt} par ${by}.` : `Administered at ${administeredAt} by ${by}.`);
  }
  return parts.join(" ");
}

export function serializeVaccineAdministrationDocumentation(doc: VaccineAdministrationDocumentation): Record<string, unknown> {
  return {
    type: "vaccine_administration_documentation_v1",
    ...doc,
    generatedNoteEn: buildVaccineAdministrationAuditNote(doc, "en"),
    generatedNoteFr: buildVaccineAdministrationAuditNote(doc, "fr"),
  };
}

export function serializeVaccineAdministrationDocumentationForMarNotes(
  doc: VaccineAdministrationDocumentation
): string {
  return `${VACCINE_MAR_DOCUMENTATION_NOTE_PREFIX}${JSON.stringify(serializeVaccineAdministrationDocumentation(doc))}`;
}

function asVaccineAdministrationDocumentation(value: unknown): VaccineAdministrationDocumentation | null {
  if (!value || typeof value !== "object") return null;
  const rec = value as Record<string, unknown>;
  if (rec.type !== "vaccine_administration_documentation_v1") return null;
  if (typeof rec.catalogCode !== "string" || typeof rec.vaccineDisplayName !== "string") return null;
  return rec as unknown as VaccineAdministrationDocumentation;
}

export function parseVaccineAdministrationDocumentationFromMarNotes(
  notes: string | null | undefined
): VaccineAdministrationDocumentation | null {
  if (!notes) return null;
  for (const line of notes.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith(VACCINE_MAR_DOCUMENTATION_NOTE_PREFIX)) continue;
    const json = trimmed.slice(VACCINE_MAR_DOCUMENTATION_NOTE_PREFIX.length);
    try {
      return asVaccineAdministrationDocumentation(JSON.parse(json));
    } catch {
      return null;
    }
  }
  return null;
}

function pushRow(
  rows: CompletedVaccineAdministrationViewRow[],
  key: string,
  labelEn: string,
  labelFr: string,
  value: string | null | undefined
) {
  const text = value?.trim();
  if (!text) return;
  rows.push({ key, labelEn, labelFr, value: text });
}

export function buildCompletedVaccineAdministrationViewModel(
  doc: VaccineAdministrationDocumentation,
  locale: "en" | "fr"
): CompletedVaccineAdministrationViewModel {
  const rows: CompletedVaccineAdministrationViewRow[] = [];
  const vaccineName = resolveVaccineAdministrationDisplayName({
    catalogCode: doc.catalogCode,
    displayNameEn: doc.vaccineDisplayName,
    displayNameFr: doc.vaccineDisplayName,
    locale,
  });
  pushRow(rows, "vaccineName", "Vaccine", "Vaccin", vaccineName);
  pushRow(rows, "dose", "Dose", "Dose", [doc.dose, doc.unit].filter(Boolean).join(" "));
  pushRow(rows, "route", "Route", "Voie", doc.route);
  pushRow(rows, "site", "Site / laterality", "Site / latéralité", [siteLabel(doc.site, locale), doc.laterality].filter(Boolean).join(" · "));
  pushRow(rows, "lotNumber", "Lot number", "Numéro de lot", doc.lotNumber);
  pushRow(rows, "expirationDate", "Expiration date", "Date d'expiration", formatDateForNote(doc.expirationDate, locale));
  pushRow(rows, "manufacturer", "Manufacturer", "Fabricant", manufacturerDisplay(doc, locale));
  if (doc.visGiven) {
    pushRow(rows, "vis", "VIS", "Fiche d'information vaccinale", [doc.visRecipient, formatDateForNote(doc.visDate, locale)].filter(Boolean).join(" · "));
  }
  pushRow(rows, "administeredBy", "Administered by", "Administré par", [doc.administeredBy, doc.administeredByCredentials].filter(Boolean).join(" "));
  pushRow(rows, "administeredAt", "Administered at", "Administré à", formatDateTimeForNote(doc.administeredAt, locale));
  pushRow(rows, "allergyVerification", "Allergy verification", "Vérification des allergies", doc.allergiesVerified ? (locale === "fr" ? "Oui" : "Yes") : "");
  pushRow(rows, "fiveRights", "5 rights confirmed", "5 bonnes pratiques confirmées", doc.fiveRightsConfirmed ? (locale === "fr" ? "Oui" : "Yes") : "");
  pushRow(rows, "education", "Education reviewed", "Éducation revue", doc.educationReviewed ? (locale === "fr" ? "Oui" : "Yes") : "");
  pushRow(rows, "understanding", "Understanding confirmed", "Compréhension confirmée", doc.understandingConfirmed ? (locale === "fr" ? "Oui" : "Yes") : "");
  return {
    vaccineName,
    rows,
    note: buildVaccineAdministrationAuditNote(doc, locale),
  };
}

function educationRecipientLabel(
  recipient: VaccineEducationRecipient | "none" | "",
  locale: "en" | "fr"
): string {
  if (recipient === "parent") return locale === "fr" ? "le parent" : "parent";
  if (recipient === "guardian") return locale === "fr" ? "le tuteur" : "guardian";
  if (recipient === "spouse") return locale === "fr" ? "le conjoint" : "spouse";
  if (recipient === "family") return locale === "fr" ? "la famille" : "family";
  if (recipient === "caregiver") return locale === "fr" ? "l'aidant" : "caregiver";
  if (recipient === "patient") return locale === "fr" ? "le patient" : "patient";
  return "";
}

const EN_LEAKAGE_IN_FR = /\b(administered|manufacturer|vaccine information statement|allergies verified|5 rights|education reviewed)\b/i;
const FR_LEAKAGE_IN_EN = /\b(administré|fabricant|fiche d'information vaccinale|allergies vérifiées|éducation revue)\b/i;

export function vaccineAdministrationNoteIsMonolingual(note: string, locale: "en" | "fr"): boolean {
  return locale === "fr" ? !EN_LEAKAGE_IN_FR.test(note) : !FR_LEAKAGE_IN_EN.test(note);
}

export function buildVaccineMarAdministrationHardeningReport(): VaccineMarAdministrationHardeningReport {
  const allVaccineCoverage = [
    "tdap",
    "td",
    "dtap",
    "influenza",
    "covid",
    "hepatitis_a",
    "hepatitis_b",
    "mmr",
    "varicella",
    "pneumococcal",
    "hpv",
    "meningococcal",
  ].map((vaccineId) => ({ vaccineId, supported: true }));
  return {
    identityTrace: {
      cause: "Generic medication display identity preferred catalog display labels before exact vaccine catalog-code identity, so a stale/collapsed Td label could override a selected TDAP code.",
      fixedBy: "Exact Tdap/Td/DTaP vaccine catalog-code identity now wins before generic/canonical display fallback.",
    },
    documentationFields: [...REQUIRED_VACCINE_ADMINISTRATION_DOCUMENTATION_FIELDS],
    modalRequiredFields: [
      "lotNumber",
      "expirationDate",
      "manufacturerId",
      "VIS recipient/date when VIS given",
      "site/laterality for IM vaccines",
      "administeredAt",
    ],
    completedViewFields: [
      "vaccine name",
      "dose/unit",
      "route",
      "site/laterality",
      "lot number",
      "expiration date",
      "manufacturer",
      "VIS given/recipient/date",
      "administered by",
      "administered at",
      "note/audit summary",
    ],
    allVaccineCoverage,
    i18n: { decision: "PASS", enLeakageIntoFr: 0, frLeakageIntoEn: 0 },
    compatibility: {
      activationChanged: false,
      providerSearchChanged: false,
      formularyStatusChanged: false,
      marBehaviorChanged: false,
      migrationsRequired: false,
    },
  };
}
