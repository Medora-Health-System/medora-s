import { describe, expect, it } from "vitest";
import {
  TRIAGE_CARRY_FORWARD_FORBIDDEN_ER_V1_KEYS,
  TRIAGE_CARRY_FORWARD_VERSION,
  buildTriageCarryForwardAuditMetadata,
  buildTriageCarryForwardSummary,
  carryForwardExtractionExcludesForbiddenFields,
  computeCarryForwardStaleness,
  confirmAllCarryForwardSections,
  confirmCarryForwardSection,
  emptyTriageCarryForwardDraft,
  evaluateCarryForwardSectionStatus,
  extractCarryForwardTriageHistory,
  mergeCarryForwardIntoNewTriage,
  normalizeTriageCarryForwardMeta,
  removeCarryForwardSectionValues,
  type TriageCarryForwardMeta,
  type TriageCarryForwardSource,
} from "./triageCarryForward.js";

const SOURCE_ENCOUNTER_ID = "enc-prior-001";
const CURRENT_PATIENT_ID = "patient-001";

function priorSource(overrides?: Partial<TriageCarryForwardSource>): TriageCarryForwardSource {
  return {
    encounterId: SOURCE_ENCOUNTER_ID,
    patientId: CURRENT_PATIENT_ID,
    facilityId: "facility-001",
    encounterDate: "2025-12-01T14:30:00.000Z",
    vitalsJson: {},
    ...overrides,
  };
}

function richPriorVitalsJson(): Record<string, unknown> {
  return {
    allergyNote: "Pénicilline — urticaire",
    medoraErTriageV1: {
      triageNarrative: "Should not carry",
      painScale0to10: "8",
      medicationsSummary: "Metformine 500 mg",
      medicationSummarySelections: ["POLYPHARMACY"],
      medicationAllergiesDetail: "Pénicilline",
      foodAllergiesDetail: "Arachides",
      pastMedicalHistory: "Diabète type 2",
      pastSurgicalHistory: "Appendicectomie 2010",
      smokingStatus: "Former smoker",
      alcoholUse: "Occasional",
      marijuanaUse: "Denies",
      socialHistorySelections: ["FORMER_SMOKER", "ALCOHOL_USE"],
    },
  };
}

function mergeRich(): { draft: ReturnType<typeof emptyTriageCarryForwardDraft>; meta: TriageCarryForwardMeta } {
  const extraction = extractCarryForwardTriageHistory(priorSource({ vitalsJson: richPriorVitalsJson() }))!;
  return mergeCarryForwardIntoNewTriage(emptyTriageCarryForwardDraft(), extraction, {
    version: TRIAGE_CARRY_FORWARD_VERSION,
    sourceEncounterId: SOURCE_ENCOUNTER_ID,
    sourceEncounterDate: "2025-12-01T14:30:00.000Z",
    carriedForwardAt: "2026-05-18T10:00:00.000Z",
  });
}

function legacyMeta19T1(): TriageCarryForwardMeta {
  return {
    version: TRIAGE_CARRY_FORWARD_VERSION,
    sourceEncounterId: SOURCE_ENCOUNTER_ID,
    sourceEncounterDate: "2025-12-01T14:30:00.000Z",
    carriedForwardAt: "2026-05-18T10:00:00.000Z",
    fields: {
      allergies: true,
      homeMedications: true,
      medicalHistory: true,
      surgicalHistory: true,
      smokingHistory: true,
      alcoholUse: true,
      substanceUse: true,
    },
    reviewStatus: "pending_review",
    fieldSnapshots: {
      allergies: JSON.stringify({ allergyNote: "Pénicilline", medicationAllergiesDetail: "Pénicilline" }),
      homeMedications: JSON.stringify({ medicationsSummary: "Metformine" }),
      medicalHistory: JSON.stringify({ pastMedicalHistory: "Diabète" }),
      surgicalHistory: JSON.stringify({ pastSurgicalHistory: "Appendicectomie" }),
      smokingHistory: JSON.stringify({ smokingStatus: "Former", socialHistorySelections: ["FORMER_SMOKER"] }),
      alcoholUse: JSON.stringify({ alcoholUse: "Occasional", socialHistorySelections: ["ALCOHOL_USE"] }),
      substanceUse: JSON.stringify({ marijuanaUse: "Denies", socialHistorySelections: [] }),
    },
  };
}

describe("triageCarryForward (19T.2)", () => {
  it("computes fresh staleness under 6 months", () => {
    const now = new Date("2026-05-18T12:00:00.000Z");
    const staleness = computeCarryForwardStaleness("2026-02-01T00:00:00.000Z", now);
    expect(staleness.level).toBe("fresh");
    expect(staleness.ageDays).toBeLessThan(183);
  });

  it("computes stale staleness between 6 and 12 months", () => {
    const now = new Date("2026-05-18T12:00:00.000Z");
    const staleness = computeCarryForwardStaleness("2025-08-01T00:00:00.000Z", now);
    expect(staleness.level).toBe("stale");
    expect(staleness.ageDays).toBeGreaterThanOrEqual(183);
    expect(staleness.ageDays).toBeLessThan(365);
  });

  it("computes very_stale staleness over 12 months", () => {
    const now = new Date("2026-05-18T12:00:00.000Z");
    const staleness = computeCarryForwardStaleness("2024-01-01T00:00:00.000Z", now);
    expect(staleness.level).toBe("very_stale");
    expect(staleness.ageDays).toBeGreaterThanOrEqual(365);
  });

  it("loads existing 19T.1 metadata without staleness", () => {
    const meta = legacyMeta19T1();
    expect(meta.staleness).toBeUndefined();
    const normalized = normalizeTriageCarryForwardMeta(meta);
    expect(normalized.staleness?.level).toBeDefined();
    expect(normalized.sourceEncounterId).toBe(SOURCE_ENCOUNTER_ID);
  });

  it("loads existing 19T.1 metadata without sectionStatus", () => {
    const meta = legacyMeta19T1();
    expect(meta.sectionStatus).toBeUndefined();
    const normalized = normalizeTriageCarryForwardMeta(meta);
    expect(normalized.sectionStatus?.allergies).toBe("pending_review");
    expect(normalized.sectionStatus?.history).toBe("pending_review");
  });

  it("initializes section statuses from carried-forward fields", () => {
    const { meta } = mergeRich();
    expect(meta.sectionStatus?.allergies).toBe("pending_review");
    expect(meta.sectionStatus?.homeMedications).toBe("pending_review");
    expect(meta.sectionStatus?.history).toBe("pending_review");
    expect(meta.sectionStatus?.socialHistory).toBe("pending_review");
  });

  it("confirm all sets all sections reviewed", () => {
    const { draft, meta } = mergeRich();
    const next = confirmAllCarryForwardSections(meta, draft, { reviewedBy: "rn-1" });
    expect(next.sectionStatus?.allergies).toBe("reviewed");
    expect(next.sectionStatus?.homeMedications).toBe("reviewed");
    expect(next.sectionStatus?.history).toBe("reviewed");
    expect(next.sectionStatus?.socialHistory).toBe("reviewed");
    expect(next.reviewStatus).toBe("reviewed");
  });

  it("confirm allergies only sets allergies reviewed", () => {
    const { draft, meta } = mergeRich();
    const next = confirmCarryForwardSection(meta, draft, "allergies");
    expect(next.sectionStatus?.allergies).toBe("reviewed");
    expect(next.sectionStatus?.homeMedications).toBe("pending_review");
    expect(next.reviewStatus).toBe("pending_review");
  });

  it("confirm home meds only sets homeMedications reviewed", () => {
    const { draft, meta } = mergeRich();
    const next = confirmCarryForwardSection(meta, draft, "homeMedications");
    expect(next.sectionStatus?.homeMedications).toBe("reviewed");
    expect(next.sectionStatus?.allergies).toBe("pending_review");
  });

  it("confirm history only sets history reviewed", () => {
    const { draft, meta } = mergeRich();
    const next = confirmCarryForwardSection(meta, draft, "history");
    expect(next.sectionStatus?.history).toBe("reviewed");
    expect(next.sectionStatus?.socialHistory).toBe("pending_review");
  });

  it("confirm social history only sets socialHistory reviewed", () => {
    const { draft, meta } = mergeRich();
    const next = confirmCarryForwardSection(meta, draft, "socialHistory");
    expect(next.sectionStatus?.socialHistory).toBe("reviewed");
    expect(next.sectionStatus?.history).toBe("pending_review");
  });

  it("clear allergies removes only carried-forward allergy values", () => {
    const { draft, meta } = mergeRich();
    draft.erV1.pastMedicalHistory = "Manual PMH";
    const { draft: cleared, meta: nextMeta } = removeCarryForwardSectionValues(draft, meta, "allergies");
    expect(cleared.allergyNote).toBe("");
    expect(cleared.erV1.medicationAllergiesDetail).toBe("");
    expect(cleared.erV1.pastMedicalHistory).toBe("Manual PMH");
    expect(nextMeta.fields.allergies).toBeUndefined();
    expect(nextMeta.sectionStatus?.allergies).toBe("removed");
  });

  it("clear home medications removes only carried-forward medication values", () => {
    const { draft, meta } = mergeRich();
    draft.allergyNote = "Manual allergy";
    const { draft: cleared, meta: nextMeta } = removeCarryForwardSectionValues(draft, meta, "homeMedications");
    expect(cleared.erV1.medicationsSummary).toBe("");
    expect(cleared.allergyNote).toBe("Manual allergy");
    expect(nextMeta.fields.homeMedications).toBeUndefined();
  });

  it("clear history removes PMH and PSH only", () => {
    const { draft, meta } = mergeRich();
    draft.erV1.smokingStatus = "Manual smoking";
    const { draft: cleared, meta: nextMeta } = removeCarryForwardSectionValues(draft, meta, "history");
    expect(cleared.erV1.pastMedicalHistory).toBe("");
    expect(cleared.erV1.pastSurgicalHistory).toBe("");
    expect(cleared.erV1.smokingStatus).toBe("Manual smoking");
    expect(nextMeta.fields.medicalHistory).toBeUndefined();
    expect(nextMeta.fields.surgicalHistory).toBeUndefined();
  });

  it("clear social history removes smoking/alcohol/substance values only", () => {
    const { draft, meta } = mergeRich();
    draft.erV1.pastMedicalHistory = "Keep PMH";
    const { draft: cleared, meta: nextMeta } = removeCarryForwardSectionValues(draft, meta, "socialHistory");
    expect(cleared.erV1.smokingStatus).toBe("");
    expect(cleared.erV1.alcoholUse).toBe("");
    expect(cleared.erV1.marijuanaUse).toBe("");
    expect(cleared.erV1.pastMedicalHistory).toBe("Keep PMH");
    expect(nextMeta.fields.smokingHistory).toBeUndefined();
    expect(nextMeta.fields.alcoholUse).toBeUndefined();
    expect(nextMeta.fields.substanceUse).toBeUndefined();
  });

  it("editing allergies marks allergies modified", () => {
    const { draft, meta } = mergeRich();
    const edited = { ...draft, allergyNote: "Changed allergy" };
    expect(evaluateCarryForwardSectionStatus(meta, edited, "allergies")).toBe("modified");
  });

  it("editing home meds marks homeMedications modified", () => {
    const { draft, meta } = mergeRich();
    const edited = { ...draft, erV1: { ...draft.erV1, medicationsSummary: "Changed meds" } };
    expect(evaluateCarryForwardSectionStatus(meta, edited, "homeMedications")).toBe("modified");
  });

  it("editing history marks history modified", () => {
    const { draft, meta } = mergeRich();
    const edited = { ...draft, erV1: { ...draft.erV1, pastMedicalHistory: "Changed PMH" } };
    expect(evaluateCarryForwardSectionStatus(meta, edited, "history")).toBe("modified");
  });

  it("editing social history marks socialHistory modified", () => {
    const { draft, meta } = mergeRich();
    const edited = { ...draft, erV1: { ...draft.erV1, smokingStatus: "Current smoker" } };
    expect(evaluateCarryForwardSectionStatus(meta, edited, "socialHistory")).toBe("modified");
  });

  it("global status pending if any section pending", () => {
    const { draft, meta } = mergeRich();
    const partial = confirmCarryForwardSection(meta, draft, "allergies");
    expect(partial.reviewStatus).toBe("pending_review");
  });

  it("global status modified if any section modified", () => {
    const { draft, meta } = mergeRich();
    const edited = { ...draft, allergyNote: "Changed" };
    const next = normalizeTriageCarryForwardMeta(meta, edited);
    expect(next.reviewStatus).toBe("modified");
  });

  it("global status reviewed if all sections reviewed", () => {
    const { draft, meta } = mergeRich();
    const next = confirmAllCarryForwardSections(meta, draft);
    expect(next.reviewStatus).toBe("reviewed");
  });

  it("global status removed if all sections removed", () => {
    const { draft, meta } = mergeRich();
    let nextDraft = draft;
    let nextMeta = meta;
    for (const section of ["allergies", "homeMedications", "history", "socialHistory"] as const) {
      const result = removeCarryForwardSectionValues(nextDraft, nextMeta, section);
      nextDraft = result.draft;
      nextMeta = result.meta;
    }
    expect(nextMeta.reviewStatus).toBe("removed");
  });

  it("audit metadata excludes clinical text", () => {
    const { meta } = mergeRich();
    const audit = buildTriageCarryForwardAuditMetadata({
      patientId: CURRENT_PATIENT_ID,
      encounterId: "enc-new",
      meta,
    });
    expect(JSON.stringify(audit)).not.toContain("Pénicilline");
    expect(JSON.stringify(audit)).not.toContain("Metformine");
    expect(audit.sectionKeys.length).toBeGreaterThan(0);
    expect(audit.stalenessLevel).toBeDefined();
  });

  it("summary includes section statuses", () => {
    const { meta } = mergeRich();
    const summary = buildTriageCarryForwardSummary(meta);
    expect(summary.sections.length).toBeGreaterThan(0);
    expect(summary.staleness?.level).toBeDefined();
    expect(summary.sections.every((s) => s.reviewStatus === "pending_review")).toBe(true);
  });

  it("carry-forward still excludes forbidden visit-specific fields", () => {
    const extraction = extractCarryForwardTriageHistory(priorSource({ vitalsJson: richPriorVitalsJson() }))!;
    expect(carryForwardExtractionExcludesForbiddenFields(extraction)).toBe(true);
    for (const forbidden of ["painScale0to10", "triageNarrative"]) {
      expect(extraction.fields).not.toHaveProperty(forbidden);
    }
    expect(TRIAGE_CARRY_FORWARD_FORBIDDEN_ER_V1_KEYS).toContain("painScale0to10");
  });

  it("prior encounter is not mutated on merge", () => {
    const prior = richPriorVitalsJson();
    const copy = JSON.parse(JSON.stringify(prior));
    extractCarryForwardTriageHistory(priorSource({ vitalsJson: prior }));
    expect(prior).toEqual(copy);
  });
});
