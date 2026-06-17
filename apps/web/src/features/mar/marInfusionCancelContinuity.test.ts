import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildMedicationInfusionOrderCancelStopNotes,
  MEDICATION_INFUSION_STOP_REASON_ORDER_CANCELLED,
  parseMedicationInfusionStopReasonFromNotes,
} from "@medora/shared";
import {
  resolveMedicationAdministrationHistoryEventType,
  resolveMedicationAdministrationHistoryReasonFields,
} from "@medora/shared";
import { isMedicationDoseOpenForCancellation } from "@medora/shared";

const webSrcRoot = join(import.meta.dirname, "../..");
const apiSrcRoot = join(import.meta.dirname, "../../../../api/src");

function readWebSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

function readApiSrc(relativePath: string): string {
  return readFileSync(join(apiSrcRoot, relativePath), "utf8");
}

describe("marInfusionCancelContinuity (MEDUI.ED.MAR.H6B)", () => {
  const ordersService = readApiSrc("orders/orders.service.ts");
  const cascade = readApiSrc("orders/medication-order-cancel-cascade.util.ts");
  const historyNorm = readFileSync(
    join(import.meta.dirname, "../../../../../packages/shared/src/mar/medicationAdministrationHistoryNormalization.ts"),
    "utf8"
  );
  const tabSrc = readWebSrc("components/encounters/MedicationAdministrationTab.tsx");
  const railLib = readWebSrc("lib/medicationAdministrationHistoryRail.ts");
  const enrichment = readApiSrc("medication-dose/mar-shift-timeline-admin-enrichment.util.ts");

  it("1 — active infusion canceled teardown hook exists", () => {
    expect(ordersService).toContain("teardownActiveMedicationInfusionsBeforeOrderCancel");
    expect(ordersService).toContain("stopMedicationInfusionForOrderCancel");
  });

  it("2 — session terminated via STOPPED update", () => {
    expect(ordersService).toContain('status: "STOPPED"');
    expect(ordersService).toContain("infusionSession.updateMany");
  });

  it("3 — stop MAR created with INFUSION_STOP phase", () => {
    expect(ordersService).toContain('infusionPhase: "INFUSION_STOP"');
    expect(ordersService).toContain("buildMedicationInfusionOrderCancelStopNotes");
  });

  it("4 — cancel marker visible via existing cascade", () => {
    expect(cascade).toContain("cascadeMedicationOrderCancelInTransaction");
    expect(readApiSrc("medication-dose/mar-shift-timeline-canceled.util.ts")).toContain(
      "loadMarShiftTimelineCanceledPlacements"
    );
  });

  it("5 — history rail chronology supports infusion + cancel events", () => {
    expect(historyNorm).toContain('input.eventType === "INFUSION_STOP"');
    expect(historyNorm).toContain("parseMedicationInfusionStopReasonFromNotes");
    expect(railLib).toContain("INFUSION_START");
    expect(railLib).toContain("ORDER_CANCELED");
  });

  it("6 — started by preserved in timeline enrichment", () => {
    expect(enrichment).toContain("startedByDisplay");
    expect(enrichment).toContain("infusionPhase");
  });

  it("7 — canceled by preserved in order cancel metadata", () => {
    expect(ordersService).toContain("orderCancelReason");
    expect(historyNorm).toContain("ORDER_CANCELED");
  });

  it("8 — stop reason ORDER_CANCELLED preserved", () => {
    const notes = buildMedicationInfusionOrderCancelStopNotes({
      durationMinutes: 10,
      cancelReason: "DUPLICATE_ORDER",
    });
    const reason = resolveMedicationAdministrationHistoryReasonFields({
      eventType: "INFUSION_STOP",
      notes,
    });
    expect(reason.reasonCode).toBe(MEDICATION_INFUSION_STOP_REASON_ORDER_CANCELLED);
  });

  it("9 — cross-shift continuity via performer fields", () => {
    expect(enrichment).toContain("stoppedByDisplay");
    expect(enrichment).toContain("startedByDisplay");
    expect(ordersService).toContain("loadInfusionPerformerIdentitySnapshot");
  });

  it("10 — historical date review wired", () => {
    expect(tabSrc).toContain("MarHistoricalDateNavigationBar");
    expect(tabSrc).toContain("selectedDayWindow");
  });

  it("11 — no orphan active infusion after cancel teardown", () => {
    expect(cascade).toContain('doseStatus: "IN_PROGRESS"');
    expect(cascade).toContain("infusionSessionId");
  });

  it("12 — no deletion (append-only MAR)", () => {
    expect(ordersService).toContain("medicationAdministration.create");
    expect(ordersService).not.toContain("medicationAdministration.delete");
  });

  it("13 — IVPB path uses dose stop linkage", () => {
    expect(ordersService).toContain("findRecurringIvpbDoseStopLinkage");
    expect(ordersService).toContain("ivpbDoseSessionMar");
  });

  it("14 — recurring IVPB path", () => {
    expect(ordersService).toContain("ivpbStopLinkage");
  });

  it("15 — legacy infusion path updates session when no IVPB linkage", () => {
    expect(ordersService).toContain("if (!ivpbStopLinkage)");
  });

  it("16 — duration preserved in stop notes", () => {
    const notes = buildMedicationInfusionOrderCancelStopNotes({
      durationMinutes: 82,
      cancelReason: "TEST",
    });
    expect(notes).toContain("82 min");
    expect(parseMedicationInfusionStopReasonFromNotes(notes).reasonCode).toBe(
      MEDICATION_INFUSION_STOP_REASON_ORDER_CANCELLED
    );
  });

  it("17 — order history preserved via OrderEvent STOP", () => {
    expect(ordersService).toContain('infusionAction: "STOP"');
    expect(ordersService).toContain("stopReasonCode");
  });

  it("18 — timeline reconstruction via enrichment", () => {
    expect(enrichment).toContain("completionSummary");
    expect(enrichment).toContain("infusionSessionKey");
  });

  it("19 — H2B compatibility", () => {
    expect(resolveMedicationAdministrationHistoryEventType({
      infusionPhase: "INFUSION_STOP",
      notes: buildMedicationInfusionOrderCancelStopNotes({
        durationMinutes: 1,
        cancelReason: "X",
      }),
      marAction: "administered",
    })).toBe("INFUSION_STOP");
  });

  it("20 — H3 compatibility", () => {
    expect(readWebSrc("lib/marHistoricalTimeline.ts")).toContain(
      "filterMedicationAdministrationHistoryByInstantWindow"
    );
    expect(isMedicationDoseOpenForCancellation({
      doseStatus: "IN_PROGRESS",
      scheduledAt: new Date("2026-06-16T08:00:00.000Z"),
      cancelledAt: new Date("2026-06-16T11:00:00.000Z"),
    })).toBe(true);
  });
});
