/**
 * Phase 2C.1 — audited static references for retirement readiness scans.
 * Keep in sync with CreateOrderModal order sets and imaging-catalog.service alias shortcuts.
 */
import type { OrderSetPredecessorReference } from "./imaging-catalog-retirement.types";

/** Documented order-set predecessor references (Phase 2C audit). */
export const KNOWN_ORDER_SET_IMAGING_PREDECESSOR_REFS: readonly OrderSetPredecessorReference[] = [
  {
    source: "CreateOrderModal.abdominalPain.ctAbdomenPelvis",
    predecessorCode: "CT_ABD",
    successorCode: "CT_ABDOMEN_PELVIS",
    role: "fallback",
  },
  {
    source: "CreateOrderModal.trauma.ctHead",
    predecessorCode: "CT_HEAD",
    successorCode: "CT_HEAD_WO_CONTRAST",
    role: "primary",
  },
];

/**
 * Subset of IMAGING_ALIAS_CODE_MAP entries that involve Phase 2C duplicate pairs.
 * Used for readiness scans only — does not alter runtime search.
 */
export const KNOWN_IMAGING_SEARCH_ALIAS_SHORTCUTS: Readonly<Record<string, readonly string[]>> = {
  "ct head": ["CT_HEAD_WO_CONTRAST", "CT_HEAD"],
  "ct abdomen": ["CT_ABDOMEN_PELVIS", "CT_ABD"],
  "cta chest": ["CTA_CHEST", "CT_CHEST_CTA"],
  "ultrasound abdomen": ["US_ABDOMEN", "US_ABD"],
  "doppler leg": ["US_VENOUS_DOPPLER_LE", "DOPPLER_VEIN"],
};
