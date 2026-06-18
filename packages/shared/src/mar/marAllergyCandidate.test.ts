import { describe, expect, it } from "vitest";
import {
  buildMarAllergyReviewCandidateNotes,
  parseMarAllergyReviewCandidatesFromNotes,
  findMarAllergyCandidatesForMedicationName,
  MAR_ALLERGY_REVIEW_CANDIDATE_NOTE_PREFIX,
} from "./marAllergyCandidate.js";

describe("marAllergyCandidate", () => {
  const candidate = {
    candidateId: "mar-1:2026-06-03T08:45:00.000Z",
    medicationName: "Amoxicillin",
    medicationClass: null,
    reactionText: "rash on arms",
    reactionCategory: "HIGH_PRIORITY_REVIEW" as const,
    detectedAt: "2026-06-03T08:45:00.000Z",
    documentedBy: "Jane RN",
    recommendationLevel: "HIGH_PRIORITY_REVIEW" as const,
    sourceAdministrationId: "mar-1",
    sourceOrderItemId: "oi-1",
  };

  it("candidate generated correctly from notes", () => {
    const notes = buildMarAllergyReviewCandidateNotes(null, candidate);
    expect(notes).toContain(MAR_ALLERGY_REVIEW_CANDIDATE_NOTE_PREFIX);
    const parsed = parseMarAllergyReviewCandidatesFromNotes(notes);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.medicationName).toBe("Amoxicillin");
    expect(parsed[0]?.reactionText).toBe("rash on arms");
  });

  it("allergy not auto-created — candidate prefix only", () => {
    const notes = buildMarAllergyReviewCandidateNotes(null, candidate);
    expect(notes).not.toMatch(/PatientAllergy|ALLERGY_CREATED/i);
    expect(notes).toContain("MAR_ALLERGY_REVIEW_CANDIDATE");
  });

  it("findMarAllergyCandidatesForMedicationName matches order medication", () => {
    const notes = buildMarAllergyReviewCandidateNotes(null, candidate);
    const parsed = parseMarAllergyReviewCandidatesFromNotes(notes);
    const matches = findMarAllergyCandidatesForMedicationName(parsed, "amoxicillin 500 mg");
    expect(matches).toHaveLength(1);
  });
});
