import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { MedicationAdministrationHistoryEntry } from "@medora/shared";
import {
  buildMedicationAdministrationHistoryRailEntries,
  buildMedicationAdministrationHistoryRailEntry,
  isClinicalViewportMobile,
  isClinicalViewportTabletOrBelow,
  marAdministrationHistoryRailBadgeForEventType,
  marAdministrationHistoryRailSideWidthPercent,
  marAdministrationHistoryRailTimelineWidthPercent,
  readStoredMarAdministrationHistoryRailExpanded,
  resolveMarAdministrationHistoryRailDefaultExpanded,
  resolveMarAdministrationHistoryRailLayoutMode,
  writeStoredMarAdministrationHistoryRailExpanded,
} from "@/lib/medicationAdministrationHistoryRail";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

function t(key: string): string {
  const map: Record<string, string> = {
    "marAdministrationHistory.reasonPrefix": "Reason: ",
    "marAdministrationHistory.prnIndicationPrefix": "Indication: ",
    "marAdministrationHistory.eventType.ADMINISTERED": "Administered",
    "marAdministrationHistory.eventType.PRN_ADMINISTERED": "PRN administered",
    "marAdministrationHistory.eventType.REFUSED": "Refused",
    "marAdministrationHistory.eventType.HELD": "Held",
    "marAdministrationHistory.eventType.MISSED": "Missed",
    "marAdministrationHistory.eventType.NOT_AVAILABLE": "Not available",
    "marAdministrationHistory.eventType.INFUSION_START": "Infusion start",
    "marAdministrationHistory.eventType.INFUSION_STOP": "Infusion stop",
    "marAdministrationHistory.eventType.ORDER_CANCELED": "Order canceled",
    "marTab.adminTime.adjustedBadge": "Adjusted",
    "marAdministrationHistory.empty": "No medication administration history available.",
  };
  return map[key] ?? key;
}

function formatClinicalTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function sampleEntry(
  overrides: Partial<MedicationAdministrationHistoryEntry>
): MedicationAdministrationHistoryEntry {
  return {
    id: "hist-1",
    source: "MAR",
    encounterId: "enc-1",
    orderItemId: "oi-1",
    medicationLabel: "Acetaminophen",
    doseDisplay: "650 mg",
    route: "PO",
    eventType: "ADMINISTERED",
    eventAt: "2026-06-16T13:14:00.000Z",
    documentedAt: null,
    performedByDisplay: "Jane Smith",
    performedByRole: "RN",
    reasonCode: null,
    reasonDetail: null,
    isPrn: false,
    prnIndication: null,
    infusionPhase: null,
    medicationDoseInstanceId: "dose-1",
    readOnly: true,
    ...overrides,
  };
}

describe("marAdministrationHistoryRail (MEDUI.ED.MAR.H2C)", () => {
  const railSrc = readSrc("components/mar/MedicationAdministrationHistoryRail.tsx");
  const tabSrc = readSrc("components/encounters/MedicationAdministrationTab.tsx");

  it("1 — renders empty state i18n and component contract", () => {
    expect(t("marAdministrationHistory.empty")).toBe(
      "No medication administration history available."
    );
    expect(railSrc).toContain('data-testid="mar-administration-history-empty"');
    expect(railSrc).toContain('t("marAdministrationHistory.empty")');
  });

  it("2 — renders administered event", () => {
    const entry = buildMedicationAdministrationHistoryRailEntry(
      sampleEntry({ eventType: "ADMINISTERED" }),
      { formatClinicalTime, t }
    );
    expect(entry.medicationLine).toBe("Acetaminophen 650 mg PO");
    expect(entry.statusLabelKey).toBe("marAdministrationHistory.eventType.ADMINISTERED");
    expect(entry.performerLine).toBe("Jane Smith RN");
  });

  it("3 — renders PRN event", () => {
    const entry = buildMedicationAdministrationHistoryRailEntry(
      sampleEntry({
        eventType: "PRN_ADMINISTERED",
        isPrn: true,
        medicationLabel: "Morphine",
        doseDisplay: "4 mg",
        route: "IV",
        prnIndication: "severe nausea",
        performedByDisplay: "John Doe",
        performedByRole: "RN",
      }),
      { formatClinicalTime, t }
    );
    expect(entry.medicationLine).toBe("Morphine 4 mg IV PRN");
    expect(entry.prnIndicationLine).toBe("Indication: severe nausea");
    expect(entry.statusLabelKey).toBe("marAdministrationHistory.eventType.PRN_ADMINISTERED");
  });

  it("4 — renders refused event", () => {
    const entry = buildMedicationAdministrationHistoryRailEntry(
      sampleEntry({
        eventType: "REFUSED",
        reasonDetail: "patient declined",
      }),
      { formatClinicalTime, t }
    );
    expect(entry.statusLabelKey).toBe("marAdministrationHistory.eventType.REFUSED");
    expect(entry.reasonLine).toBe("Reason: patient declined");
  });

  it("5 — renders held event", () => {
    const entry = buildMedicationAdministrationHistoryRailEntry(
      sampleEntry({ eventType: "HELD", reasonCode: "NPO" }),
      { formatClinicalTime, t }
    );
    expect(entry.statusLabelKey).toBe("marAdministrationHistory.eventType.HELD");
    expect(entry.reasonLine).toBe("Reason: NPO");
  });

  it("6 — renders missed event", () => {
    const entry = buildMedicationAdministrationHistoryRailEntry(
      sampleEntry({ eventType: "MISSED" }),
      { formatClinicalTime, t }
    );
    expect(entry.statusLabelKey).toBe("marAdministrationHistory.eventType.MISSED");
  });

  it("7 — renders infusion start", () => {
    const entry = buildMedicationAdministrationHistoryRailEntry(
      sampleEntry({
        eventType: "INFUSION_START",
        medicationLabel: "Vancomycin",
        doseDisplay: "1 g",
        route: "IV",
        infusionPhase: "INFUSION_START",
      }),
      { formatClinicalTime, t }
    );
    expect(entry.statusLabelKey).toBe("marAdministrationHistory.eventType.INFUSION_START");
  });

  it("8 — renders infusion stop", () => {
    const entry = buildMedicationAdministrationHistoryRailEntry(
      sampleEntry({
        eventType: "INFUSION_STOP",
        infusionPhase: "INFUSION_STOP",
      }),
      { formatClinicalTime, t }
    );
    expect(entry.statusLabelKey).toBe("marAdministrationHistory.eventType.INFUSION_STOP");
  });

  it("9 — renders canceled event", () => {
    const entry = buildMedicationAdministrationHistoryRailEntry(
      sampleEntry({
        id: "order-cancel:oi-1",
        source: "ORDER_CANCEL",
        eventType: "ORDER_CANCELED",
        medicationLabel: "Lisinopril",
        doseDisplay: "20 mg",
        route: "PO",
        performedByDisplay: "Dr Martin",
        performedByRole: null,
        reasonDetail: "clinical change",
      }),
      { formatClinicalTime, t }
    );
    expect(entry.medicationLine).toBe("Lisinopril 20 mg PO");
    expect(entry.statusLabelKey).toBe("marAdministrationHistory.eventType.ORDER_CANCELED");
    expect(entry.reasonLine).toBe("Reason: clinical change");
  });

  it("10 — newest first ordering preserves API order", () => {
    const rows = [
      sampleEntry({ id: "new", eventAt: "2026-06-16T15:00:00.000Z" }),
      sampleEntry({ id: "old", eventAt: "2026-06-16T09:00:00.000Z" }),
    ];
    const entries = buildMedicationAdministrationHistoryRailEntries(rows, { formatClinicalTime, t });
    expect(entries.map((e) => e.id)).toEqual(["new", "old"]);
  });

  it("11 — adjusted time badge when documentedAt differs", () => {
    const entry = buildMedicationAdministrationHistoryRailEntry(
      sampleEntry({
        eventAt: "2026-06-16T13:14:00.000Z",
        documentedAt: "2026-06-16T13:30:00.000Z",
      }),
      { formatClinicalTime, t }
    );
    expect(entry.showAdjustedTime).toBe(true);
    expect(entry.documentedTimeLabel).toBeTruthy();
    expect(railSrc).toContain('t("marTab.adminTime.adjustedBadge")');
  });

  it("12 — collapse state contract", () => {
    expect(railSrc).toContain('data-expanded="false"');
    expect(railSrc).toContain('aria-expanded={expanded}');
    expect(railSrc).toContain('t("marAdministrationHistory.title")');
  });

  it("13 — expand state contract", () => {
    expect(railSrc).toContain('data-expanded="true"');
    expect(railSrc).toContain('t("marAdministrationHistory.collapse")');
    expect(railSrc).toContain('data-testid="mar-administration-history-list"');
  });

  it("14 — mobile render viewport marker", () => {
    expect(isClinicalViewportMobile(390)).toBe(true);
    expect(railSrc).toContain('data-viewport={isMobile ? "mobile"');
  });

  it("15 — tablet render viewport marker", () => {
    expect(isClinicalViewportTabletOrBelow(900)).toBe(true);
    expect(railSrc).toContain('"tablet"');
  });

  it("16 — desktop render layout split", () => {
    expect(resolveMarAdministrationHistoryRailLayoutMode(1280)).toBe("sideRail");
    expect(marAdministrationHistoryRailTimelineWidthPercent()).toBe(70);
    expect(marAdministrationHistoryRailSideWidthPercent()).toBe(30);
    expect(tabSrc).toContain('data-testid="mar-workspace-with-history"');
    expect(tabSrc).toContain("marHistorySideBySide");
  });

  it("17 — loading state", () => {
    expect(railSrc).toContain("setLoading(true)");
    expect(railSrc).toContain('t("common.loading")');
  });

  it("18 — no mutation buttons", () => {
    expect(railSrc).not.toContain("onRequestAdminister");
    expect(railSrc).not.toContain("onRequestStartInfusion");
    expect(railSrc).not.toContain("onRequestRefuse");
    expect(railSrc).not.toContain("onRequestHold");
    expect(railSrc).not.toMatch(/>\s*Administer\s*</i);
    expect(railSrc).not.toMatch(/>\s*Cancel\s*</i);
  });

  it("19 — scroll behavior", () => {
    expect(railSrc).toContain('data-testid="mar-administration-history-scroll"');
    expect(railSrc).toContain("overflowY: \"auto\"");
  });

  it("20 — status badge rendering per event type", () => {
    const types = [
      "ADMINISTERED",
      "PRN_ADMINISTERED",
      "REFUSED",
      "HELD",
      "MISSED",
      "NOT_AVAILABLE",
      "INFUSION_START",
      "INFUSION_STOP",
      "ORDER_CANCELED",
      "ADMINISTRATION_CORRECTION",
    ] as const;
    for (const eventType of types) {
      const badge = marAdministrationHistoryRailBadgeForEventType(eventType);
      expect(badge.bg).toBeTruthy();
      expect(badge.text).toBeTruthy();
      expect(badge.border).toBeTruthy();
    }
    expect(railSrc).toContain("MedoraCardBadge");
    expect(railSrc).toContain("entry.badgeSoft");
  });

  it("session storage — default expanded desktop, collapsed tablet/mobile", () => {
    expect(resolveMarAdministrationHistoryRailDefaultExpanded("desktop")).toBe(true);
    expect(resolveMarAdministrationHistoryRailDefaultExpanded("tablet")).toBe(false);
    expect(resolveMarAdministrationHistoryRailDefaultExpanded("compact")).toBe(false);

    const key = { facilityId: "f1", encounterId: "e1", userId: "u1" };
    writeStoredMarAdministrationHistoryRailExpanded(
      key.facilityId,
      key.encounterId,
      key.userId,
      false
    );
    expect(readStoredMarAdministrationHistoryRailExpanded(
      key.facilityId,
      key.encounterId,
      key.userId
    )).toBe(false);
  });
});
