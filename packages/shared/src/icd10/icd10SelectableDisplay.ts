/**
 * MEDUI.TRILANG.DX.P3 — API/UI presentation contract for selectable ICD diagnosis rows.
 * Maps P2 resolver exactness onto explicit displayResolution names.
 * Never uses search aliases, category labels, or cross-language fallback.
 */

import { formatIcd10CmDisplayCode } from "./formatIcd10CmDisplayCode.js";
import type { Icd10DisplayExactness } from "./icd10TerminologyTypes.js";

export const ICD10_SELECTABLE_DISPLAY_RESOLUTIONS = [
  "EXACT_SOURCE_LABEL",
  "EXACT_GOVERNED_LABEL",
  "UNLOCALIZED_CODE",
] as const;

export type Icd10SelectableDisplayResolution = (typeof ICD10_SELECTABLE_DISPLAY_RESOLUTIONS)[number];

export function mapIcd10ExactnessToDisplayResolution(
  exactness: Icd10DisplayExactness,
): Icd10SelectableDisplayResolution {
  if (exactness === "EXACT_SOURCE") return "EXACT_SOURCE_LABEL";
  if (exactness === "EXACT_GOVERNED") return "EXACT_GOVERNED_LABEL";
  return "UNLOCALIZED_CODE";
}

export function isExactIcd10SelectableDisplayResolution(
  resolution: string | null | undefined,
): resolution is Exclude<Icd10SelectableDisplayResolution, "UNLOCALIZED_CODE"> {
  return resolution === "EXACT_SOURCE_LABEL" || resolution === "EXACT_GOVERNED_LABEL";
}

/**
 * One visible line for a server-resolved selectable diagnosis.
 * UNLOCALIZED_CODE → canonical code only (never CODE — CODE).
 * Exact label → label primary, code as metadata when it differs.
 */
export function formatIcd10ServerResolvedOneLineDisplay(input: {
  code: string;
  displayLabel?: string | null;
  displayResolution?: string | null;
}): { primary: string; metadata: string | null; visibleLines: 1 } {
  const code = formatIcd10CmDisplayCode(input.code) || input.code.trim();
  if (!isExactIcd10SelectableDisplayResolution(input.displayResolution)) {
    return { primary: code || "—", metadata: null, visibleLines: 1 };
  }
  const label = (input.displayLabel ?? "").trim();
  if (!label || label.toLowerCase() === code.toLowerCase()) {
    return { primary: code || "—", metadata: null, visibleLines: 1 };
  }
  return { primary: label, metadata: code || null, visibleLines: 1 };
}
