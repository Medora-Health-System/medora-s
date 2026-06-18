/** MEDUI.ED.MAR.H10 — allergy review candidate model (NOT an allergy record). */

import type { MarAllergyReviewRecommendationLevel } from "./marAllergyReviewGovernance.js";

export const MAR_ALLERGY_REVIEW_CANDIDATE_NOTE_PREFIX = "MAR_ALLERGY_REVIEW_CANDIDATE:";
export const MAR_ALLERGY_REVIEW_DISMISSED_NOTE_PREFIX = "MAR_ALLERGY_REVIEW_DISMISSED:";

export type MarAllergyCandidate = {
  candidateId: string;
  medicationName: string;
  medicationClass: string | null;
  reactionText: string;
  reactionCategory: MarAllergyReviewRecommendationLevel;
  detectedAt: string;
  documentedBy: string | null;
  recommendationLevel: MarAllergyReviewRecommendationLevel;
  sourceAdministrationId?: string | null;
  sourceOrderItemId?: string | null;
  dismissedAt?: string | null;
};

export type MarAllergyReviewDismissal = {
  candidateId: string;
  dismissedAt: string;
  dismissedBy: string | null;
};

function parseJsonLine<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Parse allergy review candidates from MAR notes (append-only audit trail). */
export function parseMarAllergyReviewCandidatesFromNotes(
  notes: string | null | undefined
): MarAllergyCandidate[] {
  if (!notes?.trim()) return [];
  const dismissals = new Map<string, string>();
  const candidates: MarAllergyCandidate[] = [];

  for (const line of notes.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith(MAR_ALLERGY_REVIEW_DISMISSED_NOTE_PREFIX)) {
      const raw = trimmed.slice(MAR_ALLERGY_REVIEW_DISMISSED_NOTE_PREFIX.length).trim();
      const parsed = parseJsonLine<MarAllergyReviewDismissal>(raw);
      if (parsed?.candidateId && parsed.dismissedAt) {
        dismissals.set(parsed.candidateId, parsed.dismissedAt);
      }
      continue;
    }
    if (!trimmed.startsWith(MAR_ALLERGY_REVIEW_CANDIDATE_NOTE_PREFIX)) continue;
    const raw = trimmed.slice(MAR_ALLERGY_REVIEW_CANDIDATE_NOTE_PREFIX.length).trim();
    const parsed = parseJsonLine<MarAllergyCandidate>(raw);
    if (!parsed?.candidateId || !parsed.medicationName || !parsed.detectedAt) continue;
    candidates.push({
      ...parsed,
      dismissedAt: dismissals.get(parsed.candidateId) ?? parsed.dismissedAt ?? null,
    });
  }

  return candidates.sort(
    (a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()
  );
}

/** Active candidates exclude dismissed recommendations. */
export function filterActiveMarAllergyReviewCandidates(
  candidates: MarAllergyCandidate[]
): MarAllergyCandidate[] {
  return candidates.filter((c) => !c.dismissedAt?.trim());
}

/** Append candidate line to MAR notes (never creates PatientAllergy). */
export function buildMarAllergyReviewCandidateNotes(
  existingNotes: string | null | undefined,
  candidate: Omit<MarAllergyCandidate, "dismissedAt">
): string {
  const line = `${MAR_ALLERGY_REVIEW_CANDIDATE_NOTE_PREFIX} ${JSON.stringify({
    candidateId: candidate.candidateId,
    medicationName: candidate.medicationName,
    medicationClass: candidate.medicationClass,
    reactionText: candidate.reactionText,
    reactionCategory: candidate.reactionCategory,
    detectedAt: candidate.detectedAt,
    documentedBy: candidate.documentedBy,
    recommendationLevel: candidate.recommendationLevel,
    sourceAdministrationId: candidate.sourceAdministrationId ?? null,
    sourceOrderItemId: candidate.sourceOrderItemId ?? null,
  })}`;
  const base = existingNotes?.trim() ? `${existingNotes.trim()}\n` : "";
  return `${base}${line}`;
}

/** Append dismiss acknowledgment (does not remove candidate line). */
export function buildMarAllergyReviewDismissedNotes(
  existingNotes: string | null | undefined,
  dismissal: MarAllergyReviewDismissal
): string {
  const line = `${MAR_ALLERGY_REVIEW_DISMISSED_NOTE_PREFIX} ${JSON.stringify(dismissal)}`;
  const base = existingNotes?.trim() ? `${existingNotes.trim()}\n` : "";
  return `${base}${line}`;
}

/** Match candidates to a medication being ordered (non-blocking lookup). */
export function findMarAllergyCandidatesForMedicationName(
  candidates: MarAllergyCandidate[],
  medicationName: string | null | undefined
): MarAllergyCandidate[] {
  const target = normalizeMedicationToken(medicationName);
  if (!target) return [];
  return filterActiveMarAllergyReviewCandidates(candidates).filter((candidate) => {
    const name = normalizeMedicationToken(candidate.medicationName);
    if (!name) return false;
    return name.includes(target) || target.includes(name);
  });
}

function normalizeMedicationToken(raw: string | null | undefined): string {
  return (raw ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Collect candidates across multiple MAR administration note blobs. */
export function collectMarAllergyReviewCandidatesFromAdministrations(
  administrations: Array<{ id: string; notes?: string | null; orderItemId?: string | null }>
): MarAllergyCandidate[] {
  const all: MarAllergyCandidate[] = [];
  for (const row of administrations) {
    for (const candidate of parseMarAllergyReviewCandidatesFromNotes(row.notes)) {
      all.push({
        ...candidate,
        sourceAdministrationId: candidate.sourceAdministrationId ?? row.id,
        sourceOrderItemId: candidate.sourceOrderItemId ?? row.orderItemId ?? null,
      });
    }
  }
  return all.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());
}
