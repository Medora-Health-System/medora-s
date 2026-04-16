/**
 * ER trauma primary/secondary survey — stored under `Encounter.nursingAssessment.erTraumaSurveyV1` (Json).
 * Persists via PATCH /encounters/:id (merge with other nursingAssessment keys). No backend migration.
 */

import type { ErNursingPreviewModel, ErNursingPreviewSection } from "./emergencyNursingReassessmentV1";

export const ER_TRAUMA_SURVEY_V1_KEY = "erTraumaSurveyV1" as const;

/** ABCDE primary survey option (French UI: Normal / Anormal / Inconnu). */
export type ErAbcdeOption = "" | "normal" | "abnormal" | "unknown";

export type ErTraumaSurveyV1 = {
  primaryAirway: ErAbcdeOption;
  primaryBreathing: ErAbcdeOption;
  primaryCirculation: ErAbcdeOption;
  primaryDisability: ErAbcdeOption;
  primaryExposure: ErAbcdeOption;

  primaryNotes: string;

  secondaryHeadFace: string;
  secondaryNeck: string;
  secondaryChest: string;
  secondaryAbdomenPelvis: string;
  secondaryBackSpine: string;
  secondaryExtremities: string;
  secondarySkinWounds: string;

  secondaryNotes: string;
};

export function emptyErTraumaSurveyV1Form(): ErTraumaSurveyV1 {
  return {
    primaryAirway: "",
    primaryBreathing: "",
    primaryCirculation: "",
    primaryDisability: "",
    primaryExposure: "",
    primaryNotes: "",
    secondaryHeadFace: "",
    secondaryNeck: "",
    secondaryChest: "",
    secondaryAbdomenPelvis: "",
    secondaryBackSpine: "",
    secondaryExtremities: "",
    secondarySkinWounds: "",
    secondaryNotes: "",
  };
}

function stringFromUnknown(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function abcdeFromUnknown(v: unknown): ErAbcdeOption {
  const s = stringFromUnknown(v);
  if (s === "normal" || s === "abnormal" || s === "unknown") return s;
  return "";
}

function extractTraumaBlob(nursingAssessment: unknown): Record<string, unknown> | null {
  if (!nursingAssessment || typeof nursingAssessment !== "object" || Array.isArray(nursingAssessment)) return null;
  const raw = (nursingAssessment as Record<string, unknown>)[ER_TRAUMA_SURVEY_V1_KEY];
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  return { ...(raw as Record<string, unknown>) };
}

export function erTraumaSurveyV1FormFromEncounter(nursingAssessment: unknown): ErTraumaSurveyV1 {
  const e = emptyErTraumaSurveyV1Form();
  const o = extractTraumaBlob(nursingAssessment);
  if (!o) return e;

  const g = (k: keyof ErTraumaSurveyV1): unknown => o[k as string];

  return {
    ...e,
    primaryAirway: abcdeFromUnknown(g("primaryAirway")),
    primaryBreathing: abcdeFromUnknown(g("primaryBreathing")),
    primaryCirculation: abcdeFromUnknown(g("primaryCirculation")),
    primaryDisability: abcdeFromUnknown(g("primaryDisability")),
    primaryExposure: abcdeFromUnknown(g("primaryExposure")),
    primaryNotes: stringFromUnknown(g("primaryNotes")),
    secondaryHeadFace: stringFromUnknown(g("secondaryHeadFace")),
    secondaryNeck: stringFromUnknown(g("secondaryNeck")),
    secondaryChest: stringFromUnknown(g("secondaryChest")),
    secondaryAbdomenPelvis: stringFromUnknown(g("secondaryAbdomenPelvis")),
    secondaryBackSpine: stringFromUnknown(g("secondaryBackSpine")),
    secondaryExtremities: stringFromUnknown(g("secondaryExtremities")),
    secondarySkinWounds: stringFromUnknown(g("secondarySkinWounds")),
    secondaryNotes: stringFromUnknown(g("secondaryNotes")),
  };
}

const KNOWN_KEYS: (keyof ErTraumaSurveyV1)[] = [
  "primaryAirway",
  "primaryBreathing",
  "primaryCirculation",
  "primaryDisability",
  "primaryExposure",
  "primaryNotes",
  "secondaryHeadFace",
  "secondaryNeck",
  "secondaryChest",
  "secondaryAbdomenPelvis",
  "secondaryBackSpine",
  "secondaryExtremities",
  "secondarySkinWounds",
  "secondaryNotes",
];

function valueForStorage(key: keyof ErTraumaSurveyV1, form: ErTraumaSurveyV1): unknown | undefined {
  const raw = form[key];
  if (typeof raw !== "string") return undefined;
  const t = raw.trim();

  if (
    key === "primaryAirway" ||
    key === "primaryBreathing" ||
    key === "primaryCirculation" ||
    key === "primaryDisability" ||
    key === "primaryExposure"
  ) {
    if (t === "") return undefined;
    if (t === "normal" || t === "abnormal" || t === "unknown") return t;
    return undefined;
  }

  if (t === "") return undefined;
  return t.slice(0, 8000);
}

/**
 * Merges form into previous `erTraumaSurveyV1` object; unknown keys from previous are kept
 * unless overwritten by a known key with a new value.
 */
export function mergeErTraumaSurveyV1Blob(previousNursingAssessment: unknown, form: ErTraumaSurveyV1): Record<string, unknown> | null {
  const prev = extractTraumaBlob(previousNursingAssessment);
  const merged: Record<string, unknown> = { ...(prev || {}) };

  for (const key of KNOWN_KEYS) {
    const v = valueForStorage(key, form);
    if (v === undefined) {
      delete merged[key as string];
    } else {
      merged[key as string] = v;
    }
  }

  return Object.keys(merged).length > 0 ? merged : null;
}

export function mergeErTraumaSurveyV1IntoNursingAssessment(
  previousNursingAssessment: unknown,
  form: ErTraumaSurveyV1
): Record<string, unknown> {
  const base =
    previousNursingAssessment && typeof previousNursingAssessment === "object" && !Array.isArray(previousNursingAssessment)
      ? { ...(previousNursingAssessment as Record<string, unknown>) }
      : {};
  const blob = mergeErTraumaSurveyV1Blob(previousNursingAssessment, form);
  if (blob) {
    base[ER_TRAUMA_SURVEY_V1_KEY] = blob;
  } else {
    delete base[ER_TRAUMA_SURVEY_V1_KEY];
  }
  return base;
}

function abcdeFr(v: ErAbcdeOption): string {
  if (v === "normal") return "Normal";
  if (v === "abnormal") return "Anormal";
  if (v === "unknown") return "Inconnu";
  return "";
}

function pushIf(lines: string[], label: string, text: string) {
  const t = text.trim();
  if (t) lines.push(`${label}${t}`);
}

/** Preview lines for ER nursing panel (rule-based, French). */
export function buildErTraumaSurveyV1PreviewModel(form: ErTraumaSurveyV1): ErNursingPreviewModel {
  const primary: string[] = [];
  if (form.primaryAirway) primary.push(`Voie aérienne : ${abcdeFr(form.primaryAirway)}`);
  if (form.primaryBreathing) primary.push(`Respiration : ${abcdeFr(form.primaryBreathing)}`);
  if (form.primaryCirculation) primary.push(`Circulation : ${abcdeFr(form.primaryCirculation)}`);
  if (form.primaryDisability) primary.push(`Évaluation neurologique : ${abcdeFr(form.primaryDisability)}`);
  if (form.primaryExposure) primary.push(`Exposition : ${abcdeFr(form.primaryExposure)}`);
  pushIf(primary, "Notes (primaire) : ", form.primaryNotes);

  const secondary: string[] = [];
  pushIf(secondary, "Tête / face : ", form.secondaryHeadFace);
  pushIf(secondary, "Cou : ", form.secondaryNeck);
  pushIf(secondary, "Thorax : ", form.secondaryChest);
  pushIf(secondary, "Abdomen / bassin : ", form.secondaryAbdomenPelvis);
  pushIf(secondary, "Dos / rachis : ", form.secondaryBackSpine);
  pushIf(secondary, "Extrémités : ", form.secondaryExtremities);
  pushIf(secondary, "Peau / plaies : ", form.secondarySkinWounds);
  pushIf(secondary, "Notes secondaires : ", form.secondaryNotes);

  const sections: ErNursingPreviewSection[] = [];
  if (primary.length) sections.push({ id: "trauma_primary", title: "Examen primaire (trauma)", lines: primary });
  if (secondary.length) sections.push({ id: "trauma_secondary", title: "Examen secondaire (trauma)", lines: secondary });

  if (sections.length === 0) {
    return { sections: [], narrative: "" };
  }
  return { sections, narrative: "" };
}
