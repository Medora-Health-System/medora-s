/**
 * Phase 2C.3.1 — enterprise imaging alias successor ownership manifest (governance only).
 * Does not mutate ImagingStudyAlias, IMAGING_ALIAS_CODE_MAP, or runtime search ranking.
 *
 * Source: Phase 2C.3 Alias Migration Audit; aligned with Haiti seed aliases in haiti-imaging-studies.ts.
 */
import type { ImagingAliasSuccessorOwnershipEntry } from "./imaging-alias-governance.types";

export const IMAGING_ALIAS_SUCCESSOR_OWNERSHIP_MAP: readonly ImagingAliasSuccessorOwnershipEntry[] = [
  {
    predecessorCode: "US_ABD",
    successorCode: "US_ABDOMEN",
    clinicalIntent: "Abdominal ultrasound",
    aliases: [
      {
        alias: "echo abdomen",
        action: "transfer",
        currentHolder: "both",
        notes: "Shared during dual-active; successor exclusive at cutover.",
      },
      {
        alias: "ultrasound abdomen",
        action: "successor_canonical",
        currentHolder: "successor",
      },
      {
        alias: "us abdomen",
        action: "successor_canonical",
        currentHolder: "successor",
      },
    ],
    searchShortcutQueries: ["ultrasound abdomen"],
    postCutoverShortcutCodes: ["US_ABDOMEN"],
    manualReviewRequired: false,
    phase: "2C",
    status: "planned",
  },
  {
    predecessorCode: "DOPPLER_VEIN",
    successorCode: "US_VENOUS_DOPPLER_LE",
    clinicalIntent: "Lower extremity venous Doppler (DVT)",
    aliases: [
      {
        alias: "doppler",
        action: "manual_review",
        currentHolder: "predecessor",
        notes: "Ambiguous with obstetric Doppler (US_OB_GROWTH); prefer doppler leg as canonical short form.",
      },
      {
        alias: "doppler leg",
        action: "successor_canonical",
        currentHolder: "successor",
      },
      {
        alias: "venous doppler leg",
        action: "successor_canonical",
        currentHolder: "successor",
      },
      {
        alias: "dvt ultrasound",
        action: "successor_canonical",
        currentHolder: "successor",
      },
    ],
    searchShortcutQueries: ["doppler leg"],
    postCutoverShortcutCodes: ["US_VENOUS_DOPPLER_LE"],
    manualReviewRequired: true,
    manualReviewReason: "Bare doppler alias requires clinical disambiguation before transfer.",
    phase: "2C",
    status: "planned",
  },
  {
    predecessorCode: "CT_HEAD",
    successorCode: "CT_HEAD_WO_CONTRAST",
    clinicalIntent: "CT head without contrast",
    aliases: [
      {
        alias: "ct head",
        action: "transfer",
        currentHolder: "predecessor",
        notes: "Must move to successor with ct head search shortcut at cutover.",
      },
      {
        alias: "head ct non contrast",
        action: "successor_canonical",
        currentHolder: "successor",
      },
      {
        alias: "ct brain without contrast",
        action: "successor_canonical",
        currentHolder: "successor",
      },
      {
        alias: "stroke bleed",
        action: "successor_canonical",
        currentHolder: "successor",
      },
    ],
    searchShortcutQueries: ["ct head"],
    postCutoverShortcutCodes: ["CT_HEAD_WO_CONTRAST"],
    manualReviewRequired: true,
    manualReviewReason: "Trauma order set and ct head search shortcut must align before alias cutover.",
    phase: "2C",
    status: "planned",
  },
  {
    predecessorCode: "CT_ABD",
    successorCode: "CT_ABDOMEN_PELVIS",
    clinicalIntent: "CT abdomen and pelvis",
    aliases: [
      {
        alias: "ct abdomen",
        action: "transfer",
        currentHolder: "both",
        notes: "Shared during dual-active; successor exclusive at cutover.",
      },
      {
        alias: "ct abdomen pelvis",
        action: "successor_canonical",
        currentHolder: "successor",
      },
      {
        alias: "ct abd pelvis",
        action: "successor_canonical",
        currentHolder: "successor",
      },
    ],
    searchShortcutQueries: ["ct abdomen"],
    postCutoverShortcutCodes: ["CT_ABDOMEN_PELVIS"],
    manualReviewRequired: true,
    manualReviewReason: "CPT/contrast reconciliation required before alias migration execution.",
    phase: "2C",
    status: "planned",
  },
  {
    predecessorCode: "CT_CHEST_CTA",
    successorCode: "CTA_CHEST",
    clinicalIntent: "CTA chest (pulmonary angiography)",
    aliases: [
      {
        alias: "cta thorax",
        action: "transfer",
        currentHolder: "predecessor",
        notes: "French clinician term; transfer to successor at cutover.",
      },
      {
        alias: "ct angio chest",
        action: "transfer",
        currentHolder: "both",
        notes: "Shared during dual-active; successor exclusive at cutover.",
      },
      {
        alias: "pe protocol",
        action: "transfer",
        currentHolder: "both",
        notes: "Shared during dual-active; successor exclusive at cutover.",
      },
      {
        alias: "cta chest",
        action: "successor_canonical",
        currentHolder: "successor",
      },
    ],
    searchShortcutQueries: ["cta chest"],
    postCutoverShortcutCodes: ["CTA_CHEST"],
    manualReviewRequired: true,
    manualReviewReason: "Licensed CTA chest CPT required before alias migration execution (Phase 2C.2B).",
    phase: "2C",
    status: "planned",
  },
] as const;

export const IMAGING_ALIAS_OWNERSHIP_PREDECESSOR_CODES = IMAGING_ALIAS_SUCCESSOR_OWNERSHIP_MAP.map(
  (e) => e.predecessorCode
);

export const IMAGING_ALIAS_OWNERSHIP_SUCCESSOR_CODES = IMAGING_ALIAS_SUCCESSOR_OWNERSHIP_MAP.map(
  (e) => e.successorCode
);

const predecessorToEntry = new Map(
  IMAGING_ALIAS_SUCCESSOR_OWNERSHIP_MAP.map((e) => [e.predecessorCode, e] as const)
);

const successorToEntry = new Map(
  IMAGING_ALIAS_SUCCESSOR_OWNERSHIP_MAP.map((e) => [e.successorCode, e] as const)
);

export function getAliasOwnershipEntryForPredecessor(
  predecessorCode: string
): ImagingAliasSuccessorOwnershipEntry | undefined {
  return predecessorToEntry.get(predecessorCode.trim().toUpperCase());
}

export function getAliasOwnershipEntryForSuccessor(
  successorCode: string
): ImagingAliasSuccessorOwnershipEntry | undefined {
  return successorToEntry.get(successorCode.trim().toUpperCase());
}

export function isAliasOwnershipPredecessorCode(code: string): boolean {
  return predecessorToEntry.has(code.trim().toUpperCase());
}

export function isAliasOwnershipSuccessorCode(code: string): boolean {
  return successorToEntry.has(code.trim().toUpperCase());
}
