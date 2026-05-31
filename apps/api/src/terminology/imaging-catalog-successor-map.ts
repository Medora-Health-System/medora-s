/**
 * Phase 2C.1 — enterprise imaging duplicate-retirement crosswalk (governance only).
 * Does not deactivate catalog rows or alter runtime search/billing behavior.
 */
import type { ImagingCatalogSuccessorEntry } from "./imaging-catalog-retirement.types";

export const IMAGING_CATALOG_SUCCESSOR_MAP: readonly ImagingCatalogSuccessorEntry[] = [
  {
    predecessorCode: "US_ABD",
    successorCode: "US_ABDOMEN",
    clinicalIntent: "Abdominal ultrasound",
    manualReviewRequired: false,
    phase: "2C",
    status: "planned",
  },
  {
    predecessorCode: "DOPPLER_VEIN",
    successorCode: "US_VENOUS_DOPPLER_LE",
    clinicalIntent: "Lower extremity venous Doppler (DVT)",
    manualReviewRequired: false,
    phase: "2C",
    status: "planned",
  },
  {
    predecessorCode: "CT_HEAD",
    successorCode: "CT_HEAD_WO_CONTRAST",
    clinicalIntent: "CT head without contrast",
    manualReviewRequired: true,
    manualReviewReason: "Contrast semantics, trauma order set, and ct head search shortcut must align before retirement.",
    phase: "2C",
    status: "planned",
  },
  {
    predecessorCode: "CT_ABD",
    successorCode: "CT_ABDOMEN_PELVIS",
    clinicalIntent: "CT abdomen and pelvis",
    manualReviewRequired: true,
    manualReviewReason: "CPT/contrast reconciliation required before successor billing mapping.",
    phase: "2C",
    status: "planned",
  },
  {
    predecessorCode: "CT_CHEST_CTA",
    successorCode: "CTA_CHEST",
    clinicalIntent: "CTA chest (pulmonary angiography)",
    manualReviewRequired: false,
    phase: "2C",
    status: "planned",
  },
] as const;

/** Predecessor codes in the Phase 2C retirement batch. */
export const IMAGING_RETIREMENT_PREDECESSOR_CODES = IMAGING_CATALOG_SUCCESSOR_MAP.map(
  (e) => e.predecessorCode
);

/** Successor codes in the Phase 2C retirement batch. */
export const IMAGING_RETIREMENT_SUCCESSOR_CODES = IMAGING_CATALOG_SUCCESSOR_MAP.map((e) => e.successorCode);

const predecessorToEntry = new Map(
  IMAGING_CATALOG_SUCCESSOR_MAP.map((e) => [e.predecessorCode, e] as const)
);

const successorToPredecessor = new Map(
  IMAGING_CATALOG_SUCCESSOR_MAP.map((e) => [e.successorCode, e.predecessorCode] as const)
);

export function getSuccessorEntryForPredecessor(
  predecessorCode: string
): ImagingCatalogSuccessorEntry | undefined {
  return predecessorToEntry.get(predecessorCode.trim().toUpperCase());
}

export function getPredecessorCodeForSuccessor(successorCode: string): string | undefined {
  return successorToPredecessor.get(successorCode.trim().toUpperCase());
}

export function isImagingRetirementPredecessorCode(code: string): boolean {
  return predecessorToEntry.has(code.trim().toUpperCase());
}

export function isImagingRetirementSuccessorCode(code: string): boolean {
  return successorToPredecessor.has(code.trim().toUpperCase());
}
