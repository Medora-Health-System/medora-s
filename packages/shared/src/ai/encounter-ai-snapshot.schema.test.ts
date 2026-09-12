import { describe, it, expect } from "vitest";
import {
  encounterAiSnapshotSchema,
  aiEncounterCareSettingSchema,
  aiJurisdictionSchema,
} from "./encounter-ai-snapshot.schema.js";
import { aiBoundedTextSchema, toAiBoundedText } from "./ai-bounded-text.schema.js";

describe("encounterAiSnapshotSchema", () => {
  const minimalSnapshot = {
    snapshotVersion: "abc123",
    generatedAt: "2026-01-01T00:00:00.000Z",
    encounterContext: {
      encounterId: "d36c2433-51a9-4dd8-83fe-d4304f93202b",
      facilityId: "784f7bd6-8552-4940-8f4e-e0ad40163124",
      patientId: "c172e148-ad43-4c06-b079-fbb722dddcca",
      country: "US",
      encounterType: "EMERGENCY",
      status: "OPEN",
      careSetting: "EMERGENCY_DEPARTMENT",
    },
    patientContext: {
      age: 45,
      dateOfBirth: "1980-01-15T00:00:00.000Z",
      sexAtBirth: "M",
    },
    presentation: {
      chiefComplaint: "Chest pain",
    },
    clinicalDocumentation: {},
    diagnostics: {},
    treatments: {},
    diagnoses: {},
    disposition: {},
  };

  it("accepts a minimal valid snapshot", () => {
    const parsed = encounterAiSnapshotSchema.safeParse(minimalSnapshot);
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid encounterId UUID", () => {
    const parsed = encounterAiSnapshotSchema.safeParse({
      ...minimalSnapshot,
      encounterContext: {
        ...minimalSnapshot.encounterContext,
        encounterId: "not-a-uuid",
      },
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects unsupported care setting", () => {
    const parsed = aiEncounterCareSettingSchema.safeParse("SURGERY_CENTER");
    expect(parsed.success).toBe(false);
  });

  it("rejects unsupported jurisdiction", () => {
    const parsed = aiJurisdictionSchema.safeParse("CA");
    expect(parsed.success).toBe(false);
  });

  it("accepts all supported care settings", () => {
    const settings = [
      "EMERGENCY_DEPARTMENT",
      "OFFICE_OUTPATIENT_CLINIC",
      "HOSPITAL_INPATIENT_OBSERVATION",
      "CRITICAL_CARE",
      "OTHER",
      "REVIEW_REQUIRED",
    ];
    for (const setting of settings) {
      const parsed = aiEncounterCareSettingSchema.safeParse(setting);
      expect(parsed.success).toBe(true);
    }
  });

  it("accepts a snapshot with all sections populated", () => {
    const fullSnapshot = {
      ...minimalSnapshot,
      presentation: {
        chiefComplaint: "Chest pain",
        triage: {
          esi: "2",
          chiefComplaint: "Chest pain",
          onset: "2026-01-01T00:00:00.000Z",
        },
        latestVitals: {
          recordedAt: "2026-01-01T00:00:00.000Z",
          source: "TRIAGE",
          values: { hr: 88 },
        },
        vitalTrend: [
          {
            recordedAt: "2026-01-01T00:00:00.000Z",
            source: "TRIAGE_VITALS_READING",
            values: { hr: 88 },
          },
        ],
      },
      clinicalDocumentation: {
        providerDocumentationStatus: "DRAFT",
        providerNote: { text: "Note text", truncated: false },
        treatmentPlan: { text: "Treatment plan text", truncated: false },
        structuredEntries: [
          {
            id: "entry-1",
            namespace: "NURSING_ASSESSMENT",
            documentedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        reassessments: [],
      },
      diagnostics: {
        orders: [],
        results: [
          {
            id: "result-1",
            orderItemId: "item-1",
            resultText: { text: "Hemoglobin low", truncated: false },
            criticalValue: true,
            acknowledgedByProviderAt: null,
            resultedAt: "2026-01-01T00:00:00.000Z",
            verifiedAt: null,
          },
        ],
        pendingTests: ["item-1"],
        criticalResults: [
          {
            id: "result-1",
            orderItemId: "item-1",
            resultText: { text: "Hemoglobin low", truncated: false },
            criticalValue: true,
            acknowledgedByProviderAt: null,
            resultedAt: "2026-01-01T00:00:00.000Z",
            verifiedAt: null,
          },
        ],
      },
      treatments: {
        medicationOrders: [],
        medicationAdministrations: [],
        procedures: [],
      },
      diagnoses: {
        documentedDiagnoses: [
          { id: "dx-1", code: "R06.0", display: "Dyspnea", isPrimary: true, status: "ACTIVE" },
        ],
      },
      disposition: {
        disposition: "DISCHARGE",
        dischargeStatus: "DISCHARGED",
        dischargeSummary: { text: "Discharge summary text", truncated: false },
        followUps: [
          {
            id: "fu-1",
            type: "primary-care",
            status: "OPEN",
            dueDate: "2026-01-08T00:00:00.000Z",
            instructions: { text: "Follow up in 1 week", truncated: false },
          },
        ],
        appointments: [
          {
            id: "appt-1",
            status: "SCHEDULED",
            scheduledAt: "2026-01-08T00:00:00.000Z",
            departmentCode: "dept-1",
            notes: { text: "Cardiology follow-up", truncated: false },
          },
        ],
      },
    };

    const parsed = encounterAiSnapshotSchema.safeParse(fullSnapshot);
    expect(parsed.success).toBe(true);
  });

  it("rejects malformed bounded text object for provider note", () => {
    const parsed = encounterAiSnapshotSchema.safeParse({
      ...minimalSnapshot,
      clinicalDocumentation: {
        providerNote: "x".repeat(60_000),
      },
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects bounded text missing truncated flag", () => {
    const parsed = aiBoundedTextSchema.safeParse({ text: "Note text" });
    expect(parsed.success).toBe(false);
  });
});

describe("toAiBoundedText", () => {
  it("returns null for null input", () => {
    expect(toAiBoundedText(null, 100)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(toAiBoundedText(undefined, 100)).toBeNull();
  });

  it("returns false truncated when text is below the limit", () => {
    expect(toAiBoundedText("short", 100)).toEqual({ text: "short", truncated: false });
  });

  it("returns false truncated when text is exactly at the limit", () => {
    const text = "x".repeat(100);
    expect(toAiBoundedText(text, 100)).toEqual({ text, truncated: false });
  });

  it("returns true truncated with originalLength when text exceeds the limit", () => {
    const text = "x".repeat(150);
    expect(toAiBoundedText(text, 100)).toEqual({ text: "x".repeat(100), truncated: true, originalLength: 150 });
  });

  it("returned text never exceeds the configured maximum", () => {
    const bounded = toAiBoundedText("x".repeat(10_000), 100);
    expect(bounded?.text.length).toBeLessThanOrEqual(100);
  });
});
