import { describe, expect, it, vi, afterEach } from "vitest";
import { buildEncounterClinicalRecord } from "@medora/shared";
import {
  buildEncounterClinicalRecordInputFromEmergencySummary,
  summarizeEmergencySummaryAdapterSources,
} from "./encounterClinicalRecordAdapter";
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
