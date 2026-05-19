/**
 * Phase 19F — advisory duplicate match scoring (no auto-link, no source mutation).
 */

import type { CatalogIndexEntry } from "./priority-er-inventory-catalog-index";
import {
  normalizeDoseForMatch,
  normalizeFormForMatch,
  normalizeMedicationNameForMatch,
} from "./priority-er-inventory-match-normalize.util";
import type { PriorityErSourceTrace } from "./priority-er-inventory-staging-source.util";

export type PriorityErMatchType =
  | "EXACT_SOURCE"
  | "EXACT_NORMALIZED"
  | "NAME_DOSE_FORM"
  | "NAME_ONLY"
  | "ALIAS"
  | "LEGACY_CATALOG"
  | "CONCEPT_PRODUCT";

export type PriorityErGovernanceMatchCandidate = {
  matchType: PriorityErMatchType;
  confidence: number;
  reasons: string[];
  safeToAutoLink: false;
  kind: CatalogIndexEntry["kind"];
  id: string;
  code: string | null;
  conceptId: string | null;
  productId: string | null;
  displayLabel: string;
  isActive: boolean | null;
  legacyCatalogMedicationId: string | null;
};

function pushCandidate(
  out: PriorityErGovernanceMatchCandidate[],
  seen: Set<string>,
  candidate: PriorityErGovernanceMatchCandidate
) {
  const key = `${candidate.kind}:${candidate.id}:${candidate.matchType}`;
  if (seen.has(key)) return;
  seen.add(key);
  out.push(candidate);
}

export function scorePriorityErMatchCandidates(input: {
  trace: PriorityErSourceTrace;
  entries: CatalogIndexEntry[];
  matchedRefs: Array<{
    kind: CatalogIndexEntry["kind"];
    id: string;
    code: string | null;
    conceptId: string | null;
    productId: string | null;
  }>;
}): PriorityErGovernanceMatchCandidate[] {
  const { trace, entries, matchedRefs } = input;
  const nameNorm = normalizeMedicationNameForMatch(trace.sourceNameExact);
  const doseNorm = normalizeDoseForMatch(trace.sourceStrengthExact);
  const formNorm = normalizeFormForMatch(trace.sourceRouteExact);
  const out: PriorityErGovernanceMatchCandidate[] = [];
  const seen = new Set<string>();

  for (const ref of matchedRefs) {
    const entry = entries.find((e) => e.kind === ref.kind && e.id === ref.id);
    const label = ref.code ?? entry?.code ?? ref.id;
    const doseMatch = entry ? !doseNorm || !entry.doseNormalized || entry.doseNormalized === doseNorm : false;
    const formMatch = entry ? !formNorm || !entry.formNormalized || entry.formNormalized === formNorm : false;
    const exactNorm = doseMatch && formMatch && entry?.nameNormalized === nameNorm;
    pushCandidate(out, seen, {
      matchType: exactNorm ? "EXACT_NORMALIZED" : "NAME_DOSE_FORM",
      confidence: exactNorm ? 0.95 : 0.72,
      reasons: exactNorm
        ? ["normalized_name_dose_form_match"]
        : ["reconciliation_matched_ref", doseMatch ? "dose_match" : "dose_partial", formMatch ? "form_match" : "form_partial"],
      safeToAutoLink: false,
      kind: ref.kind,
      id: ref.id,
      code: ref.code,
      conceptId: ref.conceptId,
      productId: ref.productId,
      displayLabel: label,
      isActive: null,
      legacyCatalogMedicationId: ref.kind === "catalog" ? ref.id : entry?.legacyCatalogMedicationId ?? null,
    });
  }

  for (const entry of entries) {
    if (entry.nameNormalized !== nameNorm) continue;
    const doseMatch = !doseNorm || !entry.doseNormalized || entry.doseNormalized === doseNorm;
    const formMatch = !formNorm || !entry.formNormalized || entry.formNormalized === formNorm;
    if (!doseMatch && !formMatch) continue;
    const exactNorm = doseMatch && formMatch;
    pushCandidate(out, seen, {
      matchType: exactNorm ? "EXACT_NORMALIZED" : "NAME_ONLY",
      confidence: exactNorm ? 0.9 : 0.55,
      reasons: exactNorm
        ? ["catalog_index_exact_normalized"]
        : ["catalog_index_name_match"],
      safeToAutoLink: false,
      kind: entry.kind,
      id: entry.id,
      code: entry.code,
      conceptId: entry.conceptId,
      productId: entry.productId,
      displayLabel: entry.code ?? entry.id,
      isActive: null,
      legacyCatalogMedicationId: entry.legacyCatalogMedicationId ?? null,
    });
  }

  return out.sort((a, b) => b.confidence - a.confidence).slice(0, 12);
}
