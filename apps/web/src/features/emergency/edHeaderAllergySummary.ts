/**
 * M1.7B.8 — Short allergy labels for ED workspace header (not full triage notes).
 */

import { pickProductUiCopy, type SupportedLanguage } from "@/i18n/config";
import { erTriageMessagesEn } from "@/i18n/messages/erTriage.en";
import { erTriageMessagesFr } from "@/i18n/messages/erTriage.fr";
import type { ErTriageV1Form } from "./medoraErTriageV1";

export type EdHeaderAllergyVitalsSlice = {
  allergyNote: string;
};

const MAX_HEADER_ALLERGY_NAME_LEN = 48;
const MAX_HEADER_FOOD_DETAIL_LEN = 40;

const INSTRUCTION_TEXT_RE =
  /^(préciser|preciser|document|specify|notez|indiquer|mentionner|consigner)\b/i;

const DRUG_ALLERGY_LINE_RES: readonly RegExp[] = [
  /^Drug allergy:\s*(.+?)\s*[—–-]\s*reaction:/i,
  /^Allergie médicamenteuse\s*:\s*(.+?)\s*[—–-]\s*réaction\s*:/i,
];

function erTriageV1Messages(locale: SupportedLanguage) {
  // Parser haystack is EN/FR source text. ES uses English identity, never French.
  return locale === "fr" ? erTriageMessagesFr : erTriageMessagesEn;
}

function isInstructionLikeAllergyText(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (t.length > 80) return true;
  if (INSTRUCTION_TEXT_RE.test(t)) return true;
  if (/si soins ou suture/i.test(t)) return true;
  if (/if wound care or repair/i.test(t)) return true;
  if (/document medication and other allergies/i.test(t)) return true;
  if (/allergies médicamenteuses et autres si pertinentes/i.test(t)) return true;
  return false;
}

function isShortAllergyName(text: string): boolean {
  const t = text.trim();
  if (!t || isInstructionLikeAllergyText(t)) return false;
  return t.length <= MAX_HEADER_ALLERGY_NAME_LEN;
}

function stripParentheticalGeneric(name: string): string {
  const trimmed = name.trim();
  const idx = trimmed.indexOf(" (");
  return idx > 0 ? trimmed.slice(0, idx).trim() : trimmed;
}

function parseDrugAllergyNames(detail: string): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const rawLine of detail.split(/\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    let matched = false;
    for (const re of DRUG_ALLERGY_LINE_RES) {
      const m = line.match(re);
      if (m?.[1]) {
        const name = stripParentheticalGeneric(m[1].trim());
        if (name && !seen.has(name.toLowerCase())) {
          seen.add(name.toLowerCase());
          names.push(name);
        }
        matched = true;
        break;
      }
    }
    if (!matched && isShortAllergyName(line)) {
      const name = stripParentheticalGeneric(line);
      const key = name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        names.push(name);
      }
    }
  }
  return names;
}

function parseShortDetailLines(text: string): string[] {
  return text
    .split(/[,;\n]/)
    .map((p) => p.trim())
    .filter((p) => isShortAllergyName(p));
}

function nkdaLabels(locale: SupportedLanguage): Set<string> {
  const v1 = erTriageV1Messages(locale).v1;
  return new Set(
    [v1.chipsAllergyNkda, "NKDA", "N.K.D.A.", erTriageMessagesEn.v1.chipsAllergyNkda, erTriageMessagesFr.v1.chipsAllergyNkda]
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

function textContainsNkda(text: string, locale: SupportedLanguage): boolean {
  const lower = text.trim().toLowerCase();
  if (!lower) return false;
  for (const label of nkdaLabels(locale)) {
    if (lower === label || lower.includes(label)) return true;
  }
  return lower === "nkda";
}

function headerChipLabel(code: string): string | null {
  switch (code) {
    case "NKDA":
      return "NKDA";
    case "LATEX_ALLERGY":
      return "Latex";
    case "FOOD_ALLERGY":
      return null;
    case "DRUG_ALLERGY":
      return null;
    default:
      return null;
  }
}

export type EdHeaderAllergySummaryLabels = {
  nkda: string;
  allergiesDocumented: string;
  foodAllergy: string;
};

export function defaultEdHeaderAllergySummaryLabels(locale: SupportedLanguage): EdHeaderAllergySummaryLabels {
  return {
    nkda: "NKDA",
    allergiesDocumented: pickProductUiCopy(
      locale,
      { en: "Allergies documented", fr: "Allergies consignées", es: "Alergias documentadas" },
      "Alergias documentadas"
    ),
    foodAllergy: pickProductUiCopy(
      locale,
      { en: "Food allergy", fr: "Allergie alimentaire", es: "Alergia alimentaria" },
      "Alergia alimentaria"
    ),
  };
}

/**
 * Compact allergy summary for ED header cards — names/status only, never triage instructions.
 */
export function buildEdHeaderAllergySummary(
  f: EdHeaderAllergyVitalsSlice,
  er: ErTriageV1Form,
  locale: SupportedLanguage,
  labels: EdHeaderAllergySummaryLabels = defaultEdHeaderAllergySummaryLabels(locale)
): string {
  const selections = er.allergyDetailSelections ?? [];
  const hasNkdaSelection = selections.includes("NKDA");

  const drugNames = parseDrugAllergyNames(er.medicationAllergiesDetail);
  const foodFromDetail = parseShortDetailLines(er.foodAllergiesDetail);
  const noteFromVitals = isShortAllergyName(f.allergyNote) ? f.allergyNote.trim() : "";

  const chipLabels: string[] = [];
  for (const code of selections) {
    if (code === "NKDA" || code === "DRUG_ALLERGY") continue;
    const label = headerChipLabel(code);
    if (label) chipLabels.push(label);
  }

  if (selections.includes("FOOD_ALLERGY")) {
    if (foodFromDetail.length > 0) {
      chipLabels.push(...foodFromDetail);
    } else {
      const foodRaw = er.foodAllergiesDetail.trim();
      if (foodRaw && foodRaw.length <= MAX_HEADER_FOOD_DETAIL_LEN && !isInstructionLikeAllergyText(foodRaw)) {
        chipLabels.push(foodRaw);
      } else if (!chipLabels.includes(labels.foodAllergy)) {
        chipLabels.push(labels.foodAllergy);
      }
    }
  } else if (foodFromDetail.length > 0) {
    chipLabels.push(...foodFromDetail);
  }

  const displayParts: string[] = [];
  const seen = new Set<string>();

  const pushUnique = (value: string) => {
    const v = value.trim();
    if (!v) return;
    const key = v.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    displayParts.push(v);
  };

  for (const name of drugNames) pushUnique(name);
  for (const label of chipLabels) pushUnique(label);
  if (noteFromVitals) pushUnique(noteFromVitals);

  const hasStructuredAllergies = displayParts.length > 0;
  const nkdaOnly =
    hasNkdaSelection &&
    !hasStructuredAllergies &&
    !er.medicationAllergiesDetail.trim() &&
    !er.foodAllergiesDetail.trim() &&
    !f.allergyNote.trim();

  if (nkdaOnly) return labels.nkda;

  if (hasStructuredAllergies) {
    return displayParts.join(" · ");
  }

  const medHasNkdaText = textContainsNkda(er.medicationAllergiesDetail, locale);
  const additionalRaw = er.additionalAllergyInfo.trim();
  const hadExcludedLongText =
    isInstructionLikeAllergyText(additionalRaw) ||
    isInstructionLikeAllergyText(f.allergyNote) ||
    isInstructionLikeAllergyText(er.medicationAllergiesDetail) ||
    isInstructionLikeAllergyText(er.foodAllergiesDetail) ||
    hasNkdaSelection ||
    medHasNkdaText;

  if (hadExcludedLongText) {
    if (hasNkdaSelection || medHasNkdaText) return labels.nkda;
    return labels.allergiesDocumented;
  }

  return "";
}
