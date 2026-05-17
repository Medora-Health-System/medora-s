import { describe, expect, it } from "vitest";
import {
  commandTimelineEventTitle,
  filterCommandTimelineItems,
  isSortedByDocumentedTimeNewestFirst,
  matchesCommandTimelineFilter,
  resolveCommandTimelineCategory,
} from "./enterpriseEncounterCommandTimelineModel";
import type { UnifiedTimelineApiItem } from "./enterpriseEncounterCommandTimelineModel";

const t = (key: string) => {
  const map: Record<string, string> = {
    "clinicalTimelineDisplay.event.OBSERVATION_ADMISSION_PACKET_SAVED": "Admission en observation enregistrée",
    "emergencyVisitSummaryPanel.clinicalTimeline.event.vitalsRecorded": "Signes vitaux enregistrés",
    "attribution.orderedBy": "Prescrit par {name}{role} · {datetime}",
    "attribution.performedBy": "Réalisé par {name}{role} · {datetime}",
    "attribution.resultedBy": "Résultat par {name}{role} · {datetime}",
    "unifiedTimeline.groups.CLINICAL": "Clinique",
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
  it("maps observation admission display without discharge label", () => {
    const item = baseItem({
      displayEventType: "OBSERVATION_ADMISSION_PACKET_SAVED",
      storedEventType: "DISCHARGE_SUMMARY_SAVED",
      displayGroup: "OBSERVATION",
      carePhase: "OBSERVATION",
    });
    expect(commandTimelineEventTitle(item, t)).toBe("Admission en observation enregistrée");
    expect(resolveCommandTimelineCategory(item)).toBe("OBSERVATION");
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
});
