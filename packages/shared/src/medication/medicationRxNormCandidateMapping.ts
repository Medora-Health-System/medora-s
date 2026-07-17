import { assertCandidateNotAutoVerified } from "./medicationRxNormImportModes.js";
import { normalizeRxNormDisplayTerm } from "./medicationRxNormNormalization.js";

export type RxNormStagingRowForMapping = {
  id: string;
  rxcui: string;
  termType: string;
  displayTerm: string;
  normalizedTerm: string;
  strengthText?: string | null;
  doseFormText?: string | null;
  ingredientIdentity?: string | null;
};

export type RxNormMappingTargetKind =
  | "MEDICATION_CONCEPT"
  | "MEDICATION_PRODUCT"
  | "CATALOG_MEDICATION";

export type RxNormMappingTarget = {
  kind: RxNormMappingTargetKind;
  id: string;
  code?: string | null;
  rxNormConceptId?: string | null;
  displayName?: string | null;
  normalizedDisplayName?: string | null;
  strengthDisplay?: string | null;
  dosageForm?: string | null;
};

export type GeneratedRxNormMappingCandidate = {
  targetKind: RxNormMappingTargetKind;
  targetId: string;
  targetCode?: string | null;
  status: "CANDIDATE" | "AMBIGUOUS" | "CONFLICT";
  confidence?: "EXACT" | "HIGH" | "MEDIUM" | "LOW";
  evidenceJson: string[];
  autoVerified: false;
};

function normalizeOptional(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function compareStrengthOrForm(
  stagingValue: string | null | undefined,
  targetValue: string | null | undefined
): "match" | "mismatch" | "unknown" {
  const left = normalizeOptional(stagingValue);
  const right = normalizeOptional(targetValue);
  if (!left || !right) return "unknown";
  return left === right ? "match" : "mismatch";
}

function buildCandidate(
  stagingRow: RxNormStagingRowForMapping,
  target: RxNormMappingTarget,
  evidence: string[],
  confidence: GeneratedRxNormMappingCandidate["confidence"]
): GeneratedRxNormMappingCandidate {
  assertCandidateNotAutoVerified(false);
  return {
    targetKind: target.kind,
    targetId: target.id,
    targetCode: target.code ?? null,
    status: "CANDIDATE",
    confidence,
    evidenceJson: [...evidence].sort(),
    autoVerified: false,
  };
}

/**
 * Pure candidate generator for Phase 3 RxNorm staging rows.
 * Never emits VERIFIED status or autoVerified=true.
 */
export function generateRxNormMappingCandidates(
  stagingRow: RxNormStagingRowForMapping,
  targets: RxNormMappingTarget[]
): GeneratedRxNormMappingCandidate[] {
  const matches: GeneratedRxNormMappingCandidate[] = [];

  for (const target of targets) {
    const evidence: string[] = [];
    let confidence: GeneratedRxNormMappingCandidate["confidence"] | undefined;
    let matched = false;

    const targetRxCui = target.rxNormConceptId?.trim();
    if (targetRxCui && targetRxCui === stagingRow.rxcui.trim()) {
      evidence.push(`exact_rxcui:${targetRxCui}`);
      confidence = "EXACT";
      matched = true;
    }

    const targetNormalized =
      target.normalizedDisplayName?.trim() ||
      (target.displayName ? normalizeRxNormDisplayTerm(target.displayName) : "");
    if (targetNormalized && targetNormalized === stagingRow.normalizedTerm.trim()) {
      evidence.push(`exact_normalized_name:${targetNormalized}`);
      confidence = confidence ?? "HIGH";
      matched = true;
    }

    if (!matched) continue;

    const strengthComparison = compareStrengthOrForm(stagingRow.strengthText, target.strengthDisplay);
    const formComparison = compareStrengthOrForm(stagingRow.doseFormText, target.dosageForm);

    if (strengthComparison === "match") {
      evidence.push("exact_strength");
    } else if (strengthComparison === "mismatch") {
      evidence.push("strength_mismatch");
    }

    if (formComparison === "match") {
      evidence.push("exact_dose_form");
    } else if (formComparison === "mismatch") {
      evidence.push("dose_form_mismatch");
    }

    matches.push(buildCandidate(stagingRow, target, evidence, confidence));
  }

  if (matches.length === 0) return [];

  const hasStrengthConflict = matches.some((row) => row.evidenceJson.includes("strength_mismatch"));
  const hasFormConflict = matches.some((row) => row.evidenceJson.includes("dose_form_mismatch"));

  if (matches.length > 1) {
    return matches.map((row) => ({
      ...row,
      status: "AMBIGUOUS",
      evidenceJson: [...row.evidenceJson, "multiple_candidates"].sort(),
    }));
  }

  if (hasStrengthConflict || hasFormConflict) {
    const row = matches[0];
    return [
      {
        ...row,
        status: "CONFLICT",
        evidenceJson: [...row.evidenceJson, "name_match_with_attribute_mismatch"].sort(),
      },
    ];
  }

  return matches;
}
