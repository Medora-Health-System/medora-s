/**
 * Normalisation affichage résultats labo / imagerie (consultation + dossier).
 * Données brutes inchangées côté stockage ; uniquement mapping UI.
 */

import {
  extractExplicitLabResultFlag,
  parseLabReferenceRange,
  resolveLabParsedRowFlag,
} from "@medora/shared";

import type { SupportedLanguage } from "@/i18n/config";
import type { ChartSummaryOrderItem } from "@/lib/chartApi";
import { chartSummaryOrderItemLineLabel } from "@/lib/chartSummaryOrderLabel";

export type ResultAttachmentRow = {
  fileName?: string | null;
  mimeType?: string | null;
  dataBase64?: string | null;
};

/** Pièces jointes : toutes les entrées (y compris sans base64) pour message FR explicite. */
export function attachmentsFromResultDataAll(resultData: unknown): ResultAttachmentRow[] {
  if (!resultData || typeof resultData !== "object" || Array.isArray(resultData)) return [];
  const att = (resultData as Record<string, unknown>).attachments;
  if (!Array.isArray(att)) return [];
  return att
    .filter((a) => a && typeof a === "object")
    .map((a) => {
      const o = a as Record<string, unknown>;
      return {
        fileName: typeof o.fileName === "string" ? o.fileName : null,
        mimeType: typeof o.mimeType === "string" ? o.mimeType : null,
        dataBase64: typeof o.dataBase64 === "string" ? o.dataBase64 : null,
      };
    });
}

export type ClinicalResultViewerInput = {
  title: string;
  itemStatus?: string | null;
  verifiedAt?: string | null;
  /** Documented result time (system); defaults to verifiedAt when dual display off. */
  resultDocumentedAt?: string | null;
  /** Clinical/effective result time when adjusted (lab resulted / imaging finalized). */
  resultClinicalAt?: string | null;
  resultEffectiveVersion?: number;
  criticalValue?: boolean | null;
  resultText?: string | null;
  /** Full Result.resultData (structured LAB/IMAGING + attachments). */
  resultData?: unknown;
  attachments?: ResultAttachmentRow[] | null;
  /** Nom affichage du professionnel ayant saisi / validé le résultat */
  enteredByDisplayFr?: string | null;
  /** Clinicien ayant accusé réception du résultat (séparé de l'auteur du résultat). */
  acknowledgedByDisplayFr?: string | null;
  acknowledgedByProviderAt?: string | null;
  /** Pour mise en page labo vs imagerie */
  catalogItemType?: "LAB_TEST" | "IMAGING_STUDY";
};

/** Ligne commande enrichie (GET encounter orders ou résumé dossier). */
export function clinicalResultFromOrderItemLike(item: {
  displayLabel?: string;
  displayLabelEn?: string;
  status?: string;
  catalogItemType?: string;
  result?: {
    resultText?: string | null;
    verifiedAt?: string | null;
    effectiveResultedAt?: string | null;
    effectiveResultedAtVersion?: number;
    effectiveFinalizedAt?: string | null;
    effectiveFinalizedAtVersion?: number;
    criticalValue?: boolean | null;
    resultData?: unknown;
    enteredByDisplayFr?: string | null;
    acknowledgedByDisplayFr?: string | null;
    acknowledgedByProviderAt?: string | null;
  } | null;
  /** When no display label is available (locale-aware UI). */
  emptyTitleFallback?: string;
}): ClinicalResultViewerInput {
  /** Prefer explicit localized `displayLabel` when callers set it (e.g. encounter results tab). */
  const title =
    (item.displayLabel ?? item.displayLabelEn ?? "").trim() ||
    item.emptyTitleFallback?.trim() ||
    "—";
  const r = item.result;
  const documentedAt = r?.verifiedAt ?? null;
  const isLab = item.catalogItemType === "LAB_TEST";
  const isRad = item.catalogItemType === "IMAGING_STUDY";
  const clinicalAt = isLab
    ? r?.effectiveResultedAt ?? documentedAt
    : isRad
      ? r?.effectiveFinalizedAt ?? documentedAt
      : documentedAt;
  const effectiveVersion = isLab
    ? r?.effectiveResultedAtVersion ?? 0
    : isRad
      ? r?.effectiveFinalizedAtVersion ?? 0
      : 0;
  return {
    title,
    itemStatus: item.status ?? null,
    verifiedAt: documentedAt,
    resultDocumentedAt: documentedAt,
    resultClinicalAt: clinicalAt,
    resultEffectiveVersion: effectiveVersion,
    criticalValue: r?.criticalValue ?? null,
    resultText: r?.resultText ?? null,
    resultData: r?.resultData ?? null,
    attachments: attachmentsFromResultDataAll(r?.resultData ?? null),
    enteredByDisplayFr: r?.enteredByDisplayFr ?? null,
    acknowledgedByDisplayFr: r?.acknowledgedByDisplayFr ?? null,
    acknowledgedByProviderAt: r?.acknowledgedByProviderAt ?? null,
    catalogItemType:
      item.catalogItemType === "LAB_TEST" || item.catalogItemType === "IMAGING_STUDY"
        ? item.catalogItemType
        : undefined,
  };
}

/** Résumé dossier patient : pièces déjà aplanies par l’API (`attachments`). */
export function clinicalResultFromChartOrderItem(
  item: {
    displayLabel: string;
    displayLabelFr?: string;
    displayLabelEn?: string;
    status: string;
    catalogItemType?: string;
    result: {
      resultText: string | null;
      resultData?: unknown;
      verifiedAt: string | null;
      effectiveResultedAt?: string | null;
      effectiveResultedAtVersion?: number;
      effectiveFinalizedAt?: string | null;
      effectiveFinalizedAtVersion?: number;
      criticalValue: boolean;
      enteredByDisplayFr?: string | null;
      acknowledgedByDisplayFr?: string | null;
      acknowledgedByProviderAt?: string | null;
      attachments?: ResultAttachmentRow[] | null;
    } | null;
  },
  language: SupportedLanguage,
  t?: (key: string) => string
): ClinicalResultViewerInput {
  const title = chartSummaryOrderItemLineLabel(item as ChartSummaryOrderItem, language, t);
  const r = item.result;
  const documentedAt = r?.verifiedAt ?? null;
  const isLab = item.catalogItemType === "LAB_TEST";
  const isRad = item.catalogItemType === "IMAGING_STUDY";
  const clinicalAt = isLab
    ? r?.effectiveResultedAt ?? documentedAt
    : isRad
      ? r?.effectiveFinalizedAt ?? documentedAt
      : documentedAt;
  const effectiveVersion = isLab
    ? r?.effectiveResultedAtVersion ?? 0
    : isRad
      ? r?.effectiveFinalizedAtVersion ?? 0
      : 0;
  return {
    title,
    itemStatus: item.status,
    verifiedAt: documentedAt,
    resultDocumentedAt: documentedAt,
    resultClinicalAt: clinicalAt,
    resultEffectiveVersion: effectiveVersion,
    criticalValue: r?.criticalValue ?? null,
    resultText: r?.resultText ?? null,
    resultData: (r as { resultData?: unknown } | null | undefined)?.resultData ?? null,
    attachments: r?.attachments?.length ? r.attachments : [],
    enteredByDisplayFr: r?.enteredByDisplayFr ?? null,
    acknowledgedByDisplayFr: r?.acknowledgedByDisplayFr ?? null,
    acknowledgedByProviderAt: r?.acknowledgedByProviderAt ?? null,
    catalogItemType:
      item.catalogItemType === "LAB_TEST" || item.catalogItemType === "IMAGING_STUDY"
        ? item.catalogItemType
        : undefined,
  };
}

export type LabParsedRow = {
  label: string;
  value: string;
  ref?: string;
  /** Optional unit when recoverable separately from the reference range. */
  unit?: string;
  /** Indication visuelle (H/L/C) si détectée dans le texte */
  flag?: "H" | "L" | "HH" | "LL" | "C" | null;
};

const CONCLUSION_START =
  /^(conclusion|interprétation|commentaire|synthèse|interprétation\s+biologique)\b/i;

/** Ligne « titre de section » labo (non traitée comme analyte). */
function isLabSectionHeader(line: string): boolean {
  const t = line.trim();
  if (t.length > 60) return false;
  return /^(résultats?|hémogramme|biochimie|ionogramme|hémostase|urines?|nfs|numération|bilan)\b/i.test(t);
}

/** Détecte H / L / critique dans la valeur (explicit trailing flag only — not unit suffixes). */
function extractFlag(value: string): { clean: string; flag: LabParsedRow["flag"] } {
  const { cleanValue, flag } = extractExplicitLabResultFlag(value);
  return { clean: cleanValue, flag: flag as LabParsedRow["flag"] };
}

/**
 * MEDUI.RES.2 — display-only recovery for smashed CMP/CBC walls such as
 * `Glucose9270–100mg/dL—BUN146–20mg/dL—Creatinine…`.
 * Never mutates stored result text; returns rows only when confident.
 */
export function tryRecoverSmashedLabAnalytes(raw: string): LabParsedRow[] {
  const text = (raw ?? "").trim();
  if (!text) return [];
  // Dense smashed panels usually lack newlines / colons and use em/en dashes between analytes.
  if (text.includes(":") && text.includes("\n")) return [];

  const chunks = text
    .split(/\s*[—|;]\s*/)
    .map((c) => c.trim())
    .filter(Boolean);
  if (chunks.length < 2 && !/[–−-]/.test(text)) return [];

  const recovered: LabParsedRow[] = [];
  for (const chunk of chunks.length >= 2 ? chunks : [text]) {
    const row = parseSmashedAnalyteChunk(chunk);
    if (!row) {
      // One bad chunk → abort (do not partially invent a table).
      if (chunks.length >= 2) return [];
      continue;
    }
    recovered.push(row);
  }
  return recovered.length >= 2 ? recovered : [];
}

function parseSmashedAnalyteChunk(chunk: string): LabParsedRow | null {
  const c = chunk.trim();
  if (!c || c.length > 120) return null;

  // Name + valueLow + en-dash + high + optional unit
  // e.g. Glucose9270–100mg/dL  → Glucose | 92 | 70–100 | mg/dL
  const m = c.match(
    /^([A-Za-z][A-Za-z0-9 ./\-]{0,40}?)(\d[\d.,]*)[–\-−](\d[\d.,]*)\s*([A-Za-zµμ/%0-9.^ ]{0,24})$/
  );
  if (!m) return null;

  const label = m[1].trim();
  const valueLowDigits = m[2].replace(/,/g, "");
  const highRaw = m[3].replace(/,/g, "");
  const unit = m[4].trim() || undefined;
  const high = Number.parseFloat(highRaw);
  if (!label || !Number.isFinite(high)) return null;

  const split = splitSmashedValueAndLow(valueLowDigits, high);
  if (!split) return null;

  return {
    label,
    value: split.value,
    ref: `${split.low}–${highRaw}`,
    unit,
  };
}

/** Prefer a split where low < high and both sides are clinically plausible lengths. */
function splitSmashedValueAndLow(
  digits: string,
  high: number
): { value: string; low: string } | null {
  const clean = digits.replace(/[^\d.]/g, "");
  if (!clean || clean.length < 2) return null;

  let best: { value: string; low: string; score: number } | null = null;
  for (let i = 1; i < clean.length; i++) {
    const value = clean.slice(0, i);
    const low = clean.slice(i);
    if (!value || !low) continue;
    // Avoid leading-zero artifacts except decimal forms.
    if (/^0\d/.test(value) || /^0\d/.test(low)) continue;
    const v = Number.parseFloat(value);
    const l = Number.parseFloat(low);
    if (!Number.isFinite(v) || !Number.isFinite(l)) continue;
    if (!(l < high)) continue;
    // Prefer 1–4 digit value and 1–4 digit low (typical CMP).
    if (value.length > 5 || low.length > 5) continue;
    const score =
      (value.length >= 1 && value.length <= 3 ? 3 : 1) +
      (low.length >= 1 && low.length <= 3 ? 3 : 1) +
      (l > 0 ? 1 : 0);
    if (!best || score > best.score) best = { value, low, score };
  }
  return best ? { value: best.value, low: best.low } : null;
}

function parsePipeOrTabLine(line: string): LabParsedRow | null {
  if (line.includes("|")) {
    const parts = line
      .split("|")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    if (parts.length >= 4) {
      return { label: parts[0], value: parts[1], ref: parts.slice(2).join(" ") };
    }
    if (parts.length === 3) {
      const last = parts[2];
      if (/^[\d.,\s\-–—]+(\s*(g|mg|%|U\/L|\/µL|mmol|mEq))?$/i.test(last) || last.length < 30) {
        return { label: parts[0], value: parts[1], ref: parts[2] };
      }
      return { label: parts[0], value: `${parts[1]} ${parts[2]}` };
    }
    if (parts.length === 2) {
      const { clean, flag } = extractFlag(parts[1]);
      return { label: parts[0], value: clean, flag };
    }
  }
  if (line.includes("\t")) {
    const parts = line.split(/\t/).map((p) => p.trim());
    if (parts.length >= 2) {
      const { clean, flag } = extractFlag(parts[1]);
      return {
        label: parts[0],
        value: clean,
        ref: parts[2],
        flag,
      };
    }
  }
  return null;
}

/**
 * Extrait lignes labo : puces, « libellé : valeur », séparateurs | ou tab,
 * références (réf., VR, N:, plage entre parenthèses).
 */
export function parseLabObservationLines(raw: string): {
  rows: LabParsedRow[];
  preamble: string;
  conclusion: string;
  sectionNotes: string[];
} {
  const text = (raw ?? "").trim();
  if (!text) return { rows: [], preamble: "", conclusion: "", sectionNotes: [] };

  const lines = text.split(/\r?\n/).map((l) => l.trim());
  let conclusion = "";
  let bodyLines = [...lines];
  const concIdx = lines.findIndex((l) => CONCLUSION_START.test(l));
  if (concIdx >= 0) {
    const afterHeader = lines[concIdx].replace(CONCLUSION_START, "").trim();
    const rest = lines.slice(concIdx + 1);
    conclusion = [afterHeader, ...rest].filter(Boolean).join("\n").trim();
    bodyLines = lines.slice(0, concIdx);
  }

  const rows: LabParsedRow[] = [];
  const preambleParts: string[] = [];
  const sectionNotes: string[] = [];

  const tryPushRow = (r: LabParsedRow) => {
    const { clean, flag: explicitFlag } = extractFlag(r.value);
    const resolved = resolveLabParsedRowFlag({
      value: clean,
      ref: r.ref,
      explicitFlag,
    });
    rows.push({ ...r, value: clean, flag: resolved });
  };

  for (const line of bodyLines) {
    if (!line) continue;
    if (isLabSectionHeader(line)) {
      sectionNotes.push(line);
      continue;
    }

    const pipe = parsePipeOrTabLine(line);
    if (pipe) {
      tryPushRow(pipe);
      continue;
    }

    const refParen = line.match(
      /^[-•*]?\s*(.+?)\s*:\s*(.+?)\s*\(\s*(?:réf|ref|vr|n)\s*[.:]?\s*([^)]+)\)\s*$/i
    );
    if (refParen) {
      tryPushRow({ label: refParen[1].trim(), value: refParen[2].trim(), ref: refParen[3].trim() });
      continue;
    }

    const rangeParen = line.match(/^[-•*]?\s*(.+?)\s*:\s*(.+?)\s*\(\s*([^)]+)\)\s*$/i);
    if (rangeParen && parseLabReferenceRange(rangeParen[3].trim())) {
      tryPushRow({
        label: rangeParen[1].trim(),
        value: rangeParen[2].trim(),
        ref: rangeParen[3].trim(),
      });
      continue;
    }

    const refMatch = line.match(/^[-•*]?\s*(.+?)\s*:\s*(.+?)\s*\(\s*ref\s*[.:]\s*([^)]+)\)\s*$/i);
    if (refMatch) {
      tryPushRow({ label: refMatch[1].trim(), value: refMatch[2].trim(), ref: refMatch[3].trim() });
      continue;
    }

    const bullet = line.match(/^[-•*]\s*(.+?)\s*:\s*(.+)$/);
    const plain = line.match(/^([^:{]+?)\s*:\s*(.+)$/);
    if (bullet && bullet[1].length < 100) {
      tryPushRow({ label: bullet[1].trim(), value: bullet[2].trim() });
      continue;
    }
    if (plain && plain[1].length < 140 && !plain[1].includes("  ") && plain[1].split(/\s+/).length <= 12) {
      tryPushRow({ label: plain[1].trim(), value: plain[2].trim() });
      continue;
    }

    const valueFirst = line.match(
      /^(.+?)\s+([\d]+[.,]?[\d]*\s*(?:x10\^?\d+)?\s*(?:g\/dL|g\/L|mg\/dL|%|\/µL|10\^3\/µL|UI\/L|mEq\/L|mmol\/L)?)\s*$/i
    );
    if (valueFirst && valueFirst[1].length < 80) {
      tryPushRow({ label: valueFirst[1].trim(), value: valueFirst[2].trim() });
      continue;
    }

    preambleParts.push(line);
  }

  // MEDUI.RES.2 — if structured rows failed but preamble looks like a smashed CMP wall,
  // attempt display-only recovery (does not mutate stored result text).
  if (rows.length === 0 && preambleParts.length > 0) {
    const smashedSource = preambleParts.join("\n").trim();
    const recovered = tryRecoverSmashedLabAnalytes(smashedSource);
    if (recovered.length >= 2) {
      for (const r of recovered) tryPushRow(r);
      return {
        rows,
        preamble: "",
        conclusion,
        sectionNotes,
      };
    }
  }

  return {
    rows,
    preamble: preambleParts.join("\n").trim(),
    conclusion,
    sectionNotes,
  };
}

/** Paragraphes structurés si le texte labo ne donne aucune ligne tableau (repli lisible). */
export function splitLabFallbackParagraphs(raw: string): string[] {
  const t = (raw ?? "").trim();
  if (!t) return [];
  const blocks = t.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return blocks.length ? blocks : [t];
}

export type RadiologySection = { heading: string; body: string };

/** Locale-aware exam title for display (FR applies catalog-friendly medical synonyms). */
export function normalizeExamTitleFromLocale(title: string, language: SupportedLanguage): string {
  if (language === "en") return (title ?? "").trim();
  return normalizeExamTitleFr(title);
}

/** Libellés d’examen FR pour l’affichage (données catalogue parfois en anglais). */
export function normalizeExamTitleFr(title: string): string {
  const t = (title ?? "").trim();
  if (!t) return t;
  const rules: { re: RegExp; fr: string }[] = [
    { re: /\bcomplete\s*blood\s*count\b|\bCBC\b/i, fr: "Numération formule sanguine (NFS)" },
    { re: /\bcomprehensive\s*metabolic(\s*panel)?\b|\bCMP\b/i, fr: "Bilan métabolique complet (CMP)" },
    { re: /\bbasic\s*metabolic\s*panel\b|\bBMP\b/i, fr: "Bilan métabolique de base (BMP)" },
    { re: /\burinalysis\b|\burine\s*analysis\b/i, fr: "Analyse d’urines" },
    { re: /\burine\s*culture\b|\bUCS\b|\bECBU\b/i, fr: "ECBU" },
    { re: /\bchest\s*x[- ]?ray\b|\bCXR\b|\bthoracic\s*radiograph/i, fr: "Radiographie thoracique" },
    { re: /\babdominal\s*ultrasound\b|\bUS\s+abdomen\b/i, fr: "Échographie abdominale" },
    { re: /\bCT\b\s*(?:scan\s*)?(?:of\s*)?(?:the\s*)?chest\b|\bchest\s*CT\b/i, fr: "Tomodensitométrie thoracique" },
    { re: /\bMRI\b\s*(?:of\s*)?(?:the\s*)?abdomen\b|\babdominal\s*MRI\b/i, fr: "IRM abdominale" },
  ];
  for (const { re, fr } of rules) {
    if (re.test(t)) return fr;
  }
  return t;
}

/** Libellés FR canoniques pour les sections de rapport d’imagerie. */
const RAD_HEADING_MAP: Record<string, string> = {
  indication: "Indication",
  technique: "Technique",
  constatation: "Constatations",
  constatations: "Constatations",
  resultat: "Résultats",
  résultats: "Résultats",
  résultat: "Résultats",
  resultats: "Résultats",
  findings: "Constatations",
  observation: "Constatations",
  observations: "Constatations",
  examen: "Examen",
  impression: "Impression",
  conclusion: "Conclusion",
  recommandation: "Recommandation",
  recommandations: "Recommandation",
  compterendu: "Compte rendu",
  discussion: "Discussion",
  clinique: "Données cliniques",
  indicationclinique: "Indication clinique",
  clinical: "Indication clinique",
};

const RAD_LINE_HEADING = new RegExp(
  "^\\s*(Indication(?:\\s+clinique)?|Technique|Constatations?|Résultats?|Examen|Impression|Conclusion|Recommandation(?:s)?|Discussion|Observations?|Findings?|Compte\\s+rendu)\\s*:\\s*(.*)$",
  "i"
);

const RAD_STANDALONE_HEADING = new RegExp(
  "^\\s*(Indication(?:\\s+clinique)?|Technique|Constatations?|Résultats?|Examen|Impression|Conclusion|Recommandation(?:s)?|Discussion|Observations?|Findings?|Compte\\s+rendu)\\s*$",
  "i"
);

function normalizeRadHeadingFr(key: string): string {
  const k = key.toLowerCase().replace(/\s+/g, " ").trim();
  if (k.startsWith("compte rendu")) return "Compte rendu";
  const compact = k.replace(/\s/g, "");
  if (compact === "indicationclinique" || k.startsWith("indication")) return "Indication";
  return RAD_HEADING_MAP[compact] ?? RAD_HEADING_MAP[k.replace(/\s/g, "")] ?? key.trim();
}

const RAD_HEADING_MAP_EN: Record<string, string> = {
  indication: "Indication",
  technique: "Technique",
  constatation: "Findings",
  constatations: "Findings",
  resultat: "Results",
  resultats: "Results",
  résultats: "Results",
  résultat: "Results",
  findings: "Findings",
  observation: "Findings",
  observations: "Findings",
  examen: "Study",
  impression: "Impression",
  conclusion: "Conclusion",
  recommandation: "Recommendation",
  recommandations: "Recommendations",
  compterendu: "Report",
  discussion: "Discussion",
  clinique: "Clinical data",
  indicationclinique: "Clinical indication",
  clinical: "Clinical indication",
};

function headingCompactNorm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s/g, "");
}

function normalizeRadHeadingForLocale(
  key: string,
  language: SupportedLanguage
): string {
  if (language !== "en") {
    return normalizeRadHeadingFr(key);
  }
  const k = key.toLowerCase().replace(/\s+/g, " ").trim();
  if (k.startsWith("compte rendu")) return "Report";
  const compact = headingCompactNorm(k);
  if (compact === "indicationclinique") return "Clinical indication";
  if (
    compact.startsWith("indication") &&
    (k.includes("clinique") || k.includes("clinical"))
  ) {
    return "Clinical indication";
  }
  if (k.startsWith("indication")) return "Indication";
  const fromMap = RAD_HEADING_MAP_EN[compact] ?? RAD_HEADING_MAP_EN[headingCompactNorm(k)];
  if (fromMap) return fromMap;
  if (compact.startsWith("resultat")) return "Results";
  if (compact.startsWith("constat")) return "Findings";
  return key.trim();
}

/**
 * Découpe un compte rendu imagerie : lignes « Titre : » ou titre seul, mots-clés FR/EN.
 * Section *titles* are normalized for the active UI locale; clinical body text is unchanged.
 */
export function parseRadiologySections(
  raw: string,
  language: SupportedLanguage = "fr"
): { sections: RadiologySection[]; remainder: string } {
  const text = (raw ?? "").trim();
  if (!text) return { sections: [], remainder: "" };

  const lines = text.split(/\r?\n/);
  const sections: RadiologySection[] = [];
  const loose: string[] = [];
  let current: { heading: string; lines: string[] } | null = null;

  const flush = () => {
    if (current && current.lines.length) {
      const body = current.lines.join("\n").trim();
      if (body) sections.push({ heading: current.heading, body });
    }
    current = null;
  };

  for (const line of lines) {
    const m1 = line.match(RAD_LINE_HEADING);
    if (m1) {
      flush();
      current = {
        heading: normalizeRadHeadingForLocale(m1[1], language),
        lines: m1[2] ? [m1[2]] : [],
      };
      continue;
    }
    const m2 = line.match(RAD_STANDALONE_HEADING);
    if (m2) {
      flush();
      current = { heading: normalizeRadHeadingForLocale(m2[1], language), lines: [] };
      continue;
    }
    if (/^#{1,3}\s+(.+)$/.test(line)) {
      flush();
      const ht = line.replace(/^#{1,3}\s+/, "").trim();
      current = { heading: normalizeRadHeadingForLocale(ht, language), lines: [] };
      continue;
    }
    if (current) current.lines.push(line);
    else loose.push(line);
  }
  flush();

  let remainder = loose.join("\n").trim();
  if (sections.length === 0 && remainder.length > 40) {
    const para = remainder.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    if (para.length >= 1) {
      return {
        sections: [
          {
            heading: language === "en" ? "Report" : "Compte rendu",
            body: para.join("\n\n"),
          },
        ],
        remainder: "",
      };
    }
  }

  return { sections, remainder };
}

/** Paragraphes pour affichage « document » si aucune section structurée. */
export function splitRadiologyNarrativeParagraphs(raw: string): string[] {
  const t = (raw ?? "").trim();
  if (!t) return [];
  return t.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
}
