import type { AdvancedDocumentedProcedureType } from "@medora/shared";
import type { BasicNonLacerationProcedureType } from "@/features/emergency/ProcedureDocumentBatch2Forms";

/** All enabled ED procedure documentation tiles (clickable). */
export const ER_PROCEDURE_ENABLED_TILES = [
  { step: "laceration" as const, labelKey: "erProcedureLauncher.tileLaceration" },
  { step: "WOUND_CARE" as const, labelKey: "erProcedureLauncher.tileWoundCare" },
  { step: "INCISION_AND_DRAINAGE" as const, labelKey: "erProcedureLauncher.tileIAndD" },
  { step: "SPLINT_APPLICATION" as const, labelKey: "erProcedureLauncher.tileSplint" },
  { step: "FOLEY_CATHETER" as const, labelKey: "erProcedureLauncher.tileFoley" },
  { step: "EKG" as const, labelKey: "erProcedureLauncher.tileEkg" },
  { step: "GLUCOSE_CHECK" as const, labelKey: "erProcedureLauncher.tileGlucose" },
  { step: "URINE_COLLECTION" as const, labelKey: "erProcedureLauncher.tileUrine" },
  { step: "PREGNANCY_TEST" as const, labelKey: "erProcedureLauncher.tilePregnancy" },
  { step: "CHEST_TUBE" as const, labelKey: "erProcedureLauncher.tileChestTube" },
  { step: "INTUBATION" as const, labelKey: "erProcedureLauncher.tileIntubation" },
  { step: "CENTRAL_LINE" as const, labelKey: "erProcedureLauncher.tileCentralLine" },
  { step: "PROCEDURAL_SEDATION" as const, labelKey: "erProcedureLauncher.tileProceduralSedation" },
  { step: "REDUCTION" as const, labelKey: "erProcedureLauncher.tileReduction" },
  { step: "THORACENTESIS_PARACENTESIS" as const, labelKey: "erProcedureLauncher.tileThoracentesis" },
  { step: "PELVIC_EXAM" as const, labelKey: "erProcedureLauncher.tilePelvicExam" },
  { step: "LUMBAR_PUNCTURE" as const, labelKey: "erProcedureLauncher.tileLumbarPuncture" },
] as const;

export type ErProcedureEnabledStep =
  | "laceration"
  | BasicNonLacerationProcedureType
  | AdvancedDocumentedProcedureType;

export const ER_PROCEDURE_BASIC_NON_LACERATION: BasicNonLacerationProcedureType[] = [
  "WOUND_CARE",
  "INCISION_AND_DRAINAGE",
  "SPLINT_APPLICATION",
  "FOLEY_CATHETER",
  "EKG",
  "GLUCOSE_CHECK",
  "URINE_COLLECTION",
  "PREGNANCY_TEST",
];

export const ER_PROCEDURE_ADVANCED: AdvancedDocumentedProcedureType[] = [
  "CHEST_TUBE",
  "INTUBATION",
  "CENTRAL_LINE",
  "PROCEDURAL_SEDATION",
  "REDUCTION",
  "THORACENTESIS_PARACENTESIS",
  "PELVIC_EXAM",
  "LUMBAR_PUNCTURE",
];

/** @deprecated All advanced procedures are now enabled — kept empty for test compatibility. */
export const ER_PROCEDURE_COMING_SOON_TILES = [] as const;
