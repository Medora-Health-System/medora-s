/**
 * Procédures infirmières structurées (extension de nursingEvalV1) — léger, extensible.
 * Commence par la pose de voie IV ; autres procédures pourront s’ajouter sous proceduresV1.
 */

import type { SupportedLanguage } from "@/i18n/config";

export const IV_SITE_OPTIONS_FR = [
  "RAC",
  "RAS",
  "LAC",
  "LAS",
  "Main droite",
  "Main gauche",
  "Pied droit",
  "Pied gauche",
  "Autre",
] as const;

export type IvSiteOptionFr = (typeof IV_SITE_OPTIONS_FR)[number];

/** Données persistées pour une pose de voie IV (nursingEvalV1.proceduresV1.ivInsertion). */
export type IvInsertionProcedureV1 = {
  performed: boolean;
  site?: string;
  /** Précision si site === « Autre » */
  siteOther?: string;
  /** Ex. 20G, 22G */
  gauge?: string;
  /** ISO 8601 */
  performedAt?: string;
  note?: string;
};

/** Enveloppe versionnée — autres clés possibles plus tard (ex. suture, pansement). */
export type NursingProceduresV1 = {
  ivInsertion?: IvInsertionProcedureV1;
};

function readProceduresV1FromNursing(raw: unknown): NursingProceduresV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const inner = o.nursingEvalV1;
  if (!inner || typeof inner !== "object") return null;
  const pv = (inner as Record<string, unknown>).proceduresV1;
  if (!pv || typeof pv !== "object") return null;
  return pv as NursingProceduresV1;
}

/** Extrait proceduresV1 depuis le JSON nursingAssessment racine. */
export function parseNursingProceduresV1(raw: unknown): NursingProceduresV1 | null {
  return readProceduresV1FromNursing(raw);
}

/** Ligne lisible pour le dossier (une phrase) — modèle d’affichage selon la langue d’établissement. */
export function formatIvInsertionLineForLocale(
  iv: IvInsertionProcedureV1,
  language: SupportedLanguage
): string | null {
  if (!iv.performed) return null;
  const bits: string[] = [];
  let siteDisplay = iv.site?.trim() || "";
  if (siteDisplay === "Autre" && iv.siteOther?.trim()) {
    siteDisplay = iv.siteOther.trim();
  } else if (siteDisplay === "Autre") {
    siteDisplay = language === "en" ? "Other" : "Autre";
  }
  if (siteDisplay) bits.push(siteDisplay);
  if (iv.gauge?.trim()) {
    bits.push(
      language === "en" ? `gauge ${iv.gauge.trim()}` : `calibre ${iv.gauge.trim()}`
    );
  }
  if (iv.performedAt) {
    try {
      const loc = language === "en" ? "en-US" : "fr-FR";
      const dts = new Date(iv.performedAt).toLocaleString(loc);
      bits.push(language === "en" ? `on ${dts}` : `le ${dts}`);
    } catch {
      /* ignore */
    }
  }
  if (iv.note?.trim()) bits.push(iv.note.trim());
  const detail = bits.join(", ");
  if (language === "en") {
    return detail ? `IV line placed: ${detail}` : "IV line placed";
  }
  return detail ? `Voie IV posée : ${detail}` : "Voie IV posée";
}

/** Ligne française lisible pour le dossier (une phrase). */
export function formatIvInsertionLineFr(iv: IvInsertionProcedureV1): string | null {
  return formatIvInsertionLineForLocale(iv, "fr");
}

/** Blocs pour timeline / impression (même forme que les sections texte). */
export function parseNursingProceduresForChart(
  raw: unknown,
  language: SupportedLanguage = "fr"
): { label: string; text: string }[] {
  const proc = parseNursingProceduresV1(raw);
  if (!proc?.ivInsertion?.performed) return [];
  const line = formatIvInsertionLineForLocale(proc.ivInsertion, language);
  if (!line) return [];
  return [
    {
      label: language === "en" ? "Nursing procedures" : "Procédures infirmières",
      text: line,
    },
  ];
}

/** Lignes courtes pour résumé (liste de chaînes). */
export function nursingProcedureSummaryLinesForLocale(
  raw: unknown,
  language: SupportedLanguage
): string[] {
  const proc = parseNursingProceduresV1(raw);
  if (!proc?.ivInsertion?.performed) return [];
  const line = formatIvInsertionLineForLocale(proc.ivInsertion, language);
  return line ? [line] : [];
}

/** Lignes courtes pour résumé (liste de chaînes). */
export function nursingProcedureSummaryLinesFr(raw: unknown): string[] {
  return nursingProcedureSummaryLinesForLocale(raw, "fr");
}

export function parseIvInsertionFromNursing(raw: unknown): IvInsertionProcedureV1 {
  const p = parseNursingProceduresV1(raw);
  const iv = p?.ivInsertion;
  if (!iv) return { performed: false };
  return {
    performed: Boolean(iv.performed),
    site: typeof iv.site === "string" ? iv.site : undefined,
    siteOther: typeof iv.siteOther === "string" ? iv.siteOther : undefined,
    gauge: typeof iv.gauge === "string" ? iv.gauge : undefined,
    performedAt: typeof iv.performedAt === "string" ? iv.performedAt : undefined,
    note: typeof iv.note === "string" ? iv.note : undefined,
  };
}
