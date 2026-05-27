import { describe, expect, it } from "vitest";
import {
  TRIAGE_CARRY_FORWARD_FORBIDDEN_ER_V1_KEYS,
  TRIAGE_CARRY_FORWARD_VERSION,
  attachTriageCarryForwardMetaToVitalsJson,
  buildTriageCarryForwardAuditMetadata,
  buildTriageCarryForwardSummary,
  carryForwardExtractionExcludesForbiddenFields,
  emptyTriageCarryForwardDraft,
  evaluateCarryForwardReviewStatus,
  extractCarryForwardTriageHistory,
  mergeCarryForwardIntoNewTriage,
  triageCarryForwardMetaFromVitalsJson,
  type TriageCarryForwardMeta,
  type TriageCarryForwardSource,
} from "./triageCarryForward.js";

const SOURCE_ENCOUNTER_ID = "enc-prior-001";
const CURRENT_PATIENT_ID = "patient-001";
const CURRENT_FACILITY_ID = "facility-001";

function priorSource(overrides?: Partial<TriageCarryForwardSource>): TriageCarryForwardSource {
  return {
    encounterId: SOURCE_ENCOUNTER_ID,
    patientId: CURRENT_PATIENT_ID,
    facilityId: CURRENT_FACILITY_ID,
    encounterDate: "2025-12-01T14:30:00.000Z",
    vitalsJson: {},
    ...overrides,
  };
}

function richPriorVitalsJson(): Record<string, unknown> {
  return {
    tempC: 38.5,
    hr: 110,
    bpSys: 140,
    allergyNote: "Pénicilline — urticaire",
    chiefComplaint: "Should not carry",
    medoraErTriageV1: {
      triageNarrative: "Patient arrived in distress",
      painScale0to10: "8",
      airway: "yes",
      medicationsSummary: "Metformine 500 mg PO BID\nAspirine 81 mg PO daily",
      medicationSummarySelections: ["POLYPHARMACY"],
      medicationAllergiesDetail: "Pénicilline",
      foodAllergiesDetail: "Arachides",
      additionalAllergyInfo: "NKDA refusé au triage précédent",
      allergyDetailSelections: ["DRUG_ALLERGY"],
      pastMedicalHistory: "Diabète type 2\nHTA",
      pastSurgicalHistory: "Appendicectomie 2010",
      familyHistory: "Should not carry family history",
      smokingStatus: "Former smoker — 10 pack-years",
      alcoholUse: "Occasional",
      marijuanaUse: "Denies",
      stimulantUse: "Denies",
      opioidHeroinUse: "Denies",
      historySocialComments: "No IVDU",
      socialHistorySelections: ["FORMER_SMOKER", "ALCOHOL_USE"],
      feelsSafeAtHome: "yes",
      nursingCareNote: "Should not carry nursing",
    },
  };
}

describe("triageCarryForward (19T.1)", () => {
  it("extracts allergies from prior encounter", () => {
    const extraction = extractCarryForwardTriageHistory(
      priorSource({ vitalsJson: richPriorVitalsJson() })
    );
    expect(extraction?.allergyNote).toBe("Pénicilline — urticaire");
    expect(extraction?.fields.medicationAllergiesDetail).toBe("Pénicilline");
    expect(extraction?.fields.foodAllergiesDetail).toBe("Arachides");
    expect(extraction?.appliedFieldKeys).toContain("allergies");
  });

  it("extracts home medications from prior encounter", () => {
    const extraction = extractCarryForwardTriageHistory(
      priorSource({ vitalsJson: richPriorVitalsJson() })
    );
    expect(extraction?.fields.medicationsSummary).toContain("Metformine");
    expect(extraction?.fields.medicationSummarySelections).toEqual(["POLYPHARMACY"]);
    expect(extraction?.appliedFieldKeys).toContain("homeMedications");
  });

  it("extracts medical and surgical history", () => {
    const extraction = extractCarryForwardTriageHistory(
      priorSource({ vitalsJson: richPriorVitalsJson() })
    );
    expect(extraction?.fields.pastMedicalHistory).toContain("Diabète");
    expect(extraction?.fields.pastSurgicalHistory).toContain("Appendicectomie");
    expect(extraction?.appliedFieldKeys).toContain("medicalHistory");
    expect(extraction?.appliedFieldKeys).toContain("surgicalHistory");
  });

  it("extracts smoking, alcohol, and substance use", () => {
    const extraction = extractCarryForwardTriageHistory(
      priorSource({ vitalsJson: richPriorVitalsJson() })
    );
    expect(extraction?.fields.smokingStatus).toContain("Former smoker");
    expect(extraction?.fields.alcoholUse).toBe("Occasional");
    expect(extraction?.fields.historySocialComments).toBe("No IVDU");
    expect(extraction?.fields.socialHistorySelections).toEqual(expect.arrayContaining(["FORMER_SMOKER", "ALCOHOL_USE"]));
    expect(extraction?.appliedFieldKeys).toEqual(
      expect.arrayContaining(["smokingHistory", "alcoholUse", "substanceUse"])
    );
  });

  it("does not carry forward vitals", () => {
    const extraction = extractCarryForwardTriageHistory(
      priorSource({ vitalsJson: richPriorVitalsJson() })
    );
    expect(extraction).not.toBeNull();
    expect(extraction!.fields).not.toHaveProperty("tempC");
    expect(extraction!.fields).not.toHaveProperty("hr");
    expect(carryForwardExtractionExcludesForbiddenFields(extraction!)).toBe(true);
  });

  it("does not carry forward ESI or chief complaint from triage row", () => {
    const extraction = extractCarryForwardTriageHistory(
      priorSource({
        vitalsJson: richPriorVitalsJson(),
        chiefComplaint: "Chest pain",
        esi: 2,
      })
    );
    expect(extraction!.fields).not.toHaveProperty("chiefComplaint");
    expect(extraction!.fields).not.toHaveProperty("esi");
  });

  it("does not carry forward pain score or visit-specific ER V1 fields", () => {
    const extraction = extractCarryForwardTriageHistory(
      priorSource({ vitalsJson: richPriorVitalsJson() })
    );
    for (const forbidden of ["painScale0to10", "triageNarrative", "airway", "familyHistory", "nursingCareNote"]) {
      expect(extraction!.fields).not.toHaveProperty(forbidden);
    }
    expect(TRIAGE_CARRY_FORWARD_FORBIDDEN_ER_V1_KEYS).toContain("painScale0to10");
  });

  it("does not carry forward diagnosis, orders, or disposition (not present in triage JSON)", () => {
    const extraction = extractCarryForwardTriageHistory(
      priorSource({
        vitalsJson: {
          ...richPriorVitalsJson(),
          diagnoses: [{ code: "R07.9" }],
          orders: [{ id: "order-1" }],
          disposition: { status: "DISCHARGED" },
        },
      })
    );
    expect(extraction!.fields).not.toHaveProperty("diagnoses");
    expect(extraction!.fields).not.toHaveProperty("orders");
    expect(extraction!.fields).not.toHaveProperty("disposition");
  });

  it("does not overwrite new encounter fields during merge", () => {
    const extraction = extractCarryForwardTriageHistory(
      priorSource({ vitalsJson: richPriorVitalsJson() })
    )!;
    const target = emptyTriageCarryForwardDraft();
    target.erV1.pastMedicalHistory = "Already entered asthma";
    target.allergyNote = "Existing latex allergy";

    const { draft } = mergeCarryForwardIntoNewTriage(target, extraction, {
      version: TRIAGE_CARRY_FORWARD_VERSION,
      sourceEncounterId: SOURCE_ENCOUNTER_ID,
      sourceEncounterDate: "2025-12-01T14:30:00.000Z",
      carriedForwardAt: "2026-05-18T10:00:00.000Z",
    });

    expect(draft.allergyNote).toBe("Existing latex allergy");
    expect(draft.erV1.pastMedicalHistory).toBe("Already entered asthma");
    expect(draft.erV1.pastSurgicalHistory).toContain("Appendicectomie");
  });

  it("ignores empty prior fields", () => {
    const extraction = extractCarryForwardTriageHistory(
      priorSource({
        vitalsJson: {
          medoraErTriageV1: {
            painScale0to10: "9",
            triageNarrative: "Only visit-specific data",
          },
        },
      })
    );
    expect(extraction).toBeNull();
  });

  it("includes source encounter ID and date in metadata", () => {
    const extraction = extractCarryForwardTriageHistory(
      priorSource({ vitalsJson: richPriorVitalsJson() })
    )!;
    const { meta } = mergeCarryForwardIntoNewTriage(emptyTriageCarryForwardDraft(), extraction, {
      version: TRIAGE_CARRY_FORWARD_VERSION,
      sourceEncounterId: SOURCE_ENCOUNTER_ID,
      sourceEncounterDate: "2025-12-01T14:30:00.000Z",
      sourceFacilityId: CURRENT_FACILITY_ID,
      carriedForwardAt: "2026-05-18T10:00:00.000Z",
    });
    expect(meta.sourceEncounterId).toBe(SOURCE_ENCOUNTER_ID);
    expect(meta.sourceEncounterDate).toBe("2025-12-01T14:30:00.000Z");
    expect(meta.sourceFacilityId).toBe(CURRENT_FACILITY_ID);
  });

  it("starts review status as pending_review", () => {
    const extraction = extractCarryForwardTriageHistory(
      priorSource({ vitalsJson: richPriorVitalsJson() })
    )!;
    const { meta } = mergeCarryForwardIntoNewTriage(emptyTriageCarryForwardDraft(), extraction, {
      version: TRIAGE_CARRY_FORWARD_VERSION,
      sourceEncounterId: SOURCE_ENCOUNTER_ID,
      sourceEncounterDate: "2025-12-01T14:30:00.000Z",
      carriedForwardAt: "2026-05-18T10:00:00.000Z",
    });
    expect(meta.reviewStatus).toBe("pending_review");
  });

  it("changes status to modified when a carried-forward field is edited", () => {
    const extraction = extractCarryForwardTriageHistory(
      priorSource({ vitalsJson: richPriorVitalsJson() })
    )!;
    const { draft, meta } = mergeCarryForwardIntoNewTriage(emptyTriageCarryForwardDraft(), extraction, {
      version: TRIAGE_CARRY_FORWARD_VERSION,
      sourceEncounterId: SOURCE_ENCOUNTER_ID,
      sourceEncounterDate: "2025-12-01T14:30:00.000Z",
      carriedForwardAt: "2026-05-18T10:00:00.000Z",
    });
    const edited = {
      ...draft,
      erV1: { ...draft.erV1, pastMedicalHistory: "Diabète type 2 — modifié" },
    };
    const next = evaluateCarryForwardReviewStatus(meta, edited);
    expect(next.reviewStatus).toBe("modified");
  });

  it("changes status to removed when all carried-forward values are cleared", () => {
    const extraction = extractCarryForwardTriageHistory(
      priorSource({
        vitalsJson: {
          allergyNote: "Pénicilline",
          medoraErTriageV1: { medicationAllergiesDetail: "Pénicilline" },
        },
      })
    )!;
    const { draft, meta } = mergeCarryForwardIntoNewTriage(emptyTriageCarryForwardDraft(), extraction, {
      version: TRIAGE_CARRY_FORWARD_VERSION,
      sourceEncounterId: SOURCE_ENCOUNTER_ID,
      sourceEncounterDate: "2025-12-01T14:30:00.000Z",
      carriedForwardAt: "2026-05-18T10:00:00.000Z",
    });
    const cleared = emptyTriageCarryForwardDraft();
    const next = evaluateCarryForwardReviewStatus(meta, cleared);
    expect(next.reviewStatus).toBe("removed");
    expect(draft.allergyNote).toBe("Pénicilline");
  });

  it("changes status to reviewed when review action is taken", () => {
    const extraction = extractCarryForwardTriageHistory(
      priorSource({ vitalsJson: richPriorVitalsJson() })
    )!;
    const { draft, meta } = mergeCarryForwardIntoNewTriage(emptyTriageCarryForwardDraft(), extraction, {
      version: TRIAGE_CARRY_FORWARD_VERSION,
      sourceEncounterId: SOURCE_ENCOUNTER_ID,
      sourceEncounterDate: "2025-12-01T14:30:00.000Z",
      carriedForwardAt: "2026-05-18T10:00:00.000Z",
    });
    const reviewed = evaluateCarryForwardReviewStatus(meta, draft, {
      markReviewed: true,
      reviewedBy: "user-rn-1",
      reviewedAt: "2026-05-18T10:05:00.000Z",
    });
    expect(reviewed.reviewStatus).toBe("reviewed");
    expect(reviewed.reviewedBy).toBe("user-rn-1");
  });

  it("builds summary with carried-forward status and source date", () => {
    const meta: TriageCarryForwardMeta = {
      version: TRIAGE_CARRY_FORWARD_VERSION,
      sourceEncounterId: SOURCE_ENCOUNTER_ID,
      sourceEncounterDate: "2025-12-01T14:30:00.000Z",
      carriedForwardAt: "2026-05-18T10:00:00.000Z",
      fields: { allergies: true, homeMedications: true },
      reviewStatus: "pending_review",
    };
    const summary = buildTriageCarryForwardSummary(meta);
    expect(summary.sourceEncounterId).toBe(SOURCE_ENCOUNTER_ID);
    expect(summary.sourceEncounterDate).toBe("2025-12-01T14:30:00.000Z");
    expect(summary.reviewStatus).toBe("pending_review");
    expect(summary.fields.map((f) => f.fieldKey)).toEqual(["allergies", "homeMedications"]);
  });

  it("audit metadata excludes clinical text", () => {
    const meta: TriageCarryForwardMeta = {
      version: TRIAGE_CARRY_FORWARD_VERSION,
      sourceEncounterId: SOURCE_ENCOUNTER_ID,
      sourceEncounterDate: "2025-12-01T14:30:00.000Z",
      carriedForwardAt: "2026-05-18T10:00:00.000Z",
      fields: { allergies: true },
      reviewStatus: "pending_review",
      fieldSnapshots: { allergies: JSON.stringify({ allergyNote: "Secret PHI" }) },
    };
    const audit = buildTriageCarryForwardAuditMetadata({
      patientId: CURRENT_PATIENT_ID,
      encounterId: "enc-new-001",
      meta,
      actorId: "user-rn-1",
      timestamp: "2026-05-18T10:00:00.000Z",
    });
    expect(audit).toEqual({
      patientId: CURRENT_PATIENT_ID,
      encounterId: "enc-new-001",
      sourceEncounterId: SOURCE_ENCOUNTER_ID,
      fieldKeys: ["allergies"],
      reviewStatus: "pending_review",
      actorId: "user-rn-1",
      timestamp: "2026-05-18T10:00:00.000Z",
    });
    expect(JSON.stringify(audit)).not.toContain("Secret PHI");
    expect(JSON.stringify(audit)).not.toContain("Pénicilline");
  });

  it("requires patient and encounter IDs on extraction (same-patient enforcement hook)", () => {
    expect(extractCarryForwardTriageHistory(priorSource({ patientId: "" }))).toBeNull();
    expect(extractCarryForwardTriageHistory(priorSource({ encounterId: "" }))).toBeNull();
  });

  it("persists and reads carry-forward meta from vitalsJson without mutating prior blob", () => {
    const prior = richPriorVitalsJson();
    const priorCopy = JSON.parse(JSON.stringify(prior));
    const extraction = extractCarryForwardTriageHistory(priorSource({ vitalsJson: prior }))!;
    const { meta } = mergeCarryForwardIntoNewTriage(emptyTriageCarryForwardDraft(), extraction, {
      version: TRIAGE_CARRY_FORWARD_VERSION,
      sourceEncounterId: SOURCE_ENCOUNTER_ID,
      sourceEncounterDate: "2025-12-01T14:30:00.000Z",
      carriedForwardAt: "2026-05-18T10:00:00.000Z",
    });
    const vitals = attachTriageCarryForwardMetaToVitalsJson({ tempC: 36.5 }, meta);
    expect(prior).toEqual(priorCopy);
    expect(triageCarryForwardMetaFromVitalsJson(vitals)?.sourceEncounterId).toBe(SOURCE_ENCOUNTER_ID);
  });
});
