import { describe, expect, it } from "vitest";
import {
  normalizeMedicationAdministrationHistoryAllergyReviewRows,
  normalizeMedicationAdministrationHistoryResponseRows,
  buildMarAllergyReviewCandidateNotes,
  buildMarMedicationResponseNotes,
  sortMedicationAdministrationHistoryEntries,
} from "@medora/shared";
import { buildMedicationAdministrationHistoryRailEntry } from "@/lib/medicationAdministrationHistoryRail";
import type { MedicationAdministrationHistoryEntry } from "@medora/shared";

describe("marAllergyRecommendationHistory", () => {
  const marEntry: MedicationAdministrationHistoryEntry = {
    id: "mar-1",
    source: "MAR",
    encounterId: "enc-1",
    orderItemId: "oi-1",
    medicationLabel: "Amoxicillin",
    doseDisplay: "500 mg",
    route: "PO",
    eventType: "ADMINISTERED",
    eventAt: "2026-06-03T08:00:00.000Z",
    documentedAt: null,
    performedByDisplay: "Jane RN",
    performedByRole: "RN",
    reasonCode: null,
    reasonDetail: null,
    isPrn: false,
    prnIndication: null,
    infusionPhase: null,
    medicationDoseInstanceId: "dose-1",
    readOnly: true,
  };

  function buildNotes(): string {
    const response = buildMarMedicationResponseNotes(null, {
      responseCode: "ADVERSE_REACTION_REPORTED",
      responseDetail: "rash",
      responseTime: "2026-06-03T08:45:00.000Z",
      documentedAt: "2026-06-03T08:45:00.000Z",
      painBefore: null,
      painAfter: null,
    });
    if (!response.ok || !response.notes) throw new Error("response build failed");
    return buildMarAllergyReviewCandidateNotes(response.notes, {
      candidateId: "mar-1:2026-06-03T08:45:00.000Z",
      medicationName: "Amoxicillin",
      medicationClass: null,
      reactionText: "rash",
      reactionCategory: "HIGH_PRIORITY_REVIEW",
      detectedAt: "2026-06-03T08:45:00.000Z",
      documentedBy: "Jane RN",
      recommendationLevel: "HIGH_PRIORITY_REVIEW",
      sourceAdministrationId: "mar-1",
      sourceOrderItemId: "oi-1",
    });
  }

  it("history event ALLERGY_REVIEW_RECOMMENDED generated", () => {
    const notes = buildNotes();
    const responseRows = normalizeMedicationAdministrationHistoryResponseRows({
      marEntry,
      administrationId: "mar-1",
      notes,
    });
    const allergyRows = normalizeMedicationAdministrationHistoryAllergyReviewRows({
      marEntry,
      administrationId: "mar-1",
      notes,
    });
    expect(responseRows.some((r) => r.eventType === "MEDICATION_RESPONSE_DOCUMENTED")).toBe(true);
    expect(allergyRows.some((r) => r.eventType === "ALLERGY_REVIEW_RECOMMENDED")).toBe(true);
  });

  it("chronology reconstruction preserved without collapsing", () => {
    const notes = buildNotes();
    const merged = sortMedicationAdministrationHistoryEntries([
      marEntry,
      ...normalizeMedicationAdministrationHistoryResponseRows({
        marEntry,
        administrationId: "mar-1",
        notes,
      }),
      ...normalizeMedicationAdministrationHistoryAllergyReviewRows({
        marEntry,
        administrationId: "mar-1",
        notes,
      }),
    ]);
    const types = merged.map((e) => e.eventType);
    expect(types).toContain("ADMINISTERED");
    expect(types).toContain("MEDICATION_RESPONSE_DOCUMENTED");
    expect(types).toContain("ALLERGY_REVIEW_RECOMMENDED");
    expect(types.filter((t) => t === "MEDICATION_RESPONSE_DOCUMENTED")).toHaveLength(1);
    expect(types.filter((t) => t === "ALLERGY_REVIEW_RECOMMENDED")).toHaveLength(1);
  });

  it("multiple reactions preserved", () => {
    let notes = buildNotes();
    const second = buildMarMedicationResponseNotes(notes, {
      responseCode: "ADVERSE_REACTION_REPORTED",
      responseDetail: "hives",
      responseTime: "2026-06-03T09:15:00.000Z",
      documentedAt: "2026-06-03T09:15:00.000Z",
      painBefore: null,
      painAfter: null,
    });
    if (!second.ok || !second.notes) throw new Error("second response failed");
    notes = buildMarAllergyReviewCandidateNotes(second.notes, {
      candidateId: "mar-1:2026-06-03T09:15:00.000Z",
      medicationName: "Amoxicillin",
      medicationClass: null,
      reactionText: "hives",
      reactionCategory: "HIGH_PRIORITY_REVIEW",
      detectedAt: "2026-06-03T09:15:00.000Z",
      documentedBy: "Jane RN",
      recommendationLevel: "HIGH_PRIORITY_REVIEW",
    });
    const allergyRows = normalizeMedicationAdministrationHistoryAllergyReviewRows({
      marEntry,
      administrationId: "mar-1",
      notes,
    });
    expect(allergyRows).toHaveLength(2);
  });

  it("history rail renders allergy review recommendation", () => {
    const notes = buildNotes();
    const allergyRow = normalizeMedicationAdministrationHistoryAllergyReviewRows({
      marEntry,
      administrationId: "mar-1",
      notes,
    })[0]!;
    const rail = buildMedicationAdministrationHistoryRailEntry(allergyRow, {
      formatClinicalTime: (iso) => iso,
      t: (key) => key,
    });
    expect(rail.eventType).toBe("ALLERGY_REVIEW_RECOMMENDED");
    expect(rail.allergyReviewRecommendationLine).toContain("marAllergyReview.recommendation.highPriority");
  });
});
