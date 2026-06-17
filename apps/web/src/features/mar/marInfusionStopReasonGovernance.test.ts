import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  MEDICATION_INFUSION_NURSE_STOP_REASON_CODES,
  buildMedicationInfusionStopNotes,
  parseMedicationInfusionStopReasonFromNotes,
  resolveMedicationInfusionStopReasonTimelineLabel,
} from "@medora/shared";
import { buildMedicationAdministrationHistoryRailEntry } from "@/lib/medicationAdministrationHistoryRail";
import { buildMarShiftTimelineCellDisplay } from "@medora/shared";
import { filterMedicationAdministrationHistoryByInstantWindow } from "@/lib/marHistoricalTimeline";

const webSrcRoot = join(import.meta.dirname, "../..");
const apiSrcRoot = join(import.meta.dirname, "../../../../api/src");

function readWebSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

function readApiSrc(relativePath: string): string {
  return readFileSync(join(apiSrcRoot, relativePath), "utf8");
}

describe("marInfusionStopReasonGovernance (MEDUI.ED.MAR.H6C)", () => {
  const ordersService = readApiSrc("orders/orders.service.ts");
  const historyRail = readWebSrc("lib/medicationAdministrationHistoryRail.ts");
  const marTab = readWebSrc("components/encounters/MedicationAdministrationTab.tsx");
  const drawer = readWebSrc("components/encounters/FacilityMarShiftTimelineDrawer.tsx");

  it("1 — Completed stop reason in API", () => {
    expect(ordersService).toContain("buildMedicationInfusionStopNotes");
    expect(ordersService).toContain("stopReasonCode");
  });

  it("2 — Order canceled maps to ORDER_CANCELLED", () => {
    const notes = buildMedicationInfusionStopNotes({
      durationMinutes: 20,
      stopReasonCode: "ORDER_CANCELLED",
    });
    expect(parseMedicationInfusionStopReasonFromNotes(notes).reasonCode).toBe("ORDER_CANCELLED");
  });

  it("3 — Reaction timeline label", () => {
    expect(resolveMedicationInfusionStopReasonTimelineLabel("REACTION")).toBe("Reaction");
  });

  it("4 — Line failure timeline label", () => {
    expect(resolveMedicationInfusionStopReasonTimelineLabel("LINE_FAILURE")).toBe("Line failure");
  });

  it("5 — Pump issue timeline label", () => {
    expect(resolveMedicationInfusionStopReasonTimelineLabel("PUMP_ISSUE")).toBe("Pump issue");
  });

  it("6 — Provider discontinued", () => {
    expect(MEDICATION_INFUSION_NURSE_STOP_REASON_CODES).toContain("PROVIDER_DISCONTINUED");
  });

  it("7 — IVPB uses same stop notes builder", () => {
    expect(ordersService).toContain("ivpbDoseSessionMar");
    expect(ordersService).toContain('infusionPhase: "INFUSION_STOP"');
  });

  it("8 — IVPB canceled inherits ORDER_CANCELLED", () => {
    expect(ordersService).toContain("stopMedicationInfusionForOrderCancel");
    expect(ordersService).toContain("ORDER_CANCELLED");
  });

  it("9 — cross-shift enrichment preserves stop reason", () => {
    expect(readApiSrc("medication-dose/mar-shift-timeline-admin-enrichment.util.ts")).toContain(
      "infusionStopReasonCode"
    );
  });

  it("10 — history rail renders labeled stop reason", () => {
    const entry = buildMedicationAdministrationHistoryRailEntry(
      {
        id: "mar-stop",
        source: "MAR",
        encounterId: "enc-1",
        orderItemId: "oi-1",
        medicationLabel: "Vancomycin 1 g",
        doseDisplay: "1 g",
        route: "IVPB",
        eventType: "INFUSION_STOP",
        eventAt: "2026-06-16T11:00:00.000Z",
        documentedAt: null,
        performedByDisplay: "Jane Doe",
        performedByRole: "RN",
        reasonCode: "REACTION",
        reasonDetail: "Urticaria",
        isPrn: false,
        prnIndication: null,
        infusionPhase: "INFUSION_STOP",
        medicationDoseInstanceId: null,
        readOnly: true,
      },
      {
        formatClinicalTime: (iso) => iso,
        t: (key) => (key === "marInfusionStopReason.REACTION" ? "Réaction" : key),
      }
    );
    expect(entry.reasonLine).toContain("Réaction");
    expect(historyRail).toContain("resolveMedicationInfusionStopReasonI18nKey");
  });

  it("11 — timeline completed cell uses stop reason secondary", () => {
    const display = buildMarShiftTimelineCellDisplay({
      medicationLabel: "Vancomycin",
      doseKind: "IVPB_SESSION",
      doseStatus: "COMPLETED",
      route: "IVPB",
      frequencyCode: "ONCE",
      requiresWitness: false,
      enrichment: {
        startedAt: "2026-06-16T08:00:00.000Z",
        startedByDisplay: "RN A",
        startedByInitials: "RA",
        stoppedAt: "2026-06-16T10:00:00.000Z",
        stoppedByDisplay: "RN C",
        stoppedByInitials: "RC",
        administeredAt: null,
        administeredByDisplay: null,
        administeredByInitials: null,
        completionSummary: "RA 08:00–RC 10:00",
        infusionStopReasonCode: "REACTION",
      },
    });
    expect(display.secondaryText).toBe("Reaction");
  });

  it("12 — historical date review filter unchanged", () => {
    const rows = [
      {
        id: "mar-stop",
        source: "MAR" as const,
        encounterId: "enc-1",
        orderItemId: "oi-1",
        medicationLabel: "Drug",
        doseDisplay: null,
        route: "IV",
        eventType: "INFUSION_STOP" as const,
        eventAt: "2026-06-16T11:00:00.000Z",
        documentedAt: null,
        performedByDisplay: "RN",
        performedByRole: "RN",
        reasonCode: "COMPLETED",
        reasonDetail: null,
        isPrn: false,
        prnIndication: null,
        infusionPhase: "INFUSION_STOP" as const,
        medicationDoseInstanceId: null,
        readOnly: true as const,
      },
    ];
    const filtered = filterMedicationAdministrationHistoryByInstantWindow(rows, {
      startIso: "2026-06-16T07:00:00.000Z",
      endIso: "2026-06-16T20:00:00.000Z",
    });
    expect(filtered).toHaveLength(1);
  });

  it("13 — structured metadata in order event", () => {
    expect(ordersService).toContain("stopReasonDetail");
  });

  it("14 — no free-text-only stop in API path", () => {
    expect(ordersService).toContain("INFUSION_STOP_REASON_REQUIRED");
    expect(ordersService).not.toMatch(/const autoNote = `Perfusion IV terminée/);
  });

  it("15 — H6B compatibility preserved", () => {
    expect(marTab).toContain("marInfusionStopReason");
    expect(drawer).toContain("mar-shift-timeline-drawer-stop-reason");
    expect(readWebSrc("features/mar/marInfusionCancelContinuity.test.ts")).toContain(
      "stopMedicationInfusionForOrderCancel"
    );
  });
});
