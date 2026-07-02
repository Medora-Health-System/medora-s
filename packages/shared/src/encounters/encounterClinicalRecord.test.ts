import { describe, expect, it } from "vitest";
import {
  buildEncounterClinicalRecord,
  buildProviderAssessmentHistory,
  dedupeClinicalTimelineEntries,
  dedupeLaboratoryResults,
  dedupeOrderRows,
  resolveProviderAssessmentPrimary,
} from "./encounterClinicalRecord.js";

const ENCOUNTER_ID = "550e8400-e29b-41d4-a716-446655440000";
const FACILITY_ID = "550e8400-e29b-41d4-a716-446655440001";
const PATIENT_ID = "550e8400-e29b-41d4-a716-446655440002";
const ORDER_ID = "550e8400-e29b-41d4-a716-446655440010";
const LAB_ITEM_ID = "550e8400-e29b-41d4-a716-446655440011";
const IMG_ITEM_ID = "550e8400-e29b-41d4-a716-446655440012";
const MAR_ID = "550e8400-e29b-41d4-a716-446655440013";
const PROC_ID = "550e8400-e29b-41d4-a716-446655440014";

function baseInput(): Parameters<typeof buildEncounterClinicalRecord>[0] {
  return {
    locale: "en",
    encounter: {
      id: ENCOUNTER_ID,
      facilityId: FACILITY_ID,
      patientId: PATIENT_ID,
      type: "EMERGENCY",
      status: "OPEN",
      createdAt: "2026-06-23T08:00:00.000Z",
      triageCompleteAt: "2026-06-23T08:15:00.000Z",
    },
    patient: {
      displayName: "Jean Patient",
      mrn: "MRN-001",
    },
    chiefComplaintLines: ["Chest pain"],
    presentationLines: ["Acute onset chest pain"],
  };
}

describe("encounterClinicalRecord", () => {
  it("builds empty encounter with header only", () => {
    const record = buildEncounterClinicalRecord({
      encounter: { id: ENCOUNTER_ID },
    });
    expect(record.header.encounterId).toBe(ENCOUNTER_ID);
    expect(record.providerAssessment).toBeNull();
    expect(record.orders).toEqual([]);
    expect(record.clinicalTimeline).toEqual([]);
    expect(record.auditTimeline).toEqual([]);
  });

  it("resolves provider assessment priority: signed over saved over draft", () => {
    const signed = resolveProviderAssessmentPrimary({
      documentationStatus: "SIGNED",
      signedAt: "2026-06-23T10:00:00.000Z",
      signedByDisplayName: "Dr Signed",
      sections: [{ label: "Assessment", text: "Stable patient." }],
    });
    expect(signed?.status).toBe("SIGNED");

    const saved = resolveProviderAssessmentPrimary({
      documentationStatus: "SAVED",
      savedAt: "2026-06-23T09:30:00.000Z",
      savedByDisplayName: "Dr Saved",
      sections: [{ label: "Assessment", text: "Draft content." }],
    });
    expect(saved?.status).toBe("SAVED");

    const draft = resolveProviderAssessmentPrimary({
      documentationStatus: "DRAFT",
      sections: [{ label: "Assessment", text: "In progress." }],
    });
    expect(draft?.status).toBe("DRAFT");
  });

  it("keeps only one provider assessment in clinical record with history separate", () => {
    const record = buildEncounterClinicalRecord({
      ...baseInput(),
      providerAssessment: {
        documentationStatus: "SIGNED",
        signedAt: "2026-06-23T10:00:00.000Z",
        signedByDisplayName: "Dr Example",
        sections: [{ label: "Assessment", text: "Final signed note." }],
      },
      providerAssessmentSaveHistory: [
        {
          id: "save-1",
          savedAt: "2026-06-23T09:00:00.000Z",
          performerDisplayName: "Dr Example",
          sections: [{ label: "Assessment", text: "First save." }],
        },
        {
          id: "save-2",
          savedAt: "2026-06-23T09:30:00.000Z",
          performerDisplayName: "Dr Example",
          sections: [{ label: "Assessment", text: "Second save." }],
        },
      ],
    });

    expect(record.providerAssessment?.status).toBe("SIGNED");
    expect(record.providerAssessment?.sections[0]?.text).toBe("Final signed note.");
    expect(record.providerAssessmentHistory).toHaveLength(2);
    expect(record.providerAssessmentHistory[0]?.id).toBe("save-2");
  });

  it("excludes draft from history when signed primary exists", () => {
    const primary = resolveProviderAssessmentPrimary({
      documentationStatus: "SIGNED",
      signedAt: "2026-06-23T10:00:00.000Z",
      signedByDisplayName: "Dr Example",
      sections: [{ label: "A", text: "Signed" }],
    });
    const history = buildProviderAssessmentHistory(
      [
        {
          id: "draft-1",
          savedAt: "2026-06-23T09:00:00.000Z",
          isDraft: true,
          sections: [{ label: "A", text: "Draft" }],
        },
      ],
      primary
    );
    expect(history).toHaveLength(1);
    expect(history[0]?.status).toBe("DRAFT");
  });

  it("uses latest nursing reassessment as primary and retains history", () => {
    const record = buildEncounterClinicalRecord({
      ...baseInput(),
      nursingAssessmentInitial: {
        id: "initial",
        savedAt: "2026-06-23T08:30:00.000Z",
        structuredLines: ["Initial nursing line"],
      },
      nursingReassessmentHistory: [
        {
          id: "reassess-1",
          savedAt: "2026-06-23T09:00:00.000Z",
          documentedAt: "2026-06-23T09:00:00.000Z",
          performerDisplayName: "RN One",
          structuredLines: ["First reassessment"],
        },
        {
          id: "reassess-2",
          savedAt: "2026-06-23T10:00:00.000Z",
          documentedAt: "2026-06-23T10:00:00.000Z",
          performerDisplayName: "RN Two",
          structuredLines: ["Latest reassessment"],
        },
      ],
    });

    expect(record.nursingAssessment?.id).toBe("reassess-2");
    expect(record.nursingAssessment?.structuredLines[0]).toBe("Latest reassessment");
    expect(record.nursingAssessmentHistory).toHaveLength(1);
    expect(record.nursingAssessmentHistory[0]?.id).toBe("reassess-1");
  });

  it("dedupes order lifecycle to one row per order item", () => {
    const record = buildEncounterClinicalRecord({
      ...baseInput(),
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
              status: "ACKNOWLEDGED",
            },
            {
              id: LAB_ITEM_ID,
              displayLabel: "CMP",
              status: "COMPLETED",
            },
          ],
        },
      ],
    });

    expect(record.orders).toHaveLength(1);
    expect(record.orders[0]?.status).toBe("COMPLETED");
  });

  it("dedupes laboratory workflow to one final result", () => {
    const candidates = dedupeLaboratoryResults([
      {
        orderId: ORDER_ID,
        orderItemId: LAB_ITEM_ID,
        label: "CMP",
        resultText: "Pending",
        verifiedAt: "2026-06-23T10:00:00.000Z",
        criticalValue: false,
        acknowledgedAt: null,
      },
      {
        orderId: ORDER_ID,
        orderItemId: LAB_ITEM_ID,
        label: "CMP",
        resultText: "Final result",
        verifiedAt: "2026-06-23T11:00:00.000Z",
        criticalValue: false,
        acknowledgedAt: "2026-06-23T11:05:00.000Z",
      },
    ]);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.resultText).toBe("Final result");

    const record = buildEncounterClinicalRecord({
      ...baseInput(),
      orders: [
        {
          id: ORDER_ID,
          type: "LAB",
          items: [
            {
              id: LAB_ITEM_ID,
              displayLabel: "CMP",
              result: {
                resultText: "7.2",
                verifiedAt: "2026-06-23T11:00:00.000Z",
              },
            },
          ],
        },
      ],
      auditSourceRows: [
        {
          sourceKind: "ORDER_EVENT",
          sourceId: "oe-reviewed",
          storedEventType: "REVIEWED",
          documentedAtIso: "2026-06-23T11:05:00.000Z",
          orderType: "LAB",
          orderItemId: LAB_ITEM_ID,
          summaryEn: "Result reviewed",
        },
        {
          sourceKind: "ORDER_ITEM_RESULT",
          sourceId: "result-1",
          storedEventType: "RESULT_LAB_RECORDED",
          documentedAtIso: "2026-06-23T11:00:00.000Z",
          orderType: "LAB",
          orderItemId: LAB_ITEM_ID,
          summaryEn: "CMP resulted",
        },
      ],
    });

    expect(record.laboratoryResults).toHaveLength(1);
    const labMilestones = record.clinicalTimeline.filter((e) => e.milestone === "LABORATORY_RESULTED");
    expect(labMilestones).toHaveLength(1);
    expect(record.auditTimeline.length).toBeGreaterThanOrEqual(2);
  });

  it("dedupes imaging workflow to one final report", () => {
    const record = buildEncounterClinicalRecord({
      ...baseInput(),
      orders: [
        {
          id: ORDER_ID,
          type: "IMAGING",
          items: [
            {
              id: IMG_ITEM_ID,
              displayLabel: "CT Head",
              result: {
                resultText: "No acute findings.",
                verifiedAt: "2026-06-23T12:00:00.000Z",
              },
            },
          ],
        },
      ],
      auditSourceRows: [
        {
          sourceKind: "ORDER_EVENT",
          sourceId: "oe-img-start",
          storedEventType: "STARTED",
          documentedAtIso: "2026-06-23T11:30:00.000Z",
          orderType: "IMAGING",
          orderItemId: IMG_ITEM_ID,
          summaryEn: "Imaging started",
        },
        {
          sourceKind: "ORDER_ITEM_RESULT",
          sourceId: "img-result",
          storedEventType: "RESULT_IMAGING_FINALIZED",
          documentedAtIso: "2026-06-23T12:00:00.000Z",
          orderType: "IMAGING",
          orderItemId: IMG_ITEM_ID,
          summaryEn: "CT Head finalized",
        },
      ],
    });

    expect(record.imagingResults).toHaveLength(1);
    expect(record.imagingResults[0]?.resultText).toBe("No acute findings.");
    expect(record.clinicalTimeline.some((e) => e.milestone === "IMAGING_RESULTED")).toBe(true);
    expect(record.auditTimeline.some((e) => e.classification === "ORDER_WORKFLOW")).toBe(true);
  });

  it("includes MAR administrations but not order workflow in clinical sections", () => {
    const record = buildEncounterClinicalRecord({
      ...baseInput(),
      medicationAdministrations: [
        {
          id: MAR_ID,
          medicationName: "Ketorolac",
          marAction: "ADMINISTERED",
          administeredAt: "2026-06-23T10:30:00.000Z",
          administeredByDisplayName: "RN A",
        },
      ],
      auditSourceRows: [
        {
          sourceKind: "ORDER_EVENT",
          sourceId: "oe-ack",
          storedEventType: "ACKNOWLEDGED",
          documentedAtIso: "2026-06-23T10:00:00.000Z",
          orderType: "MEDICATION",
          summaryEn: "Order acknowledged",
        },
        {
          sourceKind: "MEDICATION_ADMINISTRATION",
          sourceId: MAR_ID,
          storedEventType: "ADMINISTERED",
          documentedAtIso: "2026-06-23T10:30:00.000Z",
          summaryEn: "Ketorolac administered",
        },
      ],
    });

    expect(record.medicationAdministration).toHaveLength(1);
    expect(record.clinicalTimeline.some((e) => e.milestone === "MEDICATION_ADMINISTERED")).toBe(true);
    expect(record.auditTimeline.some((e) => e.classification === "ORDER_WORKFLOW")).toBe(true);
    expect(record.auditTimeline.some((e) => e.classification === "MAR")).toBe(true);
  });

  it("dedupes procedures to one row per procedure id", () => {
    const record = buildEncounterClinicalRecord({
      ...baseInput(),
      procedures: [
        {
          id: PROC_ID,
          label: "Laceration repair",
          clinicalSummary: "Laceration repair completed.",
          documentedAt: "2026-06-23T11:00:00.000Z",
          documentedByDisplayName: "Dr Proc",
        },
        {
          id: PROC_ID,
          label: "Laceration repair duplicate",
          clinicalSummary: "Should not appear",
          documentedAt: "2026-06-23T11:01:00.000Z",
        },
      ],
    });
    expect(record.procedures).toHaveLength(1);
    expect(record.procedures[0]?.clinicalSummary).toBe("Laceration repair completed.");
  });

  it("builds clinical timeline milestones without workflow noise", () => {
    const record = buildEncounterClinicalRecord({
      ...baseInput(),
      providerAssessment: {
        documentationStatus: "SIGNED",
        signedAt: "2026-06-23T10:00:00.000Z",
        signedByDisplayName: "Dr Example",
        sections: [{ label: "Assessment", text: "Signed note." }],
      },
      auditSourceRows: [
        {
          sourceKind: "ENCOUNTER_CLINICAL_EVENT",
          sourceId: "mse-save-1",
          storedEventType: "PROVIDER_MSE_SAVED",
          documentedAtIso: "2026-06-23T09:30:00.000Z",
          summaryEn: "Provider documentation saved",
        },
        {
          sourceKind: "ORDER_EVENT",
          sourceId: "oe-ack",
          storedEventType: "ACKNOWLEDGED",
          documentedAtIso: "2026-06-23T09:45:00.000Z",
          orderType: "LAB",
          summaryEn: "Lab order acknowledged",
        },
      ],
    });

    expect(record.clinicalTimeline.some((e) => e.milestone === "ARRIVAL")).toBe(true);
    expect(record.clinicalTimeline.some((e) => e.milestone === "TRIAGE_COMPLETE")).toBe(true);
    expect(record.clinicalTimeline.some((e) => e.milestone === "PROVIDER_ASSESSMENT_SIGNED")).toBe(true);
    expect(record.clinicalTimeline.some((e) => e.summary.includes("acknowledged"))).toBe(false);
    expect(record.auditTimeline.some((e) => e.eventType === "PROVIDER_MSE_SAVED")).toBe(true);
    expect(record.auditTimeline.some((e) => e.eventType === "ACKNOWLEDGED")).toBe(true);
  });

  it("dedupes clinical timeline by sourceType:sourceId with highest milestone rank", () => {
    const deduped = dedupeClinicalTimelineEntries([
      {
        id: "a",
        milestone: "LABORATORY_COLLECTED",
        timestampIso: "2026-06-23T10:00:00.000Z",
        actorDisplayName: null,
        actorRoleTitle: null,
        summary: "Collected",
        sourceType: "ORDER_ITEM_RESULT",
        sourceId: LAB_ITEM_ID,
      },
      {
        id: "b",
        milestone: "LABORATORY_RESULTED",
        timestampIso: "2026-06-23T11:00:00.000Z",
        actorDisplayName: null,
        actorRoleTitle: null,
        summary: "Resulted",
        sourceType: "ORDER_ITEM_RESULT",
        sourceId: LAB_ITEM_ID,
      },
    ]);
    expect(deduped).toHaveLength(1);
    expect(deduped[0]?.milestone).toBe("LABORATORY_RESULTED");
  });

  it("preserves all audit events without filtering", () => {
    const rows = [
      {
        sourceKind: "ORDER_EVENT",
        sourceId: "oe-1",
        storedEventType: "ACKNOWLEDGED",
        documentedAtIso: "2026-06-23T09:00:00.000Z",
        summaryEn: "Acknowledged",
      },
      {
        sourceKind: "ENCOUNTER_CLINICAL_EVENT",
        sourceId: "save-1",
        storedEventType: "PROVIDER_MSE_SAVED",
        documentedAtIso: "2026-06-23T09:30:00.000Z",
        summaryEn: "Provider saved",
      },
      {
        sourceKind: "ORDER_EVENT",
        sourceId: "oe-2",
        storedEventType: "STARTED",
        documentedAtIso: "2026-06-23T10:00:00.000Z",
        summaryEn: "Started",
      },
    ];
    const record = buildEncounterClinicalRecord({
      encounter: { id: ENCOUNTER_ID },
      auditSourceRows: rows,
    });
    expect(record.auditTimeline).toHaveLength(3);
    expect(record.auditTimeline.map((e) => e.eventType)).toEqual([
      "ACKNOWLEDGED",
      "PROVIDER_MSE_SAVED",
      "STARTED",
    ]);
  });

  it("handles large encounter in linear time", () => {
    const orders = Array.from({ length: 200 }, (_, i) => ({
      id: `order-${i}`,
      type: "LAB" as const,
      createdAt: `2026-06-23T${String(9 + Math.floor(i / 60)).padStart(2, "0")}:${String(i % 60).padStart(2, "0")}:00.000Z`,
      items: [
        {
          id: `item-${i}`,
          displayLabel: `Lab ${i}`,
          status: i % 2 === 0 ? "COMPLETED" : "ACKNOWLEDGED",
          result:
            i % 3 === 0
              ? {
                  resultText: `Result ${i}`,
                  verifiedAt: `2026-06-23T12:${String(i % 60).padStart(2, "0")}:00.000Z`,
                }
              : null,
        },
      ],
    }));
    const auditSourceRows = Array.from({ length: 500 }, (_, i) => ({
      sourceKind: "ORDER_EVENT",
      sourceId: `oe-${i}`,
      storedEventType: i % 4 === 0 ? "ACKNOWLEDGED" : "STARTED",
      documentedAtIso: `2026-06-23T08:${String(i % 60).padStart(2, "0")}:00.000Z`,
      summaryEn: `Event ${i}`,
    }));

    const started = performance.now();
    const record = buildEncounterClinicalRecord({
      encounter: { id: ENCOUNTER_ID, createdAt: "2026-06-23T08:00:00.000Z" },
      orders,
      auditSourceRows,
    });
    const elapsed = performance.now() - started;

    expect(record.orders).toHaveLength(200);
    expect(record.auditTimeline).toHaveLength(500);
    expect(elapsed).toBeLessThan(500);
  });

  it("dedupes orders with lifecycle rank helper", () => {
    const rows = dedupeOrderRows([
      {
        orderId: ORDER_ID,
        orderItemId: LAB_ITEM_ID,
        orderType: "LAB",
        priority: "ROUTINE",
        status: "ACKNOWLEDGED",
        label: "CMP",
        orderedAt: "2026-06-23T09:00:00.000Z",
        orderedByDisplayName: null,
      },
      {
        orderId: ORDER_ID,
        orderItemId: LAB_ITEM_ID,
        orderType: "LAB",
        priority: "ROUTINE",
        status: "COMPLETED",
        label: "CMP",
        orderedAt: "2026-06-23T09:00:00.000Z",
        orderedByDisplayName: null,
      },
    ]);
    expect(rows[0]?.status).toBe("COMPLETED");
  });

  it("remains backward compatible — source arrays are not mutated", () => {
    const orders = [
      {
        id: ORDER_ID,
        type: "LAB",
        items: [{ id: LAB_ITEM_ID, displayLabel: "CMP", status: "ACTIVE" }],
      },
    ];
    const auditSourceRows = [
      {
        sourceKind: "ORDER_EVENT",
        sourceId: "oe-1",
        storedEventType: "ACKNOWLEDGED",
        documentedAtIso: "2026-06-23T09:00:00.000Z",
        summaryEn: "Acknowledged",
      },
    ];
    const ordersBefore = JSON.stringify(orders);
    const auditBefore = JSON.stringify(auditSourceRows);

    buildEncounterClinicalRecord({
      encounter: { id: ENCOUNTER_ID },
      orders,
      auditSourceRows,
    });

    expect(JSON.stringify(orders)).toBe(ordersBefore);
    expect(JSON.stringify(auditSourceRows)).toBe(auditBefore);
  });
});
