import { describe, expect, it, vi, afterEach } from "vitest";
import { buildEncounterClinicalRecord } from "@medora/shared";
import {
  buildEncounterClinicalRecordInputFromEmergencySummary,
  mapEncounterDiagnosisApiRowsToClinicalRecordInput,
  parseEncounterDiagnosisApiItems,
  summarizeEmergencySummaryAdapterSources,
} from "./encounterClinicalRecordAdapter";
import { parseVitalsHistoryEntries } from "@/lib/encounterClinicalSafetyUi";
import type { EmergencyVisitSummaryModel } from "./emergencyVisitSummaryModel";

const ENCOUNTER_ID = "550e8400-e29b-41d4-a716-446655440000";
const ORDER_ID = "550e8400-e29b-41d4-a716-446655440010";
const LAB_ITEM_ID = "550e8400-e29b-41d4-a716-446655440011";
const IMG_ITEM_ID = "550e8400-e29b-41d4-a716-446655440012";
const MAR_ID = "550e8400-e29b-41d4-a716-446655440013";
const PROC_ID = "550e8400-e29b-41d4-a716-446655440014";

function emptyModel(): EmergencyVisitSummaryModel {
  return {
    motifPresentation: null,
    triageResume: null,
    triageCarryForward: null,
    initialNursingAssessment: null,
    resumeInfirmier: null,
    providerDocumentation: null,
    evaluationMedicale: null,
    resultats: null,
    disposition: null,
    handoff: null,
    emtala: null,
    timeline: [],
    nursingReassessmentHistory: [],
    nursingReassessmentLatestId: null,
    nursingDischargeDocumentation: null,
    providerDischargeDocumentation: null,
    providerMseHistory: [],
    providerMseLatestId: null,
    handoffHistory: [],
    handoffLatestId: null,
    dischargeSummaryHistory: [],
    dischargeSummaryLatestId: null,
    admissionSummaryHistory: [],
    admissionSummaryLatestId: null,
    dispositionSupplementHistory: [],
    dispositionSupplementLatestId: null,
    triageAssessmentHistory: [],
    triageAssessmentLatestId: null,
  };
}

describe("encounterClinicalRecordAdapter", () => {
  it("maps encounter header and chief complaint", () => {
    const input = buildEncounterClinicalRecordInputFromEmergencySummary({
      locale: "en",
      encounter: {
        id: ENCOUNTER_ID,
        facilityId: "fac-1",
        patientId: "pat-1",
        type: "EMERGENCY",
        status: "OPEN",
        createdAt: "2026-06-23T08:00:00.000Z",
        patient: { displayName: "Jean Patient", mrn: "MRN-1" },
      },
      summaryModel: {
        ...emptyModel(),
        motifPresentation: { title: "Chief complaint", lines: ["Chest pain"] },
        triageResume: { title: "Triage", lines: ["Acuity 2"] },
      },
      triageSnapshot: { triageCompleteAt: "2026-06-23T08:15:00.000Z", vitalsJson: { hr: 88 } },
    });

    const record = buildEncounterClinicalRecord(input);
    expect(record.header.encounterId).toBe(ENCOUNTER_ID);
    expect(record.header.patientDisplayName).toBe("Jean Patient");
    expect(record.chiefComplaint?.lines).toEqual(["Chest pain"]);
    expect(record.presentation?.lines).toEqual(["Acuity 2"]);
    expect(record.vitals).toHaveLength(1);
    expect(record.vitals[0]?.heartRate).toBe("88");
  });

  it("maps MAR from medicationLabelSnapshot and administeredBy user object", () => {
    const input = buildEncounterClinicalRecordInputFromEmergencySummary({
      locale: "en",
      encounter: { id: ENCOUNTER_ID },
      summaryModel: emptyModel(),
      medicationAdministrations: [
        {
          id: MAR_ID,
          medicationLabelSnapshot: "Aspirin 325 mg",
          doseValue: "325",
          doseUnit: "mg",
          route: "PO",
          marAction: "ADMINISTERED",
          administeredAt: "2026-06-23T10:30:00.000Z",
          administeredBy: { firstName: "Martine", lastName: "Duval" },
        },
      ],
    });
    const record = buildEncounterClinicalRecord(input);
    const mar = record.medicationAdministration[0];
    expect(mar?.medicationName).toBe("Aspirin 325 mg");
    expect(mar?.displayLine).toContain("Aspirin 325 mg");
    expect(mar?.administeredBy.name).toBe("Martine Duval");
  });

  it("projects vitals history and triage fields", () => {
    const input = buildEncounterClinicalRecordInputFromEmergencySummary({
      locale: "en",
      encounter: { id: ENCOUNTER_ID },
      summaryModel: {
        ...emptyModel(),
        triageAssessmentHistory: [
          {
            id: "triage-1",
            eventType: "TRIAGE_ASSESSMENT_SAVED",
            savedAt: "2026-06-23T08:10:00.000Z",
            documentedAt: "2026-06-23T08:10:00.000Z",
            displayWhen: "—",
            performerDisplayName: "Triage RN",
            performerInitials: "TR",
            performerRoleTitle: "RN",
            structuredLines: ["ESI: 3", "Arrival mode: Walk-in"],
            narrativeExcerpt: "",
          },
        ],
      },
      triageSnapshot: {
        esi: 3,
        chiefComplaint: "Chest pain",
        triageCompleteAt: "2026-06-23T08:15:00.000Z",
        vitalsJson: {
          hr: 90,
          bpSys: 120,
          bpDia: 80,
          medoraErTriageV1: { painScale0to10: 7 },
        },
      },
      vitalsHistory: [
        {
          recordedAt: "2026-06-23T09:00:00.000Z",
          vitals: { hr: 88, bpSys: 118, bpDia: 78, painScore: 4 },
          recordedBy: { displayName: "Chart RN" },
          source: "ENCOUNTER_CHART",
        },
      ],
    });
    const record = buildEncounterClinicalRecord(input);
    expect(record.vitals.length).toBeGreaterThanOrEqual(1);
    expect(record.vitals.some((v) => v.pain === "7" || v.pain === "4")).toBe(true);
    expect(record.triageDocumentation?.fields.esi).toBe("3");
  });

  it("maps provider assessment and duplicate saves into primary + history", () => {
    const input = buildEncounterClinicalRecordInputFromEmergencySummary({
      locale: "en",
      encounter: {
        id: ENCOUNTER_ID,
        providerDocumentationStatus: "SIGNED",
        providerDocumentationSignedAt: "2026-06-23T10:00:00.000Z",
        providerDocumentationSignedByDisplayFr: "Dr Example",
        nursingAssessment: {
          erProviderMseV1: {
            workspaceMetadata: { savedAt: "2026-06-23T09:30:00.000Z", savedBy: "Dr Example" },
            sections: [{ id: "hpi", title: "HPI", text: "Final signed note." }],
          },
        },
      },
      summaryModel: {
        ...emptyModel(),
        providerDocumentation: {
          title: "Provider",
          statusLine: "Signed",
          savedBy: null,
          savedAt: null,
          signedBy: "Dr Example",
          signedAt: "23/06/2026 10:00",
          sections: [{ label: "HPI", text: "Final signed note." }],
          addenda: [],
        },
        providerMseHistory: [
          {
            id: "save-2",
            eventType: "PROVIDER_MSE_SAVED",
            savedAt: "2026-06-23T09:30:00.000Z",
            documentedAt: "2026-06-23T09:30:00.000Z",
            displayWhen: "—",
            performerDisplayName: "Dr Example",
            performerInitials: "DE",
            performerRoleTitle: "PROVIDER",
            structuredLines: ["HPI: Second save."],
            narrativeExcerpt: "",
          },
          {
            id: "save-1",
            eventType: "PROVIDER_MSE_SAVED",
            savedAt: "2026-06-23T09:00:00.000Z",
            documentedAt: "2026-06-23T09:00:00.000Z",
            displayWhen: "—",
            performerDisplayName: "Dr Example",
            performerInitials: "DE",
            performerRoleTitle: "PROVIDER",
            structuredLines: ["HPI: First save."],
            narrativeExcerpt: "",
          },
        ],
        providerMseLatestId: "save-2",
      },
    });

    const record = buildEncounterClinicalRecord(input);
    expect(record.providerAssessment?.status).toBe("SIGNED");
    expect(record.providerAssessmentHistory).toHaveLength(2);
    expect(record.providerAssessmentHistory[0]?.id).toBe("save-2");
  });

  it("maps nursing reassessment primary and history", () => {
    const input = buildEncounterClinicalRecordInputFromEmergencySummary({
      locale: "en",
      encounter: { id: ENCOUNTER_ID },
      summaryModel: {
        ...emptyModel(),
        nursingReassessmentHistory: [
          {
            id: "re-2",
            documentedAt: "2026-06-23T10:00:00.000Z",
            savedAt: "2026-06-23T10:00:00.000Z",
            displayWhen: "—",
            performerDisplayName: "RN Two",
            performerInitials: "RT",
            performerRoleTitle: "RN",
            structuredLines: ["Latest reassessment"],
            narrativeExcerpt: "",
          },
          {
            id: "re-1",
            documentedAt: "2026-06-23T09:00:00.000Z",
            savedAt: "2026-06-23T09:00:00.000Z",
            displayWhen: "—",
            performerDisplayName: "RN One",
            performerInitials: "RO",
            performerRoleTitle: "RN",
            structuredLines: ["Earlier reassessment"],
            narrativeExcerpt: "",
          },
        ],
        nursingReassessmentLatestId: "re-2",
      },
    });

    const record = buildEncounterClinicalRecord(input);
    expect(record.nursingAssessment?.id).toBe("re-2");
    expect(record.nursingAssessmentHistory).toHaveLength(1);
    expect(record.nursingAssessmentHistory[0]?.id).toBe("re-1");
  });

  it("maps orders, lab results, imaging results, MAR, and procedures", () => {
    const input = buildEncounterClinicalRecordInputFromEmergencySummary({
      locale: "en",
      encounter: { id: ENCOUNTER_ID, createdAt: "2026-06-23T08:00:00.000Z" },
      summaryModel: emptyModel(),
      orders: [
        {
          id: ORDER_ID,
          type: "LAB",
          status: "ACTIVE",
          createdAt: "2026-06-23T09:00:00.000Z",
          items: [
            {
              id: LAB_ITEM_ID,
              displayLabel: "CMP",
              status: "COMPLETED",
              result: { resultText: "7.2", verifiedAt: "2026-06-23T11:00:00.000Z" },
            },
            {
              id: LAB_ITEM_ID,
              displayLabel: "CMP",
              status: "ACKNOWLEDGED",
            },
          ],
        },
        {
          id: ORDER_ID,
          type: "IMAGING",
          items: [
            {
              id: IMG_ITEM_ID,
              displayLabel: "CT Head",
              result: { resultText: "Normal", verifiedAt: "2026-06-23T12:00:00.000Z" },
            },
          ],
        },
      ],
      medicationAdministrations: [
        {
          id: MAR_ID,
          medicationName: "Ketorolac",
          marAction: "ADMINISTERED",
          administeredAt: "2026-06-23T10:30:00.000Z",
          administeredByDisplayName: "RN A",
        },
      ],
      procedures: [
        {
          id: PROC_ID,
          documentedAt: "2026-06-23T11:00:00.000Z",
          documentedByDisplayName: "Dr Proc",
          clinicalSummaryFr: "Suture complétée.",
        },
      ],
      documentationEvents: [
        {
          id: "doc-1",
          eventType: "PROVIDER_MSE_SAVED",
          createdAt: "2026-06-23T09:30:00.000Z",
        },
      ],
    });

    const record = buildEncounterClinicalRecord(input);
    expect(record.orders).toHaveLength(2);
    expect(record.laboratoryResults).toHaveLength(1);
    expect(record.imagingResults).toHaveLength(1);
    expect(record.medicationAdministration).toHaveLength(1);
    expect(record.procedures).toHaveLength(1);
    expect(record.auditTimeline.length).toBeGreaterThanOrEqual(1);
    expect(record.clinicalTimeline.some((e) => e.milestone === "LABORATORY_RESULTED")).toBe(true);
    expect(record.clinicalTimeline.some((e) => e.milestone === "MEDICATION_ADMINISTERED")).toBe(true);
  });

  it("classifies audit vs clinical timeline independently", () => {
    const input = buildEncounterClinicalRecordInputFromEmergencySummary({
      locale: "en",
      encounter: { id: ENCOUNTER_ID, createdAt: "2026-06-23T08:00:00.000Z" },
      summaryModel: emptyModel(),
      unifiedTimelineItems: [
        {
          id: "ut-1",
          sourceKind: "ORDER_EVENT",
          sourceId: "oe-1",
          storedEventType: "ACKNOWLEDGED",
          displayEventType: "ORDER_ACKNOWLEDGED_LAB",
          displayGroup: "LABORATORY",
          carePhase: "ED",
          documentedAtIso: "2026-06-23T09:00:00.000Z",
          effectiveClinicalAtIso: null,
          hasClinicalTimeCorrection: false,
          actor: { userId: null, displayName: null, role: null, department: null },
          chips: [],
          titleFr: null,
          titleEn: null,
          summaryFr: "Acknowledged",
          summaryEn: "Acknowledged",
          orderId: ORDER_ID,
          orderItemId: LAB_ITEM_ID,
        },
      ],
    });

    const record = buildEncounterClinicalRecord(input);
    expect(record.auditTimeline).toHaveLength(1);
    expect(record.auditTimeline[0]?.classification).toBe("ORDER_WORKFLOW");
    expect(record.clinicalTimeline.some((e) => e.summary.includes("Acknowledged"))).toBe(false);
  });

  it("preserves input objects without mutation", () => {
    const orders = [
      {
        id: ORDER_ID,
        type: "LAB",
        items: [{ id: LAB_ITEM_ID, displayLabel: "CMP", status: "ACTIVE" }],
      },
    ];
    const before = JSON.stringify(orders);
    buildEncounterClinicalRecordInputFromEmergencySummary({
      locale: "en",
      encounter: { id: ENCOUNTER_ID },
      summaryModel: emptyModel(),
      orders,
    });
    expect(JSON.stringify(orders)).toBe(before);
  });

  it("handles empty encounter safely", () => {
    const record = buildEncounterClinicalRecord(
      buildEncounterClinicalRecordInputFromEmergencySummary({
        locale: "fr",
        encounter: { id: ENCOUNTER_ID },
        summaryModel: emptyModel(),
      })
    );
    expect(record.header.encounterId).toBe(ENCOUNTER_ID);
    expect(record.orders).toEqual([]);
    expect(record.auditTimeline).toEqual([]);
  });

  it("summarizes adapter source counts", () => {
    const summary = summarizeEmergencySummaryAdapterSources({
      orders: [
        {
          id: ORDER_ID,
          type: "LAB",
          items: [{ id: LAB_ITEM_ID }, { id: "item-2" }],
        },
      ],
      medicationAdministrations: [{ id: MAR_ID }],
      procedures: [{ id: PROC_ID }],
      documentationEvents: [{ id: "doc-1", eventType: "X", createdAt: "2026-06-23T09:00:00.000Z" }],
      resultsSnapshot: {
        loading: false,
        ordersLoadFailedNoCache: false,
        rows: [
          {
            order: { type: "LAB" },
            item: { result: { resultText: "1", verifiedAt: "2026-06-23T11:00:00.000Z" } },
            pendingSync: false,
          },
        ],
      },
    });
    expect(summary.orderItemCount).toBe(2);
    expect(summary.marCount).toBe(1);
    expect(summary.procedureCount).toBe(1);
    expect(summary.documentationEventCount).toBe(1);
    expect(summary.labResultPreviewCount).toBe(1);
  });

  it("maps lab order ordered-by from parent createdByDisplay when flat fields absent", () => {
    const input = buildEncounterClinicalRecordInputFromEmergencySummary({
      locale: "en",
      encounter: { id: ENCOUNTER_ID },
      summaryModel: emptyModel(),
      orders: [
        {
          id: ORDER_ID,
          type: "LAB",
          createdAt: "2026-06-23T09:00:00.000Z",
          createdByDisplay: { name: "Rajnil Shah", role: "PROVIDER", at: "2026-06-23T09:00:00.000Z" },
          items: [
            {
              id: LAB_ITEM_ID,
              catalogItemType: "LAB_TEST",
              displayLabelEn: "CBC",
              displayLabelFr: "NFS",
              status: "ACTIVE",
            },
          ],
        },
      ],
    });
    const record = buildEncounterClinicalRecord(input);
    expect(record.orders[0]?.orderedByDisplayName).toBe("Rajnil Shah");
    expect(record.orders[0]?.orderedByRoleTitle).toBe("PROVIDER");
    expect(record.orders[0]?.label).toBe("CBC");
  });

  it("maps imaging order ordered-by from orderedByDisplayFr fallback", () => {
    const input = buildEncounterClinicalRecordInputFromEmergencySummary({
      locale: "fr",
      encounter: { id: ENCOUNTER_ID },
      summaryModel: emptyModel(),
      orders: [
        {
          id: "order-img",
          type: "IMAGING",
          createdAt: "2026-06-23T09:15:00.000Z",
          orderedByDisplayFr: "Rajnil Shah",
          items: [
            {
              id: IMG_ITEM_ID,
              catalogItemType: "IMAGING_STUDY",
              displayLabelEn: "Chest X-ray",
              displayLabelFr: "Radiographie thorax",
              status: "ACTIVE",
            },
          ],
        },
      ],
    });
    const record = buildEncounterClinicalRecord(input);
    expect(record.orders[0]?.orderedByDisplayName).toBe("Rajnil Shah");
    expect(record.orders[0]?.label).toBe("Radiographie thorax");
  });

  it("preserves medication prescriberName ordered-by attribution", () => {
    const input = buildEncounterClinicalRecordInputFromEmergencySummary({
      locale: "en",
      encounter: { id: ENCOUNTER_ID },
      summaryModel: emptyModel(),
      orders: [
        {
          id: "order-med",
          type: "MEDICATION",
          prescriberName: "Rajnil Shah",
          createdAt: "2026-06-23T09:30:00.000Z",
          items: [
            {
              id: "med-item",
              catalogItemType: "MEDICATION",
              displayLabelEn: "Aspirin 81 mg",
              status: "ACTIVE",
            },
          ],
        },
      ],
    });
    const record = buildEncounterClinicalRecord(input);
    expect(record.orders[0]?.orderedByDisplayName).toBe("Rajnil Shah");
  });

  it("maps lab result ordered-by separately from resulted-by", () => {
    const input = buildEncounterClinicalRecordInputFromEmergencySummary({
      locale: "en",
      encounter: { id: ENCOUNTER_ID },
      summaryModel: emptyModel(),
      orders: [
        {
          id: ORDER_ID,
          type: "LAB",
          createdAt: "2026-06-23T09:00:00.000Z",
          createdByDisplay: { name: "Rajnil Shah", role: "PROVIDER" },
          items: [
            {
              id: LAB_ITEM_ID,
              displayLabelEn: "CMP",
              result: {
                resultText: "7.2",
                verifiedAt: "2026-06-23T11:00:00.000Z",
                enteredByDisplayFr: "Hamza Farid",
                acknowledgedByDisplayFr: "Rajnil Shah",
                acknowledgedByProviderAt: "2026-06-23T11:30:00.000Z",
              },
            },
          ],
        },
      ],
    });
    const record = buildEncounterClinicalRecord(input);
    expect(record.laboratoryResults[0]?.orderedBy?.name).toBe("Rajnil Shah");
    expect(record.laboratoryResults[0]?.resultedBy?.name).toBe("Hamza Farid");
    expect(record.laboratoryResults[0]?.reviewedBy?.name).toBe("Rajnil Shah");
  });

  it("maps saved encounter diagnoses from Diagnostics tab API rows", () => {
    const mapped = mapEncounterDiagnosisApiRowsToClinicalRecordInput(
      [
        {
          id: "dx-1",
          code: "R07.9",
          description: "Chest pain, unspecified",
          sortOrder: 0,
          createdAt: "2026-06-23T09:00:00.000Z",
          status: "ACTIVE",
        },
      ],
      "en"
    );
    expect(mapped[0]?.displayLabel).toBe("R07.9 — Chest pain, unspecified");
    expect(mapped[0]?.isPrimary).toBe(true);

    const record = buildEncounterClinicalRecord(
      buildEncounterClinicalRecordInputFromEmergencySummary({
        locale: "en",
        encounter: { id: ENCOUNTER_ID, diagnoses: mapped },
        summaryModel: emptyModel(),
      })
    );
    expect(record.diagnoses[0]?.displayLabel).toBe("R07.9 — Chest pain, unspecified");
    expect(record.diagnoses[0]?.isPrimary).toBe(true);
  });

  it("maps vitals-history recordedBy.displayName and role into clinical record", () => {
    const parsed = parseVitalsHistoryEntries({
      entries: [
        {
          recordedAt: "2026-07-02T16:44:00.000Z",
          source: "ENCOUNTER_CHART",
          vitals: { bpSys: 147, bpDia: 86, hr: 87, rr: 19, spo2: 100, tempC: 36.7 },
          recordedBy: { userId: "u1", displayName: "Martine Duval", role: "RN" },
        },
      ],
    });
    const input = buildEncounterClinicalRecordInputFromEmergencySummary({
      locale: "en",
      encounter: { id: ENCOUNTER_ID },
      summaryModel: emptyModel(),
      vitalsHistory: parsed,
    });
    const record = buildEncounterClinicalRecord(input);
    expect(record.vitals[0]?.documentedBy.name).toBe("Martine Duval");
    expect(record.vitals[0]?.documentedBy.role).toBe("RN");
  });

  it("maps diagnosis API createdByDisplay into documentedBy attribution", () => {
    const parsed = parseEncounterDiagnosisApiItems(
      {
        items: [
          {
            id: "dx-1",
            encounterId: ENCOUNTER_ID,
            code: "R07.9",
            description: "Chest pain, unspecified",
            sortOrder: 0,
            createdAt: "2026-06-23T15:07:00.000Z",
            status: "ACTIVE",
            createdByDisplay: { name: "Dr Provider", role: "MD" },
          },
        ],
      },
      ENCOUNTER_ID
    );
    const mapped = mapEncounterDiagnosisApiRowsToClinicalRecordInput(parsed, "en");
    const record = buildEncounterClinicalRecord(
      buildEncounterClinicalRecordInputFromEmergencySummary({
        locale: "en",
        encounter: { id: ENCOUNTER_ID, diagnoses: mapped },
        summaryModel: emptyModel(),
      })
    );
    expect(record.diagnoses[0]?.documentedBy.name).toBe("Dr Provider");
    expect(record.diagnoses[0]?.documentedBy.role).toBe("MD");
  });
});

describe("encounterClinicalRecordParity logging", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not log in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const { logEncounterClinicalRecordParityDev } = await import("./encounterClinicalRecordParity");
    logEncounterClinicalRecordParityDev({
      encounterId: ENCOUNTER_ID,
      legacy: {
        hasProviderNote: false,
        hasNursingNote: false,
        vitalsLineCount: 0,
        orderItemCount: 0,
        labResultPreviewCount: 0,
        imagingResultPreviewCount: 0,
        marCount: 0,
        procedureCount: 0,
        clinicalTimelineCount: 0,
        metadataTimelineCount: 0,
        documentationEventCount: 0,
        providerMseHistoryCount: 0,
        nursingReassessmentHistoryCount: 0,
      },
      clinicalRecord: {
        hasProviderAssessment: false,
        hasNursingAssessment: false,
        vitalsCount: 0,
        ordersCount: 0,
        laboratoryResultsCount: 0,
        imagingResultsCount: 0,
        marCount: 0,
        proceduresCount: 0,
        clinicalTimelineCount: 0,
        auditTimelineCount: 0,
        providerHistoryCount: 0,
        nursingHistoryCount: 0,
      },
    });
    expect(info).not.toHaveBeenCalled();
    info.mockRestore();
  });
});
