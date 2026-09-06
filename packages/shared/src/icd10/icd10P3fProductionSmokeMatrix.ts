/**
 * P3-F production UI smoke matrix — checklist only.
 * Does not load terminology. Operators execute against live search/display.
 */

export const ICD10_P3F_SMOKE_SEARCH_TERMS = [
  "abd",
  "abdo",
  "dol",
  "dolo",
  "dolor",
  "nau",
  "nausea",
  "vomit",
  "vomito",
  "vómito",
  "cellulitis",
  "migraine",
] as const;

export const ICD10_P3F_SMOKE_CODES = [
  "R10.85",
  "A42.1",
  "R14.0",
  "G43.D0",
  "G43.D1",
  "R11.0",
  "R11.2",
  "R11.10",
  "R11.11",
  "R11.12",
  "L03",
  "L03.90",
  "L98.431",
  "S31.106A",
  "T78.070A",
  "G35.A",
  "QA0.0101",
] as const;

export const ICD10_P3F_SMOKE_LOCALES = ["en", "fr", "es"] as const;

export const ICD10_P3F_SMOKE_ASSERTIONS = [
  "one concept = one row",
  "active locale label only",
  "no EN under FR/ES",
  "no FR under ES",
  "no ES under FR",
  "no CODE — CODE",
  "code-only only if coverage genuinely missing",
  "aliases search but do not display",
  "same canonical code persisted after locale switch",
  "no duplicate result due to aliases",
  "no parent/category inheritance",
] as const;
