import { describe, it, expect } from "vitest";
import {
  encounterAiSnapshotSchema,
  aiEncounterCareSettingSchema,
  aiJurisdictionSchema,
} from "./encounter-ai-snapshot.schema.js";

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
        providerNote: "Note text",
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
        results: [],
        pendingTests: [],
        criticalResults: [],
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
        followUps: [],
        appointments: [],
      },
    };

    const parsed = encounterAiSnapshotSchema.safeParse(fullSnapshot);
    expect(parsed.success).toBe(true);
  });

  it("rejects overly long provider note text", () => {
    const parsed = encounterAiSnapshotSchema.safeParse({
      ...minimalSnapshot,
      clinicalDocumentation: {
        providerNote: "x".repeat(60_000),
      },
    });
    expect(parsed.success).toBe(false);
  });
});
