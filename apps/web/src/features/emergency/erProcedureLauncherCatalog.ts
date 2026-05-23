import type { DocumentedProcedureType } from "@medora/shared";
import type { BasicNonLacerationProcedureType } from "@/features/emergency/ProcedureDocumentBatch2Forms";

/** Provider-primary: physician-performed procedures (19M.3). */
export const ER_PROCEDURE_PROVIDER_PRIMARY_STEPS = [
  "laceration" as const,
  "INCISION_AND_DRAINAGE" as const,
  "CHEST_TUBE" as const,
  "INTUBATION" as const,
  "CENTRAL_LINE" as const,
  "PROCEDURAL_SEDATION" as const,
  "REDUCTION" as const,
  "THORACENTESIS_PARACENTESIS" as const,
  "LUMBAR_PUNCTURE" as const,
  "PELVIC_EXAM" as const,
];

/** Shared: may be documented on provider or nursing track. */
export const ER_PROCEDURE_SHARED_STEPS = [
  "WOUND_CARE" as const,
  "SPLINT_APPLICATION" as const,
  "FOLEY_CATHETER" as const,
  "EKG" as const,
];

/** Nursing-primary: typically nurse-performed bedside tasks. */
export const ER_PROCEDURE_NURSING_PRIMARY_STEPS: BasicNonLacerationProcedureType[] = [
  "GLUCOSE_CHECK",
  "URINE_COLLECTION",
  "PREGNANCY_TEST",
  "EKG",
  "FOLEY_CATHETER",
  "SPLINT_APPLICATION",
];

/** Provider-side launcher tiles (left column). */
export const ER_PROCEDURE_PROVIDER_TILES = [
  { step: "laceration" as const, labelKey: "erProcedureLauncher.tileLaceration" },
  { step: "INCISION_AND_DRAINAGE" as const, labelKey: "erProcedureLauncher.tileIAndD" },
  { step: "WOUND_CARE" as const, labelKey: "erProcedureLauncher.tileWoundCare" },
  { step: "SPLINT_APPLICATION" as const, labelKey: "erProcedureLauncher.tileSplint" },
  { step: "FOLEY_CATHETER" as const, labelKey: "erProcedureLauncher.tileFoley" },
  { step: "EKG" as const, labelKey: "erProcedureLauncher.tileEkg" },
  { step: "CHEST_TUBE" as const, labelKey: "erProcedureLauncher.tileChestTube" },
  { step: "INTUBATION" as const, labelKey: "erProcedureLauncher.tileIntubation" },
  { step: "CENTRAL_LINE" as const, labelKey: "erProcedureLauncher.tileCentralLine" },
  { step: "PROCEDURAL_SEDATION" as const, labelKey: "erProcedureLauncher.tileProceduralSedation" },
  { step: "REDUCTION" as const, labelKey: "erProcedureLauncher.tileReduction" },
  { step: "THORACENTESIS_PARACENTESIS" as const, labelKey: "erProcedureLauncher.tileThoracentesis" },
  { step: "PELVIC_EXAM" as const, labelKey: "erProcedureLauncher.tilePelvicExam" },
  { step: "LUMBAR_PUNCTURE" as const, labelKey: "erProcedureLauncher.tileLumbarPuncture" },
] as const;

/** Nursing assist tiles — one per provider-primary + shared procedure needing nursing support. */
export const ER_PROCEDURE_NURSING_ASSIST_TILES = [
  { assistedProcedureType: "LACERATION_REPAIR" as const, labelKey: "erProcedureLauncher.nursingAssistLaceration" },
  { assistedProcedureType: "INCISION_AND_DRAINAGE" as const, labelKey: "erProcedureLauncher.nursingAssistIAndD" },
  { assistedProcedureType: "WOUND_CARE" as const, labelKey: "erProcedureLauncher.nursingAssistWoundCare" },
  { assistedProcedureType: "SPLINT_APPLICATION" as const, labelKey: "erProcedureLauncher.nursingAssistSplint" },
  { assistedProcedureType: "FOLEY_CATHETER" as const, labelKey: "erProcedureLauncher.nursingAssistFoley" },
  { assistedProcedureType: "CHEST_TUBE" as const, labelKey: "erProcedureLauncher.nursingAssistChestTube" },
  { assistedProcedureType: "INTUBATION" as const, labelKey: "erProcedureLauncher.nursingAssistIntubation" },
  { assistedProcedureType: "CENTRAL_LINE" as const, labelKey: "erProcedureLauncher.nursingAssistCentralLine" },
  {
    assistedProcedureType: "PROCEDURAL_SEDATION" as const,
    labelKey: "erProcedureLauncher.nursingAssistProceduralSedation",
  },
  { assistedProcedureType: "REDUCTION" as const, labelKey: "erProcedureLauncher.nursingAssistReduction" },
  {
    assistedProcedureType: "THORACENTESIS_PARACENTESIS" as const,
    labelKey: "erProcedureLauncher.nursingAssistThoracentesis",
  },
  { assistedProcedureType: "PELVIC_EXAM" as const, labelKey: "erProcedureLauncher.nursingAssistPelvicExam" },
  { assistedProcedureType: "LUMBAR_PUNCTURE" as const, labelKey: "erProcedureLauncher.nursingAssistLumbarPuncture" },
] as const;

/** Nursing-primary launcher tiles (right column). */
export const ER_PROCEDURE_NURSING_PRIMARY_TILES = [
  { step: "GLUCOSE_CHECK" as const, labelKey: "erProcedureLauncher.tileGlucose" },
  { step: "URINE_COLLECTION" as const, labelKey: "erProcedureLauncher.tileUrine" },
  { step: "PREGNANCY_TEST" as const, labelKey: "erProcedureLauncher.tilePregnancy" },
  { step: "EKG" as const, labelKey: "erProcedureLauncher.tileEkg" },
  { step: "FOLEY_CATHETER" as const, labelKey: "erProcedureLauncher.tileFoley" },
  { step: "SPLINT_APPLICATION" as const, labelKey: "erProcedureLauncher.tileSplint" },
] as const;

/** @deprecated Use ER_PROCEDURE_PROVIDER_TILES — kept for compatibility. */
export const ER_PROCEDURE_ENABLED_TILES = ER_PROCEDURE_PROVIDER_TILES;

export type ErProcedureProviderStep = (typeof ER_PROCEDURE_PROVIDER_TILES)[number]["step"];
export type ErProcedureNursingAssistType = (typeof ER_PROCEDURE_NURSING_ASSIST_TILES)[number]["assistedProcedureType"];

export type ErProcedureLauncherStep =
  | ErProcedureProviderStep
  | BasicNonLacerationProcedureType
  | DocumentedProcedureType
  | `nursing-assist:${DocumentedProcedureType}`;

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

export const ER_PROCEDURE_ADVANCED = [
  "CHEST_TUBE",
  "INTUBATION",
  "CENTRAL_LINE",
  "PROCEDURAL_SEDATION",
  "REDUCTION",
  "THORACENTESIS_PARACENTESIS",
  "PELVIC_EXAM",
  "LUMBAR_PUNCTURE",
] as const;

/** @deprecated All advanced procedures are now enabled — kept empty for test compatibility. */
export const ER_PROCEDURE_COMING_SOON_TILES = [] as const;

export function isNursingAssistStep(step: string): step is `nursing-assist:${DocumentedProcedureType}` {
  return step.startsWith("nursing-assist:");
}

export function assistedProcedureTypeFromNursingStep(step: `nursing-assist:${DocumentedProcedureType}`): DocumentedProcedureType {
  return step.slice("nursing-assist:".length) as DocumentedProcedureType;
}

export function nursingAssistStepFor(assistedProcedureType: DocumentedProcedureType): `nursing-assist:${DocumentedProcedureType}` {
  return `nursing-assist:${assistedProcedureType}`;
}
