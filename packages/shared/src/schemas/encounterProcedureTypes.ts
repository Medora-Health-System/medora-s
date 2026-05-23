/** Leaf module — procedure identity constants only (no Zod, no schema imports). */

export const BASIC_DOCUMENTED_PROCEDURE_TYPES = [
  "LACERATION_REPAIR",
  "WOUND_CARE",
  "INCISION_AND_DRAINAGE",
  "SPLINT_APPLICATION",
  "FOLEY_CATHETER",
  "EKG",
  "GLUCOSE_CHECK",
  "URINE_COLLECTION",
  "PREGNANCY_TEST",
] as const;

export const ADVANCED_DOCUMENTED_PROCEDURE_TYPES = [
  "CHEST_TUBE",
  "INTUBATION",
  "CENTRAL_LINE",
  "PROCEDURAL_SEDATION",
  "REDUCTION",
  "THORACENTESIS_PARACENTESIS",
  "PELVIC_EXAM",
  "LUMBAR_PUNCTURE",
] as const;

export const DOCUMENTED_PROCEDURE_TYPES = [
  ...BASIC_DOCUMENTED_PROCEDURE_TYPES,
  ...ADVANCED_DOCUMENTED_PROCEDURE_TYPES,
] as const;

/** Clinical procedure types that may appear in nursing assist notes (same canonical set). */
export const ASSISTED_PROCEDURE_TYPES = [...DOCUMENTED_PROCEDURE_TYPES] as const;

export type AdvancedDocumentedProcedureType = (typeof ADVANCED_DOCUMENTED_PROCEDURE_TYPES)[number];
export type DocumentedProcedureType = (typeof DOCUMENTED_PROCEDURE_TYPES)[number];
