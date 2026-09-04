/**
 * Shared clinical documentation attribution formatting for ED and encounter modules.
 * Centralizes author / updater / role / datetime display — do not duplicate inline.
 */

import { defaultLanguage, pickProductUiCopy, productUiBcp47Tag, type SupportedLanguage } from "@/i18n/config";

export type DocumentationAttributionInput = {
  name?: string | null;
  role?: string | null;
  at?: string | Date | null;
};

export type DocumentationUpdateAttributionInput = DocumentationAttributionInput & {
  updatedByName?: string | null;
  updatedByRole?: string | null;
  updatedAt?: string | Date | null;
};

const ROLE_LABELS_FR: Record<string, string> = {
  PROVIDER: "Médecin",
  RN: "Infirmier(ère)",
  ADMIN: "Administrateur",
  LAB: "Technicien laboratoire",
  RADIOLOGY: "Technicien imagerie",
  PHARMACY: "Pharmacie",
  FRONT_DESK: "Accueil",
};

const ROLE_LABELS_EN: Record<string, string> = {
  PROVIDER: "Physician",
  RN: "Nurse",
  ADMIN: "Administrator",
  LAB: "Lab technician",
  RADIOLOGY: "Radiology technician",
  PHARMACY: "Pharmacy",
  FRONT_DESK: "Front desk",
};

function dateLocale(language?: SupportedLanguage): string {
  return productUiBcp47Tag(language ?? defaultLanguage);
}

/** Locale-aware clinical date/time for documentation footers. */
export function formatClinicalDateTime(
  value: string | Date | null | undefined,
  language?: SupportedLanguage
): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(dateLocale(language), { dateStyle: "short", timeStyle: "short" });
}

const ROLE_LABELS_ES: Record<string, string> = {
  PROVIDER: "Profesional clínico",
  RN: "Enfermero",
  ADMIN: "Administrador",
  LAB: "Técnico de laboratorio",
  RADIOLOGY: "Técnico de imagen",
  PHARMACY: "Farmacia",
  FRONT_DESK: "Recepción",
};

const ROLE_LABELS = {
  en: ROLE_LABELS_EN,
  fr: ROLE_LABELS_FR,
  es: ROLE_LABELS_ES,
};

/** Map stored role code(s) to a display title; preserves unknown codes verbatim. */
export function resolveRoleTitleLabel(
  role: string | null | undefined,
  language?: SupportedLanguage
): string {
  const raw = (role ?? "").trim();
  if (!raw) return "";
  const map = pickProductUiCopy(language ?? defaultLanguage, ROLE_LABELS, ROLE_LABELS.es);
  const parts = raw.split("|").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return raw;
  return parts.map((p) => map[p] ?? p).join(", ");
}

function displayName(name: string | null | undefined, unknownLabel: string): string {
  const trimmed = (name ?? "").trim();
  return trimmed || unknownLabel;
}

function roleSuffix(role: string | null | undefined, language?: SupportedLanguage): string {
  const label = resolveRoleTitleLabel(role, language);
  return label ? ` (${label})` : "";
}

function fillTemplate(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce((out, [key, value]) => out.split(`{${key}}`).join(value), template);
}

export type DocumentationAttributionLabels = {
  authorLine: string;
  updatedLine: string;
  unknownAuthor: string;
};

const ATTRIBUTION_LABELS = {
  en: {
    authorLine: "Documented by {name}{role} · {datetime}",
    updatedLine: "Last updated by {name}{role} · {datetime}",
    unknownAuthor: "Unknown author",
  },
  fr: {
    authorLine: "Documenté par {name}{role} · {datetime}",
    updatedLine: "Dernière mise à jour par {name}{role} · {datetime}",
    unknownAuthor: "Auteur inconnu",
  },
  es: {
    authorLine: "Documentado por {name}{role} · {datetime}",
    updatedLine: "Última actualización por {name}{role} · {datetime}",
    unknownAuthor: "Autor desconocido",
  },
};

export function defaultDocumentationAttributionLabels(language?: SupportedLanguage): DocumentationAttributionLabels {
  return pickProductUiCopy(language ?? defaultLanguage, ATTRIBUTION_LABELS, ATTRIBUTION_LABELS.es);
}

/** Primary author attribution line for documentation cards. */
export function formatDocumentationAuthorLine(
  input: DocumentationAttributionInput,
  language?: SupportedLanguage,
  labels?: Partial<DocumentationAttributionLabels>
): string {
  const l = { ...defaultDocumentationAttributionLabels(language), ...labels };
  const datetime = formatClinicalDateTime(input.at, language);
  if (!datetime && !(input.name ?? "").trim()) return "";
  return fillTemplate(l.authorLine, {
    name: displayName(input.name, l.unknownAuthor),
    role: roleSuffix(input.role, language),
    datetime: datetime || "—",
  });
}

/** Last-updated attribution when updater differs from author or updatedAt is present. */
export function formatDocumentationUpdatedLine(
  input: DocumentationUpdateAttributionInput,
  language?: SupportedLanguage,
  labels?: Partial<DocumentationAttributionLabels>
): string | null {
  const l = { ...defaultDocumentationAttributionLabels(language), ...labels };
  const updatedAt = formatClinicalDateTime(input.updatedAt, language);
  const updatedBy = (input.updatedByName ?? "").trim();
  if (!updatedBy && !updatedAt) return null;
  const authorName = (input.name ?? "").trim();
  const sameActor =
    updatedBy &&
    authorName &&
    updatedBy === authorName &&
    !input.updatedByRole?.trim() &&
    formatClinicalDateTime(input.at, language) === updatedAt;
  if (sameActor) return null;
  return fillTemplate(l.updatedLine, {
    name: displayName(updatedBy || input.name, l.unknownAuthor),
    role: roleSuffix(input.updatedByRole ?? input.role, language),
    datetime: updatedAt || formatClinicalDateTime(input.at, language) || "—",
  });
}

/** Compact resulted / acknowledged pair for lab/radiology summary lines. */
export function formatResultAttributionPair(input: {
  resultedBy?: string | null;
  resultedByRole?: string | null;
  resultedAt?: string | Date | null;
  acknowledgedBy?: string | null;
  acknowledgedByRole?: string | null;
  acknowledgedAt?: string | Date | null;
  language?: SupportedLanguage;
}): string[] {
  const lines: string[] = [];
  const lang = input.language ?? defaultLanguage;
  const resulted = formatDocumentationAuthorLine(
    { name: input.resultedBy, role: input.resultedByRole, at: input.resultedAt },
    lang,
    pickProductUiCopy(
      lang,
      {
        en: { authorLine: "Resulted by {name}{role} · {datetime}" },
        fr: { authorLine: "Résultat saisi par {name}{role} · {datetime}" },
        es: { authorLine: "Resultado registrado por {name}{role} · {datetime}" },
      },
      { authorLine: "Resultado registrado por {name}{role} · {datetime}" }
    )
  );
  if (resulted) lines.push(resulted);
  const ack = formatDocumentationAuthorLine(
    { name: input.acknowledgedBy, role: input.acknowledgedByRole, at: input.acknowledgedAt },
    lang,
    pickProductUiCopy(
      lang,
      {
        en: { authorLine: "Acknowledged by {name}{role} · {datetime}" },
        fr: { authorLine: "Accusé réception par {name}{role} · {datetime}" },
        es: { authorLine: "Reconocido por {name}{role} · {datetime}" },
      },
      { authorLine: "Reconocido por {name}{role} · {datetime}" }
    )
  );
  if (ack && (input.acknowledgedBy ?? "").trim()) lines.push(ack);
  return lines;
}
