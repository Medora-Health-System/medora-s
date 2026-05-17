import { describe, expect, it } from "vitest";
import {
  buildCommandTimelinePrimaryActorLine,
  commandTimelineEventTitle,
  commandTimelineTitleHasFrenchUiLeak,
  filterCommandTimelineItems,
  isSortedByDocumentedTimeNewestFirst,
  matchesCommandTimelineFilter,
  resolveCommandTimelineCategory,
  resolveOrderEventAttributionKind,
} from "./enterpriseEncounterCommandTimelineModel";
import type { UnifiedTimelineApiItem } from "./enterpriseEncounterCommandTimelineModel";

const tFr = (key: string) => {
  const map: Record<string, string> = {
    "clinicalTimelineDisplay.event.OBSERVATION_ADMISSION_PACKET_SAVED": "Admission en observation enregistrée",
    "emergencyVisitSummaryPanel.clinicalTimeline.event.vitalsRecorded": "Signes vitaux enregistrés",
    "attribution.orderedBy": "Prescrit par {name}{role} · {datetime}",
    "attribution.performedBy": "Réalisé par {name}{role} · {datetime}",
    "attribution.acknowledgedBy": "Accusé réception par {name}{role} · {datetime}",
    "attribution.resultedBy": "Résultat par {name}{role} · {datetime}",
    "unifiedTimeline.groups.CLINICAL": "Clinique",
    "commandTimeline.attribution.documentedBy": "Documenté par {name}{role}",
  };
  return map[key] ?? key;
};

const tEn = (key: string) => {
  const map: Record<string, string> = {
    "clinicalTimelineDisplay.event.OBSERVATION_ADMISSION_PACKET_SAVED": "Observation admission saved",
    "emergencyVisitSummaryPanel.clinicalTimeline.event.vitalsRecorded": "Vital signs recorded",
    "attribution.orderedBy": "Ordered by {name}{role} · {datetime}",
    "attribution.performedBy": "Performed by {name}{role} · {datetime}",
    "attribution.acknowledgedBy": "Acknowledged by {name}{role} · {datetime}",
    "attribution.resultedBy": "Resulted by {name}{role} · {datetime}",
    "commandTimeline.attribution.documentedBy": "Documented by {name}{role}",
  };
  return map[key] ?? key;
};

function baseItem(overrides: Partial<UnifiedTimelineApiItem>): UnifiedTimelineApiItem {
  return {
    id: "ENCOUNTER_CLINICAL_EVENT:x",
    sourceKind: "ENCOUNTER_CLINICAL_EVENT",
    sourceId: "x",
    storedEventType: "VITALS_RECORDED",
    displayEventType: "VITALS_RECORDED",
    displayGroup: "CLINICAL",
    carePhase: "ED",
    documentedAtIso: "2026-05-16T10:00:00.000Z",
    effectiveClinicalAtIso: null,
    hasClinicalTimeCorrection: false,
    actor: { userId: null, displayName: "Nurse A", role: "RN", department: "RN" },
    chips: [],
    titleFr: null,
    titleEn: null,
    summaryFr: null,
    summaryEn: null,
    orderId: null,
    orderItemId: null,
    ...overrides,
  };
}

describe("enterpriseEncounterCommandTimelineModel", () => {
  it("maps observation admission display without discharge label (French)", () => {
    const item = baseItem({
      displayEventType: "OBSERVATION_ADMISSION_PACKET_SAVED",
      storedEventType: "DISCHARGE_SUMMARY_SAVED",
      displayGroup: "OBSERVATION",
      carePhase: "OBSERVATION",
      titleFr: "Admission en observation enregistrée",
    });
    expect(commandTimelineEventTitle(item, tFr, "fr")).toBe("Admission en observation enregistrée");
    expect(resolveCommandTimelineCategory(item)).toBe("OBSERVATION");
  });

  it("English mode uses titleEn from API, not titleFr", () => {
    const item = baseItem({
      sourceKind: "ORDER_EVENT",
      storedEventType: "STARTED",
      displayEventType: "ORDER_STARTED_CARE",
      displayGroup: "PROCEDURE",
      titleFr: "Ordre accusé réception — Oxymétrie de pouls en continu",
      titleEn: "Order acknowledged — Continuous pulse oximetry monitoring",
      payloadJson: { lifecycleOutcome: "ACKNOWLEDGED" },
    });
    const title = commandTimelineEventTitle(item, tEn, "en");
    expect(title).toBe("Order acknowledged — Continuous pulse oximetry monitoring");
    expect(commandTimelineTitleHasFrenchUiLeak(title)).toBe(false);
  });

  it("English mode clinical events prefer titleEn", () => {
    const item = baseItem({
      displayEventType: "DISCHARGE_SUMMARY_SAVED",
      titleFr: "Dossier de sortie enregistré",
      titleEn: "Discharge packet saved",
    });
    const title = commandTimelineEventTitle(item, tEn, "en");
    expect(title).toBe("Discharge packet saved");
    expect(commandTimelineTitleHasFrenchUiLeak(title)).toBe(false);
  });

  it("English mode falls back to i18n when titleEn missing", () => {
    const item = baseItem({
      displayEventType: "VITALS_RECORDED",
      titleFr: "Signes vitaux enregistrés",
    });
    const title = commandTimelineEventTitle(item, tEn, "en");
    expect(title).toBe("Vital signs recorded");
    expect(commandTimelineTitleHasFrenchUiLeak(title)).toBe(false);
  });

  it("regression: English titles must not contain known French UI tokens", () => {
    const samples = [
      baseItem({
        titleEn: "Triage recorded",
        titleFr: "Triage enregistré",
        displayEventType: "TRIAGE_ASSESSMENT_SAVED",
      }),
      baseItem({
        sourceKind: "ORDER_EVENT",
        titleEn: "Discharge packet saved",
        titleFr: "Dossier de sortie enregistré",
        displayEventType: "ORDER_COMPLETED_CARE",
      }),
      baseItem({
        sourceKind: "ORDER_EVENT",
        titleEn: "Order acknowledged — Nursing reassessment every 2 hours",
        titleFr: "Ordre accusé réception — Réévaluation infirmière toutes les 2 h",
        displayEventType: "ORDER_STARTED_CARE",
      }),
    ];
    for (const item of samples) {
      const title = commandTimelineEventTitle(item, tEn, "en");
      expect(commandTimelineTitleHasFrenchUiLeak(title)).toBe(false);
    }
  });

  it("shows MAR corrected time fields on item", () => {
    const item = baseItem({
      id: "MEDICATION_ADMINISTRATION:mar-1",
      sourceKind: "MEDICATION_ADMINISTRATION",
      storedEventType: "ADMINISTERED",
      displayGroup: "MEDICATION",
      documentedAtIso: "2026-05-16T11:00:00.000Z",
      effectiveClinicalAtIso: "2026-05-16T10:30:00.000Z",
      hasClinicalTimeCorrection: true,
      chips: ["ADJUSTED"],
    });
    expect(item.hasClinicalTimeCorrection).toBe(true);
    expect(resolveCommandTimelineCategory(item)).toBe("MAR");
  });

  it("filters corrected-only without re-sorting by effective time", () => {
    const items = [
      baseItem({
        id: "a",
        documentedAtIso: "2026-05-16T12:00:00.000Z",
        hasClinicalTimeCorrection: true,
        effectiveClinicalAtIso: "2026-05-16T08:00:00.000Z",
      }),
      baseItem({
        id: "b",
        documentedAtIso: "2026-05-16T11:00:00.000Z",
        hasClinicalTimeCorrection: false,
      }),
    ];
    const filtered = filterCommandTimelineItems(items, "CORRECTED_ONLY");
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("a");
    expect(isSortedByDocumentedTimeNewestFirst(filtered)).toBe(true);
  });

  it("classifies order CREATED as ORDERS not MAR", () => {
    const item = baseItem({
      id: "ORDER_EVENT:oe-1",
      sourceKind: "ORDER_EVENT",
      storedEventType: "CREATED",
      displayGroup: "MEDICATION",
      displayEventType: "ORDER_CREATED_MEDICATION",
    });
    expect(resolveCommandTimelineCategory(item)).toBe("ORDERS");
    expect(matchesCommandTimelineFilter(item, "MAR")).toBe(false);
    expect(matchesCommandTimelineFilter(item, "ORDERS")).toBe(true);
  });

  it("classifies lab result as LABORATORY", () => {
    const item = baseItem({
      id: "ORDER_ITEM_RESULT:r-1",
      sourceKind: "ORDER_ITEM_RESULT",
      displayGroup: "LABORATORY",
      displayEventType: "RESULT_LAB_RECORDED",
    });
    expect(resolveCommandTimelineCategory(item)).toBe("LABORATORY");
    expect(matchesCommandTimelineFilter(item, "LAB")).toBe(true);
  });

  it("maps STARTED+ACKNOWLEDGED order events to acknowledgement attribution (not performed)", () => {
    const item = baseItem({
      id: "ORDER_EVENT:ack-1",
      sourceKind: "ORDER_EVENT",
      storedEventType: "STARTED",
      displayGroup: "PROCEDURE",
      displayEventType: "ORDER_STARTED_CARE",
      titleFr: "Ordre accusé réception — Signes vitaux",
      titleEn: "Order acknowledged — Vital signs",
      payloadJson: { lifecycleOutcome: "ACKNOWLEDGED", orderItemId: "item-1" },
      actor: { userId: "u1", displayName: "Elizabeth Posada", role: "RN", department: "RN" },
    });
    expect(resolveOrderEventAttributionKind(item)).toBe("ACKNOWLEDGED");
    expect(buildCommandTimelinePrimaryActorLine(item, tEn)).toContain("Acknowledged");
    expect(buildCommandTimelinePrimaryActorLine(item, tEn)).not.toMatch(/Réalisé|Accusé réception/);
  });

  it("French attribution uses French i18n strings", () => {
    const item = baseItem({
      id: "ORDER_EVENT:ack-2",
      sourceKind: "ORDER_EVENT",
      storedEventType: "STARTED",
      displayGroup: "PROCEDURE",
      payloadJson: { lifecycleOutcome: "ACKNOWLEDGED" },
      actor: { userId: "u1", displayName: "Marie", role: "RN", department: "RN" },
    });
    expect(buildCommandTimelinePrimaryActorLine(item, tFr)).toContain("Accusé réception");
  });
});
