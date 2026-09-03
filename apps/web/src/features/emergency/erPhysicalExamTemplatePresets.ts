/**
 * Deterministic ER physical exam template presets.
 * Copy lives in `erMseExamTemplatePresets` (fr.ts / en.ts); locale selects active wording.
 * No exam findings invented; conservative phrasing; empty fields where risk of fabrication.
 */

import type { SupportedLanguage } from "@/i18n/config";
import { getClinicalUiMessages } from "@/i18n/messages/registry";
import type { ErProviderMseForm } from "./emergencyProviderMseV1";

export type ErPhysicalExamTemplateId =
  | "normal"
  | "chest_pain"
  | "stroke"
  | "trauma"
  | "respiratory"
  | "abdominal";

export type ErPhysicalExamTemplateFields = Partial<
  Pick<
    ErProviderMseForm,
    | "examGeneralAppearance"
    | "examNeuroMental"
    | "examHeent"
    | "examCardiac"
    | "examRespiratory"
    | "examAbdomen"
    | "examMusculoskeletal"
    | "examSkin"
    | "examPsychBehavior"
    | "examReassessmentExtra"
  >
>;

export const ER_PHYSICAL_EXAM_TEMPLATE_ORDER: readonly ErPhysicalExamTemplateId[] = [
  "normal",
  "chest_pain",
  "stroke",
  "trauma",
  "respiratory",
  "abdominal",
] as const;

/** Keys merged when applying a preset (empty fields only). */
export const ER_PHYSICAL_EXAM_TEMPLATE_KEYS = [
  "examGeneralAppearance",
  "examNeuroMental",
  "examHeent",
  "examCardiac",
  "examRespiratory",
  "examAbdomen",
  "examMusculoskeletal",
  "examSkin",
  "examPsychBehavior",
  "examReassessmentExtra",
] as const satisfies readonly (keyof ErPhysicalExamTemplateFields)[];

function presetBlockForLocale(
  locale: SupportedLanguage,
  id: ErPhysicalExamTemplateId
): Record<string, string> | null {
  const root = getClinicalUiMessages(locale) as Record<string, unknown>;
  const presets = root.erMseExamTemplatePresets;
  if (!presets || typeof presets !== "object") return null;
  const block = (presets as Record<string, unknown>)[id];
  if (!block || typeof block !== "object") return null;
  return block as Record<string, string>;
}

/** Pure preset content — caller merges into empty exam fields only. */
export function getErPhysicalExamTemplatePreset(
  id: ErPhysicalExamTemplateId,
  locale: SupportedLanguage
): ErPhysicalExamTemplateFields {
  const block = presetBlockForLocale(locale, id);
  const out: ErPhysicalExamTemplateFields = {};
  for (const k of ER_PHYSICAL_EXAM_TEMPLATE_KEYS) {
    const v = block?.[k];
    (out as Record<string, string>)[k] = typeof v === "string" ? v : "";
  }
  return out;
}
