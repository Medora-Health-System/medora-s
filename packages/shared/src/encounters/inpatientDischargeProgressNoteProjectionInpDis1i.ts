/**
 * INP.DIS.1I — Deterministic Hospital Course projection from provider documentation.
 *
 * Clinical safety: never create a new clinical statement. Allowed transforms are
 * formatting only (SOAP heading removal, markdown noise, exact-duplicate drop,
 * whitespace normalize, grouping labels). Plan text is labeled as documented plan
 * and is never rewritten as a completed action.
 */

import { resolvePublicProductUiLanguageOrDefault } from "../i18n/productUiLocale.js";

export type DischargeCourseLanguage = "en" | "fr";

const SOAP_HEADER_RE = /^#{1,6}\s*(subjective|objective|assessment|plan)\s*$/i;
const SOAP_HEADER_ANYWHERE_RE = /^#{1,6}\s*(Subjective|Objective|Assessment|Plan)\s*$/im;
const MARKDOWN_FENCE_RE = /```[\w-]*\n?([\s\S]*?)```/g;
const MARKDOWN_INLINE_RE = /(\*\*|__|\*|_|`)/g;

export function planDocumentedPrefix(language: DischargeCourseLanguage = "en"): string {
  return language === "fr" ? "Plan documenté :" : "Plan documented:";
}

export function formatInpatientDischargeHumanLabel(
  code: string | null | undefined
): string {
  const raw = typeof code === "string" ? code.trim() : "";
  if (!raw) return "";
  if (!/^[A-Z][A-Z0-9_]*$/.test(raw)) return raw;
  return raw
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

export function formatInpatientDischargeDiagnosisDisplay(input: {
  code?: string | null;
  description?: string | null;
}): string {
  const description = (input.description ?? "").trim();
  const code = (input.code ?? "").trim();
  if (description && code) return `${description} (${code})`;
  if (description) return description;
  return code;
}

export const INPATIENT_PENDING_STUDY_TYPE_LABELS: Record<string, { en: string; fr: string }> = {
  LAB: { en: "Laboratory", fr: "Laboratoire" },
  CULTURE: { en: "Culture", fr: "Culture" },
  PATHOLOGY: { en: "Pathology", fr: "Anatomopathologie" },
  IMAGING: { en: "Imaging", fr: "Imagerie" },
  OTHER: { en: "Other", fr: "Autre" },
};

export function formatInpatientDischargePendingStudyTypeLabel(
  type: string | null | undefined,
  language: DischargeCourseLanguage = "en"
): string {
  const key = (type ?? "").trim().toUpperCase();
  const mapped = INPATIENT_PENDING_STUDY_TYPE_LABELS[key];
  if (mapped) return mapped[language];
  return formatInpatientDischargeHumanLabel(type) || (type ?? "").trim();
}

export function hasDischargeAuthoringMarkup(text: string | null | undefined): boolean {
  const raw = String(text ?? "");
  if (SOAP_HEADER_ANYWHERE_RE.test(raw)) return true;
  if (/```/.test(raw)) return true;
  if (/^\s*[{\[]/.test(raw.trim()) && /"[a-zA-Z_][a-zA-Z0-9_]*"\s*:/.test(raw)) return true;
  return false;
}

function trimOrEmpty(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function isInternalLeakLine(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  if (/^schemaVersion\b/i.test(t)) return true;
  if (/^INP\.DIS\./.test(t) || /^INP\.PROV\./.test(t)) return true;
  if (/^```/.test(t)) return true;
  if (/^\s*[{\[]/.test(t) && /"[a-zA-Z_][a-zA-Z0-9_]*"\s*:/.test(t)) return true;
  if (/^["']?[a-zA-Z]+["']?\s*:\s*[{\[]/.test(t)) return true;
  return false;
}

function unwrapMarkdownFences(text: string): string {
  return text.replace(MARKDOWN_FENCE_RE, (_full, inner: string) => {
    const body = String(inner ?? "").trim();
    if (isInternalLeakLine(body) || (/^\s*[{\[]/.test(body) && /"[a-zA-Z_]+"\s*:/.test(body))) {
      return "";
    }
    return body;
  });
}

function stripMarkdownMarkers(text: string): string {
  return text
    .replace(MARKDOWN_INLINE_RE, "")
    .replace(/^\s*>+\s?/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

function normalizeWhitespaceLine(line: string): string {
  return line.replace(/[ \t]+/g, " ").replace(/\s+$/g, "");
}

/** Case-insensitive exact equality after whitespace + trailing punctuation normalize. */
export function normalizeClinicalFragmentKey(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/[.;:]+$/g, "")
    .trim()
    .toLowerCase();
}

export function splitClinicalFragments(text: string): string[] {
  const raw = text.replace(/\r\n/g, "\n").trim();
  if (!raw) return [];
  const chunks: string[] = [];
  for (const line of raw.split("\n")) {
    const cleaned = normalizeWhitespaceLine(line).trim();
    if (!cleaned) continue;
    const pieces = cleaned.split(/\s*;\s+|\s*;$/);
    for (const piece of pieces) {
      const p = piece.trim();
      if (!p) continue;
      const sentences = p.split(/(?<=[.!?])\s+(?=[A-ZÀ-ÖØ-Þ])/);
      for (const s of sentences) {
        const t = s.trim();
        if (t) chunks.push(t);
      }
    }
  }
  return chunks;
}

/** Drop only exact normalized duplicates. Similar-but-different statements are kept. */
export function dedupeClinicalSentences(fragments: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const fragment of fragments) {
    const trimmed = fragment.trim();
    if (!trimmed || isInternalLeakLine(trimmed)) continue;
    const key = normalizeClinicalFragmentKey(trimmed);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

function detectSoapSections(text: string): {
  usedSoap: boolean;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
} {
  const empty = { usedSoap: false, subjective: "", objective: "", assessment: "", plan: "" };
  const raw = text.replace(/\r\n/g, "\n");
  if (!SOAP_HEADER_ANYWHERE_RE.test(raw)) {
    return empty;
  }

  let current: "subjective" | "objective" | "assessment" | "plan" | null = null;
  const buckets: Record<"subjective" | "objective" | "assessment" | "plan", string[]> = {
    subjective: [],
    objective: [],
    assessment: [],
    plan: [],
  };
  let sawHeader = false;
  for (const line of raw.split("\n")) {
    const header = line.match(SOAP_HEADER_RE);
    if (header) {
      sawHeader = true;
      const label = header[1]!.toLowerCase();
      current =
        label === "subjective"
          ? "subjective"
          : label === "objective"
            ? "objective"
            : label === "assessment"
              ? "assessment"
              : "plan";
      continue;
    }
    if (current) buckets[current].push(line);
  }
  if (!sawHeader) return empty;
  return {
    usedSoap: true,
    subjective: buckets.subjective.join("\n").trim(),
    objective: buckets.objective.join("\n").trim(),
    assessment: buckets.assessment.join("\n").trim(),
    plan: buckets.plan.join("\n").trim(),
  };
}

function prefixPlanFragments(planText: string, language: DischargeCourseLanguage): string[] {
  const prefix = planDocumentedPrefix(language);
  const prefixKey = normalizeClinicalFragmentKey(prefix);
  return splitClinicalFragments(planText).map((fragment) => {
    const key = normalizeClinicalFragmentKey(fragment);
    if (key.startsWith(prefixKey)) return fragment;
    return `${prefix} ${fragment}`;
  });
}

function cleanProviderProseKeepSoapHeaders(text: string): string {
  const unfenced = unwrapMarkdownFences(text);
  const unmarked = stripMarkdownMarkers(unfenced);
  return unmarked
    .split("\n")
    .map((line) => normalizeWhitespaceLine(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripSoapHeadings(text: string): string {
  return text
    .split("\n")
    .map((line) => (SOAP_HEADER_RE.test(line.trim()) ? "" : line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanProviderProse(text: string): string {
  return stripSoapHeadings(cleanProviderProseKeepSoapHeaders(text));
}

/**
 * Project one progress note into Hospital Course language.
 * SOAP notes: headings removed; Assessment kept as-is; Plan labeled, not completed.
 * Legacy plain text: same clinical text out, minus formatting noise and exact duplicates.
 */
export function projectProgressNoteForDischargeCourse(
  text: string | null | undefined,
  language: DischargeCourseLanguage = "en"
): string {
  const raw = trimOrEmpty(text);
  if (!raw) return "";

  const cleaned = cleanProviderProseKeepSoapHeaders(raw);
  if (!cleaned) return "";

  const soap = detectSoapSections(cleaned);
  const fragments: string[] = [];
  if (soap.usedSoap) {
    fragments.push(...splitClinicalFragments(soap.subjective));
    fragments.push(...splitClinicalFragments(soap.objective));
    fragments.push(...splitClinicalFragments(soap.assessment));
    fragments.push(...prefixPlanFragments(soap.plan, language));
  } else {
    fragments.push(...splitClinicalFragments(stripSoapHeadings(cleaned)));
  }

  return dedupeClinicalSentences(fragments).join(" ");
}

export function projectProgressNotesForDischargeCourse(
  texts: readonly string[] | null | undefined,
  language: DischargeCourseLanguage = "en"
): string {
  const projected = (texts ?? [])
    .map((t) => projectProgressNoteForDischargeCourse(t, language))
    .filter(Boolean);
  if (!projected.length) return "";
  return dedupeClinicalSentences(projected.flatMap((p) => splitClinicalFragments(p))).join(" ");
}

export function formatDischargeNarrativeForDisplay(
  text: string | null | undefined,
  language: DischargeCourseLanguage = "en"
): string {
  const raw = trimOrEmpty(text);
  if (!raw) return "";
  if (!hasDischargeAuthoringMarkup(raw) && !/##/.test(raw) && !/```/.test(raw)) {
    return dedupeClinicalSentences(splitClinicalFragments(cleanProviderProse(raw))).join(" ");
  }
  return projectProgressNoteForDischargeCourse(raw, language);
}

function heading(language: DischargeCourseLanguage, en: string, fr: string): string {
  return language === "fr" ? fr : en;
}

/**
 * Assemble a structured Hospital Course draft from canonical chart facts + projected notes.
 * Empty sections are omitted. Consults/procedures/findings stay in dedicated fields
 * (caller) so plan snippets are not mixed with completed canonical events.
 */
export function assembleInpatientHospitalCourseDraft(input: {
  language?: DischargeCourseLanguage;
  admissionReason?: string | null;
  admissionDiagnosis?: string | null;
  progressNoteTexts?: string[];
  problemPlanSummaries?: string[];
}): string {
  const language = resolvePublicProductUiLanguageOrDefault(input.language);
  const blocks: string[] = [];

  const admission =
    trimOrEmpty(input.admissionReason) || trimOrEmpty(input.admissionDiagnosis);
  if (admission) {
    blocks.push(
      `${heading(language, "Admission reason", "Motif d'admission")}\n${admission}`
    );
  }

  const courseBits: string[] = [];
  const projected = projectProgressNotesForDischargeCourse(input.progressNoteTexts, language);
  if (projected) courseBits.push(projected);

  const problems = dedupeClinicalSentences(
    (input.problemPlanSummaries ?? [])
      .map((p) => trimOrEmpty(p))
      .filter(Boolean)
  );
  if (problems.length) {
    courseBits.push(problems.join(" "));
  }

  if (courseBits.length) {
    blocks.push(
      `${heading(
        language,
        "Clinical course / provider documentation",
        "Évolution clinique / documentation médicale"
      )}\n${courseBits.join("\n")}`
    );
  }

  return blocks.join("\n\n").trim();
}
